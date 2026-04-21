const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  // Delete all PENDING and FAILED payments so student can retry
  const deleted = await prisma.semesterPayment.deleteMany({
    where: {
      status: { in: ['PENDING', 'FAILED'] },
    },
  });

  console.log(`Deleted ${deleted.count} pending/failed payments`);

  // Show remaining payments
  const remaining = await prisma.semesterPayment.findMany({
    include: {
      student: { select: { fullName: true, email: true } },
      semester: { select: { name: true } },
    },
  });

  console.log('\nRemaining payments:');
  remaining.forEach(p => {
    console.log(`  ${p.student.fullName} -> ${p.semester.name} - ${p.status} (ETB ${p.amount}) txRef: ${p.txRef}`);
  });

  await prisma.$disconnect();
}

cleanup();
