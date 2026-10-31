import { Router } from 'express';
import {
  getGames,
  getGame,
  launchGame,
  playDemoGame,
  toggleFavorite,
  getFavorites,
  handleProviderWebhook,
  getProviderStatus,
} from '../controllers/game.controller';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Provider Status & Webhook
router.get('/provider/status', optionalAuthenticate, getProviderStatus);
router.post('/provider/webhook', optionalAuthenticate, handleProviderWebhook);

// User Favorites
router.get('/favorites', authenticate, getFavorites);

// Public / Guest game catalogue browsing
router.get('/', optionalAuthenticate, getGames);
router.get('/:id', optionalAuthenticate, getGame);

// Launch Game & Play Actions
router.post('/:id/launch', optionalAuthenticate, launchGame);
router.post('/:id/play-demo', optionalAuthenticate, playDemoGame);
router.post('/:id/spin', optionalAuthenticate, playDemoGame);
router.post('/:id/favorite', authenticate, toggleFavorite);

export default router;
