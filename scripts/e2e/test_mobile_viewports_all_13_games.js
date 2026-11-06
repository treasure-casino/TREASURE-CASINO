const puppeteer = require('./node_modules/puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const GAME_IDS = [
  { id: 'game-slot-01', name: 'Treasure Kingdom' },
  { id: 'game-crash-01', name: 'Sky Rocket' },
  { id: 'game-mines-01', name: 'Crystal Mines' },
  { id: 'game-vortex-01', name: 'Treasure Vortex' },
  { id: 'game-spiral-01', name: 'Treasure Spiral' },
  { id: 'game-limbo-01', name: 'Treasure Limbo' },
  { id: 'game-dice-01', name: 'Treasure Dice' },
  { id: 'game-blackjack-01', name: 'Treasure Blackjack' },
  { id: 'game-plinko-01', name: 'Treasure Plinko' },
  { id: 'game-keno-01', name: 'Treasure Keno' },
  { id: 'game-hilo-01', name: 'Treasure Hilo' },
  { id: 'game-hotline-01', name: 'Treasure Hotline' },
  { id: 'game-chicken-run-01', name: 'Treasure Chicken Run' },
];

const VIEWPORTS = [
  { name: '320px Portrait', width: 320, height: 600 },
  { name: '360px Portrait', width: 360, height: 740 },
  { name: '375px Portrait', width: 375, height: 667 },
  { name: '390px Portrait', width: 390, height: 844 },
  { name: '414px Portrait', width: 414, height: 896 },
  { name: '430px Portrait', width: 430, height: 932 },
  { name: '740x360 Landscape', width: 740, height: 360 },
];

// Simple static server for admin/dist
function startStaticServer(distDir, port) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.json': 'application/json',
    '.woff2': 'font/woff2',
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(distDir, req.url.split('?')[0]);
    if (filePath.endsWith(path.sep) || !path.extname(filePath)) {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        // file as is
      } else {
        filePath = path.join(distDir, 'index.html');
      }
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    try {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch (e) {
      res.writeHead(500);
      res.end('Server error');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const PORT = 4173;
  const distDir = path.resolve(__dirname, '../../admin/dist');
  console.log('Serving from:', distDir);
  const server = await startStaticServer(distDir, PORT);
  console.log(`Static server running on http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });

  console.log('\n================================================================');
  console.log('📱 MOBILE RESPONSIVE VIEWPORT SUITE — ALL 13 GAMES AUDIT');
  console.log('================================================================\n');

  const allResults = [];

  for (const game of GAME_IDS) {
    console.log(`\n▶ TESTING: [${game.name}] (/arena/${game.id})`);
    const page = await browser.newPage();

    let gamePassed = true;
    const vpResults = [];

    for (const vp of VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
      await page.goto(`http://localhost:${PORT}/arena/${game.id}`, { waitUntil: 'domcontentloaded' });
      await sleep(400);

      const metrics = await page.evaluate(() => {
        const root = document.getElementById('root');
        const main = document.querySelector('main');
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const hasHorizontalScroll = scrollWidth > innerWidth + 1;

        // Check if any button exists
        const buttons = document.querySelectorAll('button');
        const hasButtons = buttons.length > 0;

        return {
          scrollWidth,
          innerWidth,
          hasHorizontalScroll,
          hasButtons,
          mainHeight: main ? main.clientHeight : 0,
        };
      });

      const passed = !metrics.hasHorizontalScroll;
      if (!passed) gamePassed = false;

      vpResults.push({
        viewport: vp.name,
        width: vp.width,
        scrollWidth: metrics.scrollWidth,
        hasHorizontalScroll: metrics.hasHorizontalScroll,
        status: passed ? 'PASSED' : 'FAILED',
      });

      console.log(`   ${passed ? '✓' : '✗'} ${vp.name.padEnd(18)} : Window=${metrics.innerWidth}px, Content=${metrics.scrollWidth}px, H-Scroll=${metrics.hasHorizontalScroll ? 'YES (OVERFLOW)' : 'NONE'}`);
    }

    allResults.push({
      game: game.name,
      gameId: game.id,
      passed: gamePassed,
      viewports: vpResults,
    });

    await page.close();
  }

  await browser.close();
  server.close();

  console.log('\n================================================================');
  console.log('📊 FINAL MOBILE VIEWPORT TEST SUMMARY');
  console.log('================================================================');
  let overallPass = true;
  for (const res of allResults) {
    const status = res.passed ? '✅ 100% RESPONSIVE' : '❌ FAILED';
    if (!res.passed) overallPass = false;
    console.log(`${res.game.padEnd(25)}: ${status}`);
  }
  console.log('================================================================');
  console.log(`OVERALL RESULT: ${overallPass ? 'ALL 13 GAMES PASSED!' : 'SOME GAMES HAD ISSUES'}`);

  if (!overallPass) {
    process.exit(1);
  } else {
    process.exit(0);
  }
})();
