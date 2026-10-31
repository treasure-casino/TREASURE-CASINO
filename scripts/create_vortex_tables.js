const { prisma } = require('../backend/dist/prisma');

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS vortex_rounds (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      bet DECIMAL(18,2) NOT NULL,
      balance_before DECIMAL(18,2) NOT NULL,
      balance_after DECIMAL(18,2) NULL,
      state VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      crash_point DECIMAL(12,4) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at DATETIME NULL,
      result VARCHAR(20) NULL,
      payout DECIMAL(18,2) DEFAULT 0.00,
      status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      INDEX idx_vortex_rounds_user (user_id),
      INDEX idx_vortex_rounds_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS vortex_events (
      id VARCHAR(36) PRIMARY KEY,
      round_id VARCHAR(36) NOT NULL,
      element VARCHAR(20) NOT NULL,
      old_multiplier DECIMAL(12,4) NOT NULL,
      new_multiplier DECIMAL(12,4) NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_vortex_events_round (round_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('Successfully created vortex_rounds and vortex_events tables');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

