import { Router } from 'express';
import {
  startChickenRunHandler,
  stepChickenRunHandler,
  cashoutChickenRunHandler,
  getChickenRunConfigHandler,
  getChickenRunHistoryHandler,
  getChickenRunAdminStatsHandler,
  updateChickenRunConfigHandler,
} from '../controllers/chickenRun.controller';

const router = Router();

// ── Public Player Endpoints (Demo Mode) ──
router.post('/start', startChickenRunHandler);
router.post('/step', stepChickenRunHandler);
router.post('/cashout', cashoutChickenRunHandler);
router.get('/config', getChickenRunConfigHandler);
router.get('/history', getChickenRunHistoryHandler);

// ── Admin Endpoints ──
router.get('/admin/stats', getChickenRunAdminStatsHandler);
router.post('/admin/config', updateChickenRunConfigHandler);

export default router;

