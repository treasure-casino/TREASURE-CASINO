import { Router } from 'express';
import {
  startHiloHandler,
  predictHiloHandler,
  collectHiloHandler,
  getHiloConfigHandler,
  getHiloHistoryHandler,
  getHiloAdminStatsHandler,
  updateHiloConfigHandler,
} from '../controllers/hilo.controller';

const router = Router();

// ── Public Player Endpoints (Demo Mode) ──
router.post('/start', startHiloHandler);
router.post('/predict', predictHiloHandler);
router.post('/collect', collectHiloHandler);
router.get('/config', getHiloConfigHandler);
router.get('/history', getHiloHistoryHandler);

// ── Admin Endpoints ──
router.get('/admin/stats', getHiloAdminStatsHandler);
router.post('/admin/config', updateHiloConfigHandler);

export default router;
