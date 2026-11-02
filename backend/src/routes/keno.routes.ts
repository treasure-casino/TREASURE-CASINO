import { Router } from 'express';
import {
  drawKenoHandler,
  getKenoConfigHandler,
  getKenoHistoryHandler,
  getKenoAdminStatsHandler,
  updateKenoConfigHandler,
} from '../controllers/keno.controller';

const router = Router();

// Gameplay endpoints
router.post('/draw', drawKenoHandler);
router.get('/config', getKenoConfigHandler);
router.get('/history', getKenoHistoryHandler);

// Admin controls & telemetry
router.get('/admin/stats', getKenoAdminStatsHandler);
router.post('/admin/config', updateKenoConfigHandler);

export default router;

