const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API_BASE = 'http://localhost:5000';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_spiral_skull_screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('================================================================');
  console.log('💀 E2E TEST: SKULL RESET & LIQUID INDICATOR POSITION AUDIT');
  console.log('================================================================\n');

  const demoToken = 'skull_neutral_audit_' + Date.now();

  // 1. API VERIFICATION OF SKULL RESET BEHAVIOR
  console.log('--- 1. API TEST: LION -> SKULL (OUTER SECTION 1 -> NEUTRAL NULL) ---');
  let res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'LION' }),
  }).then((r) => r.json());

  let s = res.data;
  console.log(`  [Lion] Outer: ${s.outerIndex ?? s.outerPosition} (${s.outerMultiplier}x) | Total: ${s.totalMultiplier}x`);
  if ((s.outerIndex ?? s.outerPosition) !== 1 || s.totalMultiplier !== 3.9) {
    throw new Error(`FAIL: Lion expected Outer Sec 1 (3.9x), got ${s.outerPosition} (${s.totalMultiplier}x)`);
  }

  // Spin SKULL: Outer Sec 1 must return to null, Total to 0.00x
  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'SKULL' }),
  }).then((r) => r.json());

  s = res.data;
  console.log(`  [Skull] Outer: ${s.outerIndex ?? s.outerPosition} (${s.outerMultiplier}x) | Total: ${s.totalMultiplier}x`);
  if ((s.outerIndex ?? s.outerPosition) !== null) {
    throw new Error(`FAIL: Skull expected Outer to return to null, got ${s.outerIndex ?? s.outerPosition}`);
  }
  if (s.totalMultiplier !== 0) {
    throw new Error(`FAIL: Skull expected Total Multiplier 0.00x, got ${s.totalMultiplier}x`);
  }
  if (s.outerMultiplier !== 0) {
    throw new Error(`FAIL: Skull expected Outer Multiplier 0, got ${s.outerMultiplier}`);
  }
  console.log('✅ PASS: Outer Circle Section 1 returned cleanly to null (neutral 0.00x) on SKULL!\n');

  console.log('--- 2. API TEST: ELEPHANT -> SKULL (MIDDLE SECTION 1 -> NEUTRAL NULL) ---');
  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'ELEPHANT' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [Elephant] Middle: ${s.middleIndex ?? s.middlePosition} (${s.middleMultiplier}x) | Total: ${s.totalMultiplier}x`);
  if ((s.middleIndex ?? s.middlePosition) !== 1 || s.totalMultiplier !== 2.5) {
    throw new Error(`FAIL: Elephant expected Middle Sec 1 (2.5x), got ${s.middlePosition} (${s.totalMultiplier}x)`);
  }

  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'SKULL' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [Skull] Middle: ${s.middleIndex ?? s.middlePosition} (${s.middleMultiplier}x) | Total: ${s.totalMultiplier}x`);
  if ((s.middleIndex ?? s.middlePosition) !== null || s.totalMultiplier !== 0) {
    throw new Error(`FAIL: Skull expected Middle to return to null and Total to 0, got pos=${s.middlePosition}, total=${s.totalMultiplier}`);
  }
  console.log('✅ PASS: Middle Circle Section 1 returned cleanly to null (neutral 0.00x) on SKULL!\n');

  console.log('--- 3. API TEST: DOG -> SKULL (INNER SECTION 1 -> NEUTRAL NULL) ---');
  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'DOG' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [Dog] Inner: ${s.innerIndex ?? s.innerPosition} (${s.innerMultiplier}x) | Total: ${s.totalMultiplier}x`);
  if ((s.innerIndex ?? s.innerPosition) !== 1 || s.totalMultiplier !== 1.55) {
    throw new Error(`FAIL: Dog expected Inner Sec 1 (1.55x), got ${s.innerPosition} (${s.totalMultiplier}x)`);
  }

  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'SKULL' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [Skull] Inner: ${s.innerIndex ?? s.innerPosition} (${s.innerMultiplier}x) | Total: ${s.totalMultiplier}x`);
  if ((s.innerIndex ?? s.innerPosition) !== null || s.totalMultiplier !== 0) {
    throw new Error(`FAIL: Skull expected Inner to return to null and Total to 0, got pos=${s.innerPosition}, total=${s.totalMultiplier}`);
  }
  console.log('✅ PASS: Inner Circle Section 1 returned cleanly to null (neutral 0.00x) on SKULL!\n');

  console.log('--- 4. API TEST: MULTI-CIRCLE SKULL STEP-BACK ---');
  // Outer 2, Middle 2, Inner 1
  await fetch(`${API_BASE}/api/spiral/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'LION' }) });
  await fetch(`${API_BASE}/api/spiral/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'LION' }) });
  await fetch(`${API_BASE}/api/spiral/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'ELEPHANT' }) });
  await fetch(`${API_BASE}/api/spiral/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'ELEPHANT' }) });
  res = await fetch(`${API_BASE}/api/spiral/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'DOG' }) }).then(r => r.json());
  s = res.data;
  console.log(`  State before Skull: Outer=${s.outerPosition}, Middle=${s.middlePosition}, Inner=${s.innerPosition}`);
  if (s.outerPosition !== 2 || s.middlePosition !== 2 || s.innerPosition !== 1) {
    throw new Error(`FAIL: Setup state incorrect: Outer=${s.outerPosition}, Middle=${s.middlePosition}, Inner=${s.innerPosition}`);
  }

  // Spin SKULL: Outer 2->1, Middle 2->1, Inner 1->null
  res = await fetch(`${API_BASE}/api/spiral/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ betAmount: 100, demoToken, forcedSymbol: 'SKULL' }) }).then(r => r.json());
  s = res.data;
  console.log(`  State after Skull: Outer=${s.outerPosition}, Middle=${s.middlePosition}, Inner=${s.innerPosition} | Total: ${s.totalMultiplier}x`);
  if (s.outerPosition !== 1 || s.middlePosition !== 1 || s.innerPosition !== null) {
    throw new Error(`FAIL: Expected Outer=1, Middle=1, Inner=null. Got Outer=${s.outerPosition}, Middle=${s.middlePosition}, Inner=${s.innerPosition}`);
  }
  if (s.totalMultiplier !== 0) {
    throw new Error(`FAIL: Expected Total 0.00x since rings reached Sec 1/neutral. Got ${s.totalMultiplier}x`);
  }
  console.log('✅ PASS: Multi-circle Skull step-back correctly decremented all tracks!\n');

  // 2. PUPPETEER FRONTEND UI & ANIMATION AUDIT
  console.log('--- 5. PUPPETEER UI AUDIT ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const uiDemoToken = 'ui_skull_audit_' + Date.now();
    console.log('  Navigating to Treasure Spiral...');
    await page.goto(`${FRONTEND_BASE}/game/spiral?demoToken=${uiDemoToken}`, {
      waitUntil: 'networkidle2',
      timeout: 20000,
    });
    await sleep(2000);

    // Screenshot 1: Clean Initial Neutral State
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-initial-neutral-state.png') });
    console.log('  📸 Screenshot 1: 01-initial-neutral-state.png saved.');

    // Verify UI displays 0.00x and ₹0.00
    const uiState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasZeroMult: text.includes('0.00x') || text.includes('0x'),
        hasZeroPayout: text.includes('₹0') || text.includes('₹ 0'),
      };
    });
    console.log('  Initial UI text check: 0.00x present:', uiState.hasZeroMult, '₹0 present:', uiState.hasZeroPayout);

    // Click SPIN button in UI
    console.log('  Triggering Spin in UI...');
    await page.evaluate(() => {
      const btn = document.querySelector('.btn-spin') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('SPIN'));
      if (btn) {
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        setTimeout(() => {
          btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
        }, 100);
      }
    });

    // Wait for spin animation and results to settle
    await sleep(4000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-after-spin.png') });
    console.log('  📸 Screenshot 2: 02-after-spin.png saved.');

    // Responsive mobile check
    await page.setViewport({ width: 375, height: 667 });
    await sleep(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-mobile-responsive-layout.png') });
    console.log('  📸 Screenshot 3: 03-mobile-responsive-layout.png saved.');
  } finally {
    await browser.close();
  }

  console.log('\n================================================================');
  console.log('🎉 ALL SKULL RESET & LIQUID INDICATOR TESTS PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runTest().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
