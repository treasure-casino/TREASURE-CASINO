/**
 * ============================================================================
 * TREASURE CASINO — SAFE JILI REMOVAL DATABASE SCRIPT
 * Removes only JILI games, provider records, sessions, events, and mappings.
 * Preserves 100% of user accounts, wallets, and financial transactions.
 * ============================================================================
 */

const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('='.repeat(75));
  console.log('  TREASURE CASINO — REMOVING ALL JILI GAMES & INTEGRATION FROM DB');
  console.log('='.repeat(75));

  try {
    // 1. Audit core data before cleanup
    const userCount = await prisma.user.count();
    const walletCount = await prisma.wallet.count();
    const txCount = await prisma.walletTransaction.count();

    console.log('\n--- CORE LEDGER VERIFICATION BEFORE REMOVAL ---');
    console.log(`[PRESERVE] User Accounts:       ${userCount}`);
    console.log(`[PRESERVE] Player Wallets:      ${walletCount}`);
    console.log(`[PRESERVE] Wallet Transactions: ${txCount}`);

    // 2. Delete JILI Game Events
    const delEvents = await prisma.gameEvent.deleteMany({
      where: {
        OR: [
          { providerCode: 'JILI' },
          { gameId: { startsWith: 'jili-' } },
        ],
      },
    });
    console.log(`[CLEANUP] Deleted ${delEvents.count} JILI game events.`);

    // 3. Delete JILI Launch Sessions
    const delLaunch = await prisma.gameLaunchSession.deleteMany({
      where: {
        OR: [
          { providerCode: 'JILI' },
          { gameId: { startsWith: 'jili-' } },
        ],
      },
    });
    console.log(`[CLEANUP] Deleted ${delLaunch.count} JILI launch sessions.`);

    // 4. Delete JILI Provider Game Mappings
    const delMappings = await prisma.providerGameMapping.deleteMany({
      where: {
        OR: [
          { providerId: 'prov-jili' },
          { gameId: { startsWith: 'jili-' } },
          { providerGameId: { startsWith: 'JILI_' } },
        ],
      },
    });
    console.log(`[CLEANUP] Deleted ${delMappings.count} JILI provider game mappings.`);

    // 5. Delete JILI Games
    const delGames = await prisma.game.deleteMany({
      where: {
        OR: [
          { providerCode: 'JILI' },
          { id: { startsWith: 'jili-' } },
        ],
      },
    });
    console.log(`[CLEANUP] Deleted ${delGames.count} JILI games from catalogue.`);

    // 6. Delete JILI Provider
    const delProvider = await prisma.gameProvider.deleteMany({
      where: {
        OR: [
          { id: 'prov-jili' },
          { code: 'JILI' },
          { name: 'JILI Games' },
        ],
      },
    });
    console.log(`[CLEANUP] Deleted ${delProvider.count} JILI provider record(s).`);

    // 7. Verify counts after removal
    const remainingJiliGames = await prisma.game.count({
      where: {
        OR: [
          { providerCode: 'JILI' },
          { id: { startsWith: 'jili-' } },
        ],
      },
    });
    const totalRemainingGames = await prisma.game.count();
    const afterUsers = await prisma.user.count();
    const afterWallets = await prisma.wallet.count();
    const afterTxs = await prisma.walletTransaction.count();

    console.log('\n--- VERIFICATION AFTER REMOVAL ---');
    console.log(`Remaining JILI Games in DB: ${remainingJiliGames} (Expected: 0)`);
    console.log(`Total Games in DB:          ${totalRemainingGames}`);
    console.log(`User Accounts (Intact):     ${afterUsers} / ${userCount}`);
    console.log(`Player Wallets (Intact):    ${afterWallets} / ${walletCount}`);
    console.log(`Transactions (Intact):      ${afterTxs} / ${txCount}`);

    if (remainingJiliGames === 0 && afterUsers === userCount && afterWallets === walletCount && afterTxs === txCount) {
      console.log('\n✔ All JILI games and provider records successfully removed from database.');
      console.log('✔ Core systems, users, wallets, and financial ledgers 100% preserved.');
    } else {
      throw new Error('Integrity check failed during JILI database cleanup.');
    }
  } catch (err) {
    console.error('Error during cleanup:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

