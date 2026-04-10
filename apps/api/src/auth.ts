// @ts-nocheck
import jwt from 'jsonwebtoken';
import { z } from 'zod';

export const JWTPayloadSchema = z.object({
  sub: z.string(),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']),
});
export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

export function signAccessToken(input: JWTPayload) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');
  return jwt.sign(input, secret, { expiresIn: '15m' });
}

export function signRefreshToken(input: JWTPayload) {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) throw new Error('JWT_REFRESH_SECRET is not set');
  return jwt.sign(input, secret, { expiresIn: '30d' });
}

export function verifyAccessToken(token: string): JWTPayload {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error('JWT_ACCESS_SECRET is not set');
  const decoded = jwt.verify(token, secret);
  return JWTPayloadSchema.parse(decoded);
}
