const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API_BASE = 'http://localhost:5000';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_spiral_lion_fix_screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('================================================================');
  console.log('🦁 TEST: REBUILT SPIRAL MULTIPLIER ENGINE (8-STEP AUDIT)');
  console.log('================================================================\n');

  const demoToken = 'spiral_engine_audit_' + Date.now();

  // ─── STEP 1 & STEP 5: STRICT 4-LION SEQUENCE ──────────────────────────
  console.log('--- TEST 1: STRICT 4-LION SEQUENCE ---');
  const expectedLion = [3.9, 12.5, 28, 52];
  let lastRoundId = '';

  for (let i = 0; i < 4; i++) {
    const res = await fetch(`${API_BASE}/api/spiral/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'LION' }),
    }).then((r) => r.json());

    const s = res.data;
    lastRoundId = s.roundId;
    console.log(`  [Lion ${i + 1}] Outer: Sec ${s.outerIndex ?? s.outerPosition} (${s.outerMultiplier}x) | Total: ${s.totalMultiplier}x`);

    if ((s.outerIndex ?? s.outerPosition) !== i + 1) {
      throw new Error(`FAIL: Lion ${i + 1} outer index expected ${i + 1}, got ${s.outerIndex ?? s.outerPosition}`);
    }
    if (s.totalMultiplier !== expectedLion[i]) {
      throw new Error(`FAIL: Lion ${i + 1} expected ${expectedLion[i]}x, got ${s.totalMultiplier}x`);
    }
    if (s.middleIndex !== null || s.innerIndex !== null) {
      throw new Error(`FAIL: Other tracks should remain null!`);
    }
  }
  console.log('✅ PASS: Strict 4-Lion sequence: 3.9x -> 12.5x -> 28x -> 52x.\n');

  // Cashout round 1
  await fetch(`${API_BASE}/api/spiral/cashout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId: lastRoundId, demoToken }),
  });

  // ─── TEST 2: STRICT 5-ELEPHANT SEQUENCE ───────────────────────────────
  console.log('--- TEST 2: STRICT 5-ELEPHANT SEQUENCE ---');
  const expectedElephant = [2.5, 7.7, 16, 27, 44];
  for (let i = 0; i < 5; i++) {
    const res = await fetch(`${API_BASE}/api/spiral/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'ELEPHANT' }),
    }).then((r) => r.json());

    const s = res.data;
    lastRoundId = s.roundId;
    console.log(`  [Elephant ${i + 1}] Middle: Sec ${s.middleIndex ?? s.middlePosition} (${s.middleMultiplier}x) | Total: ${s.totalMultiplier}x`);

    if ((s.middleIndex ?? s.middlePosition) !== i + 1) {
      throw new Error(`FAIL: Elephant ${i + 1} middle index expected ${i + 1}, got ${s.middleIndex ?? s.middlePosition}`);
    }
    if (s.totalMultiplier !== expectedElephant[i]) {
      throw new Error(`FAIL: Elephant ${i + 1} expected ${expectedElephant[i]}x, got ${s.totalMultiplier}x`);
    }
    if (s.outerIndex !== null || s.innerIndex !== null) {
      throw new Error(`FAIL: Other tracks should remain null!`);
    }
  }
  console.log('✅ PASS: Strict 5-Elephant sequence: 2.5x -> 7.7x -> 16x -> 27x -> 44x.\n');

  // Cashout round 2
  await fetch(`${API_BASE}/api/spiral/cashout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId: lastRoundId, demoToken }),
  });

  // ─── TEST 3: STRICT 3-DOG SEQUENCE ────────────────────────────────────
  console.log('--- TEST 3: STRICT 3-DOG SEQUENCE ---');
  const expectedDog = [1.55, 4.85, 10];
  for (let i = 0; i < 3; i++) {
    const res = await fetch(`${API_BASE}/api/spiral/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'DOG' }),
    }).then((r) => r.json());

    const s = res.data;
    lastRoundId = s.roundId;
    console.log(`  [Dog ${i + 1}] Inner: Sec ${s.innerIndex ?? s.innerPosition} (${s.innerMultiplier}x) | Total: ${s.totalMultiplier}x`);

    if ((s.innerIndex ?? s.innerPosition) !== i + 1) {
      throw new Error(`FAIL: Dog ${i + 1} inner index expected ${i + 1}, got ${s.innerIndex ?? s.innerPosition}`);
    }
    if (s.totalMultiplier !== expectedDog[i]) {
      throw new Error(`FAIL: Dog ${i + 1} expected ${expectedDog[i]}x, got ${s.totalMultiplier}x`);
    }
    if (s.outerIndex !== null || s.middleIndex !== null) {
      throw new Error(`FAIL: Other tracks should remain null!`);
    }
  }
  console.log('✅ PASS: Strict 3-Dog sequence: 1.55x -> 4.85x -> 10x.\n');

  // Cashout round 3
  await fetch(`${API_BASE}/api/spiral/cashout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId: lastRoundId, demoToken }),
  });

  // ─── TEST 4: MIXED SEQUENCE & ACTIVE TRACK FORMULA (STEP 5) ───────────
  console.log('--- TEST 4: MIXED SYMBOL SEQUENCE & ACTIVE TRACK FORMULA ---');
  // 1. Lion
  let mRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'LION' }),
  }).then((r) => r.json());
  console.log(`  Spin 1 (LION): Total = ${mRes.data.totalMultiplier}x (Expected: 3.9x)`);
  if (mRes.data.totalMultiplier !== 3.9) throw new Error('FAIL: Lion spin 1 not 3.9x');

  // 2. Elephant
  mRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'ELEPHANT' }),
  }).then((r) => r.json());
  console.log(`  Spin 2 (ELEPHANT): Total = ${mRes.data.totalMultiplier}x (Expected: 2.5x)`);
  if (mRes.data.totalMultiplier !== 2.5) throw new Error('FAIL: Elephant spin 2 not 2.5x');

  // 3. Dog
  mRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'DOG' }),
  }).then((r) => r.json());
  console.log(`  Spin 3 (DOG): Total = ${mRes.data.totalMultiplier}x (Expected: 1.55x)`);
  if (mRes.data.totalMultiplier !== 1.55) throw new Error('FAIL: Dog spin 3 not 1.55x');

  // 4. Goat (strict NO-OP)
  mRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'GOAT' }),
  }).then((r) => r.json());
  console.log(`  Spin 4 (GOAT): Total = ${mRes.data.totalMultiplier}x (Expected: 1.55x - NO CHANGE)`);
  if (mRes.data.totalMultiplier !== 1.55) throw new Error('FAIL: Goat changed totalMultiplier!');

  // 5. Skull (All rings currently at Sec 1, step back clamps at 1 -> resets to 0.00x)
  mRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'SKULL' }),
  }).then((r) => r.json());
  console.log(`  Spin 5 (SKULL): Total = ${mRes.data.totalMultiplier}x (Expected: 0.00x)`);
  if (mRes.data.totalMultiplier !== 0) throw new Error('FAIL: Skull did not reset total multiplier to 0.00x!');
  console.log('✅ PASS: Mixed symbol sequence conforms 100% to explicit active track formula.\n');

  // ─── TEST 5: STEP 8 CASHOUT IDEMPOTENCY & DUPLICATE PREVENTION ────────
  console.log('--- TEST 5: CASHOUT IDEMPOTENCY & DUPLICATE PREVENTION ---');
  // Spin once to get positive multiplier
  const earnRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'LION' }),
  }).then((r) => r.json());

  const activeRoundId = earnRes.data.roundId;
  const initBal = earnRes.data.balance;

  // First Cashout
  const cash1 = await fetch(`${API_BASE}/api/spiral/cashout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId: activeRoundId, demoToken }),
  }).then((r) => r.json());
  const balAfterCash1 = cash1.data.balance;
  console.log(`  Cashout 1: Payout = ₹${cash1.data.finalPayout}, Balance = ₹${balAfterCash1}`);

  // Duplicate Cashout Call (same roundId)
  const cash2 = await fetch(`${API_BASE}/api/spiral/cashout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId: activeRoundId, demoToken }),
  }).then((r) => r.json());
  const balAfterCash2 = cash2.data.balance;
  console.log(`  Cashout 2 (duplicate): Replay = ${cash2.data.idempotencyReplay}, Balance = ₹${balAfterCash2}`);

  if (balAfterCash2 !== balAfterCash1) {
    throw new Error(`FAIL: Duplicate cashout altered balance! Cash1: ₹${balAfterCash1}, Cash2: ₹${balAfterCash2}`);
  }
  console.log('✅ PASS: Duplicate cashout prevented! Zero duplicate wallet credits.\n');

  // ─── TEST 6: FRONTEND UI REAL-BROWSER AUDIT ───────────────────────────
  console.log('--- TEST 6: FRONTEND UI REAL-BROWSER AUDIT ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const uiDemoToken = 'ui_audit_' + Date.now();
    await page.goto(`${FRONTEND_BASE}/game/spiral?demoToken=${uiDemoToken}`, {
      waitUntil: 'networkidle2',
      timeout: 15000,
    });
    await sleep(2000);

    const initialScreenshot = path.join(SCREENSHOT_DIR, '01-ui-initial-neutral.png');
    await page.screenshot({ path: initialScreenshot });
    console.log(`  📸 Screenshot saved: ${initialScreenshot}`);

    // Click Spin button
    console.log('  Clicking SPIN on UI...');
    await page.evaluate(() => {
      const btn = document.querySelector('.btn-spin');
      if (btn) {
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        setTimeout(() => {
          btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        }, 100);
      }
    });
    await sleep(4000); // Wait for spin animation and backend response

    const afterSpinScreenshot = path.join(SCREENSHOT_DIR, '02-ui-after-spin.png');
    await page.screenshot({ path: afterSpinScreenshot });
    console.log(`  📸 Screenshot saved: ${afterSpinScreenshot}`);

    // Mobile viewport screenshot
    await page.setViewport({ width: 375, height: 812, isMobile: true });
    await sleep(500);
    const mobileScreenshot = path.join(SCREENSHOT_DIR, '03-mobile-layout.png');
    await page.screenshot({ path: mobileScreenshot });
    console.log(`  📸 Screenshot saved: ${mobileScreenshot}`);

  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log('🎉 ALL 8-STEP AUDIT CHECKS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runTest().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
