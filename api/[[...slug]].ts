import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../apps/api/src/serverless';

// Initialize Prisma client
import { prisma } from '../apps/api/src/db';

// Ensure Prisma is connected
let prismaConnected = false;
async function ensurePrismaConnection() {
  if (!prismaConnected) {
    await prisma.$connect();
    prismaConnected = true;
  }
}

export default async function (req: VercelRequest, res: VercelResponse) {
  // Ensure database connection
  await ensurePrismaConnection();
  
  // Fix path: Vercel sends /api/auth/login but Express expects /api/auth/login
  // The serverless-http handler should work with the full path
  return handler(req, res);
}
