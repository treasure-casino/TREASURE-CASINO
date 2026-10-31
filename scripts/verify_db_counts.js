const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.count();
  const wallets = await prisma.wallet.count();
  const transactions = await prisma.walletTransaction.count();
  const deposits = await prisma.deposit.count();
  const demoWallets = await prisma.demoWallet.count();
  const demoRounds = await prisma.demoGameRound.count();
  console.log('DB_COUNTS_RESULT:', JSON.stringify({ users, wallets, transactions, deposits, demoWallets, demoRounds }));
  await prisma.$disconnect();
}

check().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
