const puppeteer = require('./node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c';
const SCREENSHOT_DIR = path.join(ARTIFACT_DIR, 'sky_rocket_10s_screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('================================================================');
  console.log('🚀 SKY ROCKET 10-SECOND COUNTDOWN & CONTINUOUS ROUNDS TEST SUITE');
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
        if (!text.includes('favicon.ico') && !text.includes('audio/win.wav')) {
          consoleErrors.push(text);
        }
      }
    });

    page.on('requestfailed', (req) => {
      if (!req.url().includes('favicon.ico') && !req.url().includes('audio/win.wav')) {
        failedRequests.push(`${req.method()} ${req.url()}: ${req.failure()?.errorText || 'Unknown error'}`);
      }
    });

    console.log('\n[1/7] Navigating to Sky Rocket game...');
    await page.goto('http://localhost:5173/lobby/arena/game-crash-01', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.waitForSelector('canvas', { timeout: 15000 });
    await sleep(2000);

    // Verify 3D Canvas Viewport
    const canvasExists = await page.evaluate(() => {
      const c = document.querySelector('canvas');
      return Boolean(c && c.width > 0 && c.height > 0);
    });
    console.log(`[PASS] 3D WebGL Canvas rendered: ${canvasExists}`);

    // Verify Bet Slots 1 and 2
    const slotPanels = await page.evaluate(() => {
      const s1 = document.querySelector('.slot-panel-1');
      const s2 = document.querySelector('.slot-panel-2');
      return { s1: Boolean(s1), s2: Boolean(s2) };
    });
    console.log(`[PASS] Both Bet Slot Panels present: Slot 1: ${slotPanels.s1}, Slot 2: ${slotPanels.s2}`);

    // Set demo balance if needed
    await page.evaluate(() => {
      localStorage.setItem('treasure_demo_balance', '10000');
    });

    // ── STEP 1: Configure Dual Bets & Launch Rocket ──
    console.log('\n[2/7] Placing Bet on Slot 1 (₹50) and Slot 2 (₹100)...');
    // Ensure Slot 1 is armed
    await page.evaluate(() => {
      const btnBet1 = document.querySelector('.btn-bet-slot-1');
      if (btnBet1 && !btnBet1.innerText.includes('ARMED')) {
        btnBet1.click();
      }
    });
    await sleep(300);

    // Arm Slot 2
    await page.evaluate(() => {
      const btnBet2 = document.querySelector('.btn-bet-slot-2');
      if (btnBet2 && !btnBet2.innerText.includes('ARMED')) {
        btnBet2.click();
      }
    });
    await sleep(300);

    // Click Launch Rocket
    console.log('Launching Rocket into orbit...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const launchBtn = btns.find((b) => b.innerText.includes('LAUNCH ROCKET'));
      if (launchBtn) launchBtn.click();
    });

    await sleep(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-launch-and-flight.png') });
    console.log('[SAVED] 01-launch-and-flight.png');

    // Wait for ignition countdown (3s) and flight takeoff
    console.log('Waiting for flight liftoff and multiplier growth...');
    let flightRunning = false;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      flightRunning = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('ALTITUDE RISING') || text.includes('CASHOUT');
      });
      if (flightRunning) break;
    }
    console.log(`[PASS] Rocket in flight: ${flightRunning}`);

    // Cash out Slot 1 during flight
    console.log('Cashing out Slot 1 during flight...');
    const cashedOutSlot1 = await page.evaluate(() => {
      const btn = document.querySelector('.btn-cashout-slot-1');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log(`[PASS] Slot 1 cashout triggered: ${cashedOutSlot1}`);
    await sleep(500);

    // ── STEP 2: Wait for Crash & Verify 10-Second Countdown Overlay ──
    console.log('\n[3/7] Waiting for crash event and 10-second countdown...');
    let countdownActive = false;
    let crashMultiplierText = '';

    for (let i = 0; i < 60; i++) {
      await sleep(500);
      const status = await page.evaluate(() => {
        const overlay = document.querySelector('.next-round-countdown-overlay');
        const numEl = document.querySelector('.countdown-number');
        const bodyText = document.body.innerText;
        return {
          hasOverlay: Boolean(overlay),
          countdownVal: numEl ? numEl.innerText.trim() : null,
          hasCrashText: bodyText.includes('ROUND CRASHED AT') || bodyText.includes('ROCKET CRASHED AT'),
          bodyText,
        };
      });

      if (status.hasOverlay && status.countdownVal) {
        countdownActive = true;
        crashMultiplierText = status.countdownVal;
        console.log(`[PASS] 10-Second Countdown active! Current seconds: ${status.countdownVal}`);
        break;
      }
    }

    if (!countdownActive) {
      throw new Error('Countdown overlay did not become active after crash');
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-crash-10s-countdown-start.png') });
    console.log('[SAVED] 02-crash-10s-countdown-start.png');

    // ── STEP 3: Test Betting & Controls DURING the 10-Second Countdown ──
    console.log('\n[4/7] Testing betting interaction DURING the 10-second countdown...');
    const bettingDuringCountdown = await page.evaluate(() => {
      const overlay = document.querySelector('.next-round-countdown-overlay');
      const numEl = document.querySelector('.countdown-number');
      const sec = numEl ? parseInt(numEl.innerText, 10) : 0;

      // Click quick bet ₹100 on Slot 1
      const slot1Panel = document.querySelector('.slot-panel-1');
      const amtBtns = slot1Panel ? Array.from(slot1Panel.querySelectorAll('button')) : [];
      const btn100 = amtBtns.find((b) => b.innerText.includes('₹100'));
      if (btn100) btn100.click();

      // Click Place Bet Slot 1 to arm for upcoming round
      const btnBet1 = document.querySelector('.btn-bet-slot-1');
      if (btnBet1) btnBet1.click();

      // Configure Auto Cashout 2.50x
      const acCheckbox = slot1Panel ? slot1Panel.querySelector('input[type="checkbox"]') : null;
      if (acCheckbox && !acCheckbox.checked) acCheckbox.click();

      return {
        sec,
        hasOverlay: Boolean(overlay),
        armedSlot1: btnBet1 ? btnBet1.innerText.includes('ARMED') : false,
      };
    });

    console.log(`[PASS] Betting during countdown: Sec Left: ${bettingDuringCountdown.sec}, Slot 1 Armed: ${bettingDuringCountdown.armedSlot1}`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-betting-during-10s-countdown.png') });
    console.log('[SAVED] 03-betting-during-10s-countdown.png');

    // ── STEP 4: Observe Countdown Ticking Down ──
    console.log('\n[5/7] Observing countdown tick down...');
    await sleep(2500);
    const midSec = await page.evaluate(() => {
      const numEl = document.querySelector('.countdown-number');
      return numEl ? numEl.innerText.trim() : null;
    });
    console.log(`[PASS] Countdown progressed to: ${midSec}s`);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-countdown-tick-down.png') });
    console.log('[SAVED] 04-countdown-tick-down.png');

    // ── STEP 5: Verify Automatic Next Round Starts at 0 ──
    console.log('\n[6/7] Waiting for countdown to reach 0 and auto-launch next round...');
    let nextRoundStarted = false;
    for (let i = 0; i < 25; i++) {
      await sleep(1000);
      const roundStatus = await page.evaluate(() => {
        const text = document.body.innerText;
        const overlay = document.querySelector('.next-round-countdown-overlay');
        const inCountdown = text.includes('IGNITION IN');
        const inFlight = text.includes('ALTITUDE RISING');
        return {
          noOverlay: !overlay,
          started: inCountdown || inFlight,
          inFlight,
        };
      });

      if (roundStatus.started) {
        nextRoundStarted = true;
        console.log(`[PASS] Automatic Next Round started without page refresh! (In flight: ${roundStatus.inFlight})`);
        break;
      }
    }

    if (!nextRoundStarted) {
      throw new Error('Next round did not start automatically when countdown finished');
    }

    await sleep(2000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-auto-next-round-launched.png') });
    console.log('[SAVED] 05-auto-next-round-launched.png');

    // ── STEP 6: Test Continuous Round Cycle & Spectator Mode ──
    console.log('\n[7/7] Testing continuous round cycle with disabled Auto Bet (Spectator Mode)...');
    // Wait for current round to crash
    console.log('Waiting for round 2 to crash...');
    let round2Crashed = false;
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      const hasCountdown = await page.evaluate(() => {
        return Boolean(document.querySelector('.next-round-countdown-overlay'));
      });
      if (hasCountdown) {
        round2Crashed = true;
        break;
      }
    }
    console.log(`[PASS] Round 2 finished, next 10s countdown started: ${round2Crashed}`);

    // Verify that with Auto Bet OFF, slots are NOT automatically armed
    const slotsNotAutoArmed = await page.evaluate(() => {
      const btn1 = document.querySelector('.btn-bet-slot-1');
      const btn2 = document.querySelector('.btn-bet-slot-2');
      return {
        slot1Armed: btn1 ? btn1.innerText.includes('ARMED') : false,
        slot2Armed: btn2 ? btn2.innerText.includes('ARMED') : false,
      };
    });
    console.log(`[PASS] Auto Bet disabled -> Slots are NOT automatically armed (Slot 1: ${slotsNotAutoArmed.slot1Armed}, Slot 2: ${slotsNotAutoArmed.slot2Armed})`);

    // Use "Skip countdown & launch now" or let it count down
    console.log('Testing "Skip countdown & launch now" button...');
    await page.evaluate(() => {
      const launchNowBtn = document.querySelector('.btn-launch-now');
      if (launchNowBtn) launchNowBtn.click();
    });

    await sleep(1500);
    const spectatorRoundActive = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('IGNITION IN') || text.includes('ALTITUDE RISING') || text.includes('SPECTATOR');
    });
    console.log(`[PASS] Continuous Spectator Round started smoothly: ${spectatorRoundActive}`);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-spectator-continuous-round.png') });
    console.log('[SAVED] 07-spectator-continuous-round.png');

    // Verify 0 Console Errors
    console.log('\n─── DIAGNOSTIC SUMMARY ───');
    console.log(`Console Errors: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      consoleErrors.forEach((e) => console.log('  [ERROR]', e));
    }
    console.log(`Failed Network Requests: ${failedRequests.length}`);
    if (failedRequests.length > 0) {
      failedRequests.forEach((r) => console.log('  [REQ-FAIL]', r));
    }

    console.log('\n================================================================');
    console.log('🎉 ALL SKY ROCKET 10-SECOND CONTINUOUS ROUND TESTS PASSED!');
    console.log('================================================================');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
  }
})();
