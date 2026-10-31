const http = require('http');
const path = require('path');
const { PrismaClient } = require(path.join(__dirname, '../backend/node_modules/@prisma/client'));
const prisma = new PrismaClient();

function apiRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {
      'Content-Type': 'application/json',
      ...headers,
    };
    if (payload) {
      reqHeaders['Content-Length'] = Buffer.byteLength(payload);
    }

    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: reqHeaders,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body: data, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ ${message}`);
  }
}

async function runTest() {
  console.log('================================================================');
  console.log('🎮 VERIFICATION SUITE: PHASE 1 – 3D ORIGINAL GAMES PLATFORM');
  console.log('================================================================\n');

  // TEST 1: Query Games Catalogue API
  console.log('1. Verifying Phase 1 Games in Public Catalogue:');
  const catRes = await apiRequest('GET', '/api/games');
  assert(catRes.status === 200, `GET /api/games status 200`);
  assert(Array.isArray(catRes.body.data), `Games array returned in data`);
  assert(catRes.body.data.length === 3, `Exactly 3 Phase 1 games returned (found ${catRes.body.data.length})`);

  const gameNames = catRes.body.data.map(g => g.name);
  console.log('  Found Games:', gameNames.join(', '));
  assert(gameNames.includes('Treasure Kingdom'), `Treasure Kingdom (Slot) in catalogue`);
  assert(gameNames.includes('Sky Rocket'), `Sky Rocket (Crash) in catalogue`);
  assert(gameNames.includes('Crystal Mines'), `Crystal Mines (Mines) in catalogue`);

  // TEST 2: Individual Game Detail Endpoints
  console.log('\n2. Verifying Single Game Details:');
  for (const gameId of ['game-slot-01', 'game-crash-01', 'game-mines-01']) {
    const detailRes = await apiRequest('GET', `/api/games/${gameId}`);
    assert(detailRes.status === 200, `GET /api/games/${gameId} status 200`);
    assert(detailRes.body.data.id === gameId, `Game id matches ${gameId}`);
    assert(detailRes.body.data.isActive === true, `Game ${gameId} is active`);
    assert(detailRes.body.data.isDemo === true, `Game ${gameId} has demo mode enabled`);
  }

  // TEST 3: Forbidden Games Integrity Check
  console.log('\n3. Verifying Strictly Forbidden Games Are Inaccessible:');
  const forbiddenAttempts = [
    'mega-wheel-of-fortune',
    'lucky-wheel',
    'money-coming',
    'crazy-777'
  ];
  for (const fId of forbiddenAttempts) {
    const fRes = await apiRequest('GET', `/api/games/${fId}`);
    assert(fRes.status === 404, `GET /api/games/${fId} safely returns 404`);
  }

  // TEST 4: Game Launch Session Creation
  console.log('\n4. Verifying Game Launch Session API:');
  const launchRes = await apiRequest('POST', '/api/games/game-slot-01/launch', { mode: 'DEMO' });
  assert(launchRes.status === 200, `POST /api/games/game-slot-01/launch status 200`);
  assert(!!launchRes.body.data.sessionToken, `Session token generated`);
  assert(launchRes.body.data.mode === 'DEMO', `Launch mode is DEMO`);

  // TEST 5: Demo Play & Event Engine
  console.log('\n5. Verifying Demo Action & Event Recording:');
  const spinRes = await apiRequest('POST', '/api/games/game-slot-01/play-demo', { betAmount: 50 });
  assert(spinRes.status === 200, `POST /api/games/game-slot-01/play-demo status 200`);
  assert(spinRes.body.data.gameName === 'Treasure Kingdom', `Outcome generated for Treasure Kingdom`);
  assert(typeof spinRes.body.data.multiplier === 'number', `Valid numerical multiplier generated`);

  const crashPlayRes = await apiRequest('POST', '/api/games/game-crash-01/play-demo', { betAmount: 100 });
  assert(crashPlayRes.status === 200, `POST /api/games/game-crash-01/play-demo status 200`);
  assert(crashPlayRes.body.data.gameName === 'Sky Rocket', `Outcome generated for Sky Rocket`);

  const minesPlayRes = await apiRequest('POST', '/api/games/game-mines-01/play-demo', { betAmount: 50 });
  assert(minesPlayRes.status === 200, `POST /api/games/game-mines-01/play-demo status 200`);
  assert(minesPlayRes.body.data.gameName === 'Crystal Mines', `Outcome generated for Crystal Mines`);

  // TEST 6: Core Financial & User Database Integrity
  console.log('\n6. Verifying Core Financial & Database Integrity:');
  const [users, wallets, transactions, deposits, auditLogs] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.count(),
    prisma.walletTransaction.count(),
    prisma.deposit.count(),
    prisma.adminAuditLog.count(),
  ]);

  console.log(`  User Accounts:       ${users} (Expected: 42)`);
  console.log(`  Player Wallets:      ${wallets} (Expected: 42)`);
  console.log(`  Wallet Transactions: ${transactions} (Expected: >= 242)`);
  console.log(`  Deposits:            ${deposits} (Expected: 26)`);
  console.log(`  Audit Logs:          ${auditLogs} (Expected: >= 56)`);

  assert(users === 42, `All 42 user accounts preserved`);
  assert(wallets === 42, `All 42 player wallets preserved`);
  assert(transactions >= 242, `Financial transaction history preserved (${transactions})`);
  assert(deposits === 26, `Deposit records preserved (26)`);
  assert(auditLogs >= 56, `Audit logs active (${auditLogs})`);

  await prisma.$disconnect();

  console.log('\n================================================================');
  console.log('🎉 PHASE 1 VERIFICATION COMPLETE: ALL 10 ACCEPTANCE CHECKS PASSED');
  console.log('================================================================');
}

runTest().catch(async (err) => {
  console.error('Fatal test error:', err);
  await prisma.$disconnect();
  process.exit(1);
});

