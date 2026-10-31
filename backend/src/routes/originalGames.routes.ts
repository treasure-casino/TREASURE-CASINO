import { Router } from 'express';
import {
  getDemoWallet,
  resetDemoWallet,
  spinTreasureKingdom,
  startSkyRocket,
  cashoutSkyRocket,
  crashSkyRocket,
  getSkyRocketHistory,
  getSkyRocketStatus,
  startCrystalMines,
  revealCrystalTile,
  cashoutCrystalMines,
  startTreasureVortex,
  cashoutTreasureVortex,
  crashTreasureVortex,
  spinTreasureVortex,
  getTreasureVortexHistory,
} from '../controllers/originalGames.controller';

const router = Router();

// Demo Wallet
router.get('/demo-wallet', getDemoWallet);
router.post('/demo-wallet/reset', resetDemoWallet);

// 1. Treasure Kingdom (Slots)
router.post('/treasure-kingdom/spin', spinTreasureKingdom);

// 2. Sky Rocket (Crash)
router.post('/sky-rocket/start', startSkyRocket);
router.post('/sky-rocket/cashout', cashoutSkyRocket);
router.post('/sky-rocket/crash', crashSkyRocket);
router.get('/sky-rocket/history', getSkyRocketHistory);
router.get('/sky-rocket/status/:roundId', getSkyRocketStatus);

// 3. Crystal Mines (Mines)
router.post('/crystal-mines/start', startCrystalMines);
router.post('/crystal-mines/reveal', revealCrystalTile);
router.post('/crystal-mines/cashout', cashoutCrystalMines);

// 4. Treasure Vortex (3D Elemental Vortex Crash)
router.post('/treasure-vortex/start', startTreasureVortex);
router.post('/treasure-vortex/cashout', cashoutTreasureVortex);
router.post('/treasure-vortex/crash', crashTreasureVortex);
router.post('/treasure-vortex/spin', spinTreasureVortex);
router.get('/treasure-vortex/history', getTreasureVortexHistory);

export default router;

