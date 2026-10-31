const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function main() {
  const providers = await prisma.gameProvider.findMany();
  console.log('Providers in DB:', JSON.stringify(providers, null, 2));
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  prisma.$disconnect();
});

