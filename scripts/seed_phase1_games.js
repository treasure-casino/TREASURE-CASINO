const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function seedPhase1() {
  console.log('Seeding Phase 1 3D Games...');

  // 1. Ensure provider exists
  let provider = await prisma.gameProvider.findUnique({
    where: { id: 'prov-inhouse' },
  });

  if (!provider) {
    provider = await prisma.gameProvider.create({
      data: {
        id: 'prov-inhouse',
        name: 'Treasure In-House',
        code: 'IN_HOUSE',
        apiBaseUrl: 'http://localhost:5000',
        isActive: true,
      },
    });
  }

  console.log('Provider confirmed:', provider.name, provider.id);

  // 2. Seed the 3 Phase 1 Games
  const phase1Games = [
    {
      id: 'game-slot-01',
      name: 'Treasure Kingdom',
      category: 'SLOTS',
      description: '3D Aztec vault slot with dynamic cylindrical spinning reels, wild golden crowns, and 5 classic winning paylines.',
      thumbnailUrl: '/assets/games/treasure-kingdom-3d.png',
      rtp: 96.50,
      minBet: 10.00,
      maxBet: 5000.00,
      isPopular: true,
      isFeatured: true,
      isActive: true,
      isDemo: true,
      sortOrder: 1,
      providerId: provider.id,
      providerCode: 'IN_HOUSE',
    },
    {
      id: 'game-crash-01',
      name: 'Sky Rocket',
      category: 'CRASH',
      description: 'Original 3D cosmic crash flight with live rocket ascent, animated thruster fire, and exponential multipliers up to 100x.',
      thumbnailUrl: '/assets/games/sky-rocket-3d.png',
      rtp: 96.80,
      minBet: 10.00,
      maxBet: 5000.00,
      isPopular: true,
      isFeatured: true,
      isActive: true,
      isDemo: true,
      sortOrder: 2,
      providerId: provider.id,
      providerCode: 'IN_HOUSE',
    },
    {
      id: 'game-mines-01',
      name: 'Crystal Mines',
      category: 'MINES',
      description: 'Original 3D crystalline cavern runestone grid with configurable mine hazards, diamond discoveries, and cashout progression.',
      thumbnailUrl: '/assets/games/crystal-mines-3d.png',
      rtp: 97.00,
      minBet: 10.00,
      maxBet: 5000.00,
      isPopular: true,
      isFeatured: true,
      isActive: true,
      isDemo: true,
      sortOrder: 3,
      providerId: provider.id,
      providerCode: 'IN_HOUSE',
    },
  ];

  for (const g of phase1Games) {
    const seeded = await prisma.game.upsert({
      where: { id: g.id },
      update: {
        name: g.name,
        category: g.category,
        description: g.description,
        thumbnailUrl: g.thumbnailUrl,
        rtp: g.rtp,
        minBet: g.minBet,
        maxBet: g.maxBet,
        isPopular: g.isPopular,
        isFeatured: g.isFeatured,
        isActive: g.isActive,
        isDemo: g.isDemo,
        sortOrder: g.sortOrder,
        providerId: g.providerId,
        providerCode: g.providerCode,
      },
      create: g,
    });
    console.log(`✅ Seeded 3D Game: ${seeded.name} (${seeded.id}) - Category: ${seeded.category}`);
  }

  const count = await prisma.game.count();
  console.log(`Total games in database now: ${count}`);

  await prisma.$disconnect();
}

seedPhase1().catch(async (e) => {
  console.error('Failed to seed Phase 1 games:', e);
  await prisma.$disconnect();
  process.exit(1);
});
