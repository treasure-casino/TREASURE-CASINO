import { Router } from 'express';
import {
  spinHotlineHandler,
  startHotlineHandler,
  cashoutHotlineHandler,
  settleLossHotlineHandler,
  getHotlineConfigHandler,
  getHotlineHistoryHandler,
  getHotlineAdminStatsHandler,
  updateHotlineConfigHandler,
} from '../controllers/hotline.controller';

const router = Router();

// ── Public Player Endpoints (Demo Mode) ──
router.post('/spin', spinHotlineHandler);
router.post('/start', startHotlineHandler);
router.post('/cashout', cashoutHotlineHandler);
router.post('/settle-loss', settleLossHotlineHandler);
router.get('/config', getHotlineConfigHandler);
router.get('/history', getHotlineHistoryHandler);

// ── Admin Endpoints ──
router.get('/admin/stats', getHotlineAdminStatsHandler);
router.post('/admin/config', updateHotlineConfigHandler);

export default router;

