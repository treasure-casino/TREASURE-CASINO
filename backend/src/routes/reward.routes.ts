import { Router } from 'express';
import {
  getRewards,
  claimReward,
  claimCoupon,
  getVipStatus,
} from '../controllers/reward.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/', getRewards);
router.post('/:id/claim', claimReward);
router.post('/coupon', claimCoupon);
router.get('/vip-status', getVipStatus);

export default router;

