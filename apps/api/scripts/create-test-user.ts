import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'test@test.com';
  const password = 'password123';

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
    console.log('Test user already exists:', exists.email);
    console.log('Email:', email);
    console.log('Password:', password);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName: 'Test Admin',
      role: 'ADMIN',
      isApproved: true,
    },
  });

  console.log('Created test user:');
  console.log('Email:', email);
  console.log('Password:', password);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
