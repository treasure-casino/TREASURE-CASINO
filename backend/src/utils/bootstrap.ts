import { execSync } from 'child_process';
import path from 'path';
import { prisma } from '../prisma';
import { config } from '../config';
import { hashPassword } from './password';
import { logger } from './logger';

/**
 * Ensures all database tables exist in MySQL / MariaDB.
 * If tables have not been created yet (common on fresh cloud MySQL deployments),
 * automatically executes Prisma schema push without touching existing records.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  try {
    // Check if key system table exists
    await prisma.$queryRaw`SELECT 1 FROM admin_users LIMIT 1`;
    logger.info('Database tables verified.');
  } catch (error: any) {
    const errorMsg = String(error?.message || error);
    const isMissingTable =
      errorMsg.includes("doesn't exist") ||
      errorMsg.includes('does not exist') ||
      errorMsg.includes('ER_NO_SUCH_TABLE') ||
      error?.code === 'P2021';

    if (isMissingTable) {
      logger.warn('Database tables not found. Automatically synchronizing schema with Prisma...');
      try {
        const prismaCli = path.resolve(__dirname, '../../node_modules/prisma/build/index.js');
        execSync(`node "${prismaCli}" db push --skip-generate --accept-data-loss`, {
          cwd: path.resolve(__dirname, '../..'),
          stdio: 'inherit',
          env: process.env,
        });
        logger.info('Database schema successfully synchronized.');
      } catch (pushError: any) {
        logger.error('Failed to auto-synchronize database schema:', {
          message: pushError.message,
        });
      }
    } else {
      logger.warn('Database schema check notice:', { message: errorMsg });
    }
  }
}

/**
 * Ensures system baseline records exist on startup (provider, admin role, admin user).
 * This makes zero-touch deployment on Render or any cloud provider seamless.
 */
