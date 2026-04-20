const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function restoreUsers() {
  console.log('🔄 Restoring essential user accounts...\n');
  
  try {
    await prisma.$connect();
    
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@lucy.edu' },
      update: {},
      create: {
        email: 'admin@lucy.edu',
        fullName: 'System Administrator',
        role: 'ADMIN',
        passwordHash: adminPassword,
        isApproved: true
      }
    });
    
    console.log(`✅ Admin user created: ${admin.fullName} (${admin.email})`);
    
    // Create sample teacher
    const teacherPassword = await bcrypt.hash('teacher123', 10);
    const teacher = await prisma.user.upsert({
      where: { email: 'teacher@lucy.edu' },
      update: {},
      create: {
        email: 'teacher@lucy.edu',
        fullName: 'Sample Teacher',
        role: 'TEACHER',
        passwordHash: teacherPassword,
        isApproved: true
      }
    });
    
    console.log(`✅ Teacher user created: ${teacher.fullName} (${teacher.email})`);
    
    // Create sample student
    const studentPassword = await bcrypt.hash('student123', 10);
    const student = await prisma.user.upsert({
      where: { email: 'student@lucy.edu' },
      update: {},
      create: {
        email: 'student@lucy.edu',
        fullName: 'Sample Student',
        role: 'STUDENT',
        passwordHash: studentPassword,
        isApproved: true
      }
    });
    
    console.log(`✅ Student user created: ${student.fullName} (${student.email})`);
    
    // Create student profile for the sample student
    const studentProfile = await prisma.studentProfile.upsert({
      where: { userId: student.id },
      update: {},
      create: {
        userId: student.id,
        status: 'APPROVED',
        firstName: 'Sample',
        fatherName: 'Student',
        grandFatherName: 'User',
        stream: 'Natural Science', // You can change this to 'Social Science' for testing
        entryYear: 2024,
        sponsorCategory: 'Self',
        gender: 'Male',
        phone: '+251911000000'
      }
    });
    
    console.log(`✅ Student profile created for ${student.fullName}`);
    
    console.log('\n🎉 User accounts restored successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('  Admin: admin@lucy.edu / admin123');
    console.log('  Teacher: teacher@lucy.edu / teacher123');
    console.log('  Student: student@lucy.edu / student123');
    
  } catch (error) {
    console.error('❌ Error restoring users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

restoreUsers();
