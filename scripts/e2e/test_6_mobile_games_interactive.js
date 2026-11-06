const puppeteer = require('./node_modules/puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const TARGET_GAMES = [
  { id: 'game-mines-01', name: 'Crystal Mines' },
  { id: 'game-vortex-01', name: 'Treasure Vortex' },
  { id: 'game-plinko-01', name: 'Treasure Plinko' },
  { id: 'game-keno-01', name: 'Treasure Keno' },
  { id: 'game-hilo-01', name: 'Treasure Hi-Lo' },
  { id: 'game-chicken-run-01', name: 'Treasure Chicken Run' },
];

const VIEWPORTS = [
  { name: '320x568 (iPhone SE1 / Small)', width: 320, height: 568 },
  { name: '360x800 (Galaxy S20 / Android)', width: 360, height: 800 },
  { name: '375x812 (iPhone X/11 Pro)', width: 375, height: 812 },
  { name: '390x844 (iPhone 12/13/14)', width: 390, height: 844 },
  { name: '414x896 (iPhone XR/11)', width: 414, height: 896 },
  { name: '430x932 (iPhone 14/15/16 Pro Max)', width: 430, height: 932 },
  { name: '740x360 (Mobile Landscape)', width: 740, height: 360 },
  { name: '844x390 (Modern Mobile Landscape)', width: 844, height: 390 },
  { name: '1440x900 (Desktop Regression)', width: 1440, height: 900 },
];

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
    // Instant mock API responder so games load instantly without 404 delays
    if (req.url.startsWith('/api/games/')) {
      const gameId = req.url.split('/api/games/')[1]?.split('?')[0] || '';
      const matched = TARGET_GAMES.find((g) => g.id === gameId) || { name: 'Treasure Game', id: gameId };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          success: true,
          data: {
            id: matched.id,
            name: matched.name,
            category: 'ORIGINAL',
            isActive: true,
            minBet: 10,
            maxBet: 5000,
          },
        })
      );
      return;
    }

    let filePath = path.join(distDir, req.url.split('?')[0]);
    if (filePath.endsWith(path.sep) || !path.extname(filePath)) {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        // file
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
    } catch {
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
  const PORT = 4175;
  const distDir = path.resolve(__dirname, '../../admin/dist');
  const server = await startStaticServer(distDir, PORT);
  console.log(`Static preview server running on http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });

  console.log('\n================================================================');
  console.log('🧪 VERIFYING 6 MOBILE GAMES ACROSS ALL REQUESTED VIEWPORTS');
  console.log('================================================================\n');

  const suiteResults = [];

  for (const game of TARGET_GAMES) {
    console.log(`\n▶ [GAME AUDIT] ${game.name} (${game.id})`);
    console.log('----------------------------------------------------------------');

    for (const vp of VIEWPORTS) {
      const page = await browser.newPage();
      const consoleErrors = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.setViewport({
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 2, // HiDPI screen emulation
        isMobile: vp.width < 1000,
        hasTouch: vp.width < 1000,
      });

      const url = `http://localhost:${PORT}/play/${game.id}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

      // Wait for game arena to mount (loader vanishes and game buttons exist)
      try {
        await page.waitForFunction(
          () => {
            const hasBtns = document.querySelectorAll('button').length >= 3;
            const hasGame =
              document.querySelector('canvas') ||
              document.querySelector('[data-tile-index]') ||
              document.querySelector('.perspective-1000') ||
              document.querySelector('.vortex-stage');
            return hasBtns && hasGame;
          },
          { timeout: 8000 }
        );
      } catch {
        // Fallback sleep
        await sleep(1000);
      }

      await sleep(200);

      const metrics = await page.evaluate(() => {
        const docWidth = document.documentElement.scrollWidth;
        const vpWidth = window.innerWidth;
        const hasHScroll = docWidth > vpWidth + 1;

        // Check for canvas or main interactive board
        const canvas = document.querySelector('canvas');
        const canvasRect = canvas ? canvas.getBoundingClientRect() : null;

        // Check buttons
        const buttons = Array.from(document.querySelectorAll('button')).map((b) => {
          const r = b.getBoundingClientRect();
          return {
            text: b.innerText.trim().replace(/\n/g, ' '),
            width: Math.round(r.width),
            height: Math.round(r.height),
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            left: Math.round(r.left),
            right: Math.round(r.right),
            visible: r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight,
          };
        });

        const visibleButtons = buttons.filter((b) => b.visible);

        return {
          docWidth,
          vpWidth,
          hasHScroll,
          scrollDiff: docWidth - vpWidth,
          canvasDimensions: canvasRect
            ? { width: Math.round(canvasRect.width), height: Math.round(canvasRect.height) }
            : null,
          totalButtons: buttons.length,
          visibleButtonsCount: visibleButtons.length,
          buttonSamples: buttons.slice(0, 5).map((b) => b.text),
        };
      });

      const passed = !metrics.hasHScroll && metrics.totalButtons >= 3 && consoleErrors.length === 0;

      const res = {
        game: game.name,
        viewport: vp.name,
        passed,
        hScroll: metrics.hasHScroll,
        scrollDiff: metrics.scrollDiff,
        canvas: metrics.canvasDimensions,
        visibleButtons: metrics.visibleButtonsCount,
        errors: consoleErrors,
      };

      suiteResults.push(res);

      const statusIcon = passed ? '✅ PASS' : '❌ FAIL';
      console.log(
        `  ${statusIcon} | ${vp.name.padEnd(35)} | H-Scroll: ${metrics.hasHScroll ? 'YES (' + metrics.scrollDiff + 'px)' : '0px'} | Canvas: ${
          metrics.canvasDimensions ? metrics.canvasDimensions.width + 'x' + metrics.canvasDimensions.height : 'N/A'
        } | Buttons: ${metrics.visibleButtonsCount}`
      );

      if (consoleErrors.length > 0) {
        console.log(`       ⚠️ Console Errors:`, consoleErrors);
      }

      await page.close();
    }
  }

  await browser.close();
  server.close();

  const totalTests = suiteResults.length;
  const passedTests = suiteResults.filter((r) => r.passed).length;

  console.log('\n================================================================');
  console.log(`📊 FINAL SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL 6 TARGET GAMES PASSED ON EVERY VIEWPORT INCLUDING LANDSCAPE & DESKTOP!');
    process.exit(0);
  } else {
    console.error('⚠️ SOME VIEWPORT TESTS FAILED.');
    process.exit(1);
  }
})();