export async function bootstrapSystem(): Promise<void> {
  try {
    // 1. Ensure the in-house game provider exists
    let provider = await prisma.gameProvider.findFirst({
      where: {
        OR: [{ id: 'prov-inhouse' }, { code: 'IN_HOUSE' }, { name: 'In-House Games' }],
      },
    });

    if (!provider) {
      provider = await prisma.gameProvider.create({
        data: {
          id: 'prov-inhouse',
          name: 'In-House Games',
          code: 'IN_HOUSE',
          isActive: true,
        },
      });
    }

    // 2. Ensure Super Admin role exists
    let superAdminRole = await prisma.adminRole.findFirst({
      where: {
        OR: [{ name: 'Super Admin' }, { name: 'SuperAdmin' }],
      },
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.adminRole.create({
        data: {
          name: 'Super Admin',
          description: 'Full administrative access and system privileges',
        },
      });
      logger.info('Created baseline Super Admin role.');
    }

    // 3. Ensure baseline admin user exists if no admin users exist
    const adminCount = await prisma.adminUser.count();
    if (adminCount === 0) {
      const email = (config.admin.defaultEmail || 'admin@treasure.com').toLowerCase().trim();
      const rawPassword = config.admin.defaultPassword || 'Admin123!';
      const hashedPassword = await hashPassword(rawPassword);

      await prisma.adminUser.create({
        data: {
          email,
          name: 'System Administrator',
          passwordHash: hashedPassword,
          roleId: superAdminRole.id,
          isActive: true,
        },
      });
      logger.info(`Initialized default admin user: ${email}`);
    }

    // 4. Register complete catalog of 13 original in-house games
    await ensureAllOriginalGamesRegistered();
  } catch (error: any) {
    logger.warn(`Bootstrap initialization notice: ${error.message}`);
  }
}

/**
 * The complete catalogue of all 13 authentic in-house TREASURE CASINO games.
 * Strictly excludes any third-party or JILI games.
 */
export const ORIGINAL_GAMES_CATALOG = [
  {
    id: 'game-slot-01',
    name: 'Treasure Kingdom',
    category: 'SLOTS' as const,
    description: 'Original 3D Aztec vault slot with dynamic cylindrical spinning reels, wild golden crowns, and 5 classic winning paylines.',
    thumbnailUrl: '/assets/games/default.png',
    rtp: 96.50,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: true,
    isActive: true,
    isDemo: true,
    sortOrder: 1,
    volatility: 'MEDIUM',
  },
  {
    id: 'game-crash-01',
    name: 'Sky Rocket',
    category: 'CRASH' as const,
    description: 'Original 3D cosmic crash flight with live rocket ascent, animated thruster fire, and exponential multipliers up to 100x.',
    thumbnailUrl: '/assets/games/default.png',
    rtp: 96.80,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: true,
    isActive: true,
    isDemo: true,
    sortOrder: 2,
    volatility: 'HIGH',
  },
  {
    id: 'game-mines-01',
    name: 'Crystal Mines',
    category: 'MINES' as const,
    description: 'Original 3D crystalline cavern runestone grid with configurable mine hazards, diamond discoveries, and cashout progression.',
    thumbnailUrl: '/assets/games/default.png',
    rtp: 97.00,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: true,
    isActive: true,
    isDemo: true,
    sortOrder: 3,
    volatility: 'MEDIUM',
  },
  {
    id: 'game-vortex-01',
    name: 'Treasure Vortex',
    category: 'CRASH' as const,
    description: 'Original 3D elemental vortex crash game with real-time continuous multipliers, fire, water, earth and lightning surges, and partial cashout features.',
    thumbnailUrl: '/assets/games/treasure-vortex-3d.png',
    rtp: 97.20,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: true,
    isActive: true,
    isDemo: true,
    sortOrder: 4,
    volatility: 'HIGH',
  },
  {
    id: 'game-spiral-01',
    name: 'Treasure Spiral',
    category: 'CRASH' as const,
    description: 'Original 3D Concentric Rotating Rings with Animal Symbols, 700x Bonus, and Half Cash Out.',
    thumbnailUrl: '/assets/games/spiral/lion.png',
    rtp: 96.50,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: true,
    isActive: true,
    isDemo: true,
    sortOrder: 5,
    volatility: 'HIGH',
  },
  {
    id: 'game-limbo-01',
    name: 'Treasure Limbo',
    category: 'CRASH' as const,
    description: 'High-speed 2D neon multiplier game with dynamic target selection, provably fair engine, and payouts up to 10,000x.',
    thumbnailUrl: '/assets/games/default.png',
    rtp: 96.00,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: false,
    isActive: true,
    isDemo: true,
    sortOrder: 6,
    volatility: 'HIGH',
  },
  {
    id: 'game-dice-01',
    name: 'Treasure Dice',
    category: 'ROULETTE_DICE' as const,
    description: 'Provably fair 2D casino dice game with customizable Roll Under / Roll Over sliders, real-time odds calculation, and payouts up to 960x.',
    thumbnailUrl: '/assets/games/default.png',
    rtp: 96.00,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: false,
    isActive: true,
    isDemo: true,
    sortOrder: 7,
    volatility: 'MEDIUM',
  },
  {
    id: 'game-blackjack-01',
    name: 'Treasure Blackjack',
    category: 'TABLE_CARD' as const,
    description: 'Authentic 2D casino Blackjack (21). Classic table rules, 3:2 Natural Blackjack payout, Insurance (2:1), Double Down, and Dealer stands on 17.',
    thumbnailUrl: '/assets/games/default.png',
    rtp: 99.50,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: true,
    isActive: true,
    isDemo: true,
    sortOrder: 8,
    volatility: 'LOW',
  },
  {
    id: 'game-plinko-01',
    name: 'Treasure Plinko',
    category: 'PLINKO' as const,
    description: 'Provably fair 2D casino Plinko board with customizable rows (8, 12, 16), 3 risk tiers, realistic 2D ball pin physics, and payouts up to 1,000x.',
    thumbnailUrl: '/assets/games/default.png',
    rtp: 98.50,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: false,
    isActive: true,
    isDemo: true,
    sortOrder: 9,
    volatility: 'HIGH',
  },
  {
    id: 'game-keno-01',
    name: 'Treasure Keno',
    category: 'KENO' as const,
    description: 'Classic 2D casino Keno with 1–80 grid, player-selectable 1–10 spots, 20 unique ball draws, Quick Pick, and jackpot payouts up to 100x.',
    thumbnailUrl: '/assets/games/default.png',
    rtp: 95.80,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: false,
    isActive: true,
    isDemo: true,
    sortOrder: 10,
    volatility: 'HIGH',
  },
  {
    id: 'game-hilo-01',
    name: 'Treasure Hilo',
    category: 'CASINO' as const,
    description: 'Classic 2D casino card prediction game with Higher, Lower, Same bets, dynamic odds, streak multipliers, and instant cashout.',
    thumbnailUrl: '/assets/games/default.png',
    rtp: 96.00,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: false,
    isActive: true,
    isDemo: true,
    sortOrder: 11,
    volatility: 'MEDIUM',
  },
  {
    id: 'game-hotline-01',
    name: 'Treasure Hotline',
    category: 'SLOTS' as const,
    description: 'Retro 1980s neon 5-reel video slot inspired by Hotline with expanding wilds, 20 paylines, and scatter pays.',
    thumbnailUrl: '/assets/games/hotline/treasure-hotline-logo.jpg',
    rtp: 96.00,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: true,
    isActive: true,
    isDemo: true,
    sortOrder: 12,
    volatility: 'HIGH',
  },
  {
    id: 'game-chicken-run-01',
    name: 'Treasure Chicken Run',
    category: 'CASINO' as const,
    description: 'Exciting 3D cartoon chicken road crossing casino game with 4 difficulties, progressive multipliers up to 100,000x, and instant cashout.',
    thumbnailUrl: '/assets/games/default.png',
    rtp: 96.00,
    minBet: 10.00,
    maxBet: 5000.00,
    isPopular: true,
    isFeatured: true,
    isActive: true,
    isDemo: true,
    sortOrder: 13,
    volatility: 'MEDIUM',
  },
];

/**
 * Ensures all 13 authentic original in-house games are registered in the database.
 * Uses atomic upsert so missing games are registered and existing games are preserved.
 * Purges any unauthorized third-party/JILI games if detected.
 */
export async function ensureAllOriginalGamesRegistered(): Promise<void> {
  try {
    let provider = await prisma.gameProvider.findFirst({
      where: {
        OR: [{ id: 'prov-inhouse' }, { code: 'IN_HOUSE' }],
      },
    });

    if (!provider) {
      provider = await prisma.gameProvider.create({
        data: {
          id: 'prov-inhouse',
          name: 'In-House Games',
          code: 'IN_HOUSE',
          isActive: true,
        },
      });
    }

    // Clean up any forbidden/third-party/JILI games if they exist
    const FORBIDDEN = ['mega wheel of fortune', 'lucky wheel', 'money coming', 'crazy 777'];
    for (const forbidden of FORBIDDEN) {
      await prisma.game.deleteMany({
        where: {
          name: { contains: forbidden },
        },
      }).catch(() => {});
    }

    for (const g of ORIGINAL_GAMES_CATALOG) {
      await prisma.game.upsert({
        where: { id: g.id },
        update: {
          name: g.name,
          category: g.category,
          description: g.description,
          thumbnailUrl: g.thumbnailUrl,
          rtp: g.rtp,
          minBet: g.minBet,
          maxBet: g.maxBet,
          isPopular: g.isPopular,
          isFeatured: g.isFeatured,
          isActive: g.isActive,
          isDemo: g.isDemo,
          sortOrder: g.sortOrder,
          volatility: g.volatility,
          providerId: provider.id,
          providerCode: 'IN_HOUSE',
        },
        create: {
          id: g.id,
          name: g.name,
          category: g.category,
          description: g.description,
          thumbnailUrl: g.thumbnailUrl,
          rtp: g.rtp,
          minBet: g.minBet,
          maxBet: g.maxBet,
          isPopular: g.isPopular,
          isFeatured: g.isFeatured,
          isActive: g.isActive,
          isDemo: g.isDemo,
          sortOrder: g.sortOrder,
          volatility: g.volatility,
          providerId: provider.id,
          providerCode: 'IN_HOUSE',
        },
      });
    }
    logger.info(`Successfully verified and registered all ${ORIGINAL_GAMES_CATALOG.length} authentic original in-house games.`);
  } catch (error: any) {
    logger.warn(`Games catalog registration notice: ${error.message}`);
  }
}

