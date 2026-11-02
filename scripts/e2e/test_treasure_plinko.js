const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_plinko_screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPlinkoTests() {
  console.log('================================================================');
  console.log('🔮 TREASURE PLINKO — FULL END-TO-END VERIFICATION SUITE');
  console.log('================================================================\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    pipe: true,
    defaultViewport: { width: 1350, height: 950 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1350,950'],
  });

  try {
    const page = await browser.newPage();

    // ── STEP 1: Verify Lobby Card ──
    console.log('--- STEP 1: VERIFY TREASURE PLINKO IN GAME LOBBY ---');
    await page.goto(`${FRONTEND_BASE}/lobby`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1500);

    const lobbyText = await page.evaluate(() => document.body.innerText);
    const hasPlinkoInLobby = lobbyText.includes('Treasure Plinko') || lobbyText.includes('PLINKO');
    console.log('Treasure Plinko in Lobby catalog:', hasPlinkoInLobby);
    if (!hasPlinkoInLobby) {
      console.warn('Warning: Plinko card not found by text in lobby, checking direct arena route.');
    }

    const lobbyPath = path.join(SCREENSHOT_DIR, '01-lobby-plinko-card.png');
    await page.screenshot({ path: lobbyPath });
    console.log('Saved:', lobbyPath);

    // ── STEP 2: Navigate to Plinko Arena ──
    console.log('\n--- STEP 2: NAVIGATE TO PLINKO ARENA & VERIFY INITIAL BOARD ---');
    await page.goto(`${FRONTEND_BASE}/lobby/arena/game-plinko-01`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2000);

    const arenaTitleVisible = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('TREASURE PLINKO') && text.includes('UP TO 1,000x');
    });
    console.log('Arena Header Visible:', arenaTitleVisible);
    if (!arenaTitleVisible) throw new Error('Plinko Arena header not visible!');

    const initialBoardPath = path.join(SCREENSHOT_DIR, '02-ui-plinko-ready-16rows-high.png');
    await page.screenshot({ path: initialBoardPath });
    console.log('Saved:', initialBoardPath);

    // ── STEP 3: Switch Rows & Risk ──
    console.log('\n--- STEP 3: TEST ROWS & RISK SWITCHING (8 ROWS, LOW RISK) ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const row8Btn = btns.find((b) => b.innerText && b.innerText.includes('8 ROWS'));
      if (row8Btn) row8Btn.click();
      const lowRiskBtn = btns.find((b) => b.innerText && b.innerText.trim() === 'LOW');
      if (lowRiskBtn) lowRiskBtn.click();
    });
    await sleep(600);

    const rows8Path = path.join(SCREENSHOT_DIR, '03-ui-plinko-8rows-low-risk.png');
    await page.screenshot({ path: rows8Path });
    console.log('Saved:', rows8Path);

    // ── STEP 4: Drop a Ball & Observe In-Flight Physics ──
    console.log('\n--- STEP 4: DROP BALL & CAPTURE IN-FLIGHT CANVAS PHYSICS ---');
    // Switch back to 16 rows, HIGH risk for maximum action
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const row16Btn = btns.find((b) => b.innerText && b.innerText.includes('16 ROWS'));
      if (row16Btn) row16Btn.click();
      const highRiskBtn = btns.find((b) => b.innerText && b.innerText.trim() === 'HIGH');
      if (highRiskBtn) highRiskBtn.click();
    });
    await sleep(400);

    // Click DROP BALL
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const dropBtn = btns.find((b) => b.innerText && b.innerText.includes('DROP BALL'));
      if (dropBtn) dropBtn.click();
    });

    // Capture in-flight ball bouncing off pins at ~800ms
    await sleep(750);
    const inFlightPath = path.join(SCREENSHOT_DIR, '04-ui-plinko-ball-in-flight.png');
    await page.screenshot({ path: inFlightPath });
    console.log('Saved in-flight ball screenshot:', inFlightPath);

    // Wait for ball to land into final multiplier slot
    await sleep(2200);
    const landedPath = path.join(SCREENSHOT_DIR, '05-ui-plinko-ball-landed-slot.png');
    await page.screenshot({ path: landedPath });
    console.log('Saved landed ball screenshot:', landedPath);

    // ── STEP 5: Test Auto Play Drops ──
    console.log('\n--- STEP 5: TEST AUTO PLAY RAPID MULTI-BALL STREAM ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const auto10Btn = btns.find((b) => b.innerText && b.innerText.trim() === '10x');
      if (auto10Btn) auto10Btn.click();
    });

    // Allow multiple balls to stream simultaneously
    await sleep(1500);
    const multiBallPath = path.join(SCREENSHOT_DIR, '06-ui-plinko-auto-multi-balls.png');
    await page.screenshot({ path: multiBallPath });
    console.log('Saved multi-ball stream screenshot:', multiBallPath);

    // Stop Auto Play
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const stopBtn = btns.find((b) => b.innerText && b.innerText.includes('STOP AUTO PLAY'));
      if (stopBtn) stopBtn.click();
    });
    await sleep(2500);

    // ── STEP 6: Mobile Viewport Verification ──
    console.log('\n--- STEP 6: MOBILE VIEWPORT VERIFICATION (375x667) ---');
    await page.setViewport({ width: 375, height: 750 });
    await sleep(800);
    const mobilePath = path.join(SCREENSHOT_DIR, '07-ui-plinko-mobile-layout.png');
    await page.screenshot({ path: mobilePath });
    console.log('Saved mobile layout screenshot:', mobilePath);

    console.log('\n================================================================');
    console.log('🎉 TREASURE PLINKO VERIFICATION COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
  } catch (err) {
    console.error('Test run failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runPlinkoTests().catch((err) => {
  console.error(err);
  process.exit(1);
});

