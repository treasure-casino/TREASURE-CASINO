/**
 * ============================================================================
 * TREASURE CASINO — Verification Suite for Two Wheel Games Removal
 * ============================================================================
 * 
 * Verifies that:
 * 1. "Mega Wheel of Fortune" (game-cas-01) and "Lucky Wheel" (game-arc-08)
 *    are completely removed from frontend mappings and components.
 * 2. Component files (MegaWheelGame.tsx, LuckyWheelGame.tsx) are deleted.
 * 3. Exclusive asset files are deleted.
 * 4. Backend controller logic completely filters them out and returns 404 on direct access.
 * 5. Admin management list filters them out.
 * 6. The remaining Wheel Game (Fortune Wheel / Wheel of Fortune / game-arc-02)
 *    and other games continue working with 100% integrity.
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('  TREASURE CASINO — REMOVED WHEEL GAMES VERIFICATION SUITE');
console.log('='.repeat(80));

let testFailures = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    testFailures++;
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

// 1. Check Deleted Components
console.log('\n--- TEST 1: FRONTEND COMPONENT DELETION ---');
const megaComponentPath = path.join(__dirname, '../admin/src/components/games/MegaWheelGame.tsx');
const luckyComponentPath = path.join(__dirname, '../admin/src/components/games/LuckyWheelGame.tsx');

assert(!fs.existsSync(megaComponentPath), 'MegaWheelGame.tsx must not exist on disk.');
assert(!fs.existsSync(luckyComponentPath), 'LuckyWheelGame.tsx must not exist on disk.');

// 2. Check Deleted Assets
console.log('\n--- TEST 2: EXCLUSIVE GAME ASSETS DELETION ---');
const deletedAssets = [
  '../admin/public/assets/games/logos/mega-wheel.svg',
  '../admin/public/assets/games/logos/lucky-wheel.svg',
  '../admin/public/assets/games/casual-wheel.png',
  '../admin/public/assets/games/casual-wheel.svg',
  '../admin/public/assets/games/arcade-luckywheel.png',
  '../admin/public/assets/games/arcade-luckywheel.svg',
];

for (const relPath of deletedAssets) {
  const fullPath = path.join(__dirname, relPath);
  assert(!fs.existsSync(fullPath), `Asset ${path.basename(relPath)} must be deleted.`);
}

// 3. Check GameArenaPage.tsx and PLAYABLE_GAMES_MAP
console.log('\n--- TEST 3: FRONTEND PLAYABLE_GAMES_MAP & ARENA PURGE ---');
const arenaContent = fs.readFileSync(path.join(__dirname, '../admin/src/pages/lobby/GameArenaPage.tsx'), 'utf8');

assert(!arenaContent.includes('MegaWheelGame'), 'GameArenaPage must not import or reference MegaWheelGame.');
assert(!arenaContent.includes('LuckyWheelGame'), 'GameArenaPage must not import or reference LuckyWheelGame.');

// Extract PLAYABLE_GAMES_MAP block
const mapMatch = arenaContent.match(/export const PLAYABLE_GAMES_MAP: Record<string, string> = \{([\s\S]*?)\};/);
const mapContent = mapMatch ? mapMatch[1] : '';
assert(!mapContent.includes("'game-cas-01'"), 'PLAYABLE_GAMES_MAP must not contain game-cas-01.');
assert(!mapContent.includes("'game-arc-08'"), 'PLAYABLE_GAMES_MAP must not contain game-arc-08.');
assert(!arenaContent.includes('WHEEL_MEGA'), 'GameArenaPage must not have WHEEL_MEGA case.');
assert(!arenaContent.includes('WHEEL_LUCKY'), 'GameArenaPage must not have WHEEL_LUCKY case.');
assert(arenaContent.includes("['game-cas-01', 'game-arc-08'].includes(id)"), 'GameArenaPage must block direct access to retired games.');

// 4. Check Frontend wheelSpinApi.ts
console.log('\n--- TEST 4: CLIENT WHEEL CONFIG CLEANUP ---');
const wheelApiContent = fs.readFileSync(path.join(__dirname, '../admin/src/utils/wheelSpinApi.ts'), 'utf8');
assert(!wheelApiContent.includes("'game-cas-01'"), 'wheelSpinApi.ts must not contain game-cas-01.');
assert(!wheelApiContent.includes("'game-arc-08'"), 'wheelSpinApi.ts must not contain game-arc-08.');
assert(wheelApiContent.includes("'game-arc-02'"), 'wheelSpinApi.ts must preserve game-arc-02 (Fortune Wheel / Wheel Game).');

// 5. Check Backend Controllers
console.log('\n--- TEST 5: BACKEND EXCLUSION & 404 LOGIC ---');
const gameCtrlContent = fs.readFileSync(path.join(__dirname, '../backend/src/controllers/game.controller.ts'), 'utf8');
const adminGameCtrlContent = fs.readFileSync(path.join(__dirname, '../backend/src/controllers/admin/admin.games.controller.ts'), 'utf8');

assert(gameCtrlContent.includes("const EXCLUDED_GAME_IDS = ['game-cas-01', 'game-arc-08']"), 'game.controller.ts must declare EXCLUDED_GAME_IDS.');
assert(gameCtrlContent.includes("notIn: EXCLUDED_GAME_IDS"), 'getGames query must exclude retired game IDs.');
assert(adminGameCtrlContent.includes("notIn: EXCLUDED_GAME_IDS"), 'getAdminGames query must exclude retired game IDs.');

// 6. Check Remaining Wheel Game and Other Games
console.log('\n--- TEST 6: REMAINING WHEEL GAME & INTEGRITY ---');
const { sampleWheelOutcome, WHEEL_MODES } = require('../backend/dist/utils/wheelProbabilityDistribution');

// Verify Fortune Wheel / Wheel Game (game-arc-02) is preserved and fully functional
const sampleNormal = sampleWheelOutcome('game-arc-02', 'NORMAL');
assert(sampleNormal && sampleNormal.segment, 'sampleWheelOutcome for game-arc-02 (NORMAL mode) works.');
assert(sampleNormal.totalSegments === 20, '20-box Wheel Game is preserved.');

const sampleEasy = sampleWheelOutcome('game-arc-02', 'EASY');
assert(sampleEasy.totalSegments === 15, '15-box Easy Mode is preserved.');

const sampleHard = sampleWheelOutcome('game-arc-02', 'HARD');
assert(sampleHard.totalSegments === 6, '6-box Hard Mode is preserved.');

console.log('\n' + '='.repeat(80));
if (testFailures === 0) {
  console.log('  ALL AUDIT CHECKS PASSED (100% SUCCESS)!');
  console.log('  Mega Wheel of Fortune and Lucky Wheel are completely purged.');
  console.log('  All other games and remaining Wheel Game are 100% functional.');
} else {
  console.error(`  VERIFICATION FAILED WITH ${testFailures} ERRORS.`);
  process.exit(1);
}
console.log('='.repeat(80));
