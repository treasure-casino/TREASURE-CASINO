const { prisma } = require('../backend/dist/prisma');

async function main() {
  console.log('Creating spiral_rounds and spiral_events tables...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS spiral_rounds (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      bet_amount DECIMAL(18,2) NOT NULL,
      inner_position INT NOT NULL DEFAULT 1,
      middle_position INT NOT NULL DEFAULT 1,
      outer_position INT NOT NULL DEFAULT 1,
      total_multiplier DECIMAL(12,4) NOT NULL DEFAULT 7.9500,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      payout DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      half_cashout_amount DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      INDEX idx_spiral_rounds_user (user_id),
      INDEX idx_spiral_rounds_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS spiral_events (
      id VARCHAR(36) PRIMARY KEY,
      round_id VARCHAR(36) NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      inner_position INT NOT NULL,
      middle_position INT NOT NULL,
      outer_position INT NOT NULL,
      total_multiplier DECIMAL(12,4) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_spiral_events_round (round_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  const existingGame = await prisma.game.findUnique({
    where: { id: 'game-spiral-01' }
  });

  if (!existingGame) {
    const provider = await prisma.gameProvider.findFirst();
    if (provider) {
      await prisma.game.create({
        data: {
          id: 'game-spiral-01',
          name: 'Treasure Spiral',
          providerId: provider.id,
          category: 'CRASH',
          description: 'Original 3D Concentric Rotating Rings with Animal Symbols, 700x Bonus, and Half Cash Out.',
          rtp: 96.5,
          minBet: 10,
          maxBet: 5000,
          isActive: true,
          isPopular: true,
          isDemo: true,
        }
      });
      console.log('Seeded game-spiral-01 into games table.');
    }
  } else {
    console.log('game-spiral-01 already exists in games table.');
  }

  console.log('✅ spiral_rounds and spiral_events tables verified successfully!');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
