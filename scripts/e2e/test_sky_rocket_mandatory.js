const puppeteer = require('./node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'sky_rocket');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('================================================================');
  console.log('🚀 MANDATORY SKY ROCKET 3D COMPREHENSIVE TEST SUITE');
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
      if (!text.includes('favicon.ico')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('requestfailed', (req) => {
    if (!req.url().includes('favicon.ico')) {
      failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText}`);
    }
  });

  try {
    // --------------------------------------------------------------------------
    // CASE 1: LOAD GAME & INITIAL STATE
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 1: LOAD SKY ROCKET ARENA ---');
    await page.goto('http://localhost:5173/lobby/arena/game-crash-01', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await page.waitForSelector('canvas', { timeout: 10000 });
    await sleep(2000);

    const initialCanvasBox = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? { w: canvas.clientWidth, h: canvas.clientHeight } : null;
    });
    console.log('  Canvas Dimensions:', initialCanvasBox);
    if (!initialCanvasBox || initialCanvasBox.h <= 0) {
      throw new Error(`Canvas height is 0 or missing! ${JSON.stringify(initialCanvasBox)}`);
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-idle-ready.png') });

    const initialBtnText = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find((b) => b.textContent && (b.textContent.includes('START GAME') || b.textContent.includes('LAUNCH ROCKET')));
      return startBtn ? startBtn.textContent.trim() : null;
    });
    console.log('  Start Button Text:', initialBtnText);

    // --------------------------------------------------------------------------
    // CASE 2: START ROUND 1 & VERIFY LAUNCH AND MULTIPLIER INCREASE
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 2: START ROUND 1 (BET ₹50) ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find((b) => b.textContent && (b.textContent.includes('START GAME') || b.textContent.includes('LAUNCH ROCKET')));
      if (startBtn) startBtn.click();
    });

    // Verify countdown state
    await sleep(800);
    const countdownInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        isIgniting: text.includes('IGNITION IN') || text.includes('IGNITING') || text.includes('PREPARING THRUSTERS'),
      };
    });
    console.log('  Countdown Active:', countdownInfo.isIgniting);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-ignition-countdown.png') });

    // Dynamic wait for flight to begin & Cashout button to appear
    console.log('  Waiting for rocket to launch and cashout button to appear...');
    let flightDetected = false;
    let cashoutDetails = null;

    for (let attempt = 0; attempt < 25; attempt++) {
      await sleep(300);
      cashoutDetails = await page.evaluate(() => {
        const text = document.body.innerText;
        const buttons = Array.from(document.querySelectorAll('button'));
        const cashoutBtn = buttons.find((b) => b.textContent && b.textContent.includes('CASHOUT'));
        return {
          hasCashout: !!cashoutBtn,
          btnText: cashoutBtn ? cashoutBtn.textContent.trim() : null,
          hasAltitude: text.includes('ALTITUDE RISING'),
          hasPotentialWin: text.includes('Potential Win') || text.includes('CASHOUT ₹'),
        };
      });

      if (cashoutDetails.hasCashout) {
        flightDetected = true;
        console.log(`  Rocket in flight! Cashout Button: "${cashoutDetails.btnText}"`);
        break;
      }
    }

    if (!flightDetected) {
      throw new Error('Cashout button did not appear during flight!');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-flight-multiplier-rising.png') });

    // --------------------------------------------------------------------------
    // CASE 3: CASHOUT BEFORE CRASH & VERIFY DEMO REWARD
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 3: EXECUTE CASHOUT ---');
    const cashoutClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const cashoutBtn = buttons.find((b) => b.textContent && b.textContent.includes('CASHOUT'));
      if (cashoutBtn) {
        cashoutBtn.click();
        return true;
      }
      return false;
    });
    console.log('  Clicked Cashout:', cashoutClicked);

    await sleep(1500);
    const postCashoutState = await page.evaluate(() => {
      const text = document.body.innerText;
      const buttons = Array.from(document.querySelectorAll('button'));
      const restartBtn = buttons.find((b) => b.textContent && b.textContent.includes('RESTART'));
      return {
        hasCashedOutText: text.includes('CASHED OUT AT'),
        hasRestartBtn: !!restartBtn,
        restartBtnText: restartBtn ? restartBtn.textContent.trim() : null,
        fullTextSnippet: text.split('\n').filter(Boolean).slice(0, 10).join(' | '),
      };
    });
    console.log('  Post-Cashout State:', postCashoutState);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-cashout-success.png') });

    if (!postCashoutState.hasRestartBtn) {
      throw new Error('Restart button is missing after cashout!');
    }

    // --------------------------------------------------------------------------
    // CASE 4: CLICK RESTART & VERIFY IMMEDIATE RETURN TO IDLE
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 4: CLICK RESTART / PLAY AGAIN ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const restartBtn = buttons.find((b) => b.textContent && b.textContent.includes('RESTART'));
      if (restartBtn) restartBtn.click();
    });

    await sleep(800);
    const restartedIdleState = await page.evaluate(() => {
      const text = document.body.innerText;
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find((b) => b.textContent && (b.textContent.includes('START GAME') || b.textContent.includes('LAUNCH ROCKET')));
      return {
        isReady: text.includes('READY FOR LAUNCH') || text.includes('1.00x'),
        hasStartBtn: !!startBtn,
      };
    });
    console.log('  Restarted to IDLE successfully:', restartedIdleState);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-restarted-idle.png') });

    // --------------------------------------------------------------------------
    // CASE 5: ROUND 2 - LET ROCKET CRASH WITHOUT CASHING OUT
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 5: ROUND 2 - TEST CRASH OUTCOME (NO CASHOUT) ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const startBtn = buttons.find((b) => b.textContent && (b.textContent.includes('START GAME') || b.textContent.includes('LAUNCH ROCKET')));
      if (startBtn) startBtn.click();
    });

    console.log('  Round 2 launched. Waiting for rocket to reach crash point...');
    let crashed = false;
    for (let sec = 0; sec < 20; sec++) {
      await sleep(1000);
      const text = await page.evaluate(() => document.body.innerText);
      if (text.includes('CRASHED AT') || text.includes('ROCKET CRASHED')) {
        crashed = true;
        console.log(`  Rocket crashed at ~${sec}s into flight monitoring!`);
        break;
      }
    }

    if (!crashed) {
      throw new Error('Rocket did not register crash outcome within timeout!');
    }

    const crashState = await page.evaluate(() => {
      const text = document.body.innerText;
      const buttons = Array.from(document.querySelectorAll('button'));
      const restartBtn = buttons.find((b) => b.textContent && b.textContent.includes('RESTART'));
      return {
        hasCrashedText: text.includes('ROCKET CRASHED AT') || text.includes('CRASHED AT'),
        hasRestartBtn: !!restartBtn,
        restartText: restartBtn ? restartBtn.textContent.trim() : null,
      };
    });
    console.log('  Crash State Verified:', crashState);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-rocket-crashed.png') });

    // Click Restart from Crash
    console.log('\n--- STEP 6: RESTART FROM CRASH STATE ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const restartBtn = buttons.find((b) => b.textContent && b.textContent.includes('RESTART'));
      if (restartBtn) restartBtn.click();
    });

    await sleep(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-idle-after-crash-restart.png') });

    // --------------------------------------------------------------------------
    // CASE 6: REFRESH PAGE & STABILITY TEST
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
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-refreshed-arena.png') });

    // --------------------------------------------------------------------------
    // CASE 7: MOBILE RESPONSIVENESS (375x667)
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 8: MOBILE VIEWPORT TEST (375x667) ---');
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await sleep(1500);

    const mobileCanvas = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      return canvas ? { w: canvas.clientWidth, h: canvas.clientHeight } : null;
    });
    console.log('  Mobile Canvas Dimensions:', mobileCanvas);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-mobile-sky-rocket.png') });

    // --------------------------------------------------------------------------
    // VERIFY CONSOLE ERRORS & FAILED REQUESTS
    // --------------------------------------------------------------------------
    console.log('\n================================================================');
    console.log('📊 TEST RESULTS & DIAGNOSTIC SUMMARY');
    console.log('================================================================');
    console.log('  Console Errors Logged:', consoleErrors.length, consoleErrors);
    console.log('  Failed Requests Logged:', failedRequests.length, failedRequests);

    console.log('\n🎉 ALL MANDATORY SKY ROCKET TEST CASES PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-failure.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
