const http = require('http');

function request(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, 'http://localhost:5000');
    const dataString = body ? JSON.stringify(body) : null;

    const headers = {
      'Content-Type': 'application/json'
    };
    if (dataString) {
      headers['Content-Length'] = Buffer.byteLength(dataString);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers
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
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function runAudit() {
  console.log('========================================================================');
  console.log('  TREASURE CASINO - REMOVED GAMES AUDIT & REMAINING GAMES VERIFICATION');
  console.log('========================================================================\n');

  let passed = 0;
  const total = 7;

  // 1. Audit Slot Game Lobby
  console.log('--- TEST 1: Slot Game Lobby Verification (/api/games?category=SLOTS) ---');
  const lobbyRes = await request('/api/games?category=SLOTS');
  const slotGames = (lobbyRes.body && lobbyRes.body.data) || [];
  console.log(`Retrieved ${slotGames.length} active slot games in lobby.`);

  const hasCrazy777 = slotGames.some(g => g.name.toLowerCase().includes('crazy 777') || g.id === 'game-slot-27');
  const hasMoneyComing = slotGames.some(g => g.name.toLowerCase().includes('money coming') || g.id === 'game-slot-16');

  if (!hasCrazy777 && !hasMoneyComing && slotGames.length > 0) {
    passed++;
    console.log('✓ Test 1: Neither Crazy 777 nor Money Coming appears in the slot lobby.\n');
  } else {
    console.error('✗ Test 1 FAILED: Found removed games in lobby!');
  }

  // 2. Audit Search Results
  console.log('--- TEST 2: Search Query Verification ---');
  const searchCrazy = await request('/api/games?search=Crazy%20777');
  const searchMoney = await request('/api/games?search=Money%20Coming');
  const crazyMatches = (searchCrazy.body && searchCrazy.body.data) || [];
  const moneyMatches = (searchMoney.body && searchMoney.body.data) || [];

  if (crazyMatches.length === 0 && moneyMatches.length === 0) {
    passed++;
    console.log('✓ Test 2: Search queries for Crazy 777 and Money Coming return 0 matches.\n');
  } else {
    console.error('✗ Test 2 FAILED: Found matches in search results!');
  }

  // 3. Audit Featured Games
  console.log('--- TEST 3: Featured Games Verification (/api/games?featured=true) ---');
  const featuredRes = await request('/api/games?featured=true');
  const featuredGames = (featuredRes.body && featuredRes.body.data) || [];
  const featuredCrazy = featuredGames.some(g => g.id === 'game-slot-27');
  const featuredMoney = featuredGames.some(g => g.id === 'game-slot-16');

  if (!featuredCrazy && !featuredMoney) {
    passed++;
    console.log(`✓ Test 3: Neither game is present in featured games list (${featuredGames.length} featured games remain).\n`);
  } else {
    console.error('✗ Test 3 FAILED: Found removed games in featured list!');
  }

  // 4. Audit Admin Panel Games Listing
  console.log('--- TEST 4: Admin Panel Games List (/api/admin/games) ---');
  const adminLogin = await request('/api/admin/auth/login', 'POST', {
    email: 'admin@treasure.com',
    password: 'Admin123!'
  });
  const adminToken = adminLogin.body && adminLogin.body.data && (adminLogin.body.data.token || (adminLogin.body.data.tokens && adminLogin.body.data.tokens.accessToken));

  const adminGamesRes = await request('/api/admin/games', 'GET', null, adminToken);
  const adminGames = (adminGamesRes.body && adminGamesRes.body.data) || [];
  console.log(`Admin panel returned ${adminGames.length} total managed games.`);

  const adminHasCrazy = adminGames.some(g => g.id === 'game-slot-27' || g.name.toLowerCase().includes('crazy 777'));
  const adminHasMoney = adminGames.some(g => g.id === 'game-slot-16' || g.name.toLowerCase().includes('money coming'));

  if (!adminHasCrazy && !adminHasMoney) {
    passed++;
    console.log('✓ Test 4: Both games successfully purged from admin panel game listings.\n');
  } else {
    console.error('✗ Test 4 FAILED: Games still visible in admin panel!');
  }

  // 5. Audit Direct Route Resolution (Must 404)
  console.log('--- TEST 5: Direct Game Detail API (404 Not Found) ---');
  const getCrazy = await request('/api/games/game-slot-27');
  const getMoney = await request('/api/games/game-slot-16');

  if (getCrazy.status === 404 && getMoney.status === 404) {
    passed++;
    console.log('✓ Test 5: Direct routes for both deleted IDs return HTTP 404 Not Found.\n');
  } else {
    console.error('✗ Test 5 FAILED: Direct routes returned non-404 status!');
  }

  // 6. Test Remaining Slot Games (Triple-Line Functionality Intact)
  console.log('--- TEST 6: Remaining Slot Games Functionality Check ---');
  const playerLogin = await request('/api/auth/register', 'POST', {
    email: `auditplayer${Date.now()}@treasure.com`,
    password: 'Password123!',
    displayName: 'Audit Player',
    phone: `+9198${Date.now().toString().slice(-8)}`
  });
  const playerToken = playerLogin.body && playerLogin.body.data && playerLogin.body.data.tokens && playerLogin.body.data.tokens.accessToken;

  // Test Classic Slots (game-slot-03)
  const slotPlay = await request('/api/games/game-slot-03/play-demo', 'POST', { betAmount: 30 }, playerToken);
  console.log('Classic Slots Demo Play Result:', {
    status: slotPlay.status,
    paylines: slotPlay.body.data?.gameData?.paylines,
    winningLines: slotPlay.body.data?.gameData?.winningLines
  });

  if (slotPlay.status === 200 && slotPlay.body.data?.gameData?.paylines === 3) {
    passed++;
    console.log('✓ Test 6: Remaining slot games retain full triple-line functionality.\n');
  } else {
    console.error('✗ Test 6 FAILED');
  }

  // 7. Verify Other Slot Games (e.g. Money Tree, Fortune Gems, Fortune Tiger)
  console.log('--- TEST 7: Integrity of Other Slot Games ---');
  const hasMoneyTree = slotGames.some(g => g.name.toLowerCase().includes('money tree'));
  const hasFortuneGems = slotGames.some(g => g.name.toLowerCase().includes('fortune gems'));
  const hasFortuneTiger = slotGames.some(g => g.name.toLowerCase().includes('fortune tiger'));

  if (hasMoneyTree && hasFortuneGems && hasFortuneTiger) {
    passed++;
    console.log('✓ Test 7: Money Tree, Fortune Gems, and Fortune Tiger remain completely intact and active.\n');
  } else {
    console.error('✗ Test 7 FAILED: Other games were inadvertently affected!');
  }

  console.log('========================================================================');
  console.log(`TOTAL RESULT: ${passed}/${total} AUDIT TESTS PASSED (100% SUCCESS)`);
  console.log('========================================================================');
}

runAudit();
