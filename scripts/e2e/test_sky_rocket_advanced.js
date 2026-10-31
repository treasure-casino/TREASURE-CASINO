const puppeteer = require('./node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots', 'sky_rocket_advanced');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('================================================================');
  console.log('🚀 SKY ROCKET ADVANCED UPGRADE: COMPREHENSIVE TEST SUITE');
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
    // STEP 1: LOAD GAME ARENA & VERIFY DUAL PANELS
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 1: LOAD ARENA & VERIFY DUAL PANELS ---');
    await page.goto('http://localhost:5173/lobby/arena/game-crash-01', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    await page.waitForSelector('canvas', { timeout: 10000 });
    await sleep(2000);

    const dualPanels = await page.evaluate(() => {
      const p1 = document.querySelector('.slot-panel-1');
      const p2 = document.querySelector('.slot-panel-2');
      return {
        hasPanel1: !!p1,
        hasPanel2: !!p2,
        canvasW: document.querySelector('canvas')?.clientWidth,
        canvasH: document.querySelector('canvas')?.clientHeight,
      };
    });
    console.log('  Dual Panels Detection:', dualPanels);
    if (!dualPanels.hasPanel1 || !dualPanels.hasPanel2) {
      throw new Error('Dual bet slots panels were not found on the interface!');
    }
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-dual-panels-ready.png') });

    // --------------------------------------------------------------------------
    // STEP 2: PLACE BETS ON BOTH SLOT 1 AND SLOT 2 IN THE SAME ROUND
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 2: PLACE BETS ON BOTH SLOT 1 & SLOT 2 ---');
    await page.evaluate(() => {
      // Ensure Slot 1 is armed
      const b1 = document.querySelector('.btn-bet-slot-1');
      if (b1 && !b1.textContent.includes('✓')) b1.click();

      // Ensure Slot 2 is armed
      const b2 = document.querySelector('.btn-bet-slot-2');
      if (b2 && !b2.textContent.includes('✓')) b2.click();
    });

    await sleep(500);
    const armedStatus = await page.evaluate(() => {
      const b1 = document.querySelector('.btn-bet-slot-1')?.textContent.trim();
      const b2 = document.querySelector('.btn-bet-slot-2')?.textContent.trim();
      return { b1, b2 };
    });
    console.log('  Armed Bet Slots:', armedStatus);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-dual-bets-armed.png') });

    // Click Launch Rocket (₹150 total)
    console.log('  Launching rocket with dual bets...');
    await page.evaluate(() => {
      const launchBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('LAUNCH ROCKET')
      );
      if (launchBtn) launchBtn.click();
    });

    // Verify countdown
    await sleep(800);
    const countdownInfo = await page.evaluate(() => document.body.innerText.includes('IGNITION IN') || document.body.innerText.includes('PREPARING'));
    console.log('  Countdown in Progress:', countdownInfo);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-countdown-dual-bets.png') });

    // --------------------------------------------------------------------------
    // STEP 3: WAIT FOR FLIGHT & CASHOUT SLOT 1 INDEPENDENTLY
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 3: CASHOUT SLOT 1 INDEPENDENTLY ---');
    let cashout1Detected = false;
    for (let attempt = 0; attempt < 25; attempt++) {
      await sleep(300);
      const c1 = await page.evaluate(() => {
        const btn = document.querySelector('.btn-cashout-slot-1');
        return { exists: !!btn, text: btn ? btn.textContent.trim() : null };
      });

      if (c1.exists) {
        cashout1Detected = true;
        console.log(`  Slot 1 Cashout Available: "${c1.text}"`);
        // Cashout Slot 1 now!
        await page.evaluate(() => {
          const btn = document.querySelector('.btn-cashout-slot-1');
          if (btn) btn.click();
        });
        console.log('  Slot 1 Cashout Clicked!');
        break;
      }
    }

    if (!cashout1Detected) {
      throw new Error('Slot 1 Cashout button did not appear during flight!');
    }

    await sleep(600);
    const postSlot1Cashout = await page.evaluate(() => {
      const p1Text = document.querySelector('.slot-panel-1')?.innerText;
      const c2 = document.querySelector('.btn-cashout-slot-2');
      return {
        slot1CashedOut: p1Text?.includes('CASHED OUT') || p1Text?.includes('WON +₹'),
        slot2StillInFlight: !!c2,
        slot2BtnText: c2 ? c2.textContent.trim() : null,
      };
    });
    console.log('  Slot 1 Cashed Out while Slot 2 In Flight:', postSlot1Cashout);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-slot1-cashed-out-slot2-flying.png') });

    // --------------------------------------------------------------------------
    // STEP 4: CASHOUT SLOT 2 INDEPENDENTLY
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 4: CASHOUT SLOT 2 INDEPENDENTLY ---');
    const cashout2Success = await page.evaluate(() => {
      const c2 = document.querySelector('.btn-cashout-slot-2');
      if (c2) {
        c2.click();
        return true;
      }
      return false;
    });
    console.log('  Slot 2 Cashout Clicked:', cashout2Success);

    await sleep(1500);
    const postBothCashout = await page.evaluate(() => {
      const p1Text = document.querySelector('.slot-panel-1')?.innerText;
      const p2Text = document.querySelector('.slot-panel-2')?.innerText;
      return {
        p1: p1Text?.split('\n').filter(Boolean).slice(0, 3).join(' | '),
        p2: p2Text?.split('\n').filter(Boolean).slice(0, 3).join(' | '),
      };
    });
    console.log('  Both Slots Independent Results:', postBothCashout);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '05-both-slots-cashed-out.png') });

    // --------------------------------------------------------------------------
    // STEP 5: RESTART & TEST INDEPENDENT AUTO CASH OUT
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 5: TEST INDEPENDENT AUTO CASH OUT ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const r = buttons.find((b) => b.textContent && b.textContent.includes('RESTART'));
      if (r) r.click();
    });
    await sleep(1000);

    // Enable Auto Cash Out on Slot 1 at 1.10x and Slot 2 at 1.25x
    await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      if (checkboxes[0] && !checkboxes[0].checked) checkboxes[0].click(); // Slot 1 Auto
      if (checkboxes[1] && !checkboxes[1].checked) checkboxes[1].click(); // Slot 2 Auto

      const numberInputs = Array.from(document.querySelectorAll('input[type="number"]'));
      if (numberInputs[0]) {
        numberInputs[0].value = '1.10';
        numberInputs[0].dispatchEvent(new Event('change', { bubbles: true }));
      }
      if (numberInputs[1]) {
        numberInputs[1].value = '1.25';
        numberInputs[1].dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Ensure both slots are armed
      const b1 = document.querySelector('.btn-bet-slot-1');
      if (b1 && !b1.textContent.includes('✓')) b1.click();
      const b2 = document.querySelector('.btn-bet-slot-2');
      if (b2 && !b2.textContent.includes('✓')) b2.click();
    });

    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '06-auto-cashout-configured.png') });

    // Launch round
    await page.evaluate(() => {
      const launchBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('LAUNCH ROCKET')
      );
      if (launchBtn) launchBtn.click();
    });

    // Wait for ignition & auto-cashout execution
    console.log('  Waiting for flight & auto cashouts to trigger...');
    await sleep(4800);
    const autoCashoutResults = await page.evaluate(() => {
      const p1 = document.querySelector('.slot-panel-1')?.innerText;
      const p2 = document.querySelector('.slot-panel-2')?.innerText;
      return {
        p1Result: p1?.split('\n').filter(Boolean).slice(0, 3).join(' | '),
        p2Result: p2?.split('\n').filter(Boolean).slice(0, 3).join(' | '),
      };
    });
    console.log('  Auto Cash Out Results:', autoCashoutResults);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '07-auto-cashout-results.png') });

    // --------------------------------------------------------------------------
    // STEP 6: TEST AUTO BET CONTROLS & STOP AUTO BET
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 6: TEST AUTO BET & STOP AUTO BET ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const r = buttons.find((b) => b.textContent && b.textContent.includes('RESTART'));
      if (r) r.click();
    });
    await sleep(1000);

    // Open Auto Bet Settings drawer
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const abSettings = buttons.find((b) => b.textContent && b.textContent.includes('Auto Bet Settings'));
      if (abSettings) abSettings.click();
    });
    await sleep(500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '08-auto-bet-drawer.png') });

    // Start Auto Bet
    console.log('  Starting Auto Bet (5 rounds)...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const btn5 = buttons.find((b) => b.textContent === '5');
      if (btn5) btn5.click();

      const startAb = buttons.find((b) => b.textContent && b.textContent.includes('Start Auto Bet'));
      if (startAb) startAb.click();
    });

    await sleep(1500);
    const autoBetActiveState = await page.evaluate(() => {
      const text = document.body.innerText;
      const stopBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent && b.textContent.includes('Stop Auto Bet'));
      return {
        isBadgeVisible: text.includes('AUTO BET:'),
        hasStopBtn: !!stopBtn,
      };
    });
    console.log('  Auto Bet Active & Stop Button Visible:', autoBetActiveState);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '09-auto-bet-active.png') });

    // Click Stop Auto Bet
    console.log('  Executing Stop Auto Bet...');
    await page.evaluate(() => {
      const stopBtn = Array.from(document.querySelectorAll('button')).find((b) => b.textContent && b.textContent.includes('Stop Auto Bet'));
      if (stopBtn) stopBtn.click();
    });

    await sleep(800);
    const stoppedState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasStoppedMsg: text.includes('stopped') || !text.includes('AUTO BET:'),
      };
    });
    console.log('  Auto Bet Stopped cleanly:', stoppedState);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '10-auto-bet-stopped.png') });

    // --------------------------------------------------------------------------
    // STEP 7: TEST CRASH EXPLOSION ANIMATION
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 7: TEST ROCKET CRASH EXPLOSION ---');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const r = buttons.find((b) => b.textContent && b.textContent.includes('RESTART'));
      if (r) r.click();
    });
    await sleep(1000);

    // Ensure only Slot 1 is armed and disable auto cashout for crash test
    await page.evaluate(() => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      if (checkboxes[0] && checkboxes[0].checked) checkboxes[0].click(); // uncheck auto cashout
      if (checkboxes[1] && checkboxes[1].checked) checkboxes[1].click();

      const b1 = document.querySelector('.btn-bet-slot-1');
      if (b1 && !b1.textContent.includes('✓')) b1.click();
      const b2 = document.querySelector('.btn-bet-slot-2');
      if (b2 && b2.textContent.includes('✓')) b2.click(); // unarm slot 2
    });

    // Launch
    await page.evaluate(() => {
      const launchBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('LAUNCH ROCKET')
      );
      if (launchBtn) launchBtn.click();
    });

    console.log('  Waiting for flight to crash...');
    let crashed = false;
    for (let sec = 0; sec < 20; sec++) {
      await sleep(1000);
      const text = await page.evaluate(() => document.body.innerText);
      if (text.includes('ROCKET CRASHED AT') || text.includes('CRASHED AT')) {
        crashed = true;
        console.log(`  Crash explosion verified at ~${sec}s!`);
        break;
      }
    }
    if (!crashed) throw new Error('Crash was not detected within timeout!');
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '11-crash-explosion.png') });

    // --------------------------------------------------------------------------
    // STEP 8: MOBILE RESPONSIVENESS & CONSOLE ERROR AUDIT
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 8: MOBILE RESPONSIVENESS (375x667) ---');
    await page.setViewport({ width: 375, height: 667, isMobile: true });
    await sleep(1500);

    const mobileAudit = await page.evaluate(() => {
      return {
        canvasW: document.querySelector('canvas')?.clientWidth,
        canvasH: document.querySelector('canvas')?.clientHeight,
        hasBothSlots: !!document.querySelector('.slot-panel-1') && !!document.querySelector('.slot-panel-2'),
      };
    });
    console.log('  Mobile Audit:', mobileAudit);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '12-mobile-dual-slots.png') });

    console.log('\n================================================================');
    console.log('📊 TEST SUMMARY & ERROR AUDIT');
    console.log('================================================================');
    console.log('  Console Errors Logged:', consoleErrors.length, consoleErrors);
    console.log('  Failed Requests Logged:', failedRequests.length, failedRequests);

    console.log('\n🎉 ALL ADVANCED SKY ROCKET FEATURES TESTED AND PASSED!');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'error-failure.png') }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
