const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createNaturalScienceCourses() {
  const naturalScienceCourses = [
    {
      title: 'Physics',
      code: 'PHY101',
      description: 'Introduction to physics, mechanics, and thermodynamics',
      stream: 'Natural Science',
      creditHours: 4,
      ectsCredits: 6
    },
    {
      title: 'Chemistry',
      code: 'CHE101', 
      description: 'General chemistry, organic and inorganic chemistry',
      stream: 'Natural Science',
      creditHours: 4,
      ectsCredits: 6
    },
    {
      title: 'Biology',
      code: 'BIO101',
      description: 'Cell biology, genetics, and evolution',
      stream: 'Natural Science', 
      creditHours: 4,
      ectsCredits: 6
    },
    {
      title: 'Mathematics I',
      code: 'MAT101',
      description: 'Calculus, algebra, and mathematical analysis',
      stream: 'Natural Science',
      creditHours: 4,
      ectsCredits: 6
    },
    {
      title: 'Mathematics II',
      code: 'MAT102',
      description: 'Advanced calculus, linear algebra, and differential equations',
      stream: 'Natural Science',
      creditHours: 4,
      ectsCredits: 6
    },
    {
      title: 'Computer Science',
      code: 'CS101',
      description: 'Introduction to programming and computer science fundamentals',
      stream: 'Natural Science',
      creditHours: 3,
      ectsCredits: 5
    }
  ];

  console.log('Creating Natural Science courses...');
  
  for (const course of naturalScienceCourses) {
    try {
      const existing = await prisma.course.findUnique({
        where: { code: course.code }
      });

      if (existing) {
        console.log(`Course ${course.code} already exists, skipping...`);
        continue;
      }

      const created = await prisma.course.create({
        data: course
      });
      
      console.log(`✅ Created: ${created.title} (${created.code})`);
    } catch (error) {
      console.error(`❌ Error creating ${course.code}:`, error);
    }
  }

  console.log('\nNatural Science courses creation completed!');
}

createNaturalScienceCourses()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
