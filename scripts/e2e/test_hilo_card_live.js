const puppeteer = require('./node_modules/puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 4188;

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

function startStaticServer() {
  const distDir = path.resolve(__dirname, '../../admin/dist');
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
      if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
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
    server.listen(PORT, () => resolve(server));
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

(async () => {
  const server = await startStaticServer();
  console.log(`Server running on http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox'],
  });

  const outDir = path.resolve(__dirname, '../../hilo_verified_screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('\n================================================================');
  console.log('🃏 AUDITING TREASURE HI-LO PLAYING CARDS ACROSS ALL 9 VIEWPORTS');
  console.log('================================================================\n');

  let allPassed = true;
  const auditResults = [];

  for (const vp of VIEWPORTS) {
    const page = await browser.newPage();
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: 2,
      isMobile: vp.width < 1000,
      hasTouch: vp.width < 1000,
    });

    await page.goto(`http://localhost:${PORT}/play/game-hilo-01`, { waitUntil: 'domcontentloaded' });

    // Wait for card arena elements to mount
    await page.waitForSelector('.perspective-1000', { timeout: 10000 });
    await sleep(200);

    // Initial check (Cards face-down with Treasure casino luxury back)
    const initialMetrics = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const vpW = window.innerWidth;
      const cards = Array.from(document.querySelectorAll('.perspective-1000')).map((c) => {
        const r = c.getBoundingClientRect();
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          ratio: (r.width / r.height).toFixed(3),
        };
      });
      return {
        hScroll: docW - vpW,
        cards,
      };
    });

    const card0 = initialMetrics.cards[0] || { w: 0, h: 0, ratio: 0 };
    const validInitial = card0.w >= 85 && card0.h >= 125 && initialMetrics.hScroll <= 1;

    // Capture screenshot
    const cleanVpName = vp.name.split(' ')[0];
    await page.screenshot({ path: path.join(outDir, `hilo-${cleanVpName}-initial.png`) });

    // Click START ROUND
    const clickedStart = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => x.textContent.includes('START ROUND'));
      if (b) {
        b.click();
        return true;
      }
      return false;
    });

    await sleep(1500);

    // Check Revealed Card
    const liveMetrics = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.perspective-1000')).map((c) => {
        const r = c.getBoundingClientRect();
        const text = c.innerText.replace(/\s+/g, ' ').trim();
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          ratio: (r.width / r.height).toFixed(3),
          text,
        };
      });
      return cards;
    });

    const activeBase = liveMetrics[0] || { w: 0, h: 0, text: '' };
    await page.screenshot({ path: path.join(outDir, `hilo-${cleanVpName}-live.png`) });

    const statusPass = validInitial;
    if (!statusPass) allPassed = false;

    auditResults.push({
      viewport: vp.name,
      width: card0.w,
      height: card0.h,
      aspectRatio: card0.ratio,
      hScroll: initialMetrics.hScroll,
      baseCardRevealed: activeBase.text.slice(0, 30),
      passed: statusPass,
    });

    console.log(
      `${statusPass ? '✅ PASS' : '❌ FAIL'} | ${vp.name.padEnd(35)} | Card: ${card0.w}x${card0.h} (${card0.ratio}) | H-Scroll: ${initialMetrics.hScroll}px | Base: ${activeBase.text || 'Face-Down'}`
    );

    await page.close();
  }

  await browser.close();
  server.close();

  console.log('\n================================================================');
  console.log(`📊 FINAL RESULT: ${allPassed ? 'ALL 9 VIEWPORTS PASSED!' : 'FAILURES DETECTED'}`);
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
