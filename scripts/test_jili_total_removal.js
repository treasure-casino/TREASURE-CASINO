/**
 * Comprehensive Verification: Total Removal of All JILI Games & JILI Provider Integration
 */
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

async function runAudit() {
  console.log('================================================================');
  console.log('🔍 TOTAL REMOVAL AUDIT: JILI GAMES & PROVIDER INTEGRATION');
  console.log('================================================================\n');

  // TEST 1: Check JILI provider endpoint is completely unmounted (404)
  console.log('1. Verifying JILI Provider Endpoints are completely removed:');
  const jiliLaunchRes = await apiRequest('POST', '/api/provider/jili/launch/test', { mode: 'DEMO' });
  assert(jiliLaunchRes.status === 404, `POST /api/provider/jili/launch/test returns 404 (received ${jiliLaunchRes.status})`);

  const jiliCallbackRes = await apiRequest('POST', '/api/provider/jili/callback', { test: true });
  assert(jiliCallbackRes.status === 404, `POST /api/provider/jili/callback returns 404 (received ${jiliCallbackRes.status})`);

  const jiliSyncRes = await apiRequest('POST', '/api/provider/jili/sync', {});
  assert(jiliSyncRes.status === 404, `POST /api/provider/jili/sync returns 404 (received ${jiliSyncRes.status})`);

  const jiliLogsRes = await apiRequest('GET', '/api/provider/jili/logs');
  assert(jiliLogsRes.status === 404, `GET /api/provider/jili/logs returns 404 (received ${jiliLogsRes.status})`);

  // TEST 2: Check Public Game Catalogue
  console.log('\n2. Verifying Public Game Catalogue:');
  const gamesRes = await apiRequest('GET', '/api/games');
  assert(gamesRes.status === 200, `GET /api/games returns 200`);
  assert(Array.isArray(gamesRes.body.data), `games array returned`);
  assert(gamesRes.body.data.length === 0, `0 games in active catalogue (found ${gamesRes.body.data.length})`);
  assert(gamesRes.body.total === 0, `Total games reported as 0`);

  // TEST 3: Provider Status endpoint
  console.log('\n3. Verifying Provider Status:');
  const provStatusRes = await apiRequest('GET', '/api/games/provider/status');
  assert(provStatusRes.status === 200, `GET /api/games/provider/status returns 200`);
  assert(provStatusRes.body.data.totalGames === 0, `Provider status totalGames = 0`);
  const jiliInProviders = provStatusRes.body.data.providers.some(
    p => p.name.toLowerCase().includes('jili') || p.code === 'JILI'
  );
  assert(!jiliInProviders, `No active JILI provider in provider list`);

  // TEST 4: Admin Authentication
  console.log('\n4. Verifying Admin Authentication:');
  const loginRes = await apiRequest('POST', '/api/admin/auth/login', {
    email: 'admin@treasure.com',
    password: 'Admin123!',
  });
  assert(loginRes.status === 200, `POST /api/admin/auth/login returns 200`);
  assert(loginRes.body.success === true, `Admin login successful`);
  const adminToken = loginRes.body.data?.token;
  assert(!!adminToken, `Admin token received`);

  // TEST 5: Verify Admin Game Management
  console.log('\n5. Verifying Admin Game Catalogue:');
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };
  const adminGamesRes = await apiRequest('GET', '/api/admin/games', null, adminHeaders);
  assert(adminGamesRes.status === 200, `GET /api/admin/games returns 200`);
  assert(Array.isArray(adminGamesRes.body.data), `Admin games list returned`);
  assert(adminGamesRes.body.data.length === 0, `Admin game catalogue cleanly empty (0 games)`);

  // TEST 6: Direct Database Integrity Verification
  console.log('\n6. Verifying Direct Database Integrity & Preservation:');
  const [
    userCount,
    walletCount,
    transactionCount,
    depositCount,
    auditLogCount,
    totalGamesDb,
    jiliProvidersDb,
    jiliMappingsDb,
    jiliEventsDb
  ] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.count(),
    prisma.walletTransaction.count(),
    prisma.deposit.count(),
    prisma.adminAuditLog.count(),
    prisma.game.count(),
    prisma.gameProvider.count({ where: { OR: [{ code: 'JILI' }, { name: { contains: 'JILI' } }] } }),
    prisma.providerGameMapping.count(),
    prisma.gameEvent.count({ where: { providerCode: 'JILI' } }),
  ]);

  console.log(`  Users in DB:                ${userCount} (Expected: 42)`);
  console.log(`  Wallets in DB:              ${walletCount} (Expected: 42)`);
  console.log(`  Wallet Transactions in DB:  ${transactionCount} (Expected: >= 242)`);
  console.log(`  Deposits in DB:             ${depositCount} (Expected: 26)`);
  console.log(`  Admin Audit Logs in DB:     ${auditLogCount} (Expected: >= 56)`);
  console.log(`  Total Games in DB:          ${totalGamesDb} (Expected: 0)`);
  console.log(`  JILI Providers in DB:       ${jiliProvidersDb} (Expected: 0)`);
  console.log(`  JILI Mappings in DB:        ${jiliMappingsDb} (Expected: 0)`);
  console.log(`  JILI Game Events in DB:     ${jiliEventsDb} (Expected: 0)`);

  assert(userCount === 42, `Exactly 42 user accounts preserved`);
  assert(walletCount === 42, `Exactly 42 user wallets preserved`);
  assert(transactionCount >= 242, `All financial wallet transactions preserved intact (${transactionCount})`);
  assert(depositCount === 26, `All 26 deposit records preserved`);
  assert(auditLogCount >= 56, `Audit logs preserved and active (${auditLogCount})`);
  assert(totalGamesDb === 0, `Total games in database is exactly 0`);
  assert(jiliProvidersDb === 0, `JILI providers in database is 0`);
  assert(jiliMappingsDb === 0, `JILI provider mappings in database is 0`);
  assert(jiliEventsDb === 0, `JILI events in database is 0`);

  await prisma.$disconnect();

  console.log('\n================================================================');
  console.log('🎯 AUDIT COMPLETE: 100% OF REMOVAL AND INTEGRITY CHECKS PASSED');
  console.log('================================================================');
}

runAudit().catch(async (err) => {
  console.error('Fatal audit error:', err);
  await prisma.$disconnect();
  process.exit(1);
});
