import type { VercelRequest, VercelResponse } from '@vercel/node';
import handler from '../apps/api/src/serverless.ts';

// Initialize Prisma client
import { prisma } from '../apps/api/src/db.ts';

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
  
  // Run the Express handler
  return handler(req, res);
}
