import { Router } from 'express';
import { register, login, me, logout, refreshToken } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, me);
router.post('/logout', authenticate, logout);
router.post('/refresh', refreshToken);

export default router;

