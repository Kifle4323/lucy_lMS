const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsers() {
  console.log('🔍 Checking user authentication data...\n');
  
  try {
    // Check if we can connect to database
    await prisma.$connect();
    console.log('✅ Database connection successful');
    
    // Count users
    const userCount = await prisma.user.count();
    console.log(`📊 Total users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log('❌ No users found in database!');
      return;
    }
    
    // Get sample users
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isApproved: true,
        createdAt: true
      }
    });
    
    console.log('\n👥 Sample users:');
    users.forEach(user => {
      console.log(`  • ${user.fullName} (${user.email}) - ${user.role} - Approved: ${user.isApproved}`);
    });
    
    // Check if there's an admin user
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true, email: true, fullName: true }
    });
    
    console.log(`\n👑 Admin users: ${adminUsers.length}`);
    adminUsers.forEach(admin => {
      console.log(`  • ${admin.fullName} (${admin.email})`);
    });
    
  } catch (error) {
    console.error('❌ Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
