import { Router } from 'express';
import { createTicket, getTickets } from '../controllers/support.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.post('/tickets', createTicket);
router.get('/tickets', getTickets);

export default router;

