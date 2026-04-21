const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Check student enrollments
  const enrollments = await prisma.studentEnrollment.findMany({
    include: {
      student: { select: { fullName: true, email: true } },
      courseSection: { include: { course: true, semester: true } },
    },
  });
  console.log(`Enrollments: ${enrollments.length}`);
  enrollments.forEach(e => {
    console.log(`  ${e.student.fullName} -> ${e.courseSection.course.title} (${e.courseSection.semester?.name || 'no semester'}) - ${e.status}`);
  });

  // Check class students
  const classStudents = await prisma.classStudent.findMany({
    include: {
      student: { select: { fullName: true, email: true } },
      class: { select: { name: true, code: true } },
    },
  });
  console.log(`\nClass assignments: ${classStudents.length}`);
  classStudents.forEach(cs => {
    console.log(`  ${cs.student.fullName} -> Class: ${cs.class.name} (${cs.class.code})`);
  });

  // Check course sections
  const sections = await prisma.courseSection.findMany({
    include: { course: true, semester: true, teacher: { select: { fullName: true } } },
  });
  console.log(`\nCourse sections: ${sections.length}`);
  sections.forEach(s => {
    console.log(`  ${s.course.title} - ${s.semester?.name || 'no semester'} - Teacher: ${s.teacher?.fullName || 'none'}`);
  });

  await prisma.$disconnect();
}

check();
