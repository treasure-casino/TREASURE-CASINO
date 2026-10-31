const puppeteer = require('./node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_kingdom_symbols_screenshots'
);
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('================================================================');
  console.log('👑 TREASURE KINGDOM – 15 VISIBLE SYMBOLS & GAMEPLAY TEST');
  console.log('================================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

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
    // STEP 1: OPEN GAME ARENA
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 1: NAVIGATING TO TREASURE KINGDOM ARENA ---');
    await page.goto('http://localhost:5173/lobby/arena/game-slot-01', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(2500);

    // --------------------------------------------------------------------------
    // STEP 2: VERIFY ALL 15 REEL POSITIONS DISPLAY SYMBOLS BEFORE SPINNING
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 2: VERIFYING 15 VISIBLE SYMBOLS BEFORE SPINNING ---');
    const symbolCardsInfo = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.slot-grid-frame .reel-column .symbol-card'));
      return cards.map((c) => ({
        icon: c.querySelector('span')?.innerText?.trim() || '',
        badge: c.querySelector('.font-cinzel')?.innerText?.trim() || '',
        text: c.innerText.replace(/\s+/g, ' ').trim(),
      }));
    });

    console.log(`  Total Visible Symbol Cards in 5x3 Grid: ${symbolCardsInfo.length}`);
    symbolCardsInfo.forEach((info, idx) => {
      const col = idx % 5;
      const row = Math.floor(idx / 5);
      console.log(`    Cell [R${row}, C${col}]: ${info.icon} ${info.badge}`);
    });

    if (symbolCardsInfo.length !== 15) {
      throw new Error(`Expected 15 visible symbol cards, found ${symbolCardsInfo.length}`);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-initial-15-symbols-visible.png'),
    });
    console.log('  📸 Captured: 01-initial-15-symbols-visible.png');

    // --------------------------------------------------------------------------
    // STEP 3: VERIFY PAYTABLE MODAL & 9 ORIGINAL SYMBOLS
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 3: VERIFYING PAYTABLE MODAL & 9 ORIGINAL SYMBOLS ---');
    await page.click('.btn-paytable');
    await sleep(800);

    const paytableData = await page.evaluate(() => {
      const modal = document.querySelector('.paytable-modal');
      if (!modal) return null;
      const items = Array.from(modal.querySelectorAll('.grid > div'));
      return items.map((it) => it.innerText.replace(/\s+/g, ' ').trim());
    });

    console.log(`  Paytable Entries Found (${paytableData?.length}):`);
    paytableData?.forEach((p, i) => console.log(`    Symbol #${i + 1}: ${p}`));

    const requiredSymbols = [
      'Wild – Lightning',
      'Golden Crown',
      'Treasure Chest',
      'Diamond',
      'Ruby',
      'Emerald',
      'Gold Coin',
      'Ancient Key',
      'Scatter – Treasure Star',
    ];

    const allPresent = requiredSymbols.every((name) =>
      paytableData?.some((p) => p.toLowerCase().includes(name.toLowerCase()))
    );
    console.log(`  All 9 Original Symbols Present in Paytable: ${allPresent}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-paytable-9-symbols-match.png'),
    });
    console.log('  📸 Captured: 02-paytable-9-symbols-match.png');

    // Close Paytable Modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.btn-close-paytable');
      if (closeBtn) closeBtn.click();
    });
    await sleep(800);
    const isModalOpen = await page.evaluate(() => !!document.querySelector('.paytable-modal'));
    console.log(`  Paytable Modal Closed: ${!isModalOpen}`);

    // --------------------------------------------------------------------------
    // STEP 4: VERIFY BET ADJUSTMENTS
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 4: TESTING BET ADJUSTMENTS ---');
    await page.evaluate(() => {
      document.querySelector('.btn-chip-100')?.click();
    });
    await sleep(400);
    let spinBtnText = await page.evaluate(() => document.querySelector('.btn-spin')?.innerText || '');
    console.log(`  Spin Button after clicking ₹100: ${spinBtnText}`);

    await page.evaluate(() => {
      document.querySelector('.btn-bet-plus')?.click();
    });
    await sleep(400);
    spinBtnText = await page.evaluate(() => document.querySelector('.btn-spin')?.innerText || '');
    console.log(`  Spin Button after clicking +₹10: ${spinBtnText}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-bet-controls.png'),
    });
    console.log('  📸 Captured: 03-bet-controls.png');

    // --------------------------------------------------------------------------
    // STEP 5: TEST SPINNING WITH STAGGERED REEL STOPS & FINAL SYMBOLS
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 5: TESTING SPIN & STAGGERED REEL ANIMATION ---');
    await page.evaluate(() => document.querySelector('.btn-spin')?.click());
    await sleep(400);

    // Capture spinning state
    const isSpinningActive = await page.evaluate(() => {
      const btn = document.querySelector('.btn-spin');
      return btn?.innerText?.includes('SPINNING');
    });
    console.log(`  Reels Spinning Active: ${isSpinningActive}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-reels-spinning-vertical-blur.png'),
    });
    console.log('  📸 Captured: 04-reels-spinning-vertical-blur.png');

    // Wait for staggered stops (700ms, 1000ms, 1300ms, 1600ms, 1900ms) and settle at 2200ms
    await sleep(2500);

    const postSpinCards = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.slot-grid-frame .reel-column .symbol-card'));
      return cards.map((c) => ({
        icon: c.querySelector('span')?.innerText?.trim() || '',
        badge: c.querySelector('.font-cinzel')?.innerText?.trim() || '',
      }));
    });

    console.log(`  15 Symbols Visible After Spin Completed: ${postSpinCards.length === 15}`);
    postSpinCards.forEach((info, idx) => {
      const col = idx % 5;
      const row = Math.floor(idx / 5);
      console.log(`    Stopped Cell [R${row}, C${col}]: ${info.icon} ${info.badge}`);
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-spin-completed-15-symbols-locked.png'),
    });
    console.log('  📸 Captured: 05-spin-completed-15-symbols-locked.png');

    // --------------------------------------------------------------------------
    // STEP 6: PERFORM MULTIPLE SPINS TO VERIFY WIN HIGHLIGHTS & PAYLINES
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 6: PERFORMING SPINS FOR WIN HIGHLIGHT VERIFICATION ---');
    let winScreenshotTaken = false;

    for (let spinAttempt = 1; spinAttempt <= 6; spinAttempt++) {
      console.log(`  Executing Spin Attempt #${spinAttempt}...`);
      await page.evaluate(() => document.querySelector('.btn-spin')?.click());
      await sleep(2600);

      const winState = await page.evaluate(() => {
        const lastWinElem = document.querySelector('.slot-grid-frame + div, .animate-bounce');
        const winningCards = document.querySelectorAll('.symbol-card.ring-amber-400, .symbol-card.ring-pink-400');
        const polylines = document.querySelectorAll('.slot-grid-frame svg polyline');
        return {
          hasWinBanner: !!lastWinElem,
          winningCardsCount: winningCards.length,
          polylineCount: polylines.length,
        };
      });

      console.log(
        `    Attempt #${spinAttempt} Result: WinBanner=${winState.hasWinBanner}, WinningCards=${winState.winningCardsCount}, Paylines=${winState.polylineCount}`
      );

      if ((winState.winningCardsCount > 0 || winState.hasWinBanner) && !winScreenshotTaken) {
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, '06-win-highlight-paylines.png'),
        });
        console.log('  📸 Captured: 06-win-highlight-paylines.png');
        winScreenshotTaken = true;
      }
    }

    if (!winScreenshotTaken) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '06-win-highlight-paylines.png'),
      });
      console.log('  📸 Captured (baseline): 06-win-highlight-paylines.png');
    }

    // --------------------------------------------------------------------------
    // STEP 7: AUTO SPIN FUNCTIONALITY
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 7: TESTING AUTO SPIN ---');
    await page.evaluate(() => document.querySelector('.btn-auto-spin')?.click());
    await sleep(1500);

    const autoSpinActive = await page.evaluate(() => {
      const btn = document.querySelector('.btn-auto-spin');
      return btn?.innerText?.includes('STOP AUTO');
    });
    console.log(`  Auto Spin Running: ${autoSpinActive}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-auto-spin-active.png'),
    });
    console.log('  📸 Captured: 07-auto-spin-active.png');

    // Let it run for 1 auto round then stop
    await sleep(3000);
    await page.evaluate(() => document.querySelector('.btn-auto-spin')?.click());
    await sleep(500);

    const autoSpinStopped = await page.evaluate(() => {
      const btn = document.querySelector('.btn-auto-spin');
      return btn?.innerText?.includes('AUTO (25)');
    });
    console.log(`  Auto Spin Successfully Stopped: ${autoSpinStopped}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-auto-spin-stopped.png'),
    });
    console.log('  📸 Captured: 08-auto-spin-stopped.png');

    // --------------------------------------------------------------------------
    // STEP 8: RESPONSIVE MOBILE VIEWPORT (375 x 667)
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 8: TESTING RESPONSIVE MOBILE VIEWPORT ---');
    await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
    await sleep(1500);

    const mobileGridCheck = await page.evaluate(() => {
      const frame = document.querySelector('.slot-grid-frame');
      const cards = document.querySelectorAll('.slot-grid-frame .reel-column .symbol-card');
      return {
        frameVisible: !!frame,
        cardsCount: cards.length,
        frameWidth: frame?.clientWidth,
        viewportWidth: window.innerWidth,
      };
    });

    console.log(`  Mobile Grid Verified:`, mobileGridCheck);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-mobile-viewport-5x3-grid.png'),
    });
    console.log('  📸 Captured: 09-mobile-viewport-5x3-grid.png');

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
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, 'test-failure.png'),
    });
  } finally {
    await browser.close();
  }
})();

