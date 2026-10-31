const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('../backend/node_modules/@prisma/client');
const prisma = new PrismaClient();

async function checkImages() {
  const games = await prisma.game.findMany({ select: { id: true, name: true, thumbnailUrl: true } });
  let missing = 0;
  for (const g of games) {
    if (!g.thumbnailUrl) {
      console.log('Missing thumbnailUrl for ' + g.id);
      missing++;
      continue;
    }
    const cleanPath = g.thumbnailUrl.replace(/^\//, '');
    const fullPath = path.join(__dirname, '..', 'admin', 'public', cleanPath);
    if (!fs.existsSync(fullPath)) {
      console.log('File does not exist: ' + fullPath + ' for ' + g.id);
      missing++;
    }
  }
  console.log(`Total games checked: ${games.length}, Missing assets: ${missing}`);
  await prisma.$disconnect();
}
checkImages().catch(err => { console.error(err); process.exit(1); });

