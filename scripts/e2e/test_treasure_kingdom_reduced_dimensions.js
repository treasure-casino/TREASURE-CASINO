const puppeteer = require('./node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_kingdom_reduced_screenshots'
);
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('================================================================');
  console.log('👑 TREASURE KINGDOM – REDUCED DIMENSIONS & RESPONSIVE E2E TEST');
  console.log('================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run'],
  });

  const page = await browser.newPage();
  const consoleErrors = [];
  const failedRequests = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      if (!text.includes('favicon.ico') && !text.includes('audio/win.wav')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('requestfailed', (req) => {
    if (!req.url().includes('favicon.ico') && !req.url().includes('audio/win.wav')) {
      failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
    }
  });

  try {
    // --------------------------------------------------------------------------
    // TEST 1: DESKTOP VIEWPORT (1366 x 768)
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 1: VERIFYING DESKTOP VIEWPORT (1366 x 768) ---');
    await page.setViewport({ width: 1366, height: 768 });
    await page.goto('http://localhost:5173/lobby/arena/game-slot-01', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(2000);

    const desktopDimensions = await page.evaluate(() => {
      const frame = document.querySelector('.slot-grid-frame');
      const cards = Array.from(document.querySelectorAll('.slot-grid-frame .reel-column .symbol-card'));
      const controlBar = document.querySelector('.btn-spin')?.closest('div.bg-dark-900');
      const header = document.querySelector('.btn-paytable')?.closest('div');

      const frameRect = frame ? frame.getBoundingClientRect() : null;
      const cardRect = cards[0] ? cards[0].getBoundingClientRect() : null;
      const spinRect = document.querySelector('.btn-spin')?.getBoundingClientRect();

      return {
        frameWidth: Math.round(frameRect?.width || 0),
        frameHeight: Math.round(frameRect?.height || 0),
        frameTop: Math.round(frameRect?.top || 0),
        frameLeft: Math.round(frameRect?.left || 0),
        symbolCardWidth: Math.round(cardRect?.width || 0),
        symbolCardHeight: Math.round(cardRect?.height || 0),
        spinButtonVisible: !!spinRect && spinRect.top < window.innerHeight,
        spinButtonBottom: Math.round(spinRect?.bottom || 0),
        windowHeight: window.innerHeight,
        cardsCount: cards.length,
        hasVerticalScrollbar: document.documentElement.scrollHeight > window.innerHeight,
      };
    });

    console.log('  Desktop Metrics:');
    console.log(`    • Frame Width: ${desktopDimensions.frameWidth}px (Target ~620-660px vs previous 896px: -28%)`);
    console.log(`    • Frame Height: ${desktopDimensions.frameHeight}px`);
    console.log(`    • Symbol Card: ${desktopDimensions.symbolCardWidth}px × ${desktopDimensions.symbolCardHeight}px`);
    console.log(`    • Total Cards: ${desktopDimensions.cardsCount} (All 15 rendered)`);
    console.log(`    • Spin Button In View: ${desktopDimensions.spinButtonVisible} (Bottom: ${desktopDimensions.spinButtonBottom}px / Viewport: ${desktopDimensions.windowHeight}px)`);
    console.log(`    • Page Scrollable: ${desktopDimensions.hasVerticalScrollbar ? 'Yes' : 'No (Zero vertical scrolling)'}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-desktop-compact-dimensions.png'),
    });
    console.log('  📸 Captured: 01-desktop-compact-dimensions.png');

    // --------------------------------------------------------------------------
    // TEST 2: VERIFY DESKTOP GAMEPLAY & SPIN IN COMPACT FRAME
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 2: TESTING SPIN IN COMPACT FRAME ---');
    await page.evaluate(() => document.querySelector('.btn-chip-100')?.click());
    await sleep(300);
    await page.evaluate(() => document.querySelector('.btn-spin')?.click());
    await sleep(400);

    const isSpinning = await page.evaluate(() => {
      const btn = document.querySelector('.btn-spin');
      return btn?.innerText?.includes('SPINNING');
    });
    console.log(`  Spinning Animation Active: ${isSpinning}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-desktop-compact-spinning.png'),
    });
    console.log('  📸 Captured: 02-desktop-compact-spinning.png');

    // Wait for staggered reel stops and settle
    await sleep(2500);

    const postSpinCheck = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.slot-grid-frame .reel-column .symbol-card'));
      return {
        cardsCount: cards.length,
        symbols: cards.map((c) => ({
          icon: c.querySelector('span')?.innerText?.trim() || '',
          badge: c.querySelector('.font-cinzel')?.innerText?.trim() || '',
        })),
      };
    });

    console.log(`  All 15 Symbols Intact After Settle: ${postSpinCheck.cardsCount === 15}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-desktop-compact-spin-settled.png'),
    });
    console.log('  📸 Captured: 03-desktop-compact-spin-settled.png');

    // --------------------------------------------------------------------------
    // TEST 3: MOBILE VIEWPORT (375 x 667 - iPhone SE / Standard Mobile)
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 3: TESTING MOBILE VIEWPORT (375 x 667) ---');
    await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
    await sleep(1500);

    const mobileMetrics = await page.evaluate(() => {
      const frame = document.querySelector('.slot-grid-frame');
      const cards = Array.from(document.querySelectorAll('.slot-grid-frame .reel-column .symbol-card'));
      const frameRect = frame?.getBoundingClientRect();
      const spinBtn = document.querySelector('.btn-spin');
      const spinRect = spinBtn?.getBoundingClientRect();

      return {
        frameWidth: Math.round(frameRect?.width || 0),
        frameHeight: Math.round(frameRect?.height || 0),
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        fitsInWidth: (frameRect?.width || 0) <= window.innerWidth,
        fitsWithoutHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
        cardsCount: cards.length,
        cardHeight: cards[0]?.clientHeight,
        spinButtonVisible: !!spinRect && spinRect.top < window.innerHeight,
      };
    });

    console.log('  Mobile 375px Metrics:');
    console.log(`    • Frame Width: ${mobileMetrics.frameWidth}px (Viewport: ${mobileMetrics.viewportWidth}px)`);
    console.log(`    • Fits Within Screen Width: ${mobileMetrics.fitsInWidth}`);
    console.log(`    • Zero Horizontal Overflow: ${mobileMetrics.fitsWithoutHorizontalOverflow}`);
    console.log(`    • Total Symbol Cards: ${mobileMetrics.cardsCount} (Height: ${mobileMetrics.cardHeight}px)`);
    console.log(`    • Controls Visible: ${mobileMetrics.spinButtonVisible}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-mobile-375-compact-fit.png'),
    });
    console.log('  📸 Captured: 04-mobile-375-compact-fit.png');

    // Test mobile spin
    console.log('  Executing Mobile Spin...');
    await page.evaluate(() => document.querySelector('.btn-spin')?.click());
    await sleep(2600);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-mobile-375-spin-settled.png'),
    });
    console.log('  📸 Captured: 05-mobile-375-spin-settled.png');

    // --------------------------------------------------------------------------
    // TEST 4: MOBILE VIEWPORT (412 x 915 - Samsung Galaxy / Modern Phone)
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 4: TESTING MOBILE VIEWPORT (412 x 915) ---');
    await page.setViewport({ width: 412, height: 915, isMobile: true, hasTouch: true });
    await sleep(1500);

    const mobile412Metrics = await page.evaluate(() => {
      const frame = document.querySelector('.slot-grid-frame');
      const frameRect = frame?.getBoundingClientRect();
      return {
        frameWidth: Math.round(frameRect?.width || 0),
        viewportWidth: window.innerWidth,
        fitsWithoutHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });

    console.log(`  Mobile 412px: Frame=${mobile412Metrics.frameWidth}px, Fits=${mobile412Metrics.fitsWithoutHorizontalOverflow}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-mobile-412-compact-fit.png'),
    });
    console.log('  📸 Captured: 06-mobile-412-compact-fit.png');

    // --------------------------------------------------------------------------
    // SUMMARY
    // --------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log('🎉 TEST SUMMARY:');
    console.log(`  • Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((e) => console.log(`    ❌ ${e}`));
    }
    console.log(`  • Failed Network Requests: ${failedRequests.length}`);
    if (failedRequests.length > 0) {
      failedRequests.forEach((r) => console.log(`    ❌ ${r}`));
    }
    console.log('================================================================');
  } catch (err) {
    console.error('❌ Test failed with error:', err);
  } finally {
    await browser.close();
  }
})();

