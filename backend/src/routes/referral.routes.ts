import { Router } from 'express';
import { getReferralCode, getReferralStats } from '../controllers/referral.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/code', getReferralCode);
router.get('/stats', getReferralStats);

export default router;

