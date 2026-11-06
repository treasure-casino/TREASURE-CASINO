import { Router } from 'express';
import { adminLogin, getAdminMe } from '../../controllers/admin/admin.auth.controller';
import { getDashboardStats, getDashboardCharts } from '../../controllers/admin/admin.dashboard.controller';
import { getUsers, getUserDetails, updateUserStatus } from '../../controllers/admin/admin.users.controller';
import { getAdminDeposits, getAdminWithdrawals, reviewWithdrawal } from '../../controllers/admin/admin.finance.controller';
import { getAdminGames, createGame, updateGame, getAdminProviders } from '../../controllers/admin/admin.games.controller';
import { getAuditLogs, getSettings, updateSetting } from '../../controllers/admin/admin.system.controller';
import {
  getGameProbabilities,
  updateGameProbability,
  resetGameProbabilities,
  runProbabilitySimulationPreview,
  getProbabilityAuditLogs,
} from '../../controllers/admin/admin.probability.controller';
import { adminAuthenticate } from '../../middleware/adminAuth';

const router = Router();

// Public Admin Login
router.post('/auth/login', adminLogin);

// Protected Admin Routes
router.use(adminAuthenticate);

router.get('/auth/me', getAdminMe);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/charts', getDashboardCharts);

// User Management
router.get('/users', getUsers);
router.get('/users/:id', getUserDetails);
router.put('/users/:id/status', updateUserStatus);

// Financial Management
router.get('/finance/deposits', getAdminDeposits);
router.get('/finance/withdrawals', getAdminWithdrawals);
router.put('/finance/withdrawals/:id/review', reviewWithdrawal);

// Game Management
router.get('/games', getAdminGames);
router.post('/games', createGame);
router.put('/games/:id', updateGame);
router.get('/games/providers', getAdminProviders);

// System & Audit
router.get('/audit-logs', getAuditLogs);
router.get('/settings', getSettings);
router.put('/settings', updateSetting);

// Game Probability Settings (Demo / Simulation Mode Only)
router.get('/probability-settings', getGameProbabilities);
router.put('/probability-settings', updateGameProbability);
router.post('/probability-settings/reset', resetGameProbabilities);
router.post('/probability-settings/simulate', runProbabilitySimulationPreview);
router.get('/probability-settings/audit-logs', getProbabilityAuditLogs);

export default router;

