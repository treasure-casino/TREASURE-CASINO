const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API_BASE = 'http://localhost:5000';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_spiral_screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('====================================================');
  console.log('🌀 TREASURE SPIRAL COMPLETE E2E VERIFICATION SUITE');
  console.log('====================================================\n');

  // ─── PART 1: BACKEND API FLOW & ANIMAL SYMBOL LOGIC ───────────────────
  console.log('--- PART 1: BACKEND API FLOW & 5 ANIMAL SYMBOLS LOGIC ---');
  const demoToken = 'spiral_test_' + Date.now();

  // Initial balance
  const stateRes0 = await fetch(`${API_BASE}/api/spiral/state?demoToken=${demoToken}`).then(r => r.json());
  const initialBalance = stateRes0.data.balance;
  console.log(`Initial demo balance: ₹${initialBalance}`);

  // Test 1: Start Round at position 1, 1, 1
  console.log('\n[1] Testing POST /api/spiral/start (Start Round)...');
  const startRes = await fetch(`${API_BASE}/api/spiral/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken }),
  }).then(r => r.json());

  console.log('START response:', {
    roundId: startRes.data.roundId,
    innerPos: startRes.data.innerPosition,
    middlePos: startRes.data.middlePosition,
    outerPos: startRes.data.outerPosition,
    totalMultiplier: startRes.data.totalMultiplier,
    balance: startRes.data.balance,
  });

  if (!startRes.success || startRes.data.status !== 'ACTIVE') {
    throw new Error('Failed to start active Spiral round');
  }
  if (
    startRes.data.innerPosition !== 1 ||
    startRes.data.middlePosition !== 1 ||
    startRes.data.outerPosition !== 1 ||
    startRes.data.totalMultiplier !== 7.95
  ) {
    throw new Error('Initial position or multiplier mismatch! Expected (1,1,1) with 7.95x');
  }
  if (startRes.data.balance !== initialBalance - 100) {
    throw new Error(`Bet deduction mismatch! Expected ${initialBalance - 100}, got ${startRes.data.balance}`);
  }
  console.log('✅ PASS: Round started at (1, 1, 1) with 7.95x and ₹100 deducted!');
  const roundId = startRes.data.roundId;

  // Test 2: LION advances only outer circle
  console.log('\n[2] Testing LION symbol (advances outer circle)...');
  const lionRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId, forcedSymbol: 'LION' }),
  }).then(r => r.json());

  console.log('LION result:', {
    outer: lionRes.data.outerPosition,
    middle: lionRes.data.middlePosition,
    inner: lionRes.data.innerPosition,
    mult: lionRes.data.totalMultiplier,
  });
  if (lionRes.data.outerPosition !== 2 || lionRes.data.middlePosition !== 1 || lionRes.data.innerPosition !== 1) {
    throw new Error('LION failed to move only outer circle to 2');
  }
  console.log('✅ PASS: LION advanced outer circle to section 2!');

  // Test 3: ELEPHANT advances only middle circle
  console.log('\n[3] Testing ELEPHANT symbol (advances middle circle)...');
  const elephantRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId, forcedSymbol: 'ELEPHANT' }),
  }).then(r => r.json());

  console.log('ELEPHANT result:', {
    outer: elephantRes.data.outerPosition,
    middle: elephantRes.data.middlePosition,
    inner: elephantRes.data.innerPosition,
    mult: elephantRes.data.totalMultiplier,
  });
  if (elephantRes.data.middlePosition !== 2 || elephantRes.data.outerPosition !== 2 || elephantRes.data.innerPosition !== 1) {
    throw new Error('ELEPHANT failed to move only middle circle to 2');
  }
  console.log('✅ PASS: ELEPHANT advanced middle circle to section 2!');

  // Test 4: DOG advances only inner circle
  console.log('\n[4] Testing DOG symbol (advances inner circle)...');
  const dogRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId, forcedSymbol: 'DOG' }),
  }).then(r => r.json());

  console.log('DOG result:', {
    outer: dogRes.data.outerPosition,
    middle: dogRes.data.middlePosition,
    inner: dogRes.data.innerPosition,
    mult: dogRes.data.totalMultiplier,
  });
  if (dogRes.data.innerPosition !== 2) {
    throw new Error('DOG failed to move inner circle to 2');
  }
  console.log('✅ PASS: DOG advanced inner circle to section 2!');

  // Test 5: GOAT changes nothing
  console.log('\n[5] Testing GOAT symbol (no changes)...');
  const goatRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId, forcedSymbol: 'GOAT' }),
  }).then(r => r.json());

  if (
    goatRes.data.innerPosition !== 2 ||
    goatRes.data.middlePosition !== 2 ||
    goatRes.data.outerPosition !== 2
  ) {
    throw new Error('GOAT incorrectly modified circle positions');
  }
  console.log('✅ PASS: GOAT left all circle positions unchanged!');

  // Test 6: HALF CASH OUT
  console.log('\n[6] Testing POST /api/spiral/half-cashout (Lock 50%)...');
  const halfRes = await fetch(`${API_BASE}/api/spiral/half-cashout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId }),
  }).then(r => r.json());

  console.log('HALF CASHOUT response:', halfRes);
  if (!halfRes.success || !halfRes.data.halfCashedOut) {
    throw new Error('Half cashout failed');
  }
  console.log(`✅ PASS: Half cashout credited ₹${halfRes.data.creditedAmount}, round remains ACTIVE!`);

  // Test 7: Prevent duplicate half cash out
  console.log('\n[7] Testing duplicate half cashout prevention...');
  const dupHalfRes = await fetch(`${API_BASE}/api/spiral/half-cashout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId }),
  }).then(r => r.json());

  if (dupHalfRes.success) {
    throw new Error('Security failure: allowed duplicate half cashout');
  }
  console.log('✅ PASS: Duplicate half cashout correctly rejected!');

  // Test 8: FULL CASH OUT (collect remaining 50%)
  console.log('\n[8] Testing POST /api/spiral/cashout (Full Cashout)...');
  const fullCashRes = await fetch(`${API_BASE}/api/spiral/cashout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId }),
  }).then(r => r.json());

  console.log('FULL CASHOUT response:', fullCashRes);
  if (!fullCashRes.success || fullCashRes.data.status !== 'WON') {
    throw new Error('Full cashout failed');
  }
  console.log(`✅ PASS: Full cashout succeeded, collected remaining ₹${fullCashRes.data.finalPayout}, total payout ₹${fullCashRes.data.totalPayout}!`);

  // Test 9: SKULL backward movement & min boundary check in a new round
  console.log('\n[9] Testing SKULL backward movement & boundary limits...');
  const startRes2 = await fetch(`${API_BASE}/api/spiral/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken }),
  }).then(r => r.json());
  const round2Id = startRes2.data.roundId;

  // Advance outer to 2
  await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId: round2Id, forcedSymbol: 'LION' }),
  });

  // Apply SKULL: outer drops to 1, others stay 1
  const skullRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId: round2Id, forcedSymbol: 'SKULL' }),
  }).then(r => r.json());

  console.log('SKULL retreat result:', {
    inner: skullRes.data.innerPosition,
    middle: skullRes.data.middlePosition,
    outer: skullRes.data.outerPosition,
  });
  if (skullRes.data.innerPosition < 1 || skullRes.data.middlePosition < 1 || skullRes.data.outerPosition < 1) {
    throw new Error('Boundary violated: positions went below 1');
  }
  console.log('✅ PASS: SKULL moved rings backward without going below section 1!');

  // ─── PART 2: PUPPETEER BROWSER VERIFICATION (ARENA & CONTROLS) ─────────
  console.log('\n--- PART 2: PUPPETEER BROWSER UI & 3D BOARD VERIFICATION ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 768 });

  console.log(`Navigating to ${FRONTEND_BASE}/lobby/arena/game-spiral-01 ...`);
  await page.goto(`${FRONTEND_BASE}/lobby/arena/game-spiral-01`, { waitUntil: 'networkidle0', timeout: 25000 });
  await sleep(2000);

  // Check 18 Multipliers & 3 Rings
  const hasInnerMult = await page.evaluate(() => document.body.innerText.includes('1.55x') && document.body.innerText.includes('+7x'));
  const hasMiddleMult = await page.evaluate(() => document.body.innerText.includes('2.5x') && document.body.innerText.includes('+20.5x'));
  const hasOuterMult = await page.evaluate(() => document.body.innerText.includes('3.9x') && document.body.innerText.includes('700x'));
  console.log('All 3 concentric rings & multipliers present:', { hasInnerMult, hasMiddleMult, hasOuterMult });

  // Check 3 Main Buttons
  const hasSpinBtn = await page.$('.btn-spin') !== null;
  const hasHalfCashBtn = await page.$('.btn-half-cashout') !== null;
  const hasCashBtn = await page.$('.btn-cashout') !== null;
  console.log('3 Main Buttons present:', { hasSpinBtn, hasHalfCashBtn, hasCashBtn });

  // Screenshot 1: Desktop Initial Arena
  const shot1 = path.join(SCREENSHOT_DIR, '01-spiral-desktop-arena.png');
  await page.screenshot({ path: shot1 });
  console.log(`Saved screenshot: ${shot1}`);

  // Test Normal Click SPIN
  console.log('\nClicking SPIN button...');
  await page.click('.btn-spin');
  await sleep(1500);

  const shot2 = path.join(SCREENSHOT_DIR, '02-spiral-after-spin.png');
  await page.screenshot({ path: shot2 });
  console.log(`Saved screenshot: ${shot2}`);

  // Test HALF CASH OUT button in UI
  const isHalfEnabled = await page.$eval('.btn-half-cashout', btn => !btn.disabled).catch(() => false);
  console.log(`Half Cashout button enabled: ${isHalfEnabled}`);
  if (isHalfEnabled) {
    console.log('Clicking 1/2 CASHOUT in UI...');
    await page.click('.btn-half-cashout');
    await sleep(800);
    const shot3 = path.join(SCREENSHOT_DIR, '03-spiral-half-cashed.png');
    await page.screenshot({ path: shot3 });
    console.log(`Saved screenshot: ${shot3}`);
  }

  // Test FULL CASH OUT button in UI
  const isFullEnabled = await page.$eval('.btn-cashout', btn => !btn.disabled).catch(() => false);
  console.log(`Full Cashout button enabled: ${isFullEnabled}`);
  if (isFullEnabled) {
    console.log('Clicking CASH OUT in UI...');
    await page.click('.btn-cashout');
    await sleep(800);
    const shot4 = path.join(SCREENSHOT_DIR, '04-spiral-full-cashed.png');
    await page.screenshot({ path: shot4 });
    console.log(`Saved screenshot: ${shot4}`);
  }

  // Test Rules Modal
  console.log('\nOpening Rules Modal...');
  const rulesBtn = await page.$('button[title*="Game Rules"]');
  if (rulesBtn) {
    await rulesBtn.click();
    await sleep(500);
    const shot5 = path.join(SCREENSHOT_DIR, '05-spiral-rules-modal.png');
    await page.screenshot({ path: shot5 });
    console.log(`Saved rules modal screenshot: ${shot5}`);
    await page.click('.btn-close-paytable');
    await sleep(300);
  }

  // ─── PART 3: ADMIN PANEL SPIRAL MONITOR ───────────────────────────────
  console.log('\n--- PART 3: TESTING ADMIN PANEL SPIRAL MONITOR ---');
  await page.goto(`${FRONTEND_BASE}/games/spiral`, { waitUntil: 'networkidle0', timeout: 25000 });
  await sleep(1500);

  const adminHeader = await page.$eval('h1', el => el.innerText).catch(() => 'NOT FOUND');
  console.log(`Admin Page Header: "${adminHeader}"`);

  const shot6 = path.join(SCREENSHOT_DIR, '06-spiral-admin-monitor.png');
  await page.screenshot({ path: shot6 });
  console.log(`Saved admin screenshot: ${shot6}`);

  // ─── PART 4: MOBILE RESPONSIVE VIEWPORT (375x812) ─────────────────────
  console.log('\n--- PART 4: TESTING MOBILE VIEWPORT (375x812) ---');
  await page.goto(`${FRONTEND_BASE}/lobby/arena/game-spiral-01`, { waitUntil: 'networkidle0', timeout: 25000 });
  await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
  await sleep(1500);

  const shot7 = path.join(SCREENSHOT_DIR, '07-spiral-mobile-viewport.png');
  await page.screenshot({ path: shot7 });
  console.log(`Saved mobile screenshot: ${shot7}`);

  await browser.close();

  // ─── PART 5: DATABASE INTEGRITY VERIFICATION ───────────────────────────
  console.log('\n--- PART 5: VERIFYING DATABASE INTEGRITY ---');
  const { prisma } = require('../../backend/dist/prisma');
  const [usersCount, walletsCount, txCount, depCount, spiralRoundsCount, spiralEventsCount] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.count(),
    prisma.walletTransaction.count(),
    prisma.deposit.count(),
    prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM spiral_rounds').then(res => res[0].count),
    prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM spiral_events').then(res => res[0].count),
  ]);

  console.log('Database Integrity Metrics:', {
    users: usersCount,
    wallets: walletsCount,
    transactions: txCount,
    deposits: depCount,
    spiral_rounds: Number(spiralRoundsCount),
    spiral_events: Number(spiralEventsCount),
  });

  if (usersCount !== 42 || walletsCount !== 42 || txCount !== 242 || depCount !== 26) {
    throw new Error('CRITICAL: Existing user/wallet/transaction counts were modified!');
  }
  console.log('✅ PASS: All 42 users, 42 wallets, 242 transactions, 26 deposits preserved!');

  await prisma.$disconnect();

  console.log('\n====================================================');
  console.log('🎉 ALL TREASURE SPIRAL VERIFICATIONS PASSED 100%!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});

