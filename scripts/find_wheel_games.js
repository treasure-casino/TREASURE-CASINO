const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const games = await prisma.game.findMany({
    where: {
      OR: [
        { name: { contains: 'wheel' } },
        { id: { contains: 'wheel' } },
        { category: 'WHEEL' },
        { id: 'game-arc-02' },
        { id: 'game-cas-01' },
      ],
    },
    select: { id: true, name: true, category: true, isFeatured: true, isActive: true },
  });
  console.log('Matching Wheel games in DB:');
  console.log(JSON.stringify(games, null, 2));

  const allCategories = await prisma.game.groupBy({
    by: ['category'],
    _count: { id: true },
  });
  console.log('\nAll categories count:');
  console.log(JSON.stringify(allCategories, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());

