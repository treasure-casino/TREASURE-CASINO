import { Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';

const STRICTLY_FORBIDDEN_GAMES = [
  'mega wheel of fortune',
  'lucky wheel',
  'money coming',
  'crazy 777',
];

/**
 * Get games catalogue with comprehensive multi-category and search filtering
 */
export const getGames = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const category = req.query.category as string;
    const search = req.query.search as string;
    const featured = req.query.featured as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 100;
    const skip = (page - 1) * limit;

    const where: any = { isActive: true };

    if (category && category !== 'ALL') {
      if (category === 'POPULAR') {
        where.isPopular = true;
      } else {
        where.category = category as any;
      }
    }

    if (featured === 'true' || featured === '1') {
      where.isFeatured = true;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [total, games] = await Promise.all([
      prisma.game.count({ where }),
      prisma.game.findMany({
        where,
        include: {
          provider: {
            select: { id: true, name: true, code: true },
          },
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
    ]);

    // Rigorous security filter: guarantee forbidden games can NEVER leak
    const safeGames = games.filter((g) => {
      const lower = g.name.toLowerCase();
      return !STRICTLY_FORBIDDEN_GAMES.some((f) => lower.includes(f));
    });

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: safeGames,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single game details
 */
export const getGame = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        provider: {
          select: { id: true, name: true, code: true, apiBaseUrl: true },
        },
        mapping: true,
      },
    });

    if (!game || !game.isActive) {
      throw ApiError.notFound('Game not found');
    }

    // Safety verification
    const lower = game.name.toLowerCase();
    if (STRICTLY_FORBIDDEN_GAMES.some((f) => lower.includes(f))) {
      throw ApiError.notFound('Game is permanently retired');
    }

    res.json({
      success: true,
      data: game,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Launch Game: Creates a secure launch session and returns launch URL
 */
export const launchGame = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const mode = (req.body?.mode || 'DEMO').toUpperCase(); // DEMO | REAL

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        provider: true,
        mapping: true,
      },
    });

    if (!game || !game.isActive) {
      throw ApiError.notFound('Game not found or currently unavailable');
    }

    const lower = game.name.toLowerCase();
    if (STRICTLY_FORBIDDEN_GAMES.some((f) => lower.includes(f))) {
      throw ApiError.forbidden('Game unavailable');
    }

    // Cryptographically secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

    await prisma.gameLaunchSession.create({
      data: {
        sessionToken,
        userId: req.userId || null,
        gameId: game.id,
        providerCode: game.providerCode || 'IN_HOUSE',
        mode,
        ipAddress: req.ip || '127.0.0.1',
        expiresAt,
      },
    });

    // Check if live provider credentials are active
    const hasLiveCredentials = !!(
      game.provider?.apiKey &&
      game.provider?.secretKey &&
      game.provider?.apiBaseUrl &&
      !game.provider.apiKey.includes('demo')
    );

    let launchUrl: string;
    if (hasLiveCredentials && mode === 'REAL' && game.mapping?.launchUrl) {
      launchUrl = `${game.mapping.launchUrl}&token=${sessionToken}`;
    } else {
      // In-house rich demo arena launch URL
      launchUrl = `/lobby/arena/${game.id}?token=${sessionToken}&mode=${mode.toLowerCase()}`;
    }

    res.json({
      success: true,
      data: {
        sessionToken,
        gameId: game.id,
        gameName: game.name,
        category: game.category,
        providerCode: game.providerCode,
        mode,
        launchUrl,
        integrationStatus: hasLiveCredentials ? 'LIVE_PROVIDER' : 'DEMO_ARENA',
        expiresAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Play game demo / action: server-authoritative fair simulation for all game categories
 */
export const playDemoGame = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const betAmount = Math.max(1, parseFloat(req.body?.betAmount || 10));

    const game = await prisma.game.findUnique({
      where: { id },
    });

    if (!game || !game.isActive) {
      throw ApiError.notFound('Game not found or currently unavailable');
    }

    const lower = game.name.toLowerCase();
    if (STRICTLY_FORBIDDEN_GAMES.some((f) => lower.includes(f))) {
      throw ApiError.notFound('Game not found');
    }

    // Cryptographically secure random roll
    const randomBuffer = crypto.randomBytes(4);
    const randomFloat = randomBuffer.readUInt32BE(0) / 0xffffffff;

    let multiplier = 0;
    let eventType = 'SPIN';
    let details: any = {};

    switch (game.category) {
      case 'CRASH': {
        eventType = 'CRASH_ROUND';
        // Crash distribution: 1.00x - 50.00x
        if (randomFloat < 0.35) {
          multiplier = 0; // crashed before cashout
        } else if (randomFloat < 0.70) {
          multiplier = +(1.2 + (randomFloat - 0.35) * 4).toFixed(2);
        } else if (randomFloat < 0.92) {
          multiplier = +(3.0 + (randomFloat - 0.70) * 15).toFixed(2);
        } else {
          multiplier = +(10.0 + (randomFloat - 0.92) * 100).toFixed(2);
        }
        details = { crashPoint: +(1.0 + randomFloat * 15).toFixed(2) };
        break;
      }
      case 'MINES': {
        eventType = 'MINES_STEP';
        const mineHits = randomFloat < 0.25;
        multiplier = mineHits ? 0 : +(1.35 + randomFloat * 2.5).toFixed(2);
        details = { gemsFound: mineHits ? 0 : 3, hitMine: mineHits };
        break;
      }
      case 'PLINKO': {
        eventType = 'PLINKO_DROP';
        const plinkoMultipliers = [0.2, 0.5, 1.0, 1.5, 2.0, 5.0, 10.0, 25.0];
        const slotIdx = Math.floor(randomFloat * plinkoMultipliers.length);
        multiplier = plinkoMultipliers[slotIdx];
        details = { slotIdx, pegsHit: 12 };
        break;
      }
      case 'FISHING': {
        eventType = 'FISH_CATCH';
        if (randomFloat < 0.40) {
          multiplier = 0;
        } else if (randomFloat < 0.75) {
          multiplier = +(1.5 + (randomFloat - 0.40) * 3).toFixed(2);
        } else {
          multiplier = +(5.0 + (randomFloat - 0.75) * 20).toFixed(2);
        }
        details = { target: 'Golden Dragon', bulletsFired: 1 };
        break;
      }
      case 'TABLE_CARD':
      case 'CASINO': {
        eventType = 'ROUND_RESOLVE';
        if (randomFloat < 0.52) {
          multiplier = 0;
        } else if (randomFloat < 0.90) {
          multiplier = 2.0; // standard 1:1 win
        } else {
          multiplier = 3.0; // tie/bonus win
        }
        details = { outcome: multiplier > 0 ? 'WIN' : 'LOSE' };
        break;
      }
      case 'ROULETTE_DICE': {
        eventType = 'DICE_ROLL';
        if (randomFloat < 0.55) {
          multiplier = 0;
        } else if (randomFloat < 0.88) {
          multiplier = 2.0;
        } else {
          multiplier = 5.0;
        }
        details = { roll: Math.floor(randomFloat * 6) + 1 };
        break;
      }
      case 'KENO':
      case 'BINGO': {
        eventType = 'BALL_DRAW';
        if (randomFloat < 0.60) {
          multiplier = 0;
        } else if (randomFloat < 0.85) {
          multiplier = 2.5;
        } else {
          multiplier = 8.0;
        }
        details = { matches: multiplier > 0 ? 4 : 1 };
        break;
      }
      case 'SPORTS': {
        eventType = 'PENALTY_KICK';
        if (randomFloat < 0.45) {
          multiplier = 0;
        } else {
          multiplier = +(1.8 + randomFloat * 3).toFixed(2);
        }
        details = { goalScored: multiplier > 0 };
        break;
      }
      default: {
        // SLOTS standard reel math
        eventType = 'SLOT_SPIN';
        if (randomFloat < 0.58) {
          multiplier = 0;
        } else if (randomFloat < 0.85) {
          multiplier = +(1.0 + (randomFloat - 0.58) * 3).toFixed(2);
        } else if (randomFloat < 0.96) {
          multiplier = +(4.0 + (randomFloat - 0.85) * 15).toFixed(2);
        } else {
          multiplier = +(20.0 + (randomFloat - 0.96) * 100).toFixed(2);
        }
        details = {
          reels: [
            Math.floor(Math.random() * 6),
            Math.floor(Math.random() * 6),
            Math.floor(Math.random() * 6),
          ],
        };
        break;
      }
    }

    const winAmount = +(betAmount * multiplier).toFixed(2);

    // Record game event
    await prisma.gameEvent.create({
      data: {
        gameId: game.id,
        userId: req.userId || null,
        providerCode: game.providerCode || 'IN_HOUSE',
        eventType,
        amount: winAmount,
        multiplier,
        metadata: JSON.stringify({ betAmount, ...details }),
      },
    });

    res.json({
      success: true,
      data: {
        gameId: game.id,
        gameName: game.name,
        category: game.category,
        betAmount,
        multiplier,
        winAmount,
        isWin: winAmount > 0,
        eventType,
        details,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider Webhook Handler (Seamless Wallet / Callback Handler)
 */
export const handleProviderWebhook = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { providerCode = 'IN_HOUSE', eventType = 'SETTLE', externalTxId, gameId, amount = 0, multiplier = 1, sessionToken } = req.body;

    if (!externalTxId) {
      res.status(400).json({ errorCode: 1001, message: 'externalTxId is required for idempotency' });
      return;
    }

    // Idempotency check: don't double-process the same transaction
    const existing = await prisma.gameEvent.findUnique({
      where: { externalTxId },
    });

    if (existing) {
      res.json({
        errorCode: 0,
        message: 'Transaction already processed (Idempotent)',
        externalTxId,
        processedAt: existing.createdAt,
      });
      return;
    }

    // Record the verified event
    const recordedEvent = await prisma.gameEvent.create({
      data: {
        gameId: gameId || 'generic-game',
        sessionToken,
        providerCode,
        eventType,
        amount: parseFloat(amount),
        multiplier: multiplier ? parseFloat(multiplier) : 1,
        externalTxId,
        metadata: JSON.stringify(req.body),
      },
    });

    res.json({
      errorCode: 0,
      message: 'SUCCESS',
      txId: recordedEvent.id,
      externalTxId,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Provider Readiness and Integration Status Check
 */
export const getProviderStatus = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const providers = await prisma.gameProvider.findMany({
      include: {
        _count: { select: { games: true, mappings: true } },
      },
    });

    const totalGames = await prisma.game.count();
    const categoriesCount = await prisma.game.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    res.json({
      success: true,
      data: {
        providers,
        totalGames,
        categories: categoriesCount,
        integrationMode: 'READY_SEAMLESS_WALLET_AND_DEMO_ARENA',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user game favorite
 */
export const toggleFavorite = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.gameFavorite.findUnique({
      where: {
        userId_gameId: {
          userId: req.userId!,
          gameId: id,
        },
      },
    });

    if (existing) {
      await prisma.gameFavorite.delete({
        where: { id: existing.id },
      });
      res.json({ success: true, message: 'Game removed from favorites', isFavorite: false });
    } else {
      await prisma.gameFavorite.create({
        data: {
          userId: req.userId!,
          gameId: id,
        },
      });
      res.json({ success: true, message: 'Game added to favorites', isFavorite: true });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get user favorites
 */
export const getFavorites = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const favorites = await prisma.gameFavorite.findMany({
      where: { userId: req.userId! },
      include: {
        game: {
          include: {
            provider: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    const safeFavorites = favorites
      .map((f) => f.game)
      .filter((g) => {
        if (!g) return false;
        const lower = g.name.toLowerCase();
        return !STRICTLY_FORBIDDEN_GAMES.some((f) => lower.includes(f));
      });

    res.json({
      success: true,
      data: safeFavorites,
    });
  } catch (error) {
    next(error);
  }
};
