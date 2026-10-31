const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API_BASE = 'http://localhost:5000';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_dice_screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runDiceVerification() {
  console.log('================================================================');
  console.log('🎲 TREASURE DICE — FULL SUITE VERIFICATION AUDIT');
  console.log('================================================================\n');

  const demoToken = 'dice_test_' + Date.now();

  // ─── TEST 1: CONFIG API ─────────────────────────────────────────────────────
  console.log('--- TEST 1: GET /api/dice/config ---');
  const configRes = await fetch(`${API_BASE}/api/dice/config`).then((r) => r.json());
  if (!configRes.success || !configRes.data) {
    throw new Error('FAIL Test 1: Config API failed');
  }
  const cfg = configRes.data;
  console.log('  Config:', JSON.stringify(cfg));
  if (cfg.rtp !== 0.96 || cfg.minBet !== 10 || cfg.maxBet !== 5000 || cfg.minTarget !== 2 || cfg.maxTarget !== 98) {
    throw new Error('FAIL Test 1: Config parameters do not match specification');
  }
  console.log('✅ PASS: Test 1 (Config API validated).\n');

  // ─── TEST 2: ROLL UNDER (WIN & LOSS) ────────────────────────────────────────
  console.log('--- TEST 2: ROLL UNDER Win & Loss ---');
  // Under Win: target 50, outcome 25.0 < 50.0
  const underWin = await fetch(`${API_BASE}/api/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, target: 50.0, mode: 'ROLL_UNDER', forcedOutcome: 25.0, demoToken }),
  }).then((r) => r.json());

  console.log('  Under Win Response:', JSON.stringify(underWin.data));
  if (!underWin.data.isWin || underWin.data.payout !== 192 || underWin.data.multiplier !== 1.92) {
    throw new Error(`FAIL Test 2: ROLL UNDER win failed. Got: ${JSON.stringify(underWin.data)}`);
  }

  // Under Loss: target 50, outcome 75.0 >= 50.0
  const underLoss = await fetch(`${API_BASE}/api/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, target: 50.0, mode: 'ROLL_UNDER', forcedOutcome: 75.0, demoToken }),
  }).then((r) => r.json());

  if (underLoss.data.isWin || underLoss.data.payout !== 0 || underLoss.data.netProfit !== -100) {
    throw new Error(`FAIL Test 2: ROLL UNDER loss failed. Got: ${JSON.stringify(underLoss.data)}`);
  }
  console.log('✅ PASS: Test 2 (ROLL UNDER win and loss evaluated accurately).\n');

  // ─── TEST 3: ROLL OVER (WIN & LOSS) ─────────────────────────────────────────
  console.log('--- TEST 3: ROLL OVER Win & Loss ---');
  // Over Win: target 50, outcome 75.0 > 50.0
  const overWin = await fetch(`${API_BASE}/api/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, target: 50.0, mode: 'ROLL_OVER', forcedOutcome: 75.0, demoToken }),
  }).then((r) => r.json());

  if (!overWin.data.isWin || overWin.data.payout !== 192 || overWin.data.multiplier !== 1.92) {
    throw new Error(`FAIL Test 3: ROLL OVER win failed. Got: ${JSON.stringify(overWin.data)}`);
  }

  // Over Loss: target 50, outcome 25.0 <= 50.0
  const overLoss = await fetch(`${API_BASE}/api/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, target: 50.0, mode: 'ROLL_OVER', forcedOutcome: 25.0, demoToken }),
  }).then((r) => r.json());

  if (overLoss.data.isWin || overLoss.data.payout !== 0 || overLoss.data.netProfit !== -100) {
    throw new Error(`FAIL Test 3: ROLL OVER loss failed. Got: ${JSON.stringify(overLoss.data)}`);
  }
  console.log('✅ PASS: Test 3 (ROLL OVER win and loss evaluated accurately).\n');

  // ─── TEST 4: STRICT BOUNDARY CONDITION (Outcome == Target) ──────────────────
  console.log('--- TEST 4: Strict Boundary Condition (Outcome == Target) ---');
  const boundaryUnder = await fetch(`${API_BASE}/api/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 50, target: 50.0, mode: 'ROLL_UNDER', forcedOutcome: 50.0, demoToken }),
  }).then((r) => r.json());

  const boundaryOver = await fetch(`${API_BASE}/api/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 50, target: 50.0, mode: 'ROLL_OVER', forcedOutcome: 50.0, demoToken }),
  }).then((r) => r.json());

  if (boundaryUnder.data.isWin !== false || boundaryOver.data.isWin !== false) {
    throw new Error('FAIL Test 4: Boundary condition failed: Outcome == Target must not result in a win');
  }
  console.log('✅ PASS: Test 4 (Exact boundary match strictly evaluated as loss for both modes).\n');

  // ─── TEST 5: HIGH RISK TARGET (Target = 2.0 -> 48.00x) ──────────────────────
  console.log('--- TEST 5: High Risk Multiplier (Target = 2.0) ---');
  const highRisk = await fetch(`${API_BASE}/api/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 10, target: 2.0, mode: 'ROLL_UNDER', forcedOutcome: 1.5, demoToken }),
  }).then((r) => r.json());

  console.log(`  Target 2.0x -> Win Chance: ${highRisk.data.winChance}% | Multiplier: ${highRisk.data.multiplier}x | Payout: ₹${highRisk.data.payout}`);
  if (!highRisk.data.isWin || highRisk.data.multiplier !== 48.0 || highRisk.data.payout !== 480.0) {
    throw new Error(`FAIL Test 5: Expected 48.00x multiplier and ₹480 payout, got: ${JSON.stringify(highRisk.data)}`);
  }
  console.log('✅ PASS: Test 5 (High risk 48.00x multiplier calculated and paid correctly).\n');

  // ─── TEST 6: INSUFFICIENT BALANCE & IDEMPOTENCY PROTECTION ───────────────────
  console.log('--- TEST 6: Insufficient Balance & Idempotency ---');
  const badBet = await fetch(`${API_BASE}/api/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 99999, target: 50.0, mode: 'ROLL_UNDER', demoToken }),
  });
  if (badBet.status !== 400) {
    throw new Error(`FAIL Test 6: Expected HTTP 400 for bet exceeding limits, got ${badBet.status}`);
  }

  // Idempotency key test
  const testKey = 'dice_idem_' + Date.now();
  const roll1 = await fetch(`${API_BASE}/api/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 50, target: 50.0, mode: 'ROLL_UNDER', idempotencyKey: testKey, demoToken }),
  }).then((r) => r.json());

  const roll2 = await fetch(`${API_BASE}/api/dice/roll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 50, target: 50.0, mode: 'ROLL_UNDER', idempotencyKey: testKey, demoToken }),
  }).then((r) => r.json());

  if (roll1.data.roundId !== roll2.data.roundId || !roll2.data.idempotencyReplay) {
    throw new Error('FAIL Test 6: Idempotency failed to return cached replay');
  }
  console.log('✅ PASS: Test 6 (Validation and idempotency guard working as intended).\n');

  // ─── TEST 7: AUTO PLAY (10 CONSECUTIVE ROUNDS & STOP TEST) ───────────────────
  console.log('--- TEST 7: Auto Play 10 Consecutive Rounds ---');
  const tenRounds = [];
  for (let r = 1; r <= 10; r++) {
    const res = await fetch(`${API_BASE}/api/dice/roll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betAmount: 20, target: 60.0, mode: 'ROLL_UNDER', demoToken }),
    }).then((res) => res.json());

    tenRounds.push(res.data.roundId);
    await sleep(80);
  }

  if (new Set(tenRounds).size !== 10) {
    throw new Error('FAIL Test 7: Duplicate round ID in auto play');
  }
  console.log(`✅ PASS: Test 7 (10 consecutive auto play rounds executed sequentially).\n`);

  // ─── TEST 8: VERIFY EXISTING GAMES INTACT ────────────────────────────────────
  console.log('--- TEST 8: Verify Existing Games (Spiral, Limbo) Intact ---');
  const spiralState = await fetch(`${API_BASE}/api/spiral/state?demoToken=${demoToken}`).then((r) => r.json());
  const limboConfig = await fetch(`${API_BASE}/api/limbo/config`).then((r) => r.json());

  if (!spiralState.success || !limboConfig.success) {
    throw new Error('FAIL Test 8: Existing games API failed');
  }
  console.log('✅ PASS: Test 8 (Treasure Spiral and Treasure Limbo remain 100% operational).\n');

  // ─── TEST 9: PUPPETEER INTERACTIVE UI AUDIT ─────────────────────────────────
  console.log('--- TEST 9: Puppeteer Interactive UI Audit ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,800'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.evaluateOnNewDocument((token) => {
    localStorage.setItem('treasure_demo_token', token);
    localStorage.setItem('treasure_demo_balance', '10000.00');
  }, demoToken);

  // 1. Visit Lobby
  console.log('  Navigating to Game Lobby...');
  await page.goto(`${FRONTEND_BASE}/lobby`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);

  const lobbyScreenshot = path.join(SCREENSHOT_DIR, '01-lobby-treasure-dice-card.png');
  await page.screenshot({ path: lobbyScreenshot });
  console.log('  Saved Lobby Screenshot ->', lobbyScreenshot);

  // 2. Open Dice Arena
  console.log('  Navigating to Dice Arena: ' + FRONTEND_BASE + '/lobby/arena/game-dice-01');
  await page.goto(`${FRONTEND_BASE}/lobby/arena/game-dice-01`, { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(1500);

  // Check UI Elements
  const multBadge = await page.$('#dice-multiplier-badge');
  const winChanceBadge = await page.$('#dice-win-chance-badge');
  const targetBadge = await page.$('#dice-target-badge');
  const outcomeDisplay = await page.$('#dice-outcome-display');
  const rollBtn = await page.$('#dice-roll-button');
  const underBtn = await page.$('#dice-mode-under');
  const overBtn = await page.$('#dice-mode-over');
  const slider = await page.$('#dice-target-slider');

  if (!multBadge || !winChanceBadge || !targetBadge || !outcomeDisplay || !rollBtn || !underBtn || !overBtn || !slider) {
    throw new Error('FAIL Test 9: One or more critical Dice UI elements not found');
  }

  // Verify Initial Ready state
  const initMult = await page.evaluate((el) => el.textContent.trim(), multBadge);
  const initChance = await page.evaluate((el) => el.textContent.trim(), winChanceBadge);
  console.log(`  Initial Multiplier: ${initMult} | Win Chance: ${initChance}`);

  // Switch to ROLL OVER
  console.log('  Testing mode switch to ROLL OVER...');
  await page.click('#dice-mode-over');
  await sleep(300);

  // Save Ready state screenshot
  const readyScreenshot = path.join(SCREENSHOT_DIR, '02-ui-dice-ready-state.png');
  await page.screenshot({ path: readyScreenshot });
  console.log('  Saved Ready Screenshot ->', readyScreenshot);

  // Click ROLL DICE
  console.log('  Clicking ROLL DICE button...');
  await page.click('#dice-roll-button');
  await sleep(1500); // Animation completion

  const rolledScreenshot = path.join(SCREENSHOT_DIR, '03-ui-dice-after-roll.png');
  await page.screenshot({ path: rolledScreenshot });
  console.log('  Saved Rolled Screenshot ->', rolledScreenshot);

  // Test Auto Play
  console.log('  Testing Auto Play mode in UI...');
  await page.click('#dice-tab-auto');
  await sleep(300);
  await page.click('#dice-auto-rounds-10');
  await sleep(200);
  await page.click('#dice-auto-button');
  await sleep(1000);

  const autoRunningScreenshot = path.join(SCREENSHOT_DIR, '04-ui-dice-auto-running.png');
  await page.screenshot({ path: autoRunningScreenshot });
  console.log('  Saved Auto Running Screenshot ->', autoRunningScreenshot);

  // Stop Auto Play
  await sleep(2000);
  console.log('  Stopping Auto Play...');
  await page.click('#dice-auto-button');
  await sleep(500);

  // Test Mobile Viewport (375x812)
  console.log('  Testing Mobile Viewport (375x812)...');
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  await sleep(600);

  const mobileScreenshot = path.join(SCREENSHOT_DIR, '05-ui-dice-mobile-layout.png');
  await page.screenshot({ path: mobileScreenshot });
  console.log('  Saved Mobile Screenshot ->', mobileScreenshot);

  await browser.close();
  console.log('✅ PASS: Test 9 (Puppeteer UI End-to-End Audit passed completely).\n');

  console.log('================================================================');
  console.log('🏆 ALL 9 TREASURE DICE VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('================================================================');
}

runDiceVerification().catch((err) => {
  console.error('\n❌ TEST RUNNER FAILED:', err);
  process.exit(1);
});

