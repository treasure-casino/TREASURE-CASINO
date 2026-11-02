const http = require('http');

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw) });
        } catch (e) {
          resolve({ status: res.statusCode, raw });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function runTests() {
  console.log('====================================================');
  console.log('      TREASURE HOTLINE COMPREHENSIVE E2E TESTS      ');
  console.log('====================================================\n');

  const BASE_URL = 'http://127.0.0.1:5000';
  const demoToken = 'demo-test-hotline-' + Date.now();
  let passCount = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passCount++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. Config endpoint
  console.log('--- 1. Testing GET /api/hotline/config ---');
  const configRes = await get(`${BASE_URL}/api/hotline/config`);
  assert(configRes.status === 200 && configRes.body.success, 'Config endpoint responds with 200');
  const config = configRes.body.data;
  assert(config.minBet === 10 && config.maxBet === 5000, 'Min/max bets default to ₹10 / ₹5,000');
  assert(config.minNumber === 1 && config.maxNumber === 100, 'Number line limits default to 1 to 100');
  assert(config.baseRtp === 0.96, 'Base RTP is 96.0%');

  // 2. Input & Number Line Validations
  console.log('\n--- 2. Testing Input & Number Line Validations ---');
  // Selected number out of bounds (0 or 101)
  const rejectZero = await post(`${BASE_URL}/api/hotline/start`, {
    demoToken,
    betAmount: 50,
    selectedNumber: 0,
  });
  assert(rejectZero.status === 400, 'Selected number 0 is rejected with 400');

  const reject101 = await post(`${BASE_URL}/api/hotline/start`, {
    demoToken,
    betAmount: 50,
    selectedNumber: 101,
  });
  assert(reject101.status === 400, 'Selected number 101 is rejected with 400');

  // Bet outside limits
  const rejectLowBet = await post(`${BASE_URL}/api/hotline/start`, {
    demoToken,
    betAmount: 5,
    selectedNumber: 50,
  });
  assert(rejectLowBet.status === 400, 'Bet ₹5 below minBet is rejected with 400');

  // 3. Normal Round Start & Balance Deduction
  console.log('\n--- 3. Testing Start Round & Wallet Deduction ---');
  const startNormal = await post(`${BASE_URL}/api/hotline/start`, {
    demoToken,
    betAmount: 100,
    selectedNumber: 77,
  });
  assert(startNormal.status === 200 && startNormal.body.success, 'Round started successfully with #77');
  const round1 = startNormal.body.data;
  assert(round1.status === 'ACTIVE', 'Round status is ACTIVE');
  assert(round1.selectedNumber === 77, 'Selected number is 77');
  assert(round1.revealedNumber >= 1 && round1.revealedNumber <= 100, `Revealed number is within [1..100]: #${round1.revealedNumber}`);
  assert(round1.stoppingMultiplier >= 1.0, `Stopping multiplier is >= 1.00x: ${round1.stoppingMultiplier}x`);
  assert(round1.durationMs > 0, `Client animation duration calculated: ${round1.durationMs}ms`);

  // 4. Direct Hit Bonus (Matching Selected Number)
  console.log('\n--- 4. Testing Direct Hit Bonus (Exact Match) ---');
  const startDirectHit = await post(`${BASE_URL}/api/hotline/start`, {
    demoToken,
    betAmount: 100,
    selectedNumber: 42,
    forcedNumber: 42,
    forcedMultiplier: 3.0,
  });
  assert(startDirectHit.status === 200 && startDirectHit.body.success, 'Direct hit round started');
  const directData = startDirectHit.body.data;
  assert(directData.isDirectHit === true, 'Direct hit flag is true');
  assert(directData.bonusMultiplier === 2.0, 'Direct hit awards 2.0x bonus boost');
  assert(directData.stoppingMultiplier === 6.0, `Stopping multiplier boosted from 3.0x to 6.0x: ${directData.stoppingMultiplier}x`);

  // 5. Hot Zone Bonus (Proximity within ±3)
  console.log('\n--- 5. Testing Hot Zone Proximity Bonus ---');
  const startHotZone = await post(`${BASE_URL}/api/hotline/start`, {
    demoToken,
    betAmount: 100,
    selectedNumber: 45,
    forcedNumber: 42,
    forcedMultiplier: 4.0,
  });
  const hotZoneData = startHotZone.body.data;
  assert(hotZoneData.isDirectHit === false, 'Not a direct hit');
  assert(hotZoneData.isHotZone === true, 'Hot zone proximity flag is true');
  assert(hotZoneData.bonusMultiplier === 1.25, 'Hot zone awards 1.25x bonus boost');
  assert(hotZoneData.stoppingMultiplier === 5.0, `Stopping multiplier boosted: 4.0x * 1.25 = ${hotZoneData.stoppingMultiplier}x`);

  // 6. Cash Out (Successful Win)
  console.log('\n--- 6. Testing Successful Cash Out ---');
  const startForCashout = await post(`${BASE_URL}/api/hotline/start`, {
    demoToken,
    betAmount: 100,
    selectedNumber: 50,
    forcedMultiplier: 4.5,
  });
  const cashoutRoundId = startForCashout.body.data.roundId;

  // Cashout at 2.50x
  const cashoutRes = await post(`${BASE_URL}/api/hotline/cashout`, {
    demoToken,
    roundId: cashoutRoundId,
    multiplier: 2.5,
  });
  assert(cashoutRes.status === 200 && cashoutRes.body.data.status === 'WON', 'Cashout succeeded with status WON');
  assert(cashoutRes.body.data.multiplier === 2.5, 'Multiplier recorded as 2.5x');
  assert(cashoutRes.body.data.payout === 250, 'Payout calculated as ₹100 * 2.5 = ₹250');
  assert(cashoutRes.body.data.profit === 150, 'Profit is ₹150');

  // Attempting duplicate cashout on already settled round should fail
  const tryDuplicateCashout = await post(`${BASE_URL}/api/hotline/cashout`, {
    demoToken,
    roundId: cashoutRoundId,
    multiplier: 2.5,
  });
  assert(tryDuplicateCashout.status === 400, 'Duplicate cashout rejected with 400');

  // 7. Burnout / Loss Condition (Exceeding stopping multiplier)
  console.log('\n--- 7. Testing Burnout / Loss Condition ---');
  const startForBurnout = await post(`${BASE_URL}/api/hotline/start`, {
    demoToken,
    betAmount: 100,
    selectedNumber: 50,
    forcedMultiplier: 2.0,
  });
  const burnoutRoundId = startForBurnout.body.data.roundId;

  // Request cashout at 2.80x (exceeds 2.0x stopping point)
  const tryLateCashout = await post(`${BASE_URL}/api/hotline/cashout`, {
    demoToken,
    roundId: burnoutRoundId,
    multiplier: 2.8,
  });
  assert(tryLateCashout.status === 200 && tryLateCashout.body.data.status === 'LOST', 'Late cashout past stopping multiplier resolves as LOST');
  assert(tryLateCashout.body.data.payout === 0, 'Payout on burnout is ₹0');

  // 8. Idempotency Check
  console.log('\n--- 8. Testing Idempotency & Replay Prevention ---');
  const idemKey = 'idem-hotline-' + Date.now();
  const firstIdemCall = await post(`${BASE_URL}/api/hotline/start`, {
    demoToken,
    betAmount: 100,
    selectedNumber: 33,
    idempotencyKey: idemKey,
  });
  const firstBal = firstIdemCall.body.data.balance;
  const firstRoundId = firstIdemCall.body.data.roundId;

  const secondIdemCall = await post(`${BASE_URL}/api/hotline/start`, {
    demoToken,
    betAmount: 100,
    selectedNumber: 33,
    idempotencyKey: idemKey,
  });
  const secondBal = secondIdemCall.body.data.balance;
  const secondRoundId = secondIdemCall.body.data.roundId;

  assert(firstRoundId === secondRoundId, 'Duplicate request returned existing round ID');
  assert(firstBal === secondBal, 'Duplicate request did not double-debit wallet');

  // 9. Session History
  console.log('\n--- 9. Testing GET /api/hotline/history ---');
  const historyRes = await get(`${BASE_URL}/api/hotline/history?demoToken=${demoToken}`);
  assert(historyRes.status === 200 && Array.isArray(historyRes.body.data), 'History endpoint returns array');
  assert(historyRes.body.data.length >= 4, `Found ${historyRes.body.data.length} recorded rounds in session`);

  // 10. Admin Telemetry & Settings
  console.log('\n--- 10. Testing Admin Stats & Runtime Config ---');
  const adminStats = await get(`${BASE_URL}/api/hotline/admin/stats`);
  assert(adminStats.status === 200 && adminStats.body.success, 'Admin stats endpoint responds with 200');
  assert(adminStats.body.data.totalRounds > 0, `Admin recorded ${adminStats.body.data.totalRounds} total rounds`);

  // Update Config via Admin
  const updateConfig = await post(`${BASE_URL}/api/hotline/admin/config`, {
    minBet: 20,
    maxBet: 4000,
    maxMultiplier: 2000.0,
  });
  assert(updateConfig.status === 200 && updateConfig.body.data.minBet === 20, 'Admin updated minBet to ₹20');
  assert(updateConfig.body.data.maxMultiplier === 2000.0, 'Admin updated maxMultiplier to 2000x');

  // Restore defaults
  await post(`${BASE_URL}/api/hotline/admin/config`, {
    minBet: 10,
    maxBet: 5000,
    maxMultiplier: 1000.0,
  });
  console.log('Restored default bet limits.');

  console.log(`\n====================================================`);
  console.log(`🎉 ALL ${passCount} / ${totalTests} E2E TESTS PASSED PERFECTLY!`);
  console.log(`====================================================\n`);
}

runTests().catch((err) => {
  console.error('\n❌ E2E TEST FAILED:', err);
  process.exit(1);
});

