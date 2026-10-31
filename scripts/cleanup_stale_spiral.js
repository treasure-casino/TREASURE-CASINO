const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.demoGameRound.updateMany({
    where: { gameId: 'game-spiral-01', status: 'ACTIVE' },
    data: { status: 'WON', settledAt: new Date() },
  });
  console.log('Closed stale demoGameRound rows:', result.count);

  try {
    await prisma.$executeRawUnsafe(
      "UPDATE spiral_rounds SET status = 'WON', completed_at = NOW() WHERE status = 'ACTIVE'"
    );
    console.log('Updated spiral_rounds');
  } catch (err) {
    console.warn('spiral_rounds update warning:', err.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
