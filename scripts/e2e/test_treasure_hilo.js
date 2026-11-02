const http = require('http');

function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
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
  console.log('       TREASURE HILO COMPREHENSIVE E2E TESTS        ');
  console.log('====================================================\n');

  const BASE_URL = 'http://127.0.0.1:5000';
  const demoToken = 'demo-test-hilo-' + Date.now();
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

  // 1. Config & Odds Table
  console.log('--- 1. Testing GET /api/hilo/config ---');
  const configRes = await get(`${BASE_URL}/api/hilo/config`);
  assert(configRes.status === 200 && configRes.body.success, 'Config endpoint responds with 200');
  const config = configRes.body.data.config;
  assert(config.minBet === 10 && config.maxBet === 5000, 'Min/max bets default to ₹10 / ₹5,000');
  assert(config.baseRtp === 0.96, 'Base RTP is 96.0%');
  const oddsTable = configRes.body.data.rankMultipliersTable;
  assert(oddsTable['2'].lowerMultiplier === null, 'Card 2 has null lowerMultiplier (cannot go lower than 2)');
  assert(oddsTable['A'].higherMultiplier === null, 'Card A has null higherMultiplier (cannot go higher than Ace)');
  assert(oddsTable['8'].higherMultiplier === oddsTable['8'].lowerMultiplier, 'Card 8 has symmetric higher/lower odds');

  // 2. Boundary Cases (Ace & 2 Prediction Restrictions)
  console.log('\n--- 2. Testing Ace & 2 Action Boundary Validations ---');
  // Start with Ace
  const startAce = await post(`${BASE_URL}/api/hilo/start`, {
    demoToken,
    betAmount: 100,
    initialCard: { suit: '♠', rank: 'A', value: 14, code: 'A♠' },
  });
  assert(startAce.status === 200 && startAce.body.success, 'Round started with Ace as starting card');
  const aceRoundId = startAce.body.data.roundId;

  // Try HIGHER on Ace -> should be rejected with bad request (400)
  const predictHigherOnAce = await post(`${BASE_URL}/api/hilo/predict`, {
    demoToken,
    roundId: aceRoundId,
    prediction: 'HIGHER',
  });
  assert(predictHigherOnAce.status === 400, 'Predicting HIGHER on Ace is rejected with 400');

  // Predict LOWER on Ace with next card King (13) -> WIN
  const predictLowerOnAce = await post(`${BASE_URL}/api/hilo/predict`, {
    demoToken,
    roundId: aceRoundId,
    prediction: 'LOWER',
    forcedNextCard: { suit: '♥', rank: 'K', value: 13, code: 'K♥' },
  });
  assert(predictLowerOnAce.status === 200 && predictLowerOnAce.body.data.stepOutcome === 'WIN', 'Predicting LOWER on Ace succeeded and produced WIN');
  assert(predictLowerOnAce.body.data.streak === 1, 'Streak incremented to 1');

  // Collect winnings from Ace round
  const collectAce = await post(`${BASE_URL}/api/hilo/collect`, {
    demoToken,
    roundId: aceRoundId,
  });
  assert(collectAce.status === 200 && collectAce.body.data.status === 'WON', 'Collected winnings from Ace round');
  assert(collectAce.body.data.payout > 100, `Payout ₹${collectAce.body.data.payout} returned with profit`);

  // 3. Higher Prediction & Compounding Streak
  console.log('\n--- 3. Testing Higher Prediction & Streak Compounding ---');
  const startCard3 = await post(`${BASE_URL}/api/hilo/start`, {
    demoToken,
    betAmount: 100,
    initialCard: { suit: '♦', rank: '3', value: 3, code: '3♦' },
  });
  const roundId2 = startCard3.body.data.roundId;

  // Step 1: Predict HIGHER -> draw 7 (WIN)
  const step1 = await post(`${BASE_URL}/api/hilo/predict`, {
    demoToken,
    roundId: roundId2,
    prediction: 'HIGHER',
    forcedNextCard: { suit: '♣', rank: '7', value: 7, code: '7♣' },
  });
  assert(step1.body.data.stepOutcome === 'WIN' && step1.body.data.streak === 1, 'Step 1: 3 -> 7 HIGHER = WIN (Streak 1)');
  const mult1 = step1.body.data.accumulatedMultiplier;

  // Step 2: From 7, predict HIGHER -> draw 10 (WIN)
  const step2 = await post(`${BASE_URL}/api/hilo/predict`, {
    demoToken,
    roundId: roundId2,
    prediction: 'HIGHER',
    forcedNextCard: { suit: '♠', rank: '10', value: 10, code: '10♠' },
  });
  assert(step2.body.data.stepOutcome === 'WIN' && step2.body.data.streak === 2, 'Step 2: 7 -> 10 HIGHER = WIN (Streak 2)');
  const mult2 = step2.body.data.accumulatedMultiplier;
  assert(mult2 > mult1, `Multiplier compounded: ${mult1}x -> ${mult2}x`);

  // 4. Push Handling on Equal Rank
  console.log('\n--- 4. Testing Equal Rank PUSH Handling ---');
  // From 10, predict HIGHER -> draw another 10 (PUSH)
  const stepPush = await post(`${BASE_URL}/api/hilo/predict`, {
    demoToken,
    roundId: roundId2,
    prediction: 'HIGHER',
    forcedNextCard: { suit: '♥', rank: '10', value: 10, code: '10♥' },
  });
  assert(stepPush.body.data.stepOutcome === 'PUSH', 'Equal rank 10 -> 10 on HIGHER gives PUSH');
  assert(stepPush.body.data.streak === 2, 'Streak is preserved on PUSH (still 2)');
  assert(stepPush.body.data.accumulatedMultiplier === mult2, 'Multiplier is preserved on PUSH');
  assert(stepPush.body.data.status === 'ACTIVE', 'Round remains ACTIVE after PUSH');

  // Collect after PUSH
  const collectPush = await post(`${BASE_URL}/api/hilo/collect`, {
    demoToken,
    roundId: roundId2,
  });
  assert(collectPush.status === 200 && collectPush.body.data.status === 'WON', 'Successfully collected after PUSH');
  assert(collectPush.body.data.streak === 2, 'Collected round preserved streak 2');

  // 5. Same Prediction Test
  console.log('\n--- 5. Testing SAME Prediction Option ---');
  const startSameRound = await post(`${BASE_URL}/api/hilo/start`, {
    demoToken,
    betAmount: 100,
    initialCard: { suit: '♠', rank: '9', value: 9, code: '9♠' },
  });
  const sameRoundId = startSameRound.body.data.roundId;

  // Predict SAME with card 9 -> WIN
  const predictSameWin = await post(`${BASE_URL}/api/hilo/predict`, {
    demoToken,
    roundId: sameRoundId,
    prediction: 'SAME',
    forcedNextCard: { suit: '♦', rank: '9', value: 9, code: '9♦' },
  });
  assert(predictSameWin.body.data.stepOutcome === 'WIN', 'Hit SAME prediction = WIN');
  assert(predictSameWin.body.data.accumulatedMultiplier >= 10.0, `SAME multiplier is high (${predictSameWin.body.data.accumulatedMultiplier}x)`);

  const collectSame = await post(`${BASE_URL}/api/hilo/collect`, {
    demoToken,
    roundId: sameRoundId,
  });
  assert(collectSame.body.data.payout >= 1000, `Collected SAME payout: ₹${collectSame.body.data.payout}`);

  // 6. Loss Handling
  console.log('\n--- 6. Testing Loss Handling ---');
  const startLossRound = await post(`${BASE_URL}/api/hilo/start`, {
    demoToken,
    betAmount: 100,
    initialCard: { suit: '♠', rank: '8', value: 8, code: '8♠' },
  });
  const lossRoundId = startLossRound.body.data.roundId;

  // Predict HIGHER, but next card is 4 -> LOSS
  const predictLoss = await post(`${BASE_URL}/api/hilo/predict`, {
    demoToken,
    roundId: lossRoundId,
    prediction: 'HIGHER',
    forcedNextCard: { suit: '♥', rank: '4', value: 4, code: '4♥' },
  });
  assert(predictLoss.body.data.stepOutcome === 'LOSS', '8 -> 4 with HIGHER prediction yields LOSS');
  assert(predictLoss.body.data.status === 'LOST', 'Round status updated to LOST');
  assert(predictLoss.body.data.accumulatedMultiplier === 0, 'Accumulated multiplier reset to 0');
  assert(predictLoss.body.data.potentialPayout === 0, 'Payout is 0');

  // Attempting to collect from a lost round should fail
  const tryCollectLost = await post(`${BASE_URL}/api/hilo/collect`, {
    demoToken,
    roundId: lossRoundId,
  });
  assert(tryCollectLost.status === 400, 'Collecting from LOST round is rejected with 400');

  // 7. Player History
  console.log('\n--- 7. Testing GET /api/hilo/history ---');
  const historyRes = await get(`${BASE_URL}/api/hilo/history?demoToken=${demoToken}`);
  assert(historyRes.status === 200 && Array.isArray(historyRes.body.data), 'History endpoint returns array');
  assert(historyRes.body.data.length >= 4, `Found ${historyRes.body.data.length} recorded rounds in session`);

  // 8. Admin Telemetry & Settings
  console.log('\n--- 8. Testing Admin Stats & Runtime Config ---');
  const adminStats = await get(`${BASE_URL}/api/hilo/admin/stats`);
  assert(adminStats.status === 200 && adminStats.body.success, 'Admin stats endpoint responds with 200');
  assert(adminStats.body.data.totalRounds > 0, `Admin recorded ${adminStats.body.data.totalRounds} total rounds`);

  // Update Config via Admin
  const updateConfig = await post(`${BASE_URL}/api/hilo/admin/config`, {
    minBet: 20,
    maxBet: 4000,
  });
  assert(updateConfig.status === 200 && updateConfig.body.data.minBet === 20, 'Admin successfully updated minBet to ₹20');

  // Restore default minBet
  await post(`${BASE_URL}/api/hilo/admin/config`, {
    minBet: 10,
    maxBet: 5000,
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
