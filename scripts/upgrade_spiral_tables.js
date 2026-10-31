const { prisma } = require('../backend/dist/prisma');

async function main() {
  console.log('Upgrading spiral_rounds and spiral_events tables for Full 3D & One Spin Click = One Bet...');

  const addColumnIfNotExists = async (table, colDef, colName) => {
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE ${table} ADD COLUMN ${colDef}`);
      console.log(`Added ${colName} to ${table}`);
    } catch (e) {
      if (e.message && e.message.includes('Duplicate column')) {
        // column already exists
      } else {
        console.warn(`Column check/add for ${colName}:`, e.message);
      }
    }
  };

  // Upgrades for spiral_events
  await addColumnIfNotExists('spiral_events', 'user_id VARCHAR(64) NULL', 'user_id');
  await addColumnIfNotExists('spiral_events', 'spin_number INT NOT NULL DEFAULT 1', 'spin_number');
  await addColumnIfNotExists('spiral_events', 'bet_amount DECIMAL(18,2) NOT NULL DEFAULT 100.00', 'bet_amount');
  await addColumnIfNotExists('spiral_events', 'inner_before INT NOT NULL DEFAULT 1', 'inner_before');
  await addColumnIfNotExists('spiral_events', 'middle_before INT NOT NULL DEFAULT 1', 'middle_before');
  await addColumnIfNotExists('spiral_events', 'outer_before INT NOT NULL DEFAULT 1', 'outer_before');
  await addColumnIfNotExists('spiral_events', 'inner_after INT NOT NULL DEFAULT 1', 'inner_after');
  await addColumnIfNotExists('spiral_events', 'middle_after INT NOT NULL DEFAULT 1', 'middle_after');
  await addColumnIfNotExists('spiral_events', 'outer_after INT NOT NULL DEFAULT 1', 'outer_after');
  await addColumnIfNotExists('spiral_events', 'mult_before DECIMAL(12,4) NOT NULL DEFAULT 7.9500', 'mult_before');
  await addColumnIfNotExists('spiral_events', 'mult_after DECIMAL(12,4) NOT NULL DEFAULT 7.9500', 'mult_after');
  await addColumnIfNotExists('spiral_events', 'bonus_type VARCHAR(32) NULL', 'bonus_type');
  await addColumnIfNotExists('spiral_events', 'bonus_amount DECIMAL(12,4) NOT NULL DEFAULT 0.0000', 'bonus_amount');
  await addColumnIfNotExists('spiral_events', 'payout DECIMAL(18,2) NOT NULL DEFAULT 0.00', 'payout');
  await addColumnIfNotExists('spiral_events', 'idempotency_key VARCHAR(64) NULL', 'idempotency_key');

  // Upgrades for spiral_rounds
  await addColumnIfNotExists('spiral_rounds', 'spin_count INT NOT NULL DEFAULT 0', 'spin_count');
  await addColumnIfNotExists('spiral_rounds', 'total_bonus_awarded DECIMAL(12,4) NOT NULL DEFAULT 0.0000', 'total_bonus_awarded');
  await addColumnIfNotExists('spiral_rounds', 'idempotency_key VARCHAR(64) NULL', 'idempotency_key');

  console.log('✅ Tables upgraded successfully.');
  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Upgrade script failed:', err);
  process.exit(1);
});

