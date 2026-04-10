import type { VercelRequest, VercelResponse } from '@vercel/node';
import serverless from 'serverless-http';
import app from '../apps/api/src/app.js';

// Initialize Prisma client
import { prisma } from '../apps/api/src/db.js';

// Ensure Prisma is connected
let prismaConnected = false;
async function ensurePrismaConnection() {
  if (!prismaConnected) {
    await prisma.$connect();
    prismaConnected = true;
  }
}

// Wrap Express app for serverless
const handler = serverless(app, {
  binary: ['image/*', 'application/pdf'],
});

export default async function (req: VercelRequest, res: VercelResponse) {
  // Ensure database connection
  await ensurePrismaConnection();
  
  // Run the Express handler
  return handler(req, res);
}
