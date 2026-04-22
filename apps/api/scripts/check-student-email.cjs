const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const students = await prisma.user.findMany({
    where: { role: 'STUDENT' },
    select: { id: true, email: true, fullName: true },
  });

  students.forEach(s => {
    console.log(`  ${s.fullName} | email: "${s.email}" | id: ${s.id}`);
  });

  await prisma.$disconnect();
}

check();
