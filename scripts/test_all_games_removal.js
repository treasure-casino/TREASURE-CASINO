/**
 * ============================================================================
 * TREASURE CASINO — TOTAL GAMES REMOVAL VERIFICATION SUITE
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('  TREASURE CASINO — TOTAL GAMES REMOVAL AUDIT & VERIFICATION');
console.log('='.repeat(80));

let failures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    failures++;
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

// 1. Verify All Game Components are Removed
console.log('\n--- 1. GAME COMPONENTS REMOVAL ---');
const deletedComponents = [
  'AdventureSlotGame.tsx',
  'ClassicSlotsGame.tsx',
  'CoinFlipGame.tsx',
  'CoinSeriesSlotGame.tsx',
  'DiceGame.tsx',
  'FortuneGemsGame.tsx',
  'FortuneTigerGame.tsx',
  'FortuneWheelGame.tsx',
  'HiLoGame.tsx',
  'KenoGame.tsx',
  'LimboGame.tsx',
  'MinesGame.tsx',
  'OriginalCrashGame.tsx',
  'PlinkoGame.tsx',
  'SkyAviatorGame.tsx',
  'ThematicClassicSlotGame.tsx',
  'VortexGame.tsx',
  'WheelGame.tsx',
  'AutoBetHUD.tsx',
  'AutoBetModal.tsx',
];

for (const comp of deletedComponents) {
  const p = path.join(__dirname, '../admin/src/components/games', comp);
  assert(!fs.existsSync(p), `Component ${comp} must be permanently removed.`);
}

// 2. Verify Game-Specific Utilities are Removed
console.log('\n--- 2. GAME UTILITY FILES REMOVAL ---');
const deletedUtils = [
  '../admin/src/utils/slotProbabilityDistribution.ts',
  '../admin/src/utils/slotSpinApi.ts',
  '../admin/src/utils/useSlotAutoBet.ts',
  '../admin/src/utils/wheelSpinApi.ts',
  '../backend/src/utils/slotProbabilityDistribution.ts',
  '../backend/src/utils/wheelProbabilityDistribution.ts',
];

for (const u of deletedUtils) {
  const p = path.join(__dirname, u);
  assert(!fs.existsSync(p), `Utility ${path.basename(u)} must be permanently removed.`);
}

// 3. Verify Public Game Assets Cleaned
console.log('\n--- 3. GAME ASSETS CLEANUP ---');
const assetsDir = path.join(__dirname, '../admin/public/assets/games');
const filesInAssets = fs.readdirSync(assetsDir);
assert(filesInAssets.length === 1 && filesInAssets[0] === 'default.png', 'assets/games must only contain default.png');

// 4. Verify PLAYABLE_GAMES_MAP is Empty
console.log('\n--- 4. FRONTEND PLAYABLE_GAMES_MAP RESET ---');
const arenaCode = fs.readFileSync(path.join(__dirname, '../admin/src/pages/lobby/GameArenaPage.tsx'), 'utf8');
assert(arenaCode.includes('export const PLAYABLE_GAMES_MAP: Record<string, string> = {};'), 'PLAYABLE_GAMES_MAP must be empty {}.');
assert(arenaCode.includes('GAME UNAVAILABLE'), 'GameArenaPage must show GAME UNAVAILABLE screen on legacy game IDs.');

// 5. Verify GameLobbyPage Shows "New Games Coming Soon"
console.log('\n--- 5. FINAL EMPTY GAME LOBBY DESIGN ---');
const lobbyCode = fs.readFileSync(path.join(__dirname, '../admin/src/pages/lobby/GameLobbyPage.tsx'), 'utf8');
assert(lobbyCode.includes('NEW GAMES COMING SOON'), 'GameLobbyPage must feature "NEW GAMES COMING SOON" showcase.');
assert(lobbyCode.includes('Catalogue Currently Empty'), 'GameLobbyPage must display professional empty catalogue message.');
assert(!lobbyCode.includes('PLAYABLE_GAMES_MAP'), 'GameLobbyPage must not rely on legacy game maps.');

// 6. Verify Backend Game Controller & Routes
console.log('\n--- 6. BACKEND API RESET & ROUTE VERIFICATION ---');
const routesCode = fs.readFileSync(path.join(__dirname, '../backend/src/routes/game.routes.ts'), 'utf8');
assert(!routesCode.includes('/crash'), 'Crash game routes must be removed.');

const ctrlCode = fs.readFileSync(path.join(__dirname, '../backend/src/controllers/game.controller.ts'), 'utf8');
assert(!ctrlCode.includes('CRASH_STATE'), 'Aviator crash state must be removed.');
assert(!ctrlCode.includes('generateTripleLineGrid'), 'Triple line slot generator must be removed.');
assert(!ctrlCode.includes('sampleWheelOutcome'), 'Wheel outcome sampling must be removed.');

// 7. Verify Core Systems Preserved
console.log('\n--- 7. CORE SYSTEMS PRESERVATION ---');
assert(fs.existsSync(path.join(__dirname, '../backend/src/controllers/auth.controller.ts')), 'User Auth controller preserved.');
assert(fs.existsSync(path.join(__dirname, '../backend/src/controllers/wallet.controller.ts')), 'Wallet controller preserved.');
assert(fs.existsSync(path.join(__dirname, '../backend/src/controllers/admin/admin.auth.controller.ts')), 'Admin Auth controller preserved.');
assert(fs.existsSync(path.join(__dirname, '../backend/src/controllers/admin/admin.finance.controller.ts')), 'Admin Finance (deposits/withdrawals) preserved.');
assert(fs.existsSync(path.join(__dirname, '../backend/src/controllers/admin/admin.dashboard.controller.ts')), 'Admin Dashboard stats preserved.');
assert(fs.existsSync(path.join(__dirname, '../backend/src/controllers/admin/admin.system.controller.ts')), 'Admin System & Audit logs preserved.');
assert(fs.existsSync(path.join(__dirname, '../admin/src/pages/finance/FinanceDepositsPage.tsx')), 'Finance Deposits Page preserved.');
assert(fs.existsSync(path.join(__dirname, '../admin/src/pages/finance/FinanceWithdrawalsPage.tsx')), 'Finance Withdrawals Page preserved.');
assert(fs.existsSync(path.join(__dirname, '../admin/src/pages/users/UsersPage.tsx')), 'Users Page preserved.');
assert(fs.existsSync(path.join(__dirname, '../admin/src/pages/DashboardPage.tsx')), 'Dashboard Page preserved.');

console.log('\n' + '='.repeat(80));
if (failures === 0) {
  console.log('  ALL AUDIT CHECKS PASSED (100% SUCCESS)!');
  console.log('  All legacy games completely removed.');
  console.log('  Game catalogue reset and ready for future games.');
  console.log('  All core systems, authentication, wallet, and admin tools 100% preserved.');
} else {
  console.error(`  AUDIT FAILED WITH ${failures} ERRORS.`);
  process.exit(1);
}
console.log('='.repeat(80));

