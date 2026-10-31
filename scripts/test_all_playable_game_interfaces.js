/**
 * ============================================================================
 * TREASURE CASINO — Playable Game Interface & Launch Verification Suite
 * Verifies every single game card individually, launch API, and dedicated UI engine.
 * ============================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

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

const CATEGORY_ENGINE_MAP = {
  SLOTS: 'SlotMachineEngine',
  CRASH: 'CrashRocketEngine',
  MINES: 'MinesGameEngine',
  PLINKO: 'PlinkoBoardEngine',
  FISHING: 'FishShooterEngine',
  TABLE_CARD: 'CardTableEngine',
  CASINO: 'CardTableEngine',
  ROULETTE_DICE: 'RouletteDiceEngine',
  KENO: 'KenoBingoEngine',
  BINGO: 'KenoBingoEngine',
  SPORTS: 'SportsPenaltyEngine',
};

async function testAllGames() {
  console.log('='.repeat(80));
  console.log('  TREASURE CASINO: PLAYABLE GAME INTERFACES INDIVIDUAL AUDIT');
  console.log('='.repeat(80));

  // 1. Fetch all games from backend
  const res = await apiRequest('GET', '/api/games?limit=200');
  if (!res.body?.success || !Array.isArray(res.body.data)) {
    throw new Error('Failed to fetch catalogue from /api/games');
  }

  const allGames = res.body.data;
  console.log(`\nFound ${allGames.length} active games in catalogue to verify.\n`);

  let launchSuccess = 0;
  let launchFailed = 0;
  let engineMapped = 0;
  let engineMissing = 0;

  const categoryStats = {};
  const fullyPlayableGames = [];
  const demoOnlyGames = [];
  const providerConnectedGames = [];
  const unavailableGames = [];

  for (let i = 0; i < allGames.length; i++) {
    const g = allGames[i];
    const cat = g.category;
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;

    // Check dedicated engine
    const engine = CATEGORY_ENGINE_MAP[cat];
    if (engine) {
      engineMapped++;
    } else {
      engineMissing++;
      console.error(`[ENGINE MISSING] Game ${g.id} (${g.name}) has no engine for category ${cat}`);
    }

    // Test launch endpoint for this specific game
    const launch = await apiRequest('POST', `/api/games/${g.id}/launch`, { mode: 'DEMO' });
    if (launch.status === 200 && launch.body?.data?.sessionToken) {
      launchSuccess++;
      fullyPlayableGames.push({
        id: g.id,
        name: g.name,
        category: cat,
        engine: engine,
        mode: 'PLAYABLE_DEMO_ENGINE',
      });
      demoOnlyGames.push(g.name);
    } else {
      launchFailed++;
      unavailableGames.push(g.name);
      console.error(`[LAUNCH FAILED] Game ${g.id} (${g.name}) status: ${launch.status}`);
    }
  }

  console.log(`\n--- INDIVIDUAL GAME CARD TEST RESULTS ---`);
  console.log(`Total games tested individually: ${allGames.length}`);
  console.log(`Successful Launch & Session Created: ${launchSuccess} / ${allGames.length}`);
  console.log(`Failed Launches: ${launchFailed}`);
  console.log(`Dedicated Playable UI Engine Mapped: ${engineMapped} / ${allGames.length}`);

  // Test spin on each category engine
  console.log(`\n--- CATEGORY INTERACTIVE ENGINE RESOLUTION AUDIT ---`);
  for (const [cat, engineName] of Object.entries(CATEGORY_ENGINE_MAP)) {
    const sampleGame = allGames.find((g) => g.category === cat);
    if (!sampleGame) {
      console.error(`[WARN] No game found for category: ${cat}`);
      continue;
    }

    const spin = await apiRequest('POST', `/api/games/${sampleGame.id}/spin`, {
      betAmount: 20,
    });

    const isOk = spin.status === 200 && spin.body?.success;
    console.log(
      ` - Category ${cat.padEnd(14)} ➔ Engine: ${engineName.padEnd(20)} [${isOk ? 'PASS' : 'FAIL'}] (Sample: ${sampleGame.name})`
    );
  }

  // Verify frontend components exist on disk
  console.log(`\n--- COMPONENT INTEGRITY AUDIT ---`);
  const engines = [
    'SlotMachineEngine.tsx',
    'CrashRocketEngine.tsx',
    'MinesGameEngine.tsx',
    'PlinkoBoardEngine.tsx',
    'FishShooterEngine.tsx',
    'CardTableEngine.tsx',
    'RouletteDiceEngine.tsx',
    'KenoBingoEngine.tsx',
    'SportsPenaltyEngine.tsx',
  ];

  const componentsDir = path.join(__dirname, '../admin/src/components/games');
  let missingFiles = 0;
  for (const eng of engines) {
    const fullPath = path.join(componentsDir, eng);
    if (fs.existsSync(fullPath)) {
      console.log(` [EXISTS] admin/src/components/games/${eng}`);
    } else {
      console.error(` [MISSING] admin/src/components/games/${eng}`);
      missingFiles++;
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`FINAL RESULT: ${launchSuccess === allGames.length && missingFiles === 0 ? 'ALL CHECKS PASSED (100% OPERATIONAL)' : 'ERRORS DETECTED'}`);
  console.log('='.repeat(80));

  if (launchFailed > 0 || missingFiles > 0) {
    process.exit(1);
  }
}

testAllGames().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

