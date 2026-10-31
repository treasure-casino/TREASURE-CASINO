/**
 * ============================================================================
 * TREASURE CASINO — TOTAL GAMES REMOVAL VERIFICATION SUITE
 * Systematically verifies that all games are 100% removed, catalogue is empty,
 * and all users, wallets, and financial ledgers are intact.
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('../backend/node_modules/@prisma/client');

const prisma = new PrismaClient();
const BASE_URL = 'http://localhost:5000';

function apiRequest(method, pathUrl, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(pathUrl, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
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

async function runVerification() {
  console.log('='.repeat(80));
  console.log('  TREASURE CASINO: TOTAL GAMES REMOVAL AUDIT & VERIFICATION');
  console.log('='.repeat(80));

  let passed = 0;
  let failed = 0;

  function assert(cond, desc) {
    if (cond) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Database Game Records
    console.log('\n--- 1. Database Games Count Audit ---');
    const gameCount = await prisma.game.count();
    const sessionCount = await prisma.gameSession.count();
    const launchCount = await prisma.gameLaunchSession.count();
    const eventCount = await prisma.gameEvent.count();
    const mappingCount = await prisma.providerGameMapping.count();

    assert(gameCount === 0, `Total games in database: ${gameCount} (Expected: 0)`);
    assert(sessionCount === 0, `Total legacy game sessions: ${sessionCount} (Expected: 0)`);
    assert(launchCount === 0, `Total launch sessions: ${launchCount} (Expected: 0)`);
    assert(eventCount === 0, `Total game events: ${eventCount} (Expected: 0)`);
    assert(mappingCount === 0, `Total provider mappings: ${mappingCount} (Expected: 0)`);

    // 2. Core Systems Data Preservation
    console.log('\n--- 2. Core User & Financial Data Preservation ---');
    const userCount = await prisma.user.count();
    const walletCount = await prisma.wallet.count();
    const txCount = await prisma.walletTransaction.count();
    const depositCount = await prisma.deposit.count();
    const auditCount = await prisma.adminAuditLog.count();

    assert(userCount === 42, `User Accounts: ${userCount} / 42 (PRESERVED)`);
    assert(walletCount === 42, `Wallets: ${walletCount} / 42 (PRESERVED)`);
    assert(txCount === 242, `Financial Transactions: ${txCount} / 242 (PRESERVED)`);
    assert(depositCount === 26, `Deposits: ${depositCount} / 26 (PRESERVED)`);
    assert(auditCount === 56, `Admin Audit Logs: ${auditCount} / 56 (PRESERVED)`);

    // 3. Backend API Endpoints
    console.log('\n--- 3. Backend API Endpoints Audit ---');
    const publicGames = await apiRequest('GET', '/api/games');
    assert(publicGames.status === 200, `GET /api/games status code: ${publicGames.status}`);
    assert(Array.isArray(publicGames.body?.data) && publicGames.body.data.length === 0, `GET /api/games returns empty array (Length: ${publicGames.body?.data?.length})`);
    assert(publicGames.body?.total === 0, `GET /api/games total count: ${publicGames.body?.total}`);

    // Test nonexistent game id
    const singleGame = await apiRequest('GET', '/api/games/jili-slot-01');
    assert(singleGame.status === 404, `GET /api/games/jili-slot-01 status: ${singleGame.status} (Inaccessible)`);

    // Health Endpoint
    const health = await apiRequest('GET', '/health');
    assert(health.status === 200, `GET /health status: ${health.status}`);
    assert(health.body?.status === 'UP', `System status is UP (${health.body?.database})`);

    // 4. File Assets Audit
    console.log('\n--- 4. Game File Assets & Components Audit ---');
    const assetsDir = path.join(__dirname, '../admin/public/assets/games');
    const assetFiles = fs.readdirSync(assetsDir);
    const svgGameThumbnails = assetFiles.filter((f) => f.endsWith('.svg'));
    assert(svgGameThumbnails.length === 0, `Game SVG thumbnails in assets/games: ${svgGameThumbnails.length} (Expected: 0)`);

    const componentsDir = path.join(__dirname, '../admin/src/components/games');
    const componentFiles = fs.readdirSync(componentsDir);
    const engineComponents = componentFiles.filter((f) => f.endsWith('Engine.tsx'));
    assert(engineComponents.length === 0, `Game engine components in components/games: ${engineComponents.length} (Expected: 0)`);

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log(`TOTAL REMOVAL AUDIT RESULT: ${failed === 0 ? 'ALL CHECKS PASSED (100% CLEAN)' : 'FAILED'}`);
    console.log(`PASSED: ${passed}, FAILED: ${failed}`);
    console.log('='.repeat(80));

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Audit exception:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();

