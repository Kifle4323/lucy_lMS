import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@lucycollege.edu' },
    update: {},
    create: {
      email: 'admin@lucycollege.edu',
      passwordHash: adminPassword,
      fullName: 'System Admin',
      role: 'ADMIN',
      isApproved: true,
      isProfileComplete: true,
    },
  });
  console.log('Created admin user:', admin.email);

  // Create sample teacher
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@lucycollege.edu' },
    update: {},
    create: {
      email: 'teacher@lucycollege.edu',
      passwordHash: teacherPassword,
      fullName: 'John Teacher',
      role: 'TEACHER',
      isApproved: true,
      isProfileComplete: true,
    },
  });
  console.log('Created teacher user:', teacher.email);

  // Create sample student
  const studentPassword = await bcrypt.hash('student123', 10);
  const student = await prisma.user.upsert({
    where: { email: 'student@lucycollege.edu' },
    update: {},
    create: {
      email: 'student@lucycollege.edu',
      passwordHash: studentPassword,
      fullName: 'Jane Student',
      role: 'STUDENT',
      isApproved: true,
      isProfileComplete: true,
    },
  });
  console.log('Created student user:', student.email);

  // Create sample course
  const course = await prisma.course.upsert({
    where: { code: 'CS101' },
    update: {},
    create: {
      code: 'CS101',
      title: 'Introduction to Computer Science',
      description: 'Basic concepts of computer science and programming',
      creditHours: 3,
    },
  });
  console.log('Created course:', course.code);

  // Create sample academic year
  const academicYear = await prisma.academicYear.upsert({
    where: { name: '2024-2025' },
    update: {},
    create: {
      name: '2024-2025',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-08-31'),
      isActive: true,
    },
  });
  console.log('Created academic year:', academicYear.name);

  // Create sample semester
  const semester = await prisma.semester.upsert({
    where: { academicYearId_type: { academicYearId: academicYear.id, type: 'FALL' } },
    update: {},
    create: {
      academicYearId: academicYear.id,
      type: 'FALL',
      name: 'Fall 2024',
      startDate: new Date('2024-09-01'),
      endDate: new Date('2025-01-15'),
      registrationStart: new Date('2024-08-15'),
      registrationEnd: new Date('2024-08-31'),
      status: 'IN_PROGRESS',
      isCurrent: true,
    },
  });
  console.log('Created semester:', semester.name);

  console.log('\n=== Seed Complete ===');
  console.log('Admin login: admin@lucycollege.edu / admin123');
  console.log('Teacher login: teacher@lucycollege.edu / teacher123');
  console.log('Student login: student@lucycollege.edu / student123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
