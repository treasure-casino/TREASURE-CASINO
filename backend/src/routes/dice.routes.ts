import { Router } from 'express';
import {
  rollDiceHandler,
  getDiceHistoryHandler,
  getDiceConfigHandler,
  updateDiceConfigHandler,
} from '../controllers/dice.controller';

const router = Router();

// Gameplay endpoints
router.post('/roll', rollDiceHandler);
router.get('/history', getDiceHistoryHandler);
router.get('/config', getDiceConfigHandler);

// Admin controls
router.post('/admin/config', updateDiceConfigHandler);

export default router;

