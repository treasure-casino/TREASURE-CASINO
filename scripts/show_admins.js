const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function showAdmins() {
  const users = await prisma.adminUser.findMany();
  console.log('ADMIN USERS IN DATABASE:');
  console.log(users.map(u => ({ email: u.email, name: u.name, isActive: u.isActive })));
  await prisma.$disconnect();
}

showAdmins().catch(err => { console.error(err); process.exit(1); });

