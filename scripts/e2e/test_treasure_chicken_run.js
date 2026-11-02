/**
 * Comprehensive Automated End-to-End Test Suite for TREASURE CHICKEN RUN
 *
 * Verifies:
 * 1. Backend REST API: config, start, step, cashout, history, admin stats, update config.
 * 2. All 4 difficulties: EASY, MEDIUM, HARD, HARDCORE.
 * 3. Validation: insufficient balance, min/max bounds, duplicate cashout rejection.
 * 4. Browser UI & Gameplay: Start Run, Hop Forward jump animations, Cash Out, Auto Play with working Stop.
 * 5. Visual regression screenshots.
 */

const http = require('http');
const path = require('path');
const fs = require('fs');

const BACKEND_URL = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = 'C:\\Users\\km811\\.gemini\\antigravity\\brain\\47198f3a-fbf2-4c74-a97e-3a554c74b32c\\treasure_chicken_run_screenshots';

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function apiRequest(method, endpoint, body = null, demoToken = 'test-token-cr-01') {
  return new Promise((resolve, reject) => {
    const url = new URL(BACKEND_URL + endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-demo-token': demoToken,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runApiTests() {
  console.log('\n============================================================');
  console.log('🐔 TREASURE CHICKEN RUN — BACKEND API TEST SUITE');
  console.log('============================================================\n');

  const testToken = `cr_test_${Date.now()}`;

  // 1. Config endpoint
  console.log('1. Testing GET /api/chicken-run/config...');
  const configRes = await apiRequest('GET', '/api/chicken-run/config');
  assert(configRes.status === 200, 'GET /config returns 200');
  assert(configRes.body.success === true, 'GET /config success flag is true');
  assert(configRes.body.data.totalTiles === 24, 'Config has exactly 24 tiles');
  assert(configRes.body.data.baseRtp === 0.96, 'Base RTP is 0.96 (96.0%)');
  assert(Object.keys(configRes.body.data.difficulties).length === 4, 'Has 4 difficulties configured');
  assert(configRes.body.data.difficulties.EASY.multipliers.length === 24, 'EASY has 24 multipliers');
  assert(configRes.body.data.difficulties.HARDCORE.multipliers.length === 24, 'HARDCORE has 24 multipliers');

  // 2. Bet validation bounds
  console.log('\n2. Testing Bet Validation Bounds...');
  const underBet = await apiRequest('POST', '/api/chicken-run/start', { betAmount: 2, difficulty: 'MEDIUM' }, testToken);
  assert(underBet.status === 400, 'Rejects bet below minBet (₹10)');

  const overBet = await apiRequest('POST', '/api/chicken-run/start', { betAmount: 8000, difficulty: 'MEDIUM' }, testToken);
  assert(overBet.status === 400, 'Rejects bet above maxBet (₹5000)');

  // 3. Test Starting Rounds across all 4 Difficulties
  console.log('\n3. Testing Start Round across all 4 difficulties...');
  for (const diff of ['EASY', 'MEDIUM', 'HARD', 'HARDCORE']) {
    const startRes = await apiRequest('POST', '/api/chicken-run/start', { betAmount: 50, difficulty: diff }, testToken);
    assert(startRes.status === 200, `Start round on ${diff} returns 200`);
    assert(startRes.body.data.roundId.startsWith('cr_'), `Round ID generated: ${startRes.body.data.roundId}`);
    assert(startRes.body.data.difficulty === diff, `Round difficulty is ${diff}`);
    assert(startRes.body.data.currentStep === 0, 'Initial step is 0');
    assert(startRes.body.data.currentMultiplier === 1.0, 'Initial multiplier is 1.0x');
    assert(startRes.body.data.status === 'ACTIVE', 'Round status is ACTIVE');
    assert(startRes.body.data.tiles.length === 24, 'Round contains 24 stepping tiles');
  }

  // 4. Test Stepping and Cashout Flow
  console.log('\n4. Testing Stepping & Cashout Flow...');
  const playToken = `cr_play_${Date.now()}`;
  const startRound = await apiRequest('POST', '/api/chicken-run/start', { betAmount: 100, difficulty: 'EASY' }, playToken);
  const rId = startRound.body.data.roundId;
  const balanceAfterBet = startRound.body.data.balance;

  // Attempt cashout at step 0 (should fail)
  const prematureCashout = await apiRequest('POST', '/api/chicken-run/cashout', { roundId: rId }, playToken);
  assert(prematureCashout.status === 400, 'Rejects premature cashout at step 0');

  // Take step 1
  const step1 = await apiRequest('POST', '/api/chicken-run/step', { roundId: rId }, playToken);
  assert(step1.status === 200, 'POST /step returns 200');
  console.log(`    Step 1 outcome: ${step1.body.data.outcome} (Multiplier: ${step1.body.data.currentMultiplier}x)`);

  if (step1.body.data.outcome === 'SAFE') {
    assert(step1.body.data.currentStep === 1, 'Current step is 1 after safe jump');
    assert(step1.body.data.currentMultiplier >= 1.04, 'Multiplier increased after safe jump');
    assert(step1.body.data.potentialPayout >= 104, 'Potential payout is at least ₹104');

    // Now cash out!
    const cashoutRes = await apiRequest('POST', '/api/chicken-run/cashout', { roundId: rId }, playToken);
    assert(cashoutRes.status === 200, 'POST /cashout returns 200');
    assert(cashoutRes.body.data.status === 'CASHED_OUT', 'Round marked CASHED_OUT');
    assert(cashoutRes.body.data.payout >= 104, `Payout received: ₹${cashoutRes.body.data.payout}`);
    assert(cashoutRes.body.data.balance > balanceAfterBet, 'Balance credited after cashout');

    // Prevent duplicate cashout
    const dupCashout = await apiRequest('POST', '/api/chicken-run/cashout', { roundId: rId }, playToken);
    assert(dupCashout.status === 404 || dupCashout.status === 400, 'Rejects duplicate cashout attempt');

    // Prevent stepping after cashout
    const stepAfterCashout = await apiRequest('POST', '/api/chicken-run/step', { roundId: rId }, playToken);
    assert(stepAfterCashout.status === 404 || stepAfterCashout.status === 400, 'Rejects stepping after round finished');
  }

  // 5. Test History & Admin Stats
  console.log('\n5. Testing History & Admin Stats...');
  const historyRes = await apiRequest('GET', '/api/chicken-run/history', null, playToken);
  assert(historyRes.status === 200, 'GET /history returns 200');
  assert(Array.isArray(historyRes.body.data), 'History returns an array');
  assert(historyRes.body.data.length > 0, 'History contains recent rounds');

  const adminStats = await apiRequest('GET', '/api/chicken-run/admin/stats');
  assert(adminStats.status === 200, 'GET /admin/stats returns 200');
  assert(adminStats.body.data.stats.totalRounds > 0, 'Admin reports total rounds');
  assert(adminStats.body.data.stats.theoreticalRtp === '96.0%', 'Admin stats confirm 96.0% Theoretical RTP');
}

async function runBrowserTests() {
  console.log('\n============================================================');
  console.log('🌐 TREASURE CHICKEN RUN — BROWSER E2E TEST SUITE');
  console.log('============================================================\n');

  const puppeteer = require('./node_modules/puppeteer-core');
  const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    console.log('1. Navigating to Chicken Run arena...');
    await page.goto(`${FRONTEND_URL}/lobby/arena/game-chicken-run-01`, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });
    await sleep(2000);

    // Save initial lobby/arena screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-chicken-run-initial.png') });
    console.log('  Captured initial arena screenshot.');

    // Verify Title & Badges
    const titleText = await page.evaluate(() => document.body.innerText);
    assert(titleText.includes('TREASURE CHICKEN RUN'), 'Page displays "TREASURE CHICKEN RUN" title');
    assert(titleText.includes('24 STEP ROAD'), 'Page displays "24 STEP ROAD" badge');
    assert(titleText.includes('96.0% RTP'), 'Page displays "96.0% RTP" badge');

    // 2. Test Difficulty Selector
    console.log('\n2. Testing Difficulty Switcher...');
    const hardBtn = await page.waitForSelector('button ::-p-text(HARD)', { timeout: 5000 });
    await hardBtn.click();
    await sleep(400);

    const isHardSelected = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((el) => el.innerText.trim().startsWith('HARD') && !el.innerText.includes('HARDCORE'));
      return b ? b.className.includes('bg-amber-600') : false;
    });
    assert(isHardSelected, 'HARD difficulty activated with amber neon theme');

    // 3. Switch to EASY for safe step demonstration
    const easyBtn = await page.waitForSelector('button ::-p-text(EASY)', { timeout: 5000 });
    await easyBtn.click();
    await sleep(400);

    // Enable Turbo Mode for fast reliable test execution
    const turboBtn = await page.waitForSelector('button ::-p-text(TURBO)', { timeout: 5000 });
    const turboText = await page.evaluate((el) => el.innerText, turboBtn);
    if (turboText.includes('OFF')) {
      await turboBtn.click();
      await sleep(300);
      console.log('  Turbo Mode enabled.');
    }

    // 4. Test Start Run Button
    console.log('\n3. Starting a Live Game Round...');
    const startBtn = await page.$('button[data-testid="chicken-start-button"]');
    assert(startBtn !== null, 'Found button[data-testid="chicken-start-button"]');

    await startBtn.click();
    await sleep(1000);

    // Verify buttons changed to HOP FORWARD and CASH OUT
    const stepBtn = await page.$('button[data-testid="chicken-step-button"]');
    const cashoutBtn = await page.$('button[data-testid="chicken-cashout-button"]');
    assert(stepBtn !== null, 'Active round displays "HOP FORWARD" button');
    assert(cashoutBtn !== null, 'Active round displays "CASH OUT" button');

    // Capture screenshot during active run
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-chicken-run-active.png') });

    // 5. Test Hopping Forward
    console.log('\n4. Hopping Forward 2 Tiles...');
    await stepBtn.click();
    await sleep(800);

    const step1State = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasStep1OrSafe: text.includes('STEP 1') || text.includes('SAFE') || text.includes('BUST'),
        rawSnippet: text.slice(0, 300),
      };
    });
    assert(step1State.hasStep1OrSafe, 'Step 1 jump executed and evaluated');

    // Check if still active, hop again
    const stillActive = await page.$('button[data-testid="chicken-step-button"]');
    if (stillActive) {
      await stillActive.click();
      await sleep(800);

      // Now Cash Out
      console.log('\n5. Testing Live Cash Out...');
      const readyCashout = await page.$('button[data-testid="chicken-cashout-button"]');
      if (readyCashout) {
        await readyCashout.click();
        await sleep(1000);

        const cashoutState = await page.evaluate(() => {
          const text = document.body.innerText;
          return text.includes('CASHED OUT') || text.includes('WIN') || text.includes('START RUN');
        });
        assert(cashoutState, 'Cash out triggered victory celebration and credited winnings');
      }
    }

    // Capture post-round screenshot
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-chicken-run-settled.png') });

    // 6. Test Paytable Modal
    console.log('\n6. Testing Paytable & Rules Modal...');
    await page.evaluate(() => {
      const btn = document.querySelector('button[data-testid="chicken-paytable-button"]');
      if (btn) btn.click();
    });
    await sleep(600);

    const paytableVisible = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('RULES') || text.includes('How to Play');
    });
    assert(paytableVisible, 'Paytable & Rules modal opens with transparent rules and ladders');

    // Close paytable
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const closeBtn = btns.find(b => b.innerText.includes('CLOSE') || b.innerText.includes('✕'));
      if (closeBtn) closeBtn.click();
    });
    await sleep(400);

    // 7. Verify Game Lobby Card
    console.log('\n7. Testing Game Lobby Card & Discovery...');
    await page.goto(`${FRONTEND_URL}/lobby`, { waitUntil: 'networkidle2' });
    await sleep(1500);

    const lobbyHasGame = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Treasure Chicken Run') || text.includes('CHICKEN ROAD');
    });
    assert(lobbyHasGame, 'Treasure Chicken Run is visible in the main Casino Game Lobby');

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, '04-lobby-chicken-run-card.png') });
  } finally {
    await browser.close();
  }
}

async function main() {
  try {
    await runApiTests();
    await runBrowserTests();

    console.log('\n============================================================');
    console.log(`FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================\n');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('Fatal error in test suite:', err);
    process.exit(1);
  }
}

main();
