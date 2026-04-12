import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { bcrypt } from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"
import { sign, verify } from "https://esm.sh/djwt@3.0.2"

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const JWT_ACCESS_SECRET = Deno.env.get('JWT_ACCESS_SECRET') || 'change-me'
const JWT_REFRESH_SECRET = Deno.env.get('JWT_REFRESH_SECRET') || 'change-me-too'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

async function verifyToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    const payload = await verify(token, JWT_ACCESS_SECRET)
    return payload
  } catch {
    return null
  }
}

function signAccessToken(payload: { sub: string; role: string }) {
  return sign({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 }, JWT_ACCESS_SECRET)
}

function signRefreshToken(payload: { sub: string; role: string }) {
  return sign({ ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, JWT_REFRESH_SECRET)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  const url = new URL(req.url)
  const path = url.pathname.replace('/api', '')
  const authHeader = req.headers.get('Authorization')

  try {
    // POST /auth/register
    if (path === '/auth/register' && req.method === 'POST') {
      const body = await req.json()
      const { email, password, fullName, role = 'STUDENT' } = body

      // Check if user exists
      const { data: existing } = await supabase
        .from('User')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (existing) {
        return json({ error: 'email_exists', message: 'Email already registered' }, 400)
      }

      const passwordHash = await bcrypt.hash(password)

      const { data: user, error } = await supabase
        .from('User')
        .insert({
          email: email.toLowerCase(),
          passwordHash,
          fullName,
          role,
          isApproved: false,
        })
        .select('id, email, fullName, role, isApproved, createdAt')
        .single()

      if (error) throw error

      return json({ ...user, message: 'Account created. Please wait for admin approval.' })
    }

    // POST /auth/login
    if (path === '/auth/login' && req.method === 'POST') {
      const body = await req.json()
      const { email, password } = body

      const { data: user } = await supabase
        .from('User')
        .select('*')
        .eq('email', email.toLowerCase())
        .single()

      if (!user) {
        return json({ error: 'invalid_credentials' }, 401)
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash)
      if (!validPassword) {
        return json({ error: 'invalid_credentials' }, 401)
      }

      if (user.role !== 'ADMIN' && !user.isApproved) {
        return json({ error: 'account_pending', message: 'Account pending approval' }, 403)
      }

      const payload = { sub: user.id, role: user.role }
      const accessToken = signAccessToken(payload)
      const refreshToken = signRefreshToken(payload)

      return json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          isProfileComplete: user.isProfileComplete,
          profileImage: user.profileImage,
        },
      })
    }

    // GET /me
    if (path === '/me' && req.method === 'GET') {
      const user = await verifyToken(authHeader)
      if (!user) return json({ error: 'unauthorized' }, 401)

      const { data: profile } = await supabase
        .from('User')
        .select('id, email, fullName, role, isProfileComplete, profileImage, isApproved, createdAt')
        .eq('id', user.sub)
        .single()

      return json(profile)
    }

    // POST /me/change-password
    if (path === '/me/change-password' && req.method === 'POST') {
      const user = await verifyToken(authHeader)
      if (!user) return json({ error: 'unauthorized' }, 401)

      const body = await req.json()
      const { currentPassword, newPassword } = body

      const { data: profile } = await supabase
        .from('User')
        .select('passwordHash')
        .eq('id', user.sub)
        .single()

      if (!profile) return json({ error: 'user_not_found' }, 404)

      const validPassword = await bcrypt.compare(currentPassword, profile.passwordHash)
      if (!validPassword) {
        return json({ error: 'invalid_password', message: 'Current password is incorrect' }, 400)
      }

      const passwordHash = await bcrypt.hash(newPassword)

      await supabase
        .from('User')
        .update({ passwordHash })
        .eq('id', user.sub)

      return json({ success: true, message: 'Password changed successfully' })
    }

    // Admin routes
    const adminUser = await verifyToken(authHeader)
    if (adminUser?.role !== 'ADMIN') {
      return json({ error: 'forbidden' }, 403)
    }

    // GET /admin/pending-users
    if (path === '/admin/pending-users' && req.method === 'GET') {
      const { data: users } = await supabase
        .from('User')
        .select('id, email, fullName, role, createdAt')
        .eq('isApproved', false)
        .order('createdAt', { ascending: false })

      return json(users)
    }

    // POST /admin/users
    if (path === '/admin/users' && req.method === 'POST') {
      const body = await req.json()
      const { email, password, fullName, role } = body

      const { data: existing } = await supabase
        .from('User')
        .select('id')
        .eq('email', email.toLowerCase())
        .single()

      if (existing) {
        return json({ error: 'email_exists' }, 400)
      }

      const passwordHash = await bcrypt.hash(password)

      const { data: user } = await supabase
        .from('User')
        .insert({
          email: email.toLowerCase(),
          passwordHash,
          fullName,
          role,
          isApproved: true,
          isProfileComplete: true,
        })
        .select('id, email, fullName, role, isApproved, createdAt')
        .single()

      return json(user)
    }

    // POST /admin/users/:userId/approve
    const approveMatch = path.match(/^\/admin\/users\/([^/]+)\/approve$/)
    if (approveMatch && req.method === 'POST') {
      const userId = approveMatch[1]

      const { data: user } = await supabase
        .from('User')
        .update({ isApproved: true })
        .eq('id', userId)
        .select('id, email, fullName, role, isApproved')
        .single()

      return json(user)
    }

    // DELETE /admin/users/:userId
    const deleteMatch = path.match(/^\/admin\/users\/([^/]+)$/)
    if (deleteMatch && req.method === 'DELETE') {
      const userId = deleteMatch[1]

      await supabase.from('User').delete().eq('id', userId)

      return json({ success: true })
    }

    return json({ error: 'not_found' }, 404)
  } catch (error) {
    console.error('Error:', error)
    return json({ error: 'internal_error', message: error.message }, 500)
  }
})
