import { Router } from 'express';
import {
  dealBlackjackHandler,
  insuranceBlackjackHandler,
  hitBlackjackHandler,
  standBlackjackHandler,
  doubleDownBlackjackHandler,
  getBlackjackStateHandler,
  getBlackjackHistoryHandler,
  getBlackjackConfigHandler,
  updateBlackjackConfigHandler,
} from '../controllers/blackjack.controller';
import { adminAuthenticate } from '../middleware/adminAuth';

const router = Router();

// Public Player Gameplay Endpoints
router.post('/deal', dealBlackjackHandler);
router.post('/insurance', insuranceBlackjackHandler);
router.post('/hit', hitBlackjackHandler);
router.post('/stand', standBlackjackHandler);
router.post('/double', doubleDownBlackjackHandler);
router.get('/state', getBlackjackStateHandler);
router.get('/history', getBlackjackHistoryHandler);
router.get('/config', getBlackjackConfigHandler);

// Admin Configuration Endpoint
router.post('/admin/config', adminAuthenticate, updateBlackjackConfigHandler);

export default router;
