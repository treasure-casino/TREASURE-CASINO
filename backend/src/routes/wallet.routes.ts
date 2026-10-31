import { Router } from 'express';
import {
  getWallet,
  getTransactions,
  deposit,
  withdraw,
  getDeposits,
  getWithdrawals,
} from '../controllers/wallet.controller';
import { authenticate } from '../middleware/auth';
import { financialLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(authenticate);

router.get('/', getWallet);
router.get('/transactions', getTransactions);
router.post('/deposit', financialLimiter, deposit);
router.post('/withdraw', financialLimiter, withdraw);
router.get('/deposits', getDeposits);
router.get('/withdrawals', getWithdrawals);

export default router;

