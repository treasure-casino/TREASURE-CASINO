const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding Treasure Vortex into Games Catalog...');

  const provider = await prisma.gameProvider.findUnique({
    where: { id: 'prov-inhouse' },
  });

  if (!provider) {
    throw new Error('In-house provider not found');
  }

  const vortexGame = await prisma.game.upsert({
    where: { id: 'game-vortex-01' },
    update: {
      name: 'Treasure Vortex',
      category: 'CRASH',
      description: 'Original 3D elemental vortex crash game with real-time continuous multipliers, fire, water, earth and lightning surges, and partial cashout features.',
      thumbnailUrl: '/assets/games/treasure-vortex-3d.png',
      rtp: 97.20,
      minBet: 10.00,
      maxBet: 5000.00,
      isPopular: true,
      isFeatured: true,
      isActive: true,
      isDemo: true,
      sortOrder: 4,
      providerId: provider.id,
      providerCode: 'IN_HOUSE',
    },
    create: {
      id: 'game-vortex-01',
      name: 'Treasure Vortex',
      category: 'CRASH',
      description: 'Original 3D elemental vortex crash game with real-time continuous multipliers, fire, water, earth and lightning surges, and partial cashout features.',
      thumbnailUrl: '/assets/games/treasure-vortex-3d.png',
      rtp: 97.20,
      minBet: 10.00,
      maxBet: 5000.00,
      isPopular: true,
      isFeatured: true,
      isActive: true,
      isDemo: true,
      sortOrder: 4,
      providerId: provider.id,
      providerCode: 'IN_HOUSE',
    },
  });

  console.log('✅ Treasure Vortex seeded successfully:', vortexGame.id, vortexGame.name);
  await prisma.$disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});

