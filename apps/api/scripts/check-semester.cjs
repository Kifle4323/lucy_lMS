const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSemester() {
  const semesters = await prisma.semester.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log('All semesters:');
  semesters.forEach(s => {
    const now = new Date();
    const start = s.addDropStart ? new Date(s.addDropStart) : null;
    const end = s.addDropEnd ? new Date(s.addDropEnd) : null;
    const inPeriod = start && end && now >= start && now <= end;
    console.log(`  ${s.name} | isCurrent: ${s.isCurrent} | status: ${s.status}`);
    console.log(`    addDropStart: ${s.addDropStart} | addDropEnd: ${s.addDropEnd}`);
    console.log(`    Currently in add/drop period: ${inPeriod}`);
  });

  await prisma.$disconnect();
}

checkSemester();
