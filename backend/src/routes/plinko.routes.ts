import { Router } from 'express';
import {
  dropBallPlinkoHandler,
  getPlinkoConfigHandler,
  getPlinkoHistoryHandler,
  updatePlinkoConfigHandler,
} from '../controllers/plinko.controller';

const router = Router();

// Gameplay endpoints
router.post('/drop', dropBallPlinkoHandler);
router.get('/config', getPlinkoConfigHandler);
router.get('/history', getPlinkoHistoryHandler);

// Admin controls
router.post('/admin/config', updatePlinkoConfigHandler);

export default router;

