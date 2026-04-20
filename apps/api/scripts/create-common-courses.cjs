const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createCommonCourses() {
  const commonCourses = [
    {
      title: 'Physical Education',
      code: 'PE101',
      description: 'Physical fitness, sports, and health education',
      stream: null, // Common course for all streams
      creditHours: 1,
      ectsCredits: 2
    },
    {
      title: 'Information Technology Fundamentals',
      code: 'IT101',
      description: 'Basic computer skills and digital literacy',
      stream: null,
      creditHours: 2,
      ectsCredits: 3
    },
    {
      title: 'Ethiopian Languages and Culture',
      code: 'ETH101',
      description: 'Ethiopian languages, culture, and heritage',
      stream: null,
      creditHours: 2,
      ectsCredits: 3
    },
    {
      title: 'Research Methodology',
      code: 'RES101',
      description: 'Academic research skills and methodology',
      stream: null,
      creditHours: 2,
      ectsCredits: 3
    }
  ];

  console.log('Creating Common courses (available to all streams)...');
  
  for (const course of commonCourses) {
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

  console.log('\nCommon courses creation completed!');
}

createCommonCourses()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
