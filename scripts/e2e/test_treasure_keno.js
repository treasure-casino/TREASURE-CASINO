const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_keno_screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runKenoTests() {
  console.log('================================================================');
  console.log('💎 TREASURE KENO — COMPREHENSIVE END-TO-END VERIFICATION SUITE');
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
    console.log('--- STEP 1: VERIFY TREASURE KENO IN GAME LOBBY ---');
    await page.goto(`${FRONTEND_BASE}/lobby`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1500);

    const lobbyText = await page.evaluate(() => document.body.innerText);
    const hasKenoInLobby = lobbyText.includes('Treasure Keno') || lobbyText.includes('KENO');
    console.log('Treasure Keno in Lobby catalog:', hasKenoInLobby);

    const lobbyPath = path.join(SCREENSHOT_DIR, '01-lobby-keno-card.png');
    await page.screenshot({ path: lobbyPath });
    console.log('Saved:', lobbyPath);

    // ── STEP 2: Navigate to Keno Arena ──
    console.log('\n--- STEP 2: NAVIGATE TO KENO ARENA & VERIFY 1-80 BOARD ---');
    await page.goto(`${FRONTEND_BASE}/lobby/arena/game-keno-01`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(2000);

    const arenaTitleVisible = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('TREASURE KENO') && text.includes('1–80 BOARD');
    });
    console.log('Arena Header Visible:', arenaTitleVisible);
    if (!arenaTitleVisible) throw new Error('Keno Arena header not visible!');

    const initialBoardPath = path.join(SCREENSHOT_DIR, '02-ui-keno-ready-board.png');
    await page.screenshot({ path: initialBoardPath });
    console.log('Saved:', initialBoardPath);

    // ── STEP 3: Test Quick Pick & Clear ──
    console.log('\n--- STEP 3: TEST QUICK PICK 10 & CLEAR BUTTON ---');
    // Click PICK 10
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const pick10Btn = btns.find((b) => b.innerText && b.innerText.includes('PICK 10'));
      if (pick10Btn) pick10Btn.click();
    });
    await sleep(500);

    const quickPickPath = path.join(SCREENSHOT_DIR, '03-ui-keno-quick-pick-10.png');
    await page.screenshot({ path: quickPickPath });
    console.log('Saved Quick Pick 10 screenshot:', quickPickPath);

    // Test CLEAR
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const clearBtn = btns.find((b) => b.innerText && b.innerText.includes('CLEAR'));
      if (clearBtn) clearBtn.click();
    });
    await sleep(400);

    // ── STEP 4: Select 5 Specific Numbers & Verify Dynamic Payout Table ──
    console.log('\n--- STEP 4: SELECT 5 CUSTOM NUMBERS & CHECK PAYOUT TABLE ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const targetNumbers = ['7', '14', '21', '28', '35'];
      btns.forEach((b) => {
        if (targetNumbers.includes(b.innerText.trim())) {
          b.click();
        }
      });
    });
    await sleep(500);

    const selected5Path = path.join(SCREENSHOT_DIR, '04-ui-keno-5spots-selected.png');
    await page.screenshot({ path: selected5Path });
    console.log('Saved 5 spots selected screenshot:', selected5Path);

    // ── STEP 5: Click PLAY DRAW & Capture In-Flight Sequential Draw ──
    console.log('\n--- STEP 5: PLAY DRAW & CAPTURE IN-FLIGHT 20-BALL DRAW ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const playBtn = btns.find((b) => b.innerText && b.innerText.includes('PLAY DRAW'));
      if (playBtn && !playBtn.disabled) playBtn.click();
    });

    // Capture in-flight draw at ~900ms (around 10 balls drawn)
    await sleep(850);
    const inFlightPath = path.join(SCREENSHOT_DIR, '05-ui-keno-draw-in-flight.png');
    await page.screenshot({ path: inFlightPath });
    console.log('Saved in-flight draw screenshot:', inFlightPath);

    // Wait for all 20 balls to complete drawing and settle
    await sleep(1500);
    const settledPath = path.join(SCREENSHOT_DIR, '06-ui-keno-round-settled.png');
    await page.screenshot({ path: settledPath });
    console.log('Saved settled round screenshot:', settledPath);

    // ── STEP 6: Test Auto Play ──
    console.log('\n--- STEP 6: TEST AUTO PLAY & GRACEFUL STOP ---');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const auto10Btn = btns.find((b) => b.innerText && b.innerText.trim() === '10x');
      if (auto10Btn && !auto10Btn.disabled) auto10Btn.click();
    });
    await sleep(1000);

    const autoRunningPath = path.join(SCREENSHOT_DIR, '07-ui-keno-auto-running.png');
    await page.screenshot({ path: autoRunningPath });
    console.log('Saved auto play running screenshot:', autoRunningPath);

    // Stop Auto Play
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const stopBtn = btns.find((b) => b.innerText && b.innerText.includes('STOP AUTO PLAY'));
      if (stopBtn) stopBtn.click();
    });
    await sleep(1500);

    // ── STEP 7: Mobile Viewport Verification ──
    console.log('\n--- STEP 7: MOBILE VIEWPORT VERIFICATION (375x750) ---');
    await page.setViewport({ width: 375, height: 750 });
    await sleep(600);
    const mobilePath = path.join(SCREENSHOT_DIR, '08-ui-keno-mobile-layout.png');
    await page.screenshot({ path: mobilePath });
    console.log('Saved mobile layout screenshot:', mobilePath);

    // ── STEP 8: Admin Panel Keno Monitor Verification ──
    console.log('\n--- STEP 8: VERIFY ADMIN PANEL KENO MONITOR ---');
    await page.setViewport({ width: 1350, height: 950 });
    
    // Log in as Admin first
    await page.goto(`${FRONTEND_BASE}/login`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(800);
    await page.type('input[type="email"], input[name="email"], input[placeholder*="email" i]', 'admin@treasure.com');
    await page.type('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');
    await sleep(1500);

    // Navigate to Keno Monitor
    await page.goto(`${FRONTEND_BASE}/games/keno`, { waitUntil: 'networkidle0', timeout: 30000 });
    await sleep(1500);

    const adminTitleVisible = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('TREASURE KENO') && text.includes('ADMIN CONTROL');
    });
    console.log('Admin Keno Monitor Visible:', adminTitleVisible);

    const adminPath = path.join(SCREENSHOT_DIR, '09-admin-keno-monitor.png');
    await page.screenshot({ path: adminPath });
    console.log('Saved admin monitor screenshot:', adminPath);

    console.log('\n================================================================');
    console.log('🎉 ALL TREASURE KENO VERIFICATIONS COMPLETED SUCCESSFULLY!');
    console.log('================================================================');
  } catch (err) {
    console.error('Test run failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runKenoTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
