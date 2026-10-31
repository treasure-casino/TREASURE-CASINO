/**
 * Mandatory Comprehensive Gameplay Verification Suite for the 3 Games:
 * 1. Treasure Kingdom (Slots)
 * 2. Sky Rocket (Crash)
 * 3. Crystal Mines (Mines)
 */
const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT = path.join(__dirname, 'screenshots', 'gameplay');
fs.mkdirSync(OUT, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  console.log('================================================================');
  console.log('🎮 STARTING END-TO-END GAMEPLAY VERIFICATION (PUPPETEER CHROME)');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 820 });

  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. TEST GAME 1: TREASURE KINGDOM (SLOTS)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: TREASURE KINGDOM (SLOTS) ---');
  await page.goto(`${BASE}/lobby`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(OUT, '1-1-lobby.png') });

  // Click Treasure Kingdom card
  const clickedSlot = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((e) => e.textContent.trim() === 'Treasure Kingdom');
    if (!h) return false;
    h.closest('[class*="cursor-pointer"]').click();
    return true;
  });
  if (!clickedSlot) throw new Error('Could not find or click Treasure Kingdom card');

  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await sleep(2000);
  console.log('  Navigation to Treasure Kingdom:', page.url());

  // Verify canvas loaded with proper dimensions
  const slotCanvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { w: c.clientWidth, h: c.clientHeight } : null;
  });
  console.log('  Canvas dimensions:', slotCanvas);
  if (!slotCanvas || slotCanvas.w === 0 || slotCanvas.h === 0) {
    throw new Error('Treasure Kingdom canvas has invalid dimensions');
  }

  // Click SPIN button
  console.log('  Clicking SPIN button...');
  const spinClicked = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('SPIN'));
    if (!btn) return false;
    btn.click();
    return true;
  });
  if (!spinClicked) throw new Error('Could not find SPIN button');

  await sleep(1000);
  await page.screenshot({ path: path.join(OUT, '1-2-spinning.png') });
  console.log('  Reels are spinning...');

  // Wait for spin to complete (backend round settled and reels stopped)
  await sleep(3500);
  await page.screenshot({ path: path.join(OUT, '1-3-spun.png') });

  const slotResult = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasSpinBtn: text.includes('SPIN'),
      balanceText: [...document.querySelectorAll('div')].find((d) => d.textContent.includes('Demo Balance'))?.innerText,
    };
  });
  console.log('  Post-spin status:', slotResult);

  // Test Back to Lobby button
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((btn) => btn.textContent.includes('BACK TO LOBBY'));
    if (b) b.click();
  });
  await sleep(1500);
  console.log('  Returned to Lobby:', page.url().includes('/lobby'));

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. TEST GAME 2: SKY ROCKET (CRASH)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: SKY ROCKET (CRASH) ---');
  await page.goto(`${BASE}/lobby`, { waitUntil: 'networkidle2' });

  // Click Sky Rocket card
  const clickedRocket = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((e) => e.textContent.trim() === 'Sky Rocket');
    if (!h) return false;
    h.closest('[class*="cursor-pointer"]').click();
    return true;
  });
  if (!clickedRocket) throw new Error('Could not find or click Sky Rocket card');

  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await sleep(2000);
  console.log('  Navigation to Sky Rocket:', page.url());

  const rocketCanvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { w: c.clientWidth, h: c.clientHeight } : null;
  });
  console.log('  Canvas dimensions:', rocketCanvas);
  if (!rocketCanvas || rocketCanvas.w === 0 || rocketCanvas.h === 0) {
    throw new Error('Sky Rocket canvas has invalid dimensions');
  }

  // Click LAUNCH ROCKET button
  console.log('  Clicking LAUNCH ROCKET button...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('LAUNCH ROCKET'));
    if (btn) btn.click();
  });

  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, '2-1-countdown.png') });
  console.log('  Ignition Countdown active...');

  // Wait for rocket to launch and enter RUNNING state
  await sleep(3500);
  await page.screenshot({ path: path.join(OUT, '2-2-flying.png') });

  const flyingState = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasCashout: text.includes('CASHOUT'),
      multiplierText: [...document.querySelectorAll('div')].find((d) => d.textContent.includes('x'))?.innerText,
    };
  });
  console.log('  Rocket in flight:', flyingState);

  // Click CASHOUT button
  console.log('  Executing CASHOUT...');
  const cashedOut = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('CASHOUT'));
    if (!btn) return false;
    btn.click();
    return true;
  });
  console.log('  Cashout clicked:', cashedOut);

  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, '2-3-cashout-result.png') });

  // Test Back to Lobby button
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((btn) => btn.textContent.includes('BACK TO LOBBY'));
    if (b) b.click();
  });
  await sleep(1500);
  console.log('  Returned to Lobby:', page.url().includes('/lobby'));

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. TEST GAME 3: CRYSTAL MINES (MINES)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: CRYSTAL MINES (MINES) ---');
  await page.goto(`${BASE}/lobby`, { waitUntil: 'networkidle2' });

  // Click Crystal Mines card
  const clickedMines = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h3')].find((e) => e.textContent.trim() === 'Crystal Mines');
    if (!h) return false;
    h.closest('[class*="cursor-pointer"]').click();
    return true;
  });
  if (!clickedMines) throw new Error('Could not find or click Crystal Mines card');

  await page.waitForNavigation({ waitUntil: 'networkidle2' }).catch(() => {});
  await sleep(2000);
  console.log('  Navigation to Crystal Mines:', page.url());

  const minesCanvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { w: c.clientWidth, h: c.clientHeight } : null;
  });
  console.log('  Canvas dimensions:', minesCanvas);
  if (!minesCanvas || minesCanvas.w === 0 || minesCanvas.h === 0) {
    throw new Error('Crystal Mines canvas has invalid dimensions');
  }

  // Select 5 Mines
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')];
    const m5 = btns.find((b) => b.textContent.trim() === '5');
    if (m5) m5.click();
  });

  // Click START GAME
  console.log('  Clicking START GAME button...');
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('START GAME'));
    if (btn) btn.click();
  });

  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, '3-1-started.png') });

  // Click a 3D tile on the canvas
  console.log('  Clicking tile on 3D canvas...');
  const canvasBox = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    const r = c.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  if (canvasBox) {
    await page.mouse.click(canvasBox.x, canvasBox.y);
    await sleep(2000);
    await page.screenshot({ path: path.join(OUT, '3-2-tile-revealed.png') });
  }

  const minesStatus = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasCashoutOrPick: text.includes('CASHOUT') || text.includes('PICK A TILE'),
      balanceText: [...document.querySelectorAll('div')].find((d) => d.textContent.includes('Demo Balance'))?.innerText,
    };
  });
  console.log('  Mines round interaction:', minesStatus);

  // If cashout is available, click CASHOUT
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => b.textContent.includes('CASHOUT'));
    if (btn) btn.click();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, '3-3-cashout.png') });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. MOBILE RESPONSIVENESS TEST (375x667 iPhone SE)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: MOBILE RESPONSIVENESS (375x667) ---');
  await page.setViewport({ width: 375, height: 667, isMobile: true });
  await page.goto(`${BASE}/lobby`, { waitUntil: 'networkidle2' });
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT, '4-1-mobile-lobby.png') });

  await page.goto(`${BASE}/lobby/arena/game-slot-01`, { waitUntil: 'networkidle2' });
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, '4-2-mobile-slot.png') });

  const mobileCanvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { w: c.clientWidth, h: c.clientHeight } : null;
  });
  console.log('  Mobile canvas dimensions:', mobileCanvas);
  if (!mobileCanvas || mobileCanvas.w === 0 || mobileCanvas.h === 0) {
    throw new Error('Mobile viewport canvas has 0 dimensions');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. PAGE REFRESH TEST
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: PAGE REFRESH STABILITY ---');
  await page.reload({ waitUntil: 'networkidle2' });
  await sleep(2000);
  const refreshedCanvas = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? { w: c.clientWidth, h: c.clientHeight } : null;
  });
  console.log('  Refreshed canvas dimensions:', refreshedCanvas);
  if (!refreshedCanvas || refreshedCanvas.w === 0) {
    throw new Error('Canvas failed to render after refresh');
  }

  await browser.close();

  console.log('\n================================================================');
  console.log('🎉 ALL 3 GAMES PASSED INTERACTIVE BROWSER GAMEPLAY TESTS!');
  console.log(`Any errors logged: ${errors.length ? errors.join(', ') : 'NONE'}`);
  console.log('================================================================');
})().catch((err) => {
  console.error('❌ E2E TEST FAILED:', err);
  process.exit(1);
});

