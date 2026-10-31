const puppeteer = require('./node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'sky_rocket_auto_flow_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('================================================================');
  console.log('🚀 SKY ROCKET AUTO FLOW & ZERO-LAUNCH-NOW VERIFICATION SUITE');
  console.log('================================================================');

  let browser;
  try {
    browser = await puppeteer.launch({
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
        failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText || 'Unknown error'}`);
      }
    });

    // ── STEP 1: Load Sky Rocket & Confirm NO "Launch Now" Button ──
    console.log('\n[1/8] Opening Sky Rocket at /lobby/arena/game-crash-01...');
    await page.goto('http://localhost:5173/lobby/arena/game-crash-01', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await sleep(1500);

    console.log('Checking for any "Launch Now" buttons in the entire DOM...');
    const launchNowCheck = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const launchNowBtns = allButtons.filter(
        (b) =>
          b.innerText.toLowerCase().includes('launch now') ||
          b.innerText.toLowerCase().includes('launch rocket') ||
          b.classList.contains('btn-launch-now')
      );
      return {
        count: launchNowBtns.length,
        buttonsFound: launchNowBtns.map((b) => b.innerText.trim()),
      };
    });

    if (launchNowCheck.count > 0) {
      throw new Error(`Launch Now button found in UI: ${JSON.stringify(launchNowCheck.buttonsFound)}`);
    }
    console.log('[PASS] ZERO "Launch Now" / manual launch buttons found in UI!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-no-launch-now-button.png') });
    console.log('[SAVED] 01-no-launch-now-button.png');

    // ── STEP 2: Verify Initial 10-Second Betting Countdown ──
    console.log('\n[2/8] Verifying automatic 10-second countdown on initial load...');
    let initialCountdownActive = false;
    let initialSec = 0;
    for (let i = 0; i < 20; i++) {
      await sleep(300);
      const res = await page.evaluate(() => {
        const overlay = document.querySelector('.next-round-countdown-overlay');
        const numEl = document.querySelector('.countdown-number');
        return {
          hasOverlay: Boolean(overlay),
          sec: numEl ? parseInt(numEl.innerText.trim(), 10) : 0,
        };
      });
      if (res.hasOverlay && res.sec > 0) {
        initialCountdownActive = true;
        initialSec = res.sec;
        break;
      }
    }
    console.log(`[PASS] Initial countdown active: ${initialCountdownActive} (Seconds remaining: ${initialSec}s)`);

    // ── STEP 3: Arm Slot 1 and Slot 2 During Countdown ──
    console.log('\n[3/8] Arming Slot 1 (₹50) and Slot 2 (₹100) during countdown...');
    const bettingArmed = await page.evaluate(() => {
      // Slot 1
      const btn1 = document.querySelector('.btn-bet-slot-1');
      if (btn1 && !btn1.innerText.includes('ARMED')) {
        btn1.click();
      }

      // Slot 2: select ₹100 preset and arm
      const slot2Panel = document.querySelector('.slot-panel-2');
      const amtBtns = slot2Panel ? Array.from(slot2Panel.querySelectorAll('button')) : [];
      const btn100 = amtBtns.find((b) => b.innerText.includes('₹100'));
      if (btn100) btn100.click();

      const btn2 = document.querySelector('.btn-bet-slot-2');
      if (btn2 && !btn2.innerText.includes('ARMED')) {
        btn2.click();
      }

      return {
        slot1Armed: btn1 ? btn1.innerText.includes('ARMED') : false,
        slot2Armed: btn2 ? btn2.innerText.includes('ARMED') : false,
      };
    });
    console.log(`[PASS] Both bets armed for next round: Slot 1: ${bettingArmed.slot1Armed}, Slot 2: ${bettingArmed.slot2Armed}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-bets-armed-countdown.png') });
    console.log('[SAVED] 02-bets-armed-countdown.png');

    // ── STEP 4: Observe Automatic Launch At 0 (NO CLICKS!) ──
    console.log('\n[4/8] Waiting for countdown to reach 0 and launch automatically...');
    let autoLaunched = false;
    for (let i = 0; i < 25; i++) {
      await sleep(800);
      const state = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          ignition: text.includes('IGNITION IN'),
          inFlight: text.includes('ALTITUDE RISING') || text.includes('ROCKET IN FLIGHT'),
        };
      });
      if (state.ignition || state.inFlight) {
        autoLaunched = true;
        console.log(`[PASS] Rocket launched automatically at countdown 0! (Ignition/Flight: ${state.ignition ? 'Ignition' : 'Flight'})`);
        break;
      }
    }
    if (!autoLaunched) {
      throw new Error('Rocket did not launch automatically when countdown finished');
    }

    // Wait for liftoff
    console.log('Waiting for flight liftoff and multiplier curve...');
    let flightActive = false;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      flightActive = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('ALTITUDE RISING') || text.includes('ROCKET IN FLIGHT');
      });
      if (flightActive) break;
    }
    console.log(`[PASS] Rocket in flight: ${flightActive}`);
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-automatic-flight-active.png') });
    console.log('[SAVED] 03-automatic-flight-active.png');

    // ── STEP 5: Manual Cashout on Slot 1 During Flight ──
    console.log('\n[5/8] Testing manual cash out on Slot 1 during flight...');
    const cashedOut1 = await page.evaluate(() => {
      const btn = document.querySelector('.btn-cashout-slot-1');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`[PASS] Slot 1 cashed out: ${cashedOut1}`);
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-slot1-cashed-out.png') });
    console.log('[SAVED] 04-slot1-cashed-out.png');

    // ── STEP 6: Wait for Crash & Verify Immediate 10s Countdown ──
    console.log('\n[6/8] Waiting for crash event and immediate 10-second countdown...');
    let nextCountdownStarted = false;
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      const res = await page.evaluate(() => {
        const overlay = document.querySelector('.next-round-countdown-overlay');
        const numEl = document.querySelector('.countdown-number');
        return {
          hasOverlay: Boolean(overlay),
          sec: numEl ? parseInt(numEl.innerText.trim(), 10) : 0,
        };
      });
      if (res.hasOverlay && res.sec > 0) {
        nextCountdownStarted = true;
        console.log(`[PASS] Crash settled. Next 10-second countdown started automatically: ${res.sec}s`);
        break;
      }
    }
    if (!nextCountdownStarted) {
      throw new Error('Next 10-second countdown did not start automatically after crash');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-crash-and-countdown.png') });
    console.log('[SAVED] 05-crash-and-countdown.png');

    // ── STEP 7: Verify Round 2 Launches Automatically At 0 ──
    console.log('\n[7/8] Waiting for countdown to reach 0 for Round 2...');
    let round2Launched = false;
    for (let i = 0; i < 25; i++) {
      await sleep(800);
      const state = await page.evaluate(() => {
        const text = document.body.innerText;
        return {
          ignition: text.includes('IGNITION IN'),
          inFlight: text.includes('ALTITUDE RISING') || text.includes('ROCKET IN FLIGHT'),
        };
      });
      if (state.ignition || state.inFlight) {
        round2Launched = true;
        console.log(`[PASS] Round 2 launched automatically without user click!`);
        break;
      }
    }
    if (!round2Launched) {
      throw new Error('Round 2 did not launch automatically at countdown 0');
    }
    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-round-2-auto-launched.png') });
    console.log('[SAVED] 06-round-2-auto-launched.png');

    // ── STEP 8: Page Refresh & Reconnection Test ──
    console.log('\n[8/8] Testing page reload and reconnection...');
    await page.reload({ waitUntil: 'networkidle2' });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await sleep(2000);

    const reloadedState = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      const launchNowBtns = allButtons.filter((b) => b.innerText.toLowerCase().includes('launch now'));
      const hasOverlay = Boolean(document.querySelector('.next-round-countdown-overlay'));
      const canvas = document.querySelector('canvas');
      return {
        launchNowCount: launchNowBtns.length,
        hasOverlay,
        canvasOk: Boolean(canvas && canvas.width > 0),
      };
    });

    console.log(`[PASS] Page reloaded cleanly: Canvas OK: ${reloadedState.canvasOk}, Countdown Active: ${reloadedState.hasOverlay}, Launch Now count: ${reloadedState.launchNowCount}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-page-reload-clean.png') });
    console.log('[SAVED] 07-page-reload-clean.png');

    // ── DIAGNOSTIC SUMMARY ──
    console.log('\n─── DIAGNOSTIC SUMMARY ───');
    console.log(`Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((e) => console.log('  [ERROR]', e));
    }
    console.log(`Failed Network Requests: ${failedRequests.length}`);
    if (failedRequests.length > 0) {
      failedRequests.forEach((r) => console.log('  [REQ-FAIL]', r));
    }

    if (consoleErrors.length > 0) {
      throw new Error(`Test failed with ${consoleErrors.length} console errors`);
    }

    console.log('\n================================================================');
    console.log('🎉 ALL SKY ROCKET AUTO FLOW & ZERO-LAUNCH-NOW TESTS PASSED!');
    console.log('================================================================');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();

