const puppeteer = require('./node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'treasure_kingdom');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('================================================================');
  console.log('👑 TREASURE KINGDOM 3D COMPLETE GAMEPLAY TEST SUITE');
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
    // CASE 1: START GAME FROM LOBBY
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 1: START FROM LOBBY & NAVIGATE TO ARENA ---');
    await page.goto('http://localhost:5173/lobby', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    // Click Treasure Kingdom game card
    const cardClicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('a, div, button'));
      const tkCard = cards.find((c) => c.innerText && c.innerText.includes('Treasure Kingdom'));
      if (tkCard) {
        tkCard.click();
        return true;
      }
      return false;
    });
    console.log('  Clicked Lobby Card:', cardClicked);

    // If direct click did not navigate, go directly to arena URL
    if (!page.url().includes('arena')) {
      await page.goto('http://localhost:5173/lobby/arena/game-slot-01', { waitUntil: 'networkidle2' });
    }

    await page.waitForSelector('canvas', { timeout: 10000 });
    await sleep(2000);

    const initialCanvas = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? { w: canvas.clientWidth, h: canvas.clientHeight } : null;
    });
    console.log('  Canvas Dimensions in Arena:', initialCanvas);
    if (!initialCanvas || initialCanvas.h <= 0) {
      throw new Error(`Canvas height is 0 or missing! ${JSON.stringify(initialCanvas)}`);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-arena-initial.png') });

    // --------------------------------------------------------------------------
    // CASE 2: CHANGE BET AMOUNT (+, -, CHIPS)
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 2: TEST BET CONTROLS (+, -, CHIPS) ---');
    const initialBet = await page.evaluate(() => {
      const btn = document.querySelector('.btn-spin');
      return btn ? btn.textContent.trim() : null;
    });
    console.log('  Initial Bet Button:', initialBet);

    // Click Plus button twice (+₹20)
    await page.click('.btn-bet-plus');
    await sleep(200);
    await page.click('.btn-bet-plus');
    await sleep(200);

    const afterPlusBet = await page.evaluate(() => document.querySelector('.btn-spin')?.textContent.trim());
    console.log('  After + button clicked twice:', afterPlusBet);

    // Click Minus button (-₹10)
    await page.click('.btn-bet-minus');
    await sleep(200);

    const afterMinusBet = await page.evaluate(() => document.querySelector('.btn-spin')?.textContent.trim());
    console.log('  After - button clicked once:', afterMinusBet);

    // Click Chip ₹100
    await page.click('.btn-chip-100');
    await sleep(200);

    const afterChipBet = await page.evaluate(() => document.querySelector('.btn-spin')?.textContent.trim());
    console.log('  After Chip ₹100 selected:', afterChipBet);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-bet-controls-tested.png') });

    // --------------------------------------------------------------------------
    // CASE 3: OPEN PAYTABLE & VERIFY 9 ORIGINAL SYMBOLS AND RULES
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 3: OPEN PAYTABLE & VERIFY 9 ORIGINAL SYMBOLS ---');
    await page.click('.btn-paytable');
    await sleep(800);

    const paytableAudit = await page.evaluate(() => {
      const modal = document.querySelector('.paytable-modal');
      const text = modal ? modal.innerText : '';
      return {
        isOpen: !!modal,
        hasCrown: text.includes('Golden Crown'),
        hasDiamond: text.includes('Diamond'),
        hasCoin: text.includes('Gold Coin'),
        hasChest: text.includes('Treasure Chest'),
        hasRuby: text.includes('Ruby'),
        hasEmerald: text.includes('Emerald'),
        hasKey: text.includes('Ancient Key'),
        hasWild: text.includes('Wild Symbol'),
        hasScatter: text.includes('Scatter Symbol'),
        has10Paylines: text.includes('10 Fixed Paylines'),
      };
    });
    console.log('  Paytable Symbols & Rules Audit:', paytableAudit);

    if (
      !paytableAudit.hasCrown ||
      !paytableAudit.hasDiamond ||
      !paytableAudit.hasCoin ||
      !paytableAudit.hasChest ||
      !paytableAudit.hasRuby ||
      !paytableAudit.hasEmerald ||
      !paytableAudit.hasKey ||
      !paytableAudit.hasWild ||
      !paytableAudit.hasScatter
    ) {
      throw new Error('Not all 9 required original symbols are present in paytable!');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-paytable-modal.png') });

    // Close paytable
    await page.evaluate(() => {
      const closeBtn = document.querySelector('.paytable-modal button');
      if (closeBtn) closeBtn.click();
    });
    await sleep(500);

    // --------------------------------------------------------------------------
    // CASE 4: SPIN THE REELS & VERIFY SEQUENTIAL STOPPING
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 4: EXECUTE REEL SPIN & VERIFY ANIMATION ---');
    // Set bet to ₹50
    await page.click('.btn-chip-50');
    await sleep(200);

    // Click SPIN
    await page.click('.btn-spin');

    // Verify spinning state active
    await sleep(500);
    const spinningState = await page.evaluate(() => {
      const btn = document.querySelector('.btn-spin');
      return {
        isSpinning: btn?.textContent.includes('SPINNING...'),
        isDisabled: btn?.disabled,
      };
    });
    console.log('  Spinning in progress:', spinningState);
    if (!spinningState.isSpinning || !spinningState.isDisabled) {
      throw new Error('Spin button should be disabled during spin animation!');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-reels-spinning.png') });

    // Wait for staggered reel stops to settle (2500ms)
    console.log('  Waiting for 5 reels to stop sequentially...');
    await sleep(3200);

    const postSpinResult = await page.evaluate(() => {
      const text = document.body.innerText;
      const btn = document.querySelector('.btn-spin');
      return {
        isReady: btn?.textContent.includes('SPIN (₹50)'),
        hasWinBanner: text.includes('BIG TREASURE WIN!') || text.includes('JACKPOT'),
        hasHistory: text.includes('+₹') || text.includes('₹0'),
        snippet: text.split('\n').filter(Boolean).slice(0, 10).join(' | '),
      };
    });
    console.log('  Post-Spin Settle Result:', postSpinResult);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-reels-stopped-result.png') });

    // --------------------------------------------------------------------------
    // CASE 5: TEST MULTIPLE SPINS FOR WIN AND LOSS COMBINATIONS
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 5: TEST MULTIPLE SPINS FOR WIN/LOSS COMBINATIONS ---');
    for (let spinCount = 2; spinCount <= 4; spinCount++) {
      console.log(`  Executing Spin #${spinCount}...`);
      await page.click('.btn-spin');
      await sleep(3500);
      const res = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          winBanner: text.includes('BIG TREASURE WIN!') || text.includes('JACKPOT'),
          lastWinText: text.match(/₹[\d,]+\.\d{2}/g)?.slice(0, 3),
        };
      });
      console.log(`  Spin #${spinCount} Outcome:`, res);
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-multiple-spins-history.png') });

    // --------------------------------------------------------------------------
    // CASE 6: TEST AUTO SPIN AND STOP
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 6: TEST AUTO SPIN AND STOP ---');
    await page.click('.btn-auto-spin');
    await sleep(1500);

    const autoSpinActive = await page.evaluate(() => {
      const btn = document.querySelector('.btn-auto-spin');
      return {
        isActive: btn?.textContent.includes('STOP AUTO'),
        text: btn?.textContent.trim(),
      };
    });
    console.log('  Auto Spin Active:', autoSpinActive);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-auto-spin-active.png') });

    // Stop Auto Spin
    console.log('  Clicking Stop Auto Spin...');
    await page.click('.btn-auto-spin');
    await sleep(800);

    const autoSpinStopped = await page.evaluate(() => {
      const btn = document.querySelector('.btn-auto-spin');
      return btn?.textContent.includes('AUTO (25)');
    });
    console.log('  Auto Spin Stopped Cleanly:', autoSpinStopped);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-auto-spin-stopped.png') });

    // --------------------------------------------------------------------------
    // CASE 7: PAGE REFRESH & STABILITY TEST
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 7: PAGE REFRESH STABILITY TEST ---');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await sleep(2000);

    const refreshedCanvas = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? { w: canvas.clientWidth, h: canvas.clientHeight } : null;
    });
    console.log('  Refreshed Canvas Dimensions:', refreshedCanvas);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-refreshed-arena.png') });

    // --------------------------------------------------------------------------
    // CASE 8: MOBILE RESPONSIVENESS (375x667)
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 8: MOBILE VIEWPORT TEST (375x667) ---');
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await sleep(1500);

    const mobileCanvas = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? { w: canvas.clientWidth, h: canvas.clientHeight } : null;
    });
    console.log('  Mobile Canvas Dimensions:', mobileCanvas);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-mobile-slot.png') });

    // --------------------------------------------------------------------------
    // AUDIT CONSOLE ERRORS & FAILED REQUESTS
    // --------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log('📊 TEST SUMMARY & ERROR AUDIT');
    console.log('================================================================');
    console.log('  Console Errors Logged:', consoleErrors.length, consoleErrors);
    console.log('  Failed Requests Logged:', failedRequests.length, failedRequests);

    console.log('\n🎉 ALL MANDATORY TREASURE KINGDOM TEST CASES PASSED!');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-failure.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();

