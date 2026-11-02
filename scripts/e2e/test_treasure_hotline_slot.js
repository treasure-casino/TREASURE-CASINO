/**
 * TREASURE HOTLINE 2D VIDEO SLOT (SPRIBE/HOTLINE INSPIRED)
 * PRD Automated End-to-End Test Suite
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000';
let demoToken = 'slot_prd_test_' + Date.now();

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const url = new URL(options.url || BASE_URL + options.path);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-token': demoToken,
        ...(options.headers || {}),
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${message}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${message}`);
  }
}

async function runHotlineSlotTests() {
  console.log('\n============================================================');
  console.log('⚡ TREASURE HOTLINE 2D VIDEO SLOT - PRD E2E TEST SUITE');
  console.log('============================================================\n');

  try {
    // ── 1. CONFIGURATION TESTS (PRD §1 & §2) ──
    console.log('--- 1. Game Configuration & Symbol Specs ---');
    const configRes = await request({ path: '/api/hotline/config' });
    assert(configRes.status === 200, 'Config endpoint returns HTTP 200');
    assert(configRes.body.success === true, 'Config response has success: true');

    const config = configRes.body.data;
    assert(config.minBet === 10, 'Min bet is ₹10');
    assert(config.maxBet === 5000, 'Max bet is ₹5,000');
    assert(Array.isArray(config.symbols), 'Symbols list is provided');
    assert(config.symbols.length === 8, 'Exactly 8 original Hotline symbols configured');

    const symbolCodes = config.symbols.map((s) => s.code);
    const requiredSymbols = [
      'WILD',
      'NEON_7',
      'HOTLINE_PHONE',
      'SPORTS_CAR',
      'PALM_TREE',
      'CASSETTE',
      'STAR',
      'SCATTER',
    ];
    requiredSymbols.forEach((code) => {
      assert(symbolCodes.includes(code), `Contains required symbol: ${code}`);
    });

    assert(Array.isArray(config.paylines), 'Paylines list is provided');
    assert(config.paylines.length === 20, 'Has 20 paylines configured');
    assert(config.reelCount === 5, '5 reels');
    assert(config.rowCount === 3, '3 rows');
    assert(config.scatterProbability === 0.01, 'Backend Scatter probability is exactly 0.01 (1%)');
    assert(config.scatterProbabilityPercent === '1.0%', 'Backend Scatter probability percent is 1.0%');
    assert(config.features.includes('EXPANDING_WILDS'), 'Feature EXPANDING_WILDS is active');
    assert(config.features.includes('FREE_SPINS'), 'Feature FREE_SPINS is active (PRD §4)');
    assert(config.features.includes('BONUS_BET'), 'Feature BONUS_BET is active (PRD §4)');
    assert(config.features.includes('LOW_HIGH_RISK'), 'Feature LOW_HIGH_RISK is active (PRD §3)');

    // ── 2. INPUT VALIDATION TESTS (PRD §6) ──
    console.log('\n--- 2. Bet Validation Tests ---');
    const underBetRes = await request({ path: '/api/hotline/spin', method: 'POST' }, { betAmount: 5 });
    assert(underBetRes.status === 400, 'Rejects bet below minBet (₹5 < ₹10)');

    const overBetRes = await request({ path: '/api/hotline/spin', method: 'POST' }, { betAmount: 6000 });
    assert(overBetRes.status === 400, 'Rejects bet above maxBet (₹6000 > ₹5000)');

    const nanBetRes = await request({ path: '/api/hotline/spin', method: 'POST' }, { betAmount: 'invalid' });
    assert(nanBetRes.status === 400, 'Rejects non-numeric bet');

    // ── 3. LOW RISK VS HIGH RISK GAME MODES (PRD §3) ──
    console.log('\n--- 3. Game Modes: LOW RISK & HIGH RISK (PRD §3) ---');
    const lowSpin = await request(
      { path: '/api/hotline/spin', method: 'POST' },
      { betAmount: 100, riskLevel: 'LOW', demoToken }
    );
    assert(lowSpin.status === 200, 'LOW RISK spin returns HTTP 200');
    assert(lowSpin.body.data.riskLevel === 'LOW', 'Returned riskLevel is LOW');

    const highSpin = await request(
      { path: '/api/hotline/spin', method: 'POST' },
      { betAmount: 100, riskLevel: 'HIGH', demoToken }
    );
    assert(highSpin.status === 200, 'HIGH RISK spin returns HTTP 200');
    assert(highSpin.body.data.riskLevel === 'HIGH', 'Returned riskLevel is HIGH');

    // ── 4. BONUS BET (+50%) EXECUTION (PRD §4) ──
    console.log('\n--- 4. Bonus Bet (+50%) Execution (PRD §4) ---');
    const bonusBetSpin = await request(
      { path: '/api/hotline/spin', method: 'POST' },
      { betAmount: 100, bonusBetActive: true, demoToken }
    );
    assert(bonusBetSpin.status === 200, 'Bonus Bet spin returns HTTP 200');
    assert(bonusBetSpin.body.data.bonusBetActive === true, 'Spin reports bonusBetActive: true');
    assert(bonusBetSpin.body.data.baseBet === 100, 'Base bet is 100');
    assert(bonusBetSpin.body.data.totalBet === 150, 'Total bet is 150 (+50% bonus bet applied)');
    assert(
      bonusBetSpin.body.data.balanceAfter ===
        +(bonusBetSpin.body.data.balanceBefore - 150 + bonusBetSpin.body.data.totalPayout).toFixed(2),
      'Wallet deducted exact totalBet (₹150) and credited payout'
    );

    // ── 5. FREE SPINS EXECUTION (PRD §4) ──
    console.log('\n--- 5. Free Spins Mode Execution (PRD §4) ---');
    const freeSpinRes = await request(
      { path: '/api/hotline/spin', method: 'POST' },
      { betAmount: 100, isFreeSpin: true, demoToken }
    );
    assert(freeSpinRes.status === 200, 'Free spin returns HTTP 200');
    assert(freeSpinRes.body.data.isFreeSpinRound === true, 'Round reports isFreeSpinRound: true');
    assert(freeSpinRes.body.data.totalBet === 0, 'Total bet deducted is ₹0 during Free Spins');
    assert(
      freeSpinRes.body.data.balanceAfter ===
        +(freeSpinRes.body.data.balanceBefore + freeSpinRes.body.data.totalPayout).toFixed(2),
      'Balance increased by pure win without deducting bet during Free Spin'
    );

    // ── 6. EXPANDING WILD MECHANICAL INTEGRITY ──
    console.log('\n--- 6. Expanding Wild Mechanical Verification ---');
    let foundExpandingWild = false;
    for (let i = 0; i < 20; i++) {
      const sp = await request(
        { path: '/api/hotline/spin', method: 'POST' },
        { betAmount: 20, bonusBetActive: true, demoToken }
      );
      if (sp.body.data.expandedReels && sp.body.data.expandedReels.length > 0) {
        foundExpandingWild = true;
        const eReels = sp.body.data.expandedReels;
        const eGrid = sp.body.data.expandedGrid;
        eReels.forEach((colIdx) => {
          assert(
            eGrid[0][colIdx] === 0 && eGrid[1][colIdx] === 0 && eGrid[2][colIdx] === 0,
            `Expanding Wild at Reel ${colIdx} converted entire column [rows 0,1,2] to Wild (0)`
          );
        });
        break;
      }
    }
    assert(foundExpandingWild, 'Observed Expanding Wild trigger within sample batch');

    // ── 7. IDEMPOTENCY KEY VERIFICATION ──
    console.log('\n--- 7. Idempotency Key Verification ---');
    const idemKey = 'hotline_prd_idem_' + Date.now();
    const idemRes1 = await request(
      { path: '/api/hotline/spin', method: 'POST' },
      { betAmount: 50, demoToken, idempotencyKey: idemKey }
    );
    const balAfter1 = idemRes1.body.data.balanceAfter;

    const idemRes2 = await request(
      { path: '/api/hotline/spin', method: 'POST' },
      { betAmount: 50, demoToken, idempotencyKey: idemKey }
    );
    assert(idemRes2.status === 200, 'Idempotent replay returns 200 OK');
    assert(idemRes2.body.data.roundId === idemRes1.body.data.roundId, 'Returns same roundId');
    assert(idemRes2.body.data.balanceAfter === balAfter1, 'No duplicate bet deduction on replay');

    // ── 8. PLAYER HISTORY & TELEMETRY ──
    console.log('\n--- 8. History and Admin Telemetry ---');
    const histRes = await request({ path: `/api/hotline/history?demoToken=${demoToken}&limit=10` });
    assert(histRes.status === 200, 'History endpoint returns HTTP 200');
    assert(Array.isArray(histRes.body.data), 'History returns an array');
    assert(histRes.body.data.length > 0, 'Recent spins are recorded in player history');

    const adminStatsRes = await request({ path: '/api/hotline/admin/stats' });
    assert(adminStatsRes.status === 200, 'Admin stats endpoint returns HTTP 200');
    assert(adminStatsRes.body.data.totalRounds > 0, 'Admin reports total rounds > 0');
    assert(adminStatsRes.body.data.totalBets > 0, 'Admin reports total wagers > 0');

    // ── 9. ADMIN CONFIGURATION UPDATE ──
    console.log('\n--- 9. Admin Configuration Updates ---');
    const updateRes = await request(
      { path: '/api/hotline/admin/config', method: 'POST' },
      { minBet: 20, maxBet: 4000 }
    );
    assert(updateRes.status === 200, 'Admin config update returns 200 OK');
    assert(updateRes.body.data.minBet === 20, 'Config minBet updated to 20');
    assert(updateRes.body.data.maxBet === 4000, 'Config maxBet updated to 4000');

    // Restore config
    await request(
      { path: '/api/hotline/admin/config', method: 'POST' },
      { minBet: 10, maxBet: 5000 }
    );

    console.log('\n============================================================');
    console.log(`🏁 TEST RESULTS: ${passedTests} / ${totalTests} PASSED (${failedTests} FAILED)`);
    console.log('============================================================\n');

    if (failedTests > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
}

runHotlineSlotTests();
