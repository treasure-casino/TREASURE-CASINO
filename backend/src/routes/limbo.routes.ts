import { Router } from 'express';
import {
  rollLimboHandler,
  getLimboHistoryHandler,
  getLimboConfigHandler,
  updateLimboConfigHandler,
} from '../controllers/limbo.controller';

const router = Router();

// Public / Demo Limbo gameplay endpoints
router.post('/roll', rollLimboHandler);
router.get('/history', getLimboHistoryHandler);
router.get('/config', getLimboConfigHandler);

// Admin controls
router.post('/admin/config', updateLimboConfigHandler);

export default router;

