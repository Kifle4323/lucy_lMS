import type { Request, Response, Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { signAccessToken, signRefreshToken } from '../auth.js';
import { authRequired, type AuthedRequest } from '../middleware.js';

export function registerAuthRoutes(router: Router) {
  router.post('/auth/register', async (req: Request, res: Response) => {
    const body = z
      .object({
        email: z.string().email(),
        password: z.string().min(6),
        fullName: z.string().min(2),
        role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']).optional(),
      })
      .parse(req.body);

    const passwordHash = await bcrypt.hash(body.password, 10);

    const user = await prisma.user.create({
      data: {
        email: body.email.toLowerCase(),
        passwordHash,
        fullName: body.fullName,
        role: body.role ?? 'STUDENT',
      },
      select: { id: true, email: true, fullName: true, role: true, createdAt: true },
    });

    res.json(user);
  });

  router.post('/auth/login', async (req: Request, res: Response) => {
    const body = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: 'invalid_credentials' });
      return;
    }

    const payload = { sub: user.id, role: user.role } as const;
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, isProfileComplete: user.isProfileComplete },
    });
  });

  router.get('/me', authRequired, async (req: AuthedRequest, res: Response) => {
    const id = req.user!.id;
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, fullName: true, role: true, isProfileComplete: true, createdAt: true },
    });
    res.json(user);
  });
}
