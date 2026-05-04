import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const users = [
    { email: 'teacher@lucy.edu', password: 'password123' },
    { email: 'admin@lucy.edu', password: 'password123' },
    { email: 'student1@lucy.edu', password: 'password123' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const updated = await prisma.user.updateMany({
      where: { email: u.email },
      data: { passwordHash: hash },
    });
    console.log(updated.count > 0 ? `✅ Reset password for ${u.email}` : `⚠️  User not found: ${u.email}`);
  }

  // Also ensure admin exists
  let admin = await prisma.user.findUnique({ where: { email: 'admin@lucy.edu' } });
  if (!admin) {
    const hash = await bcrypt.hash('password123', 10);
    admin = await prisma.user.create({
      data: { email: 'admin@lucy.edu', passwordHash: hash, fullName: 'Admin User', role: 'ADMIN', isApproved: true },
    });
    console.log('✅ Created admin:', admin.fullName);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
