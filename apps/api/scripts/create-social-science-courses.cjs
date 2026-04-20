const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createSocialScienceCourses() {
  const socialScienceCourses = [
    {
      title: 'Economics',
      code: 'ECO101',
      description: 'Introduction to economic principles, microeconomics and macroeconomics',
      stream: 'Social Science',
      creditHours: 3,
      ectsCredits: 5
    },
    {
      title: 'History',
      code: 'HIS101', 
      description: 'World history and historical analysis methods',
      stream: 'Social Science',
      creditHours: 3,
      ectsCredits: 5
    },
    {
      title: 'Geography',
      code: 'GEO101',
      description: 'Physical and human geography, spatial analysis',
      stream: 'Social Science', 
      creditHours: 3,
      ectsCredits: 5
    },
    {
      title: 'English Language',
      code: 'ENG101',
      description: 'English language skills, literature, and communication',
      stream: 'Social Science',
      creditHours: 4,
      ectsCredits: 6
    },
    {
      title: 'Civic Education',
      code: 'CIV101',
      description: 'Citizenship, government, and civic responsibilities',
      stream: 'Social Science',
      creditHours: 2,
      ectsCredits: 3
    },
    {
      title: 'Aptitude Development',
      code: 'APT101',
      description: 'Critical thinking, problem-solving, and aptitude skills',
      stream: 'Social Science',
      creditHours: 2,
      ectsCredits: 3
    }
  ];

  console.log('Creating Social Science courses...');
  
  for (const course of socialScienceCourses) {
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

  console.log('\nSocial Science courses creation completed!');
}

createSocialScienceCourses()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
