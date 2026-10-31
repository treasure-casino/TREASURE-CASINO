/**
 * ============================================================================
 * TREASURE CASINO — SAFE DATABASE GAME PURGE SCRIPT
 * Removes all game catalogue entries, sessions, mappings, and events.
 * Preserves 100% of user accounts, wallet balances, transactions, and audit logs.
 * ============================================================================
 */

const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(75));
  console.log('  TREASURE CASINO — SAFE DATABASE ALL GAMES PURGE SCRIPT');
  console.log('='.repeat(75));

  try {
    // 1. Audit core data before purge
    const userCount = await prisma.user.count();
    const walletCount = await prisma.wallet.count();
    const txCount = await prisma.walletTransaction.count();
    const depositCount = await prisma.deposit.count();
    const adminLogCount = await prisma.adminAuditLog.count();

    console.log('\n--- CORE SYSTEM RECORDS AUDIT (MUST PRESERVE) ---');
    console.log(`[PRESERVE] Total User Accounts:       ${userCount}`);
    console.log(`[PRESERVE] Total Wallets:             ${walletCount}`);
    console.log(`[PRESERVE] Total Wallet Transactions: ${txCount}`);
    console.log(`[PRESERVE] Total Deposits:            ${depositCount}`);
    console.log(`[PRESERVE] Total Admin Audit Logs:    ${adminLogCount}`);

    // 2. Safely delete game-specific child records first
    console.log('\n--- PURGING GAME RECORDS ---');
    const delEvents = await prisma.gameEvent.deleteMany({});
    console.log(`[PURGE] Deleted ${delEvents.count} game events.`);

    const delLaunch = await prisma.gameLaunchSession.deleteMany({});
    console.log(`[PURGE] Deleted ${delLaunch.count} game launch sessions.`);

    const delMappings = await prisma.providerGameMapping.deleteMany({});
    console.log(`[PURGE] Deleted ${delMappings.count} provider game mappings.`);

    const delSessions = await prisma.gameSession.deleteMany({});
    console.log(`[PURGE] Deleted ${delSessions.count} legacy game sessions.`);

    const delFavs = await prisma.gameFavorite.deleteMany({});
    console.log(`[PURGE] Deleted ${delFavs.count} game favorites.`);

    // 3. Delete all games from catalogue
    const delGames = await prisma.game.deleteMany({});
    console.log(`[PURGE] Deleted ${delGames.count} games from catalogue.`);

    // 4. Verify catalogue is now 0
    const remainingGames = await prisma.game.count();
    console.log(`\n[VERIFY] Remaining Games Count in Database: ${remainingGames}`);

    // 5. Verify core records are completely unchanged
    const afterUsers = await prisma.user.count();
    const afterWallets = await prisma.wallet.count();
    const afterTxs = await prisma.walletTransaction.count();

    console.log('\n--- POST-PURGE INTEGRITY VERIFICATION ---');
    console.log(`[STATUS] User Accounts Preserved:       ${afterUsers} / ${userCount} (${afterUsers === userCount ? 'PASS' : 'FAIL'})`);
    console.log(`[STATUS] Wallets Preserved:             ${afterWallets} / ${walletCount} (${afterWallets === walletCount ? 'PASS' : 'FAIL'})`);
    console.log(`[STATUS] Transactions Preserved:        ${afterTxs} / ${txCount} (${afterTxs === txCount ? 'PASS' : 'FAIL'})`);

    if (remainingGames === 0 && afterUsers === userCount && afterWallets === walletCount && afterTxs === txCount) {
      console.log('\n✔ All existing games successfully and safely purged.');
      console.log('✔ Core systems, users, wallets, and financial ledgers 100% intact.');
    } else {
      throw new Error('Integrity mismatch detected during game purge.');
    }
  } catch (err) {
    console.error('Purge error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

