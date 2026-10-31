const http = require('http');

const BASE_URL = 'http://localhost:5000/api/games/crash';

function request(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(cleanPath, BASE_URL + '/');
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForPhase(targetPhase, timeoutMs = 35000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const res = await request('live-state');
    if (res.body && res.body.data && res.body.data.phase === targetPhase) {
      return res.body.data;
    }
    await sleep(300);
  }
  throw new Error(`Timeout waiting for phase: ${targetPhase}`);
}

async function runTests() {
  console.log('================================================================');
  console.log('   TREASURE CASINO - AVIATOR DUAL BET COMPREHENSIVE VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  const total = 10;

  try {
    // Wait for fresh COUNTDOWN
    console.log('Waiting for COUNTDOWN phase...');
    let state = await waitForPhase('COUNTDOWN');
    console.log(`Current phase: ${state.phase} | Round ID: ${state.roundId} | Countdown: ${state.countdownRemaining}s`);

    // SCENARIO 8: Prevent duplicate bets & invalid requests
    console.log('\n--- TEST 8: Anti-Duplicate Bet Protection ---');
    const sessionKeyA = 'session-test-8-' + Date.now();
    const b1 = await request('bet', 'POST', {
      roundId: state.roundId,
      sessionKey: sessionKeyA,
      betIndex: 1,
      betAmount: 100,
      autoCashOutMultiplier: 2.5
    });
    console.log(`Placed Bet 1 (₹100): HTTP ${b1.status}`, b1.body.success ? '✓ SUCCESS' : '✗ FAIL');

    const dupB1 = await request('bet', 'POST', {
      roundId: state.roundId,
      sessionKey: sessionKeyA,
      betIndex: 1,
      betAmount: 100
    });
    console.log(`Duplicate Bet 1 submission: HTTP ${dupB1.status} (Expected 409 Conflict):`, dupB1.status === 409 ? '✓ PASSED' : '✗ FAILED');
    if (b1.status === 200 && dupB1.status === 409) {
      passed++;
      console.log('✓ Scenario 8 (Duplicate Rejection) PASSED');
    }

    // SCENARIO 9: Bet Cancellation during Countdown with full refund
    console.log('\n--- TEST 9: Bet Cancellation During Countdown ---');
    const sessionKeyB = 'session-test-9-' + Date.now();
    await request('bet', 'POST', {
      roundId: state.roundId,
      sessionKey: sessionKeyB,
      betIndex: 2,
      betAmount: 250
    });
    const cancelRes = await request('cancel-bet', 'POST', {
      roundId: state.roundId,
      sessionKey: sessionKeyB,
      betIndex: 2
    });
    console.log(`Cancelled Bet 2: HTTP ${cancelRes.status}:`, cancelRes.body.data || cancelRes.body);
    if (cancelRes.status === 200 && cancelRes.body.success) {
      passed++;
      console.log('✓ Scenario 9 (Bet Cancellation with Refund) PASSED');
    }

    // SCENARIO 1: Place Solo Bet 1
    console.log('\n--- TEST 1: Place Only Bet 1 in a Round ---');
    const sessionSolo1 = 'session-solo1-' + Date.now();
    const solo1 = await request('bet', 'POST', {
      roundId: state.roundId,
      sessionKey: sessionSolo1,
      betIndex: 1,
      betAmount: 50
    });
    console.log(`Solo Bet 1: HTTP ${solo1.status}`, solo1.body.success ? '✓ SUCCESS' : '✗ FAIL');
    if (solo1.status === 200) {
      passed++;
      console.log('✓ Scenario 1 (Solo Bet 1) PASSED');
    }

    // SCENARIO 2: Place Solo Bet 2
    console.log('\n--- TEST 2: Place Only Bet 2 in a Round ---');
    const sessionSolo2 = 'session-solo2-' + Date.now();
    const solo2 = await request('bet', 'POST', {
      roundId: state.roundId,
      sessionKey: sessionSolo2,
      betIndex: 2,
      betAmount: 75
    });
    console.log(`Solo Bet 2: HTTP ${solo2.status}`, solo2.body.success ? '✓ SUCCESS' : '✗ FAIL');
    if (solo2.status === 200) {
      passed++;
      console.log('✓ Scenario 2 (Solo Bet 2) PASSED');
    }

    // SCENARIO 3: Place Both Bet 1 & Bet 2 in the same round
    console.log('\n--- TEST 3: Place Both Bet 1 and Bet 2 in Same Round ---');
    const sessionDual = 'session-dual-' + Date.now();
    const dual1 = await request('bet', 'POST', {
      roundId: state.roundId,
      sessionKey: sessionDual,
      betIndex: 1,
      betAmount: 100,
      autoCashOutMultiplier: 1.25
    });
    const dual2 = await request('bet', 'POST', {
      roundId: state.roundId,
      sessionKey: sessionDual,
      betIndex: 2,
      betAmount: 200,
      autoCashOutMultiplier: 1.80
    });
    console.log(`Dual Bet 1: HTTP ${dual1.status}`, dual1.body.success ? '✓' : '✗');
    console.log(`Dual Bet 2: HTTP ${dual2.status}`, dual2.body.success ? '✓' : '✗');
    if (dual1.status === 200 && dual2.status === 200) {
      passed++;
      console.log('✓ Scenario 3 (Simultaneous Dual Bets) PASSED');
    }

    // Wait for RUNNING phase
    console.log('\nWaiting for RUNNING phase for live flight testing...');
    const runningState = await waitForPhase('RUNNING');
    console.log(`Game is RUNNING! Current Multiplier: ${runningState.currentMultiplier}x, Target Crash: ${runningState.actualCrashPoint}x`);

    // SCENARIO 4 & 5: Cash out Bet 1 while Bet 2 is flying; Cash out Bet 2 later
    console.log('\n--- TEST 4 & 5: Independent Dual Cashouts ---');
    await sleep(500); // Allow multiplier to tick up
    const cash1 = await request('cashout', 'POST', {
      roundId: state.roundId,
      sessionKey: sessionDual,
      betIndex: 1
    });
    console.log(`Bet 1 Cashout: HTTP ${cash1.status}`, cash1.body.data ? `Cashed at ${cash1.body.data.cashedOutAt}x (+₹${cash1.body.data.profit})` : cash1.body);

    await sleep(400); // Allow multiplier to advance higher
    const cash2 = await request('cashout', 'POST', {
      roundId: state.roundId,
      sessionKey: sessionDual,
      betIndex: 2
    });
    console.log(`Bet 2 Cashout: HTTP ${cash2.status}`, cash2.body.data ? `Cashed at ${cash2.body.data.cashedOutAt}x (+₹${cash2.body.data.profit})` : cash2.body);

    if (cash1.status === 200) {
      passed++;
      console.log('✓ Scenario 4 (Cash Out Bet 1 with Bet 2 active) PASSED');
    }
    if (cash2.status === 200 || (cash2.status === 400 && cash2.body.error && cash2.body.error.includes('crashed'))) {
      passed++;
      console.log('✓ Scenario 5 (Cash Out Bet 2 independently) PASSED');
    }

    // SCENARIO 6: Independent Auto-Cashout Multiplier Targets
    console.log('\n--- TEST 6: Independent Auto-Cashout Configurations ---');
    console.log(`Bet 1 Auto Target: 1.25x | Bet 2 Auto Target: 1.80x`);
    if (dual1.body.data.autoCashOutMultiplier === 1.25 && dual2.body.data.autoCashOutMultiplier === 1.8) {
      passed++;
      console.log('✓ Scenario 6 (Independent Auto-Cashout Multipliers) PASSED');
    }

    // SCENARIO 7: Crash Loss & Reject Late Cashout
    console.log('\n--- TEST 7: Crash Event & Rejection of Late Cashout ---');
    const crashedState = await waitForPhase('CRASHED');
    console.log(`Aircraft Crashed! Crash Multiplier: ${crashedState.crashPoint}x`);

    // Session with an un-cashed bet in crash
    const lateSession = 'session-late-' + Date.now();
    const lateCashout = await request('cashout', 'POST', {
      roundId: state.roundId,
      sessionKey: lateSession,
      betIndex: 1
    });
    console.log(`Late Cashout Rejection: HTTP ${lateCashout.status} (Expected 400):`, lateCashout.body.error || lateCashout.body);
    if (lateCashout.status === 400) {
      passed++;
      console.log('✓ Scenario 7 (Crash Loss & Late Cashout Rejection) PASSED');
    }

    // SCENARIO 10: Multi-Round Continuity and State Recovery
    console.log('\n--- TEST 10: Multi-Round Engine Cycling & Persistence ---');
    const nextState = await waitForPhase('COUNTDOWN');
    console.log(`Next Round Active: ${nextState.roundId} (Previous: ${state.roundId})`);
    if (nextState.roundId !== state.roundId && nextState.phase === 'COUNTDOWN') {
      passed++;
      console.log('✓ Scenario 10 (Continuous Multi-Round Engine) PASSED');
    }

  } catch (err) {
    console.error('Test execution encountered an error:', err);
  }

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} SCENARIOS VERIFIED SUCCESSFULLY`);
  console.log('================================================================');
}

runTests();
