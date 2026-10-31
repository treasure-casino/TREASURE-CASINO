import { Router } from 'express';
import {
  spinSpiralHandler,
  halfCashoutSpiralHandler,
  fullCashoutSpiralHandler,
  stopAutoSpiralHandler,
  getSpiralStateHandler,
  getSpiralHistoryHandler,
  getSpiralAdminStatsHandler,
} from '../controllers/spiral.controller';

const router = Router();

router.post('/start', spinSpiralHandler);
router.post('/spin', spinSpiralHandler);
router.post('/half-cashout', halfCashoutSpiralHandler);
router.post('/cashout', fullCashoutSpiralHandler);
router.post('/stop-auto', stopAutoSpiralHandler);
router.get('/state', getSpiralStateHandler);
router.get('/history', getSpiralHistoryHandler);
router.get('/admin/stats', getSpiralAdminStatsHandler);

export default router;
