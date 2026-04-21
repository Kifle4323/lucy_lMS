const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEnrollment() {
  // Update the student's enrollment from DROPPED to ENROLLED
  const updated = await prisma.studentEnrollment.updateMany({
    where: {
      student: { email: 'student@lucy.edu' },
      status: 'DROPPED'
    },
    data: {
      status: 'ENROLLED'
    }
  });

  console.log(`Updated ${updated.count} enrollments from DROPPED to ENROLLED`);

  // Verify the fix
  const enrollments = await prisma.studentEnrollment.findMany({
    where: { student: { email: 'student@lucy.edu' } },
    include: {
      student: { select: { fullName: true, email: true } },
      courseSection: { include: { course: true, semester: true } },
    },
  });

  console.log('\nCurrent enrollments:');
  enrollments.forEach(e => {
    console.log(`  ${e.student.fullName} -> ${e.courseSection.course.title} (${e.courseSection.semester?.name || 'no semester'}) - ${e.status}`);
  });

  await prisma.$disconnect();
}

fixEnrollment();
