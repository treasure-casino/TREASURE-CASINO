const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function createDemoTables() {
  console.log('Creating demo_wallets and demo_game_rounds tables in treasure_db...');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`demo_wallets\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`token_hash\` CHAR(64) NOT NULL,
      \`balance\` DECIMAL(18,2) NOT NULL DEFAULT 10000.00,
      \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`idx_demo_wallets_token_hash\` (\`token_hash\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`demo_game_rounds\` (
      \`id\` VARCHAR(36) NOT NULL,
      \`demo_wallet_id\` VARCHAR(36) NOT NULL,
      \`game_id\` VARCHAR(36) NOT NULL,
      \`engine\` VARCHAR(20) NOT NULL,
      \`status\` VARCHAR(20) NOT NULL,
      \`bet_amount\` DECIMAL(18,2) NOT NULL,
      \`payout\` DECIMAL(18,2) NOT NULL DEFAULT 0.00,
      \`multiplier\` DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
      \`balance_before\` DECIMAL(18,2) NOT NULL,
      \`balance_after\` DECIMAL(18,2) NULL,
      \`public_state\` TEXT NULL,
      \`secret_state\` TEXT NULL,
      \`commitment\` CHAR(64) NULL,
      \`started_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      \`settled_at\` DATETIME(3) NULL,
      PRIMARY KEY (\`id\`),
      KEY \`idx_demo_rounds_wallet_game_started\` (\`demo_wallet_id\`,\`game_id\`,\`started_at\`),
      KEY \`idx_demo_rounds_status\` (\`status\`),
      CONSTRAINT \`fk_demo_rounds_wallet\` FOREIGN KEY (\`demo_wallet_id\`) REFERENCES \`demo_wallets\` (\`id\`) ON DELETE CASCADE,
      CONSTRAINT \`fk_demo_rounds_game\` FOREIGN KEY (\`game_id\`) REFERENCES \`games\` (\`id\`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log('Tables created successfully.');
  await prisma.$disconnect();
}

createDemoTables().catch(async (e) => {
  console.error('Migration error:', e);
  await prisma.$disconnect();
  process.exit(1);
});

