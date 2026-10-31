import { Router } from 'express';
import {
  startVortexReadyHandler,
  spinVortexLaunchHandler,
  collectVortexHandler,
  crashVortexHandler,
  recordVortexEventHandler,
  getVortexHistoryHandler,
  getVortexStateHandler,
  getVortexAdminStatsHandler,
} from '../controllers/vortex.controller';

const router = Router();

router.post('/start', startVortexReadyHandler);
router.post('/spin', spinVortexLaunchHandler);
router.post('/collect', collectVortexHandler);
router.post('/crash', crashVortexHandler);
router.post('/event', recordVortexEventHandler);
router.get('/history', getVortexHistoryHandler);
router.get('/state', getVortexStateHandler);
router.get('/admin/stats', getVortexAdminStatsHandler);

export default router;
