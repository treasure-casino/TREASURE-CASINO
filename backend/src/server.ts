import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { swaggerSpec } from './config/swagger';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';
import { prisma } from './prisma';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import walletRoutes from './routes/wallet.routes';
import gameRoutes from './routes/game.routes';
import originalGamesRoutes from './routes/originalGames.routes';
import rewardRoutes from './routes/reward.routes';
import referralRoutes from './routes/referral.routes';
import supportRoutes from './routes/support.routes';
import adminRoutes from './routes/admin/admin.routes';
import vortexRoutes from './routes/vortex.routes';
import spiralRoutes from './routes/spiral.routes';
import limboRoutes from './routes/limbo.routes';
import diceRoutes from './routes/dice.routes';
import blackjackRoutes from './routes/blackjack.routes';
import plinkoRoutes from './routes/plinko.routes';
import kenoRoutes from './routes/keno.routes';
import hiloRoutes from './routes/hilo.routes';
import hotlineRoutes from './routes/hotline.routes';
import chickenRunRoutes from './routes/chickenRun.routes';
import { ensureLimboGameRegistered } from './controllers/limbo.controller';
import { ensureDiceGameRegistered } from './controllers/dice.controller';
import { ensureBlackjackGameRegistered } from './controllers/blackjack.controller';
import { ensurePlinkoGameRegistered } from './controllers/plinko.controller';
import { ensureKenoGameRegistered } from './controllers/keno.controller';
import { ensureHiloGameRegistered } from './controllers/hilo.controller';
import { ensureHotlineGameRegistered } from './controllers/hotline.controller';
import { ensureChickenRunGameRegistered } from './controllers/chickenRun.controller';

const app = express();

// Security Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI assets and inline scripts to render cleanly
  })
);

const cleanOrigin = (url: string) => url.trim().replace(/\/+$/, '');

const configuredOrigins = (config.cors.origin || []).map(cleanOrigin).filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    ...configuredOrigins,
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ])
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Swagger UI, server-to-server)
      if (!origin) return callback(null, true);
      const normalizedOrigin = cleanOrigin(origin);
      if (
        allowedOrigins.includes(normalizedOrigin) ||
        normalizedOrigin.startsWith('http://localhost:') ||
        normalizedOrigin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      logger.warn(`CORS blocked for origin: ${origin}`);
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'x-demo-token'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// General Rate Limiting (exclude api-docs from strict rate limiting)
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/api-docs')) {
    return next();
  }
  return generalLimiter(req, res, next);
});

// Swagger JSON Specification Endpoint
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Swagger UI Documentation Endpoint
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: 'TREASURE Casino - API Documentation',
  })
);

// Health Check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'UP',
      database: 'MySQL / MariaDB Connected (treasure_db)',
      simulatedMode: config.payment.simulatedOnly,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'DOWN',
      database: 'Database connection failed',
      error: error.message,
    });
  }
});

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'UP',
      database: 'MySQL / MariaDB Connected (treasure_db)',
      simulatedMode: config.payment.simulatedOnly,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'DOWN',
      database: 'Database connection failed',
      error: error.message,
    });
  }
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/games/original', originalGamesRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/rewards', rewardRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vortex', vortexRoutes);
app.use('/api/spiral', spiralRoutes);
app.use('/api/limbo', limboRoutes);
app.use('/api/dice', diceRoutes);
app.use('/api/blackjack', blackjackRoutes);
app.use('/api/plinko', plinkoRoutes);
app.use('/api/keno', kenoRoutes);
app.use('/api/hilo', hiloRoutes);
app.use('/api/hotline', hotlineRoutes);
app.use('/api/chicken-run', chickenRunRoutes);

// Global Error Handler
app.use(errorHandler);

const PORT = config.port;

const startServer = async () => {
  try {
    // Test DB connection
    await prisma.$queryRaw`SELECT 1`;
    logger.info(`✅ Successfully connected to MySQL / MariaDB (Database: ${config.database.name})`);

    // Ensure built-in games registered
    await ensureLimboGameRegistered();
    await ensureDiceGameRegistered();
    await ensureBlackjackGameRegistered();
    await ensurePlinkoGameRegistered();
    await ensureKenoGameRegistered();
    await ensureHiloGameRegistered();
    await ensureHotlineGameRegistered();
    await ensureChickenRunGameRegistered();

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`🚀 TREASURE Casino Backend running on port ${PORT} (0.0.0.0:${PORT})`);
      logger.info(`📖 API Documentation available at /api-docs`);
      logger.info(`🛡️ Simulated Financial Mode: ${config.payment.simulatedOnly ? 'ACTIVE' : 'DISABLED'}`);
    });

    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down server gracefully...`);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Database disconnected. Process exited.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error: any) {
    logger.error('Failed to initialize server or database connection', { error: String(error) });
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Promise Rejection:', { reason: reason?.message || String(reason) });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

startServer();

export default app;
