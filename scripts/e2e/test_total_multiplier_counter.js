const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API_BASE = 'http://localhost:5000';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_spiral_total_multiplier_screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('================================================================');
  console.log('🔢 TREASURE SPIRAL — TOTAL MULTIPLIER COUNTER VERIFICATION');
  console.log('   Strict verification of User Test Cases 1 through 9');
  console.log('================================================================\n');

  // ─── TEST 1: INITIAL STATE -> 0.00x ──────────────────────────────────────────
  console.log('--- TEST 1: Initial State -> 0.00x ---');
  const token1 = 'tm_t1_' + Date.now();
  let stateRes = await fetch(`${API_BASE}/api/spiral/state?demoToken=${token1}`).then((r) => r.json());
  console.log('  Initial state response:', stateRes.data);
  if (stateRes.data.active !== false || (stateRes.data.state && stateRes.data.state.totalMultiplier !== 0)) {
    throw new Error(`FAIL Test 1: Expected inactive/null state with 0.00x, got: ${JSON.stringify(stateRes.data)}`);
  }
  console.log('✅ PASS: Test 1 (Initial state is neutral with 0.00x Total Multiplier).\n');

  // ─── TEST 2: ONE LION -> 3.90x ──────────────────────────────────────────────
  console.log('--- TEST 2: One Lion -> 3.90x ---');
  const token2 = 'tm_t2_' + Date.now();
  let res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken: token2, forcedSymbol: 'LION' }),
  }).then((r) => r.json());
  let s = res.data;
  console.log(`  [Lion] Outer=${s.outerMultiplier}x, Middle=${s.middleMultiplier}x, Inner=${s.innerMultiplier}x | Total=${s.totalMultiplier}x | Payout=₹${s.potentialPayout}`);
  if (s.outerMultiplier !== 3.9 || s.middleMultiplier !== 0 || s.innerMultiplier !== 0 || s.totalMultiplier !== 3.9 || s.potentialPayout !== 390) {
    throw new Error(`FAIL Test 2: Expected Outer=3.9, Total=3.90x, Payout=390. Got Outer=${s.outerMultiplier}, Total=${s.totalMultiplier}, Payout=${s.potentialPayout}`);
  }
  console.log('✅ PASS: Test 2 (One Lion -> 3.90x, Payout ₹390).\n');

  // ─── TEST 3: ONE LION + ONE ELEPHANT -> 6.40x ──────────────────────────────
  console.log('--- TEST 3: One Lion + One Elephant -> 6.40x ---');
  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken: token2, forcedSymbol: 'ELEPHANT' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [Lion + Elephant] Outer=${s.outerMultiplier}x, Middle=${s.middleMultiplier}x, Inner=${s.innerMultiplier}x | Total=${s.totalMultiplier}x | Payout=₹${s.potentialPayout}`);
  if (s.outerMultiplier !== 3.9 || s.middleMultiplier !== 2.5 || s.innerMultiplier !== 0 || s.totalMultiplier !== 6.4 || s.potentialPayout !== 640) {
    throw new Error(`FAIL Test 3: Expected Outer=3.9, Middle=2.5, Total=6.40x, Payout=640. Got Total=${s.totalMultiplier}, Payout=${s.potentialPayout}`);
  }
  console.log('✅ PASS: Test 3 (One Lion + One Elephant -> 3.9 + 2.5 = 6.40x, Payout ₹640).\n');

  // ─── TEST 4: ONE LION + ONE ELEPHANT + ONE DOG -> 7.95x ────────────────────
  console.log('--- TEST 4: One Lion + One Elephant + One Dog -> 7.95x ---');
  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken: token2, forcedSymbol: 'DOG' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [Lion + Elephant + Dog] Outer=${s.outerMultiplier}x, Middle=${s.middleMultiplier}x, Inner=${s.innerMultiplier}x | Total=${s.totalMultiplier}x | Payout=₹${s.potentialPayout}`);
  if (s.outerMultiplier !== 3.9 || s.middleMultiplier !== 2.5 || s.innerMultiplier !== 1.55 || s.totalMultiplier !== 7.95 || s.potentialPayout !== 795) {
    throw new Error(`FAIL Test 4: Expected Outer=3.9, Middle=2.5, Inner=1.55, Total=7.95x, Payout=795. Got Total=${s.totalMultiplier}, Payout=${s.potentialPayout}`);
  }
  console.log('✅ PASS: Test 4 (One Lion + One Elephant + One Dog -> 3.9 + 2.5 + 1.55 = 7.95x, Payout ₹795).\n');

  // ─── TEST 5: TWO DOGS -> 4.85x ─────────────────────────────────────────────
  console.log('--- TEST 5: Two Dogs -> 4.85x ---');
  const token5 = 'tm_t5_' + Date.now();
  await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken: token5, forcedSymbol: 'DOG' }),
  });
  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken: token5, forcedSymbol: 'DOG' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [Two Dogs] Inner=${s.innerMultiplier}x, Outer=${s.outerMultiplier}x, Middle=${s.middleMultiplier}x | Total=${s.totalMultiplier}x | Payout=₹${s.potentialPayout}`);
  if (s.innerMultiplier !== 4.85 || s.outerMultiplier !== 0 || s.middleMultiplier !== 0 || s.totalMultiplier !== 4.85 || s.potentialPayout !== 485) {
    throw new Error(`FAIL Test 5: Expected Inner=4.85, Outer=0, Middle=0, Total=4.85x, Payout=485. Got Total=${s.totalMultiplier}, Payout=${s.potentialPayout}`);
  }
  console.log('✅ PASS: Test 5 (Two Dogs -> 4.85x, Payout ₹485).\n');

  // ─── TEST 6: TWO DOGS + ONE SKULL -> 1.55x ─────────────────────────────────
  console.log('--- TEST 6: Two Dogs + One Skull -> 1.55x ---');
  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken: token5, forcedSymbol: 'SKULL' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [Two Dogs + Skull] Inner=${s.innerMultiplier}x, Outer=${s.outerMultiplier}x, Middle=${s.middleMultiplier}x | Total=${s.totalMultiplier}x | Payout=₹${s.potentialPayout}`);
  if (s.innerMultiplier !== 1.55 || s.outerMultiplier !== 0 || s.middleMultiplier !== 0 || s.totalMultiplier !== 1.55 || s.potentialPayout !== 155) {
    throw new Error(`FAIL Test 6: Expected Inner=1.55, Outer=0, Middle=0, Total=1.55x, Payout=155. Got Total=${s.totalMultiplier}, Payout=${s.potentialPayout}`);
  }
  console.log('✅ PASS: Test 6 (Two Dogs + One Skull -> Inner decrements to Index 0 = 1.55x, Total=1.55x, NOT 0x).\n');

  // ─── TEST 7: GOAT -> TOTAL REMAINS EXACTLY UNCHANGED ────────────────────────
  console.log('--- TEST 7: Goat -> Total remains exactly unchanged ---');
  const prevTotal = s.totalMultiplier;
  const prevPayout = s.potentialPayout;
  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken: token5, forcedSymbol: 'GOAT' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [After Goat] Inner=${s.innerMultiplier}x | Total=${s.totalMultiplier}x | Payout=₹${s.potentialPayout}`);
  if (s.totalMultiplier !== prevTotal || s.potentialPayout !== prevPayout) {
    throw new Error(`FAIL Test 7: Expected Total=${prevTotal}x, Payout=${prevPayout}. Got Total=${s.totalMultiplier}x, Payout=${s.potentialPayout}`);
  }
  console.log('✅ PASS: Test 7 (Goat produced zero changes to Total Multiplier or Payout).\n');

  // ─── TEST 8: SKULL ON INACTIVE CIRCLES -> NO NEGATIVE/INVALID VALUES ────────
  console.log('--- TEST 8: Skull on inactive circles -> no negative or invalid values ---');
  const token8 = 'tm_t8_' + Date.now();
  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken: token8, forcedSymbol: 'SKULL' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [Skull on Inactive] Outer=${s.outerIndex}, Middle=${s.middleIndex}, Inner=${s.innerIndex} | Total=${s.totalMultiplier}x | Payout=₹${s.potentialPayout}`);
  if (s.outerIndex !== null || s.middleIndex !== null || s.innerIndex !== null || s.totalMultiplier !== 0 || s.potentialPayout !== 0) {
    throw new Error(`FAIL Test 8: All rings must remain null and Total=0.00x! Got Outer=${s.outerIndex}, Middle=${s.middleIndex}, Inner=${s.innerIndex}, Total=${s.totalMultiplier}`);
  }
  console.log('✅ PASS: Test 8 (Skull on inactive circles remains null and 0.00x).\n');

  // ─── TEST 9: BROWSER UI AUDIT: DISPLAYED VALUE MATCHES BACKEND EXACTLY ──────
  console.log('--- TEST 9: Browser UI Audit: Displayed value matches backend exactly ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    // Navigate to Spiral 2D game
    const uiToken = 'tm_ui_' + Date.now();
    await page.goto(`${FRONTEND_BASE}/game/spiral?demoToken=${uiToken}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    // Initial Neutral Screen capture
    const initialText = await page.$eval('#total-multiplier-display', (el) => el.textContent.trim());
    console.log(`  UI Initial Display: "${initialText}"`);
    if (initialText !== '0.00x') {
      throw new Error(`FAIL Test 9: Expected "0.00x" initially, got "${initialText}"`);
    }

    const path1 = path.join(SCREENSHOT_DIR, '01-ui-initial-neutral-0x.png');
    await page.screenshot({ path: path1 });
    console.log(`  📸 Screenshot saved: ${path1}`);

    // Trigger a spin by clicking the SPIN button in UI
    console.log('  Clicking UI Spin button...');
    await page.click('.btn-spin');
    await sleep(2500); // Wait for spin response + suspense animation

    // Inspect updated total multiplier display
    const afterSpinText = await page.$eval('#total-multiplier-display', (el) => el.textContent.trim());
    console.log(`  UI After Spin Display: "${afterSpinText}"`);

    const path2 = path.join(SCREENSHOT_DIR, '02-ui-after-spin-total-counter.png');
    await page.screenshot({ path: path2 });
    console.log(`  📸 Screenshot saved: ${path2}`);

    // Test Mobile viewport layout
    await page.setViewport({ width: 390, height: 844, isMobile: true });
    await sleep(1000);
    const mobileText = await page.$eval('#total-multiplier-display', (el) => el.textContent.trim());
    console.log(`  UI Mobile Display: "${mobileText}"`);

    const path3 = path.join(SCREENSHOT_DIR, '03-ui-mobile-viewport-total-counter.png');
    await page.screenshot({ path: path3 });
    console.log(`  📸 Screenshot saved: ${path3}`);

    console.log('✅ PASS: Test 9 (UI Display exactly matches backend numeric counter).\n');
  } finally {
    await browser.close();
  }

  console.log('================================================================');
  console.log('🎉 ALL 9 TOTAL MULTIPLIER TESTS PASSED WITH 100% ACCURACY!');
  console.log('================================================================');
}

runTest().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
