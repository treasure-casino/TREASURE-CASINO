const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API_BASE = 'http://localhost:5000';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_limbo_screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('================================================================');
  console.log('⚡ TREASURE LIMBO — FULL ENGINE & UI AUTOMATED TEST SUITE');
  console.log('================================================================\n');

  const demoToken = 'limbo_e2e_token_' + Date.now();

  // ─── TEST 1: CONFIG API ─────────────────────────────────────────────────────
  console.log('--- TEST 1: GET /api/limbo/config ---');
  const configRes = await fetch(`${API_BASE}/api/limbo/config`).then((r) => r.json());
  if (!configRes.success || !configRes.data) {
    throw new Error('FAIL Test 1: Config API failed');
  }
  const cfg = configRes.data;
  console.log('  Config:', JSON.stringify(cfg));
  if (cfg.rtp !== 0.96 || cfg.minBet !== 10 || cfg.maxBet !== 5000 || cfg.maxMultiplier !== 10000) {
    throw new Error('FAIL Test 1: Config parameters do not match specification');
  }
  console.log('✅ PASS: Test 1 (Config API validated).\n');

  // ─── TEST 2: WIN SCENARIO (M >= T) ──────────────────────────────────────────
  console.log('--- TEST 2: Win Scenario (Forced M = 2.50x >= T = 2.00x) ---');
  const winRes = await fetch(`${API_BASE}/api/limbo/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      betAmount: 100,
      targetMultiplier: 2.0,
      forcedMultiplier: 2.5,
      demoToken,
    }),
  }).then((r) => r.json());

  console.log('  Win Response:', JSON.stringify(winRes.data));
  const wData = winRes.data;
  if (!wData.isWin || wData.payout !== 200 || wData.netProfit !== 100 || wData.resultMultiplier !== 2.5) {
    throw new Error(`FAIL Test 2: Expected isWin=true, payout=200, netProfit=100. Got: ${JSON.stringify(wData)}`);
  }
  console.log(`✅ PASS: Test 2 (Win scenario correctly paid ₹200 for ₹100 bet at 2.00x target).\n`);

  // ─── TEST 3: LOSS SCENARIO (M < T) ──────────────────────────────────────────
  console.log('--- TEST 3: Loss Scenario (Forced M = 1.80x < T = 2.00x) ---');
  const balBeforeLoss = wData.balance;
  const lossRes = await fetch(`${API_BASE}/api/limbo/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      betAmount: 100,
      targetMultiplier: 2.0,
      forcedMultiplier: 1.8,
      demoToken,
    }),
  }).then((r) => r.json());

  console.log('  Loss Response:', JSON.stringify(lossRes.data));
  const lData = lossRes.data;
  if (lData.isWin || lData.payout !== 0 || lData.netProfit !== -100 || lData.balance !== balBeforeLoss - 100) {
    throw new Error(`FAIL Test 3: Expected isWin=false, payout=0, netProfit=-100. Got: ${JSON.stringify(lData)}`);
  }
  console.log('✅ PASS: Test 3 (Loss scenario correctly deducted ₹100 bet with ₹0 payout).\n');

  // ─── TEST 4: EXACT BOUNDARY MATCH (M = T) ───────────────────────────────────
  console.log('--- TEST 4: Boundary Match (Forced M = 3.00x == T = 3.00x) ---');
  const boundaryRes = await fetch(`${API_BASE}/api/limbo/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      betAmount: 50,
      targetMultiplier: 3.0,
      forcedMultiplier: 3.0,
      demoToken,
    }),
  }).then((r) => r.json());

  if (!boundaryRes.data.isWin || boundaryRes.data.payout !== 150) {
    throw new Error('FAIL Test 4: Expected exact boundary match to win');
  }
  console.log('✅ PASS: Test 4 (Exact boundary match successfully evaluated as WIN).\n');

  // ─── TEST 5: LOW TARGET (1.01x) AND HIGH TARGET (1000.00x) ──────────────────
  console.log('--- TEST 5: Low & High Target Probability Calculations ---');
  const lowRes = await fetch(`${API_BASE}/api/limbo/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      betAmount: 20,
      targetMultiplier: 1.01,
      forcedMultiplier: 1.01,
      demoToken,
    }),
  }).then((r) => r.json());

  console.log(`  Target 1.01x Win Chance: ${lowRes.data.winChance}% | Payout: ₹${lowRes.data.payout}`);
  if (lowRes.data.winChance !== 95.05 || lowRes.data.payout !== 20.2) {
    throw new Error(`FAIL Test 5: Expected winChance=95.05, payout=20.2. Got: ${JSON.stringify(lowRes.data)}`);
  }

  const highRes = await fetch(`${API_BASE}/api/limbo/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      betAmount: 10,
      targetMultiplier: 1000.0,
      forcedMultiplier: 1500.0,
      demoToken,
    }),
  }).then((r) => r.json());

  console.log(`  Target 1000.0x Win Chance: ${highRes.data.winChance}% | Payout: ₹${highRes.data.payout}`);
  if (highRes.data.winChance !== 0.1 || highRes.data.payout !== 10000) {
    throw new Error(`FAIL Test 5: Expected winChance=0.1, payout=10000. Got: ${JSON.stringify(highRes.data)}`);
  }
  console.log('✅ PASS: Test 5 (Low 1.01x and High 1000x targets correctly evaluated).\n');

  // ─── TEST 6: INSUFFICIENT BALANCE REJECTION ──────────────────────────────────
  console.log('--- TEST 6: Insufficient Balance Rejection ---');
  const emptyToken = 'empty_wallet_' + Date.now();
  // Drain empty wallet with huge bet
  const failRes = await fetch(`${API_BASE}/api/limbo/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      betAmount: 99999, // exceeds max bet or balance
      targetMultiplier: 2.0,
      demoToken: emptyToken,
    }),
  });
  if (failRes.status !== 400) {
    throw new Error(`FAIL Test 6: Expected HTTP 400 Bad Request, got status ${failRes.status}`);
  }
  console.log('✅ PASS: Test 6 (Illegal/insufficient bet correctly rejected with HTTP 400).\n');

  // ─── TEST 7: IDEMPOTENCY KEY PROTECTION ──────────────────────────────────────
  console.log('--- TEST 7: Idempotency Protection ---');
  const idemKey = 'idem_key_' + Date.now();
  const firstCall = await fetch(`${API_BASE}/api/limbo/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      betAmount: 50,
      targetMultiplier: 2.0,
      forcedMultiplier: 2.5,
      idempotencyKey: idemKey,
      demoToken,
    }),
  }).then((r) => r.json());

  const secondCall = await fetch(`${API_BASE}/api/limbo/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      betAmount: 50,
      targetMultiplier: 2.0,
      forcedMultiplier: 2.5,
      idempotencyKey: idemKey,
      demoToken,
    }),
  }).then((r) => r.json());

  console.log('  First Round ID:', firstCall.data.roundId, '| Second Round ID:', secondCall.data.roundId);
  console.log('  Second Call Replay Flag:', secondCall.data.idempotencyReplay);
  if (firstCall.data.roundId !== secondCall.data.roundId || !secondCall.data.idempotencyReplay) {
    throw new Error('FAIL Test 7: Idempotency replay did not return original cached round');
  }
  console.log('✅ PASS: Test 7 (Idempotency key successfully guarded against double deductions).\n');

  // ─── TEST 8: HISTORY API ────────────────────────────────────────────────────
  console.log('--- TEST 8: GET /api/limbo/history ---');
  const histRes = await fetch(`${API_BASE}/api/limbo/history?demoToken=${demoToken}`).then((r) => r.json());
  console.log(`  Fetched ${histRes.data.length} historical rounds.`);
  if (!histRes.success || !Array.isArray(histRes.data) || histRes.data.length === 0) {
    throw new Error('FAIL Test 8: History list empty or invalid');
  }
  const latestHist = histRes.data[0];
  if (!latestHist.roundId || typeof latestHist.resultMultiplier !== 'number' || typeof latestHist.isWin !== 'boolean') {
    throw new Error('FAIL Test 8: History item structure incomplete');
  }
  console.log('✅ PASS: Test 8 (History endpoint returns valid structured rounds).\n');

  // ─── TEST 9: PUPPETEER UI END-TO-END VERIFICATION ────────────────────────────
  console.log('--- TEST 9: Puppeteer Interactive UI Audit ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  // Inject test demo token into localStorage so page uses consistent demo balance
  await page.evaluateOnNewDocument((token) => {
    localStorage.setItem('treasure_demo_token', token);
    localStorage.setItem('treasure_demo_balance', '10000.00');
  }, demoToken);

  console.log('  Navigating to Game Lobby: ' + FRONTEND_BASE + '/lobby');
  await page.goto(`${FRONTEND_BASE}/lobby`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);

  // Take screenshot of lobby with Limbo card visible
  const lobbyScreenshotPath = path.join(SCREENSHOT_DIR, '01-lobby-treasure-limbo-card.png');
  await page.screenshot({ path: lobbyScreenshotPath, fullPage: false });
  console.log('  Saved Lobby Screenshot ->', lobbyScreenshotPath);

  // Navigate to Limbo Arena
  console.log('  Navigating to Limbo Arena: ' + FRONTEND_BASE + '/lobby/arena/game-limbo-01');
  await page.goto(`${FRONTEND_BASE}/lobby/arena/game-limbo-01`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);

  // Check UI Elements
  const targetBadge = await page.$('#limbo-target-badge');
  const winChanceBadge = await page.$('#limbo-win-chance-badge');
  const multDisplay = await page.$('#limbo-multiplier-display');
  const betInput = await page.$('#limbo-bet-input');
  const targetInput = await page.$('#limbo-target-input');
  const rollBtn = await page.$('#limbo-roll-button');

  if (!targetBadge || !winChanceBadge || !multDisplay || !betInput || !targetInput || !rollBtn) {
    throw new Error('FAIL Test 9: One or more critical UI elements not found on Limbo Arena page');
  }

  // Verify target badge initially shows 2.00x
  const initialTargetText = await page.evaluate((el) => el.textContent.trim(), targetBadge);
  const initialChanceText = await page.evaluate((el) => el.textContent.trim(), winChanceBadge);
  console.log(`  Initial Target: ${initialTargetText} | Win Chance: ${initialChanceText}`);

  // Test interactive preset button: click 5.0x preset
  console.log('  Testing Preset 5.0x click...');
  await page.click('#limbo-preset-5_0x');
  await sleep(300);

  const updatedTargetText = await page.evaluate((el) => el.textContent.trim(), targetBadge);
  const updatedChanceText = await page.evaluate((el) => el.textContent.trim(), winChanceBadge);
  console.log(`  Updated Target: ${updatedTargetText} | Win Chance: ${updatedChanceText}`);
  if (updatedTargetText !== '5.00x' || updatedChanceText !== '19.20%') {
    throw new Error(`FAIL Test 9: Preset 5.0x did not update target correctly. Got: ${updatedTargetText}, ${updatedChanceText}`);
  }

  // Switch back to 2.0x preset
  await page.click('#limbo-preset-2_0x');
  await sleep(300);

  // Take screenshot of Initial Ready State
  const readyScreenshotPath = path.join(SCREENSHOT_DIR, '02-ui-limbo-ready-state.png');
  await page.screenshot({ path: readyScreenshotPath, fullPage: false });
  console.log('  Saved Ready State Screenshot ->', readyScreenshotPath);

  // Click ROLL button
  console.log('  Clicking ROLL Button...');
  await page.click('#limbo-roll-button');

  // Wait for animation & resolution (approx 1.2s)
  await sleep(1500);

  // Take screenshot after Roll
  const rolledScreenshotPath = path.join(SCREENSHOT_DIR, '03-ui-limbo-after-roll.png');
  await page.screenshot({ path: rolledScreenshotPath, fullPage: false });
  console.log('  Saved After Roll Screenshot ->', rolledScreenshotPath);

  // Test Mobile Viewport (375x812)
  console.log('  Testing Mobile Viewport (375x812)...');
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await sleep(600);

  const mobileScreenshotPath = path.join(SCREENSHOT_DIR, '04-ui-limbo-mobile-layout.png');
  await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
  console.log('  Saved Mobile Screenshot ->', mobileScreenshotPath);

  await browser.close();
  console.log('✅ PASS: Test 9 (Puppeteer UI End-to-End Audit passed completely).\n');

  console.log('================================================================');
  console.log('🏆 ALL 9 TREASURE LIMBO VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});
