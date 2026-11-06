const puppeteer = require('./node_modules/puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 4192;

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

  const viewports = [
    { name: '360x800 (Mobile)', width: 360, height: 800 },
    { name: '1440x900 (Desktop)', width: 1440, height: 900 },
  ];

  console.log('\n================================================================');
  console.log('🚀 VERIFYING SKY ROCKET: SINGLE 10s COUNTDOWN & NO 3s DUPLICATE');
  console.log('================================================================\n');

  let allPassed = true;

  for (const vp of viewports) {
    console.log(`▶ Testing Viewport: ${vp.name}`);
    const page = await browser.newPage();
    await page.setViewport(vp);

    await page.goto(`http://localhost:${PORT}/play/game-crash-01`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.countdown-number', { timeout: 8000 });

    // 1. Check countdown overlay existence and initial value
    const countdownInfo = await page.evaluate(() => {
      const countdownEls = document.querySelectorAll('.countdown-number');
      const text = countdownEls.length > 0 ? countdownEls[0].innerText.trim() : null;
      const countOverlays = document.querySelectorAll('.next-round-countdown-overlay').length;
      const textContent = document.body.innerText;
      const hasIgnitionCountdown = textContent.includes('IGNITION IN') || textContent.includes('LAUNCHING IN 3s');

      return {
        countOverlays,
        countdownValue: parseInt(text, 10),
        hasIgnitionCountdown,
        hasDuplicateTimers: countdownEls.length > 1,
      };
    });

    console.log(`  Initial 10s Countdown Value: ${countdownInfo.countdownValue}s (expected <= 10)`);
    console.log(`  Count of Overlays: ${countdownInfo.countOverlays} (expected: 1)`);
    console.log(`  Has Duplicate Timers: ${countdownInfo.hasDuplicateTimers ? '❌ YES' : '✅ NO'}`);
    console.log(`  Has "IGNITION IN" / 3s Countdown: ${countdownInfo.hasIgnitionCountdown ? '❌ YES' : '✅ NO'}`);

    if (
      countdownInfo.countOverlays !== 1 ||
      countdownInfo.hasDuplicateTimers ||
      countdownInfo.hasIgnitionCountdown ||
      countdownInfo.countdownValue > 10 ||
      countdownInfo.countdownValue < 1
    ) {
      allPassed = false;
    }

    // 2. Track countdown over 3 seconds and ensure it decrements smoothly towards 0
    await sleep(2000);

    const decrementedVal = await page.evaluate(() => {
      const el = document.querySelector('.countdown-number');
      const textContent = document.body.innerText;
      return {
        val: el ? parseInt(el.innerText.trim(), 10) : null,
        hasIgnitionCountdown: textContent.includes('IGNITION IN'),
      };
    });

    console.log(`  After 2s, Countdown Value: ${decrementedVal.val}s`);
    console.log(`  Has "IGNITION IN": ${decrementedVal.hasIgnitionCountdown ? '❌ YES' : '✅ NO'}`);

    if (decrementedVal.val >= countdownInfo.countdownValue || decrementedVal.hasIgnitionCountdown) {
      allPassed = false;
    }

    await page.close();
  }

  await browser.close();
  server.close();

  console.log('\n================================================================');
  console.log(allPassed ? '🎉 VERIFICATION PASSED: Only 10s countdown is active, 3s countdown completely removed!' : '❌ VERIFICATION FAILED');
  console.log('================================================================\n');

  process.exit(allPassed ? 0 : 1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
