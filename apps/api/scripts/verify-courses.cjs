const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifyCourses() {
  console.log('📚 Verifying all courses in the database...\n');
  
  const courses = await prisma.course.findMany({
    orderBy: { stream: 'asc' }
  });

  const naturalScience = courses.filter(c => c.stream === 'Natural Science');
  const socialScience = courses.filter(c => c.stream === 'Social Science');
  const common = courses.filter(c => c.stream === null);

  console.log(`🔬 Natural Science Courses (${naturalScience.length}):`);
  naturalScience.forEach(course => {
    console.log(`  • ${course.title} (${course.code}) - ${course.creditHours} credits`);
  });

  console.log(`\n📖 Social Science Courses (${socialScience.length}):`);
  socialScience.forEach(course => {
    console.log(`  • ${course.title} (${course.code}) - ${course.creditHours} credits`);
  });

  console.log(`\n🌍 Common Courses (${common.length}):`);
  common.forEach(course => {
    console.log(`  • ${course.title} (${course.code}) - ${course.creditHours} credits`);
  });

  console.log(`\n✅ Total courses: ${courses.length}`);
  
  await prisma.$disconnect();
}

verifyCourses().catch(console.error);
