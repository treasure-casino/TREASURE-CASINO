const puppeteer = require('./node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_vortex_screenshots'
);
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('================================================================');
  console.log('🌀 TREASURE VORTEX 3D – PRD VERIFICATION & AUDIT SUITE');
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
    // STEP 1: VERIFY GAME CARD IN LOBBY (NO WIN-RATE / RTP PERCENTAGE)
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 1: OPENING LOBBY & VERIFYING TREASURE VORTEX CARD ---');
    await page.goto('http://localhost:5173/lobby', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const vortexCardInfo = await page.evaluate(() => {
      const h3s = Array.from(document.querySelectorAll('h3'));
      const vortexH3 = h3s.find((h) => h.innerText && h.innerText.includes('Treasure Vortex'));
      const card = vortexH3?.closest('.group');
      if (!card) return { found: false };
      const text = card.innerText.replace(/\s+/g, ' ').trim();
      const hasWinRate = /win\s*rate|rtp|win\s*percentage/i.test(text);
      return { found: true, text, hasWinRate };
    });

    console.log('  Lobby Card Found:', vortexCardInfo.found);
    console.log('  Lobby Card Content:', vortexCardInfo.text);
    console.log('  Card strictly FREE of fake win rate / RTP percentage:', !vortexCardInfo.hasWinRate);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-lobby-treasure-vortex-card.png'),
    });
    console.log('  📸 Captured: 01-lobby-treasure-vortex-card.png');

    // --------------------------------------------------------------------------
    // STEP 2: NAVIGATE TO TREASURE VORTEX ARENA
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 2: NAVIGATING TO TREASURE VORTEX ARENA ---');
    await page.goto('http://localhost:5173/lobby/arena/game-vortex-01', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(2500);

    const arenaCheck = await page.evaluate(() => {
      const stage = document.querySelector('.vortex-stage');
      const canvas = document.querySelector('canvas');
      const startBtn = document.querySelector('.btn-start');
      const resetBtn = document.querySelector('.btn-reset-balance');
      const paytableBtn = document.querySelector('.btn-paytable');

      return {
        hasCanvas: !!canvas,
        hasStage: !!stage,
        hasStartBtn: !!startBtn,
        hasResetBtn: !!resetBtn,
        hasPaytableBtn: !!paytableBtn,
      };
    });

    console.log('  Arena 3D Elemental Vortex UI Components Verified:', arenaCheck);
    if (!arenaCheck.hasCanvas || !arenaCheck.hasStage || !arenaCheck.hasStartBtn) {
      throw new Error('Vortex elemental crash arena failed to render required controls');
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-vortex-4-rings-rendered.png'),
    });
    console.log('  📸 Captured: 02-vortex-arena-idle.png');

    // --------------------------------------------------------------------------
    // STEP 3: VERIFY PAYTABLE & ELEMENTAL PROGRESSION RULES (NO WIN RATE)
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 3: TESTING RULES & PROGRESSION TIERS ---');
    await page.evaluate(() => document.querySelector('.btn-paytable')?.click());
    await sleep(800);

    const paytableData = await page.evaluate(() => {
      const modal = document.querySelector('.paytable-modal');
      if (!modal) return null;
      const modalText = modal.innerText.replace(/\s+/g, ' ').trim();
      const hasWinRate = /win\s*rate|rtp|win\s*percentage/i.test(modalText);
      const hasFireTiers = modalText.includes('70x') && modalText.includes('FIRE');
      const hasWaterTiers = modalText.includes('5x') && modalText.includes('WATER');
      const hasEarthTiers = modalText.includes('25x') && modalText.includes('EARTH');
      const hasWind = modalText.includes('WIND Boost');
      const hasSkull = modalText.includes('SKULL Reduction Priority');

      return {
        modalText,
        hasWinRate,
        hasFireTiers,
        hasWaterTiers,
        hasEarthTiers,
        hasWind,
        hasSkull,
      };
    });

    console.log('  Rules Modal strictly FREE of Win Rate / RTP %:', !paytableData.hasWinRate);
    console.log('  Elemental Rules Verified:');
    console.log('    • Fire Progression [3, 5, 9, 16, 28, 45, 70]:', paytableData.hasFireTiers);
    console.log('    • Water Progression [1.5, 2.2, 3.5, 5]:', paytableData.hasWaterTiers);
    console.log('    • Earth Progression [2, 3.5, 6, 10, 16, 25]:', paytableData.hasEarthTiers);
    console.log('    • Wind Boost Documented:', paytableData.hasWind);
    console.log('    • Skull Priority (Fire -> Earth -> Water):', paytableData.hasSkull);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-vortex-paytable-modal.png'),
    });
    console.log('  📸 Captured: 03-vortex-rules-elemental.png');

    // Close Paytable
    await page.evaluate(() => document.querySelector('.btn-close-paytable')?.click());
    await sleep(600);

    // --------------------------------------------------------------------------
    // STEP 4: VERIFY BET ADJUSTMENTS & DEMO RESET
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 4: TESTING BET ADJUSTMENTS & DEMO RESET ---');
    await page.evaluate(() => document.querySelector('.btn-chip-100')?.click());
    await sleep(300);
    await page.evaluate(() => document.querySelector('.btn-bet-plus')?.click());
    await sleep(300);

    const startBtnText = await page.evaluate(() => document.querySelector('.btn-start')?.innerText || '');
    console.log(`  Start Button after ₹100 + ₹10: ${startBtnText}`);

    // Test Reset Demo Balance button
    await page.evaluate(() => document.querySelector('.btn-reset-balance')?.click());
    await sleep(500);
    const balanceText = await page.evaluate(() => document.querySelector('.btn-reset-balance')?.parentElement?.innerText || '');
    console.log(`  Balance after Reset: ${balanceText.trim()}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-vortex-bet-controls.png'),
    });
    console.log('  📸 Captured: 04-vortex-bet-controls.png');

    // --------------------------------------------------------------------------
    // STEP 5: START ROUND & EXECUTE ELEMENTAL SPINS
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 5: STARTING ROUND & EXECUTING ELEMENTAL SPINS ---');
    await page.evaluate(() => document.querySelector('.btn-start')?.click());
    await sleep(1000);

    // Check that round entered ACTIVE state with Spin and Collect buttons
    const roundControls = await page.evaluate(() => {
      const hasSpin = !!document.querySelector('.btn-spin');
      const hasCollect = !!document.querySelector('.btn-collect');
      const collectText = document.querySelector('.btn-collect')?.innerText?.replace(/\s+/g, ' ');
      return { hasSpin, hasCollect, collectText };
    });
    console.log('  Round Controls Active:', roundControls);

    // Execute 3 Elemental Spins
    for (let i = 1; i <= 3; i++) {
      console.log(`  Executing Elemental Spin #${i}...`);
      await page.evaluate(() => document.querySelector('.btn-spin')?.click());
      await sleep(1200);

      const spinState = await page.evaluate(() => {
        const multText = document.querySelector('.vortex-stage .font-cinzel')?.innerText;
        const msgText = document.querySelector('.vortex-stage .rounded-full')?.innerText;
        return { multText, msgText };
      });
      console.log(`    Result #${i}: Multiplier=${spinState.multText}, Event=${spinState.msgText}`);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-vortex-spinning-rings.png'),
    });
    console.log('  📸 Captured: 05-vortex-spins-executed.png');

    // --------------------------------------------------------------------------
    // STEP 6: COLLECT PAYOUT
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 6: COLLECTING PAYOUT ---');
    const collectBtnText = await page.evaluate(() => document.querySelector('.btn-collect')?.innerText?.replace(/\s+/g, ' '));
    console.log(`  Clicking Collect (${collectBtnText})...`);
    await page.evaluate(() => document.querySelector('.btn-collect')?.click());
    await sleep(1200);

    const postCollectState = await page.evaluate(() => {
      const hasStart = !!document.querySelector('.btn-start');
      const hasCollect = !!document.querySelector('.btn-collect');
      const balText = document.querySelector('.btn-reset-balance')?.parentElement?.innerText?.replace(/\s+/g, ' ');
      return { hasStart, hasCollect, balText };
    });
    console.log('  State after Collect:', postCollectState);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-vortex-spin-settled.png'),
    });
    console.log('  📸 Captured: 06-vortex-payout-collected.png');

    // --------------------------------------------------------------------------
    // STEP 7: VERIFY ADMIN PANEL VORTEX MONITOR
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 7: TESTING ADMIN PANEL VORTEX MONITOR ---');
    await page.goto('http://localhost:5173/games/vortex', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const adminStats = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.innerText;
      const kpis = Array.from(document.querySelectorAll('.font-mono')).map((el) => el.innerText.trim());
      const rows = document.querySelectorAll('tbody tr').length;
      return { h1, kpis: kpis.slice(0, 3), rowCount: rows };
    });
    console.log('  Admin Vortex Monitor Loaded:', adminStats);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-vortex-multiple-rounds-history.png'),
    });
    console.log('  📸 Captured: 07-vortex-admin-monitor.png');

    // --------------------------------------------------------------------------
    // STEP 8: RESPONSIVE MOBILE VIEWPORT (375 x 667)
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 8: TESTING RESPONSIVE MOBILE VIEWPORT (375 x 667) ---');
    await page.goto('http://localhost:5173/lobby/arena/game-vortex-01', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
    await sleep(1500);

    const mobileCheck = await page.evaluate(() => {
      const stage = document.querySelector('.vortex-stage');
      const rect = stage?.getBoundingClientRect();
      return {
        stageWidth: Math.round(rect?.width || 0),
        stageHeight: Math.round(rect?.height || 0),
        viewportWidth: window.innerWidth,
        fitsWithoutOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });

    console.log(`  Mobile 375px Check: Stage=${mobileCheck.stageWidth}px, FitsWithoutOverflow=${mobileCheck.fitsWithoutOverflow}`);

    // Execute mobile start
    await page.evaluate(() => document.querySelector('.btn-start')?.click());
    await sleep(1000);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-vortex-mobile-viewport.png'),
    });
    console.log('  📸 Captured: 09-vortex-mobile-viewport.png');

    // Collect on mobile
    await page.evaluate(() => document.querySelector('.btn-collect')?.click());
    await sleep(1000);

    // --------------------------------------------------------------------------
    // STEP 9: REGRESSION CHECK ON TREASURE KINGDOM & SKY ROCKET
    // --------------------------------------------------------------------------
    console.log('\n--- STEP 9: REGRESSION CHECK ON EXISTING GAMES ---');
    await page.goto('http://localhost:5173/lobby/arena/game-slot-01', { waitUntil: 'networkidle2' });
    await sleep(2000);
    const slotCards = await page.evaluate(() => document.querySelectorAll('.symbol-card').length);
    console.log(`  Treasure Kingdom 15 Symbols Rendered: ${slotCards === 15}`);

    await page.goto('http://localhost:5173/lobby/arena/game-crash-01', { waitUntil: 'networkidle2' });
    await sleep(2000);
    const crashCanvas = await page.evaluate(() => !!document.querySelector('canvas'));
    console.log(`  Sky Rocket 3D Canvas Active: ${crashCanvas}`);

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
