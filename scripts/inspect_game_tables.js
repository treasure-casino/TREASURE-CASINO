const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

(async () => {
  const tables = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('games','users','demo_wallets','demo_game_rounds','game_sessions')`
  );
  console.log(tables);
  const cols = await prisma.$queryRawUnsafe(
    `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, CHARACTER_SET_NAME, COLLATION_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('games','users') AND COLUMN_NAME = 'id'`
  );
  console.log(cols);
  const v = await prisma.$queryRawUnsafe('SELECT VERSION() AS v');
  console.log(v);
  await prisma.$disconnect();
})().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });

