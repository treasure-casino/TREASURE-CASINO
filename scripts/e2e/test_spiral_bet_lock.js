const puppeteer = require('./node_modules/puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API_BASE = 'http://localhost:5000';
const FRONTEND_BASE = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c',
  'treasure_spiral_bet_lock_screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('================================================================');
  console.log('🔒 TREASURE SPIRAL — BET AMOUNT LOCK VERIFICATION');
  console.log('   Strict verification of User Test Cases 1 through 9');
  console.log('================================================================\n');

  // ─── TEST 1: INITIAL STATE: BET CONTROLS ENABLED ───────────────────────────
  console.log('--- TEST 1: Initial state: BET controls enabled ---');
  const token = 'bet_lock_' + Date.now();
  let stateRes = await fetch(`${API_BASE}/api/spiral/state?demoToken=${token}`).then((r) => r.json());
  console.log('  Initial state active:', stateRes.data.active, '| isBetLocked:', stateRes.data.state?.isBetLocked);
  if (stateRes.data.active !== false || (stateRes.data.state && stateRes.data.state.isBetLocked)) {
    throw new Error('FAIL Test 1: Expected initial state to be unlocked (isBetLocked = false)');
  }
  console.log('✅ PASS: Test 1 (Initial state has BET controls unlocked).\n');

  // ─── TEST 2: FIRST VALID MULTIPLIER ACTIVATION: BET CONTROLS LOCK ──────────
  console.log('--- TEST 2: First valid multiplier activation (Lion) -> BET locks ---');
  let res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken: token, forcedSymbol: 'LION' }),
  }).then((r) => r.json());
  let s = res.data;
  console.log(`  [Lion] Total: ${s.totalMultiplier}x | isBetLocked: ${s.isBetLocked} | betAmount: ₹${s.betAmount}`);
  if (s.totalMultiplier !== 3.9 || s.isBetLocked !== true || s.betAmount !== 100) {
    throw new Error(`FAIL Test 2: Expected Total=3.90x, isBetLocked=true, betAmount=100. Got Total=${s.totalMultiplier}, isBetLocked=${s.isBetLocked}`);
  }
  console.log('✅ PASS: Test 2 (First multiplier activation locks BET controls at ₹100).\n');

  // ─── TEST 8 & 9: BACKEND REJECTS ATTEMPTS TO CHANGE BET DURING ACTIVE ROUND ─
  console.log('--- TEST 8 & 9: Backend rejects illegal bet changes without deducting balance ---');
  const balanceBeforeIllegal = (await fetch(`${API_BASE}/api/spiral/state?demoToken=${token}`).then(r => r.json())).data.balance;
  console.log(`  Balance before illegal attempt: ₹${balanceBeforeIllegal}`);

  let illegalError = null;
  try {
    const illegalRes = await fetch(`${API_BASE}/api/spiral/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betAmount: 500, demoToken: token, forcedSymbol: 'LION' }), // Attempting to change bet from 100 to 500!
    });
    if (!illegalRes.ok) {
      illegalError = await illegalRes.json();
    }
  } catch (err) {
    illegalError = err;
  }

  const errorMsg = illegalError?.error || illegalError?.message;
  console.log('  Illegal attempt response error:', errorMsg);
  if (!errorMsg || !errorMsg.includes('BET LOCKED')) {
    throw new Error(`FAIL Test 8: Backend must reject bet change while multiplier > 0! Got: ${JSON.stringify(illegalError)}`);
  }

  const balanceAfterIllegal = (await fetch(`${API_BASE}/api/spiral/state?demoToken=${token}`).then(r => r.json())).data.balance;
  console.log(`  Balance after illegal attempt: ₹${balanceAfterIllegal}`);
  if (balanceAfterIllegal !== balanceBeforeIllegal) {
    throw new Error(`FAIL Test 9: Balance was deducted on rejected request! Before: ${balanceBeforeIllegal}, After: ${balanceAfterIllegal}`);
  }
  console.log('✅ PASS: Test 8 & 9 (Backend rejected illegal bet modification and did not deduct balance).\n');

  // ─── TEST 3: MULTIPLIER INCREASES FURTHER: BET REMAINS LOCKED ──────────────
  console.log('--- TEST 3: Multiplier increases further (Elephant) -> BET remains locked ---');
  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken: token, forcedSymbol: 'ELEPHANT' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [Lion + Elephant] Total: ${s.totalMultiplier}x | isBetLocked: ${s.isBetLocked}`);
  if (s.totalMultiplier !== 6.4 || s.isBetLocked !== true) {
    throw new Error(`FAIL Test 3: Expected Total=6.40x, isBetLocked=true. Got Total=${s.totalMultiplier}, isBetLocked=${s.isBetLocked}`);
  }
  console.log('✅ PASS: Test 3 (Multiplier increased to 6.40x, BET remains locked).\n');

  // ─── TEST 4: GOAT / NO-CHANGE SYMBOL: BET REMAINS LOCKED ────────────────────
  console.log('--- TEST 4: Goat / no-change symbol -> BET remains locked ---');
  res = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 100, demoToken: token, forcedSymbol: 'GOAT' }),
  }).then((r) => r.json());
  s = res.data;
  console.log(`  [Goat] Total: ${s.totalMultiplier}x | isBetLocked: ${s.isBetLocked}`);
  if (s.totalMultiplier !== 6.4 || s.isBetLocked !== true) {
    throw new Error(`FAIL Test 4: Expected Total=6.40x, isBetLocked=true after Goat. Got Total=${s.totalMultiplier}, isBetLocked=${s.isBetLocked}`);
  }
  console.log('✅ PASS: Test 4 (Goat symbol rolled, BET remains locked).\n');

  // ─── TEST 5: SKULL DECREASES MULTIPLIER BUT REMAINS > 0.00x: BET LOCKED ─────
  console.log('--- TEST 5: Skull decreases multiplier but remains > 0.00x -> BET remains locked ---');
  // Outer was 0 (3.9x), Middle was 0 (2.5x).
  // Skull decrements Outer to null (0x) and Middle to null (0x)... Wait!
  // Let's test with a track that has 2 steps so it stays > 0.00x!
  const tokenDog = 'bet_lock_dog_' + Date.now();
  await fetch(`${API_BASE}/api/spiral/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ betAmount: 100, demoToken: tokenDog, forcedSymbol: 'DOG' }) });
  await fetch(`${API_BASE}/api/spiral/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ betAmount: 100, demoToken: tokenDog, forcedSymbol: 'DOG' }) });
  // Now Inner is 1 (4.85x), Total = 4.85x
  res = await fetch(`${API_BASE}/api/spiral/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ betAmount: 100, demoToken: tokenDog, forcedSymbol: 'SKULL' }) }).then(r => r.json());
  s = res.data;
  console.log(`  [Two Dogs + Skull] Inner: Index ${s.innerIndex} (${s.innerMultiplier}x) | Total: ${s.totalMultiplier}x | isBetLocked: ${s.isBetLocked}`);
  if (s.totalMultiplier !== 1.55 || s.isBetLocked !== true) {
    throw new Error(`FAIL Test 5: Expected Total=1.55x (> 0), isBetLocked=true. Got Total=${s.totalMultiplier}, isBetLocked=${s.isBetLocked}`);
  }
  console.log('✅ PASS: Test 5 (Skull decreased multiplier to 1.55x, BET remains locked).\n');

  // ─── TEST 6: MULTIPLIER REACHES EXACTLY 0.00x: BET UNLOCKS ──────────────────
  console.log('--- TEST 6: Multiplier reaches exactly 0.00x -> BET UNLOCKS ---');
  res = await fetch(`${API_BASE}/api/spiral/spin`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ betAmount: 100, demoToken: tokenDog, forcedSymbol: 'SKULL' }) }).then(r => r.json());
  s = res.data;
  console.log(`  [Second Skull] Total: ${s.totalMultiplier}x | isBetLocked: ${s.isBetLocked}`);
  if (s.totalMultiplier !== 0 || s.isBetLocked !== false) {
    throw new Error(`FAIL Test 6: Expected Total=0.00x, isBetLocked=false. Got Total=${s.totalMultiplier}, isBetLocked=${s.isBetLocked}`);
  }
  // Now verify that player CAN change bet to ₹250!
  const betChangeRes = await fetch(`${API_BASE}/api/spiral/spin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ betAmount: 250, demoToken: tokenDog, forcedSymbol: 'LION' }),
  }).then(r => r.json());
  console.log(`  [Spin with new bet ₹250] Bet Amount: ₹${betChangeRes.data.betAmount} | Total: ${betChangeRes.data.totalMultiplier}x | isBetLocked: ${betChangeRes.data.isBetLocked}`);
  if (betChangeRes.data.betAmount !== 250 || betChangeRes.data.isBetLocked !== true) {
    throw new Error(`FAIL Test 6: Expected new bet ₹250 to be accepted after unlock! Got ₹${betChangeRes.data.betAmount}`);
  }
  console.log('✅ PASS: Test 6 (Multiplier reached 0.00x, BET unlocked, and new bet ₹250 accepted).\n');

  // ─── TEST 7: CASH OUT AND NEW ROUND: BET UNLOCKS AFTER SETTLEMENT ───────────
  console.log('--- TEST 7: Cash out and new round -> BET unlocks after settlement ---');
  // Cash out the active round with ₹250 bet
  const cashoutRes = await fetch(`${API_BASE}/api/spiral/cashout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roundId: betChangeRes.data.roundId, demoToken: tokenDog }),
  }).then(r => r.json());
  console.log(`  [Cash Out] status: ${cashoutRes.data.status} | payout: ₹${cashoutRes.data.totalPayout} | isBetLocked: ${cashoutRes.data.isBetLocked}`);
  if (cashoutRes.data.active !== false || cashoutRes.data.isBetLocked !== false) {
    throw new Error(`FAIL Test 7: Round must end and isBetLocked must be false after cashout! Got active=${cashoutRes.data.active}, isBetLocked=${cashoutRes.data.isBetLocked}`);
  }
  console.log('✅ PASS: Test 7 (CASH OUT completed, round settled, BET unlocked).\n');

  // ─── BROWSER UI VERIFICATION WITH PUPPETEER ────────────────────────────────
  console.log('--- BROWSER UI AUDIT: VERIFY BET LOCK CONTROLS & BADGE ---');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const uiToken = 'bet_lock_ui_' + Date.now();
    await page.evaluateOnNewDocument((tok) => {
      localStorage.setItem('treasure_demo_token', tok);
    }, uiToken);

    await page.goto(`${FRONTEND_BASE}/game/spiral`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const isMinusDisabledBefore = await page.$eval('.btn-bet-minus', el => el.disabled);
    const isPlusDisabledBefore = await page.$eval('.btn-bet-plus', el => el.disabled);
    const hasLockBadgeBefore = await page.$('#bet-locked-badge');
    console.log(`  UI Initial Unlocked: minusDisabled=${isMinusDisabledBefore}, plusDisabled=${isPlusDisabledBefore}, hasLockBadge=${!!hasLockBadgeBefore}`);
    if (hasLockBadgeBefore) {
      throw new Error('FAIL UI: Bet lock badge must NOT be present before first multiplier!');
    }

    const path1 = path.join(SCREENSHOT_DIR, '01-ui-bet-unlocked-initial.png');
    await page.screenshot({ path: path1 });
    console.log(`  📸 Screenshot saved: ${path1}`);

    // Phase 2: Trigger Lion to activate multiplier and lock BET
    console.log('  Advancing round to 3.90x via Lion...');
    await fetch(`${API_BASE}/api/spiral/spin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ betAmount: 100, demoToken: uiToken, forcedSymbol: 'LION' }),
    });

    // Reload page to observe synchronized active locked state
    await page.goto(`${FRONTEND_BASE}/game/spiral?demoToken=${uiToken}`, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(2000);

    const totalDisplay = await page.$eval('#total-multiplier-display', el => el.textContent.trim());
    const isMinusDisabledAfter = await page.$eval('.btn-bet-minus', el => el.disabled);
    const isPlusDisabledAfter = await page.$eval('.btn-bet-plus', el => el.disabled);
    const hasLockBadgeAfter = await page.$('#bet-locked-badge');
    const minusTitle = await page.$eval('.btn-bet-minus', el => el.getAttribute('title'));

    console.log(`  UI Active Locked: total=${totalDisplay}, minusDisabled=${isMinusDisabledAfter}, plusDisabled=${isPlusDisabledAfter}, hasLockBadge=${!!hasLockBadgeAfter}`);
    console.log(`  Button tooltip: "${minusTitle}"`);

    if (!isMinusDisabledAfter || !isPlusDisabledAfter || !hasLockBadgeAfter) {
      throw new Error('FAIL UI: Buttons must be disabled and lock badge displayed when multiplier > 0.00x!');
    }

    const path2 = path.join(SCREENSHOT_DIR, '02-ui-bet-locked-active-round.png');
    await page.screenshot({ path: path2 });
    console.log(`  📸 Screenshot saved: ${path2}`);

    // Phase 3: Click Cash Out in UI to verify unlock
    console.log('  Clicking Cash Out button in UI to verify unlock...');
    await page.click('.btn-cashout');
    await sleep(2000);

    const hasLockBadgeAfterCashout = await page.$('#bet-locked-badge');
    const isMinusDisabledAfterCashout = await page.$eval('.btn-bet-minus', el => el.disabled);
    const isPlusDisabledAfterCashout = await page.$eval('.btn-bet-plus', el => el.disabled);

    console.log(`  UI After Cashout: hasLockBadge=${!!hasLockBadgeAfterCashout}, minusDisabled=${isMinusDisabledAfterCashout}, plusDisabled=${isPlusDisabledAfterCashout}`);
    if (hasLockBadgeAfterCashout || isMinusDisabledAfterCashout || isPlusDisabledAfterCashout) {
      throw new Error('FAIL UI: Bet controls must unlock after cashout settlement!');
    }

    const path3 = path.join(SCREENSHOT_DIR, '03-ui-bet-unlocked-after-cashout.png');
    await page.screenshot({ path: path3 });
    console.log(`  📸 Screenshot saved: ${path3}`);

    console.log('✅ PASS: Browser UI accurately reflects locked and unlocked states.\n');
  } finally {
    await browser.close();
  }

  console.log('================================================================');
  console.log('🎉 ALL 9 BET LOCK TEST CASES PASSED WITH 100% SUCCESS!');
  console.log('================================================================');
}

runTest().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
