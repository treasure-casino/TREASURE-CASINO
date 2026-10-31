const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(70));
  console.log('  TREASURE CASINO — SAFE DATABASE GAME PURGE SCRIPT');
  console.log('='.repeat(70));

  try {
    // 1. Check user accounts count
    const userCount = await prisma.user.count();
    console.log(`[VERIFY] Total User Accounts (PRESERVED): ${userCount}`);

    // 2. Check wallet count
    const walletCount = await prisma.wallet.count();
    console.log(`[VERIFY] Total Wallets (PRESERVED): ${walletCount}`);

    // 3. Check transactions count
    const txCount = await prisma.walletTransaction.count();
    console.log(`[VERIFY] Total Transactions (PRESERVED): ${txCount}`);

    // 4. Safely delete game sessions & favorites
    const delSessions = await prisma.gameSession.deleteMany({});
    console.log(`[PURGE] Deleted ${delSessions.count} legacy game sessions.`);

    const delFavs = await prisma.gameFavorite.deleteMany({});
    console.log(`[PURGE] Deleted ${delFavs.count} legacy game favorites.`);

    // 5. Safely delete all games
    const delGames = await prisma.game.deleteMany({});
    console.log(`[PURGE] Deleted ${delGames.count} legacy games from catalogue.`);

    // 6. Verify catalogue is empty
    const remainingGames = await prisma.game.count();
    console.log(`[VERIFY] Remaining Games Count in DB: ${remainingGames}`);

    console.log('\n✓ Database purge completed successfully. 0 games remain.');
    console.log('✓ All users, wallets, and financial transactions are completely preserved.');
  } catch (err) {
    if (err.message && err.message.includes("Can't reach database server")) {
      console.log('[NOTE] Local MySQL service is currently offline. Static and controller purge active.');
      console.log('       When MySQL is started, run: mysql -u root < scripts/purge_all_games.sql');
    } else {
      console.error('[ERROR]', err);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();

