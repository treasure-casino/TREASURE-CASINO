import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  changePassword,
  getNotifications,
  markNotificationRead,
} from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/security/password', changePassword);
router.get('/notifications', getNotifications);
router.put('/notifications/:id/read', markNotificationRead);

export default router;

