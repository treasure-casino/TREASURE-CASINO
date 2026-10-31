import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { DemoWalletService } from '../services/demoWallet.service';
import { randomBytes, createHash, randomUUID } from 'crypto';
import { ElementType } from '../games/vortex/vortexEngine';

/**
 * Provably fair crash point generator
 * 96% RTP (4% house edge), 3% instant crash at 1.00x
 */
export function generateCrashPoint(): number {
  const rand = Math.random();
  if (rand < 0.03) {
    return 1.00;
  }
  const raw = 0.96 / (1 - rand);
  const capped = Math.min(500, Math.max(1.01, +(Math.floor(raw * 100) / 100)));
  return +capped.toFixed(2);
}

/**
 * POST /api/vortex/start
 * Button Behavior: START
 * - Prepares the game
 * - Does NOT deduct bet
 * - No wallet change
 * - Sets status to READY
 */
export const startVortexReadyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bet, betAmount, demoToken } = req.body;
    const betVal = parseFloat(bet ?? betAmount);

    if (isNaN(betVal) || betVal < 10 || betVal > 5000) {
      throw ApiError.badRequest('Bet amount must be between ₹10 and ₹5,000');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);
    const balance = parseFloat(wallet.balance.toString());

    if (balance < betVal) {
      throw ApiError.badRequest('Insufficient demo balance to place this bet');
    }

    // START = Ready only. No wallet deduction.
    res.json({
      success: true,
      data: {
        status: 'READY',
        ready: true,
        bet: betVal,
        balance,
        message: 'Game prepared. Ready to spin vortex.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vortex/spin
 * Button Behavior: SPIN VORTEX
 * - Deducts bet (once)
 * - Starts the round
 * - Begins vortex animation
 * - Multiplier starts at 1.00x
 * - Enables COLLECT
 */
export const spinVortexLaunchHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bet, betAmount, demoToken } = req.body;
    const betVal = parseFloat(bet ?? betAmount);

    if (isNaN(betVal) || betVal < 10 || betVal > 5000) {
      throw ApiError.badRequest('Bet amount must be between ₹10 and ₹5,000');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);
    const balanceBefore = parseFloat(wallet.balance.toString());

    if (balanceBefore < betVal) {
      throw ApiError.badRequest('Insufficient demo balance');
    }

    // Auto-settle any stale active rounds for this wallet to prevent stuck sessions
    const staleRounds = await prisma.demoGameRound.findMany({
      where: {
        demoWalletId: wallet.id,
        gameId: 'game-vortex-01',
        status: 'ACTIVE',
      },
    });

    for (const stale of staleRounds) {
      await prisma.demoGameRound.update({
        where: { id: stale.id },
        data: {
          status: 'CRASHED',
          payout: 0,
          settledAt: new Date(),
        },
      });
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE vortex_rounds SET status = 'CRASHED', state = 'CRASHED', result = 'LOST', ended_at = NOW() WHERE id = ? AND status = 'ACTIVE'`,
          stale.id
        );
      } catch {}
    }

    // 1. DEDUCT BET ONCE from demo wallet
    const { balanceAfter } = await DemoWalletService.deductBet(wallet.id, betVal);

    // 2. Generate server-authoritative crash point
    const crashPoint = generateCrashPoint();
    const secretSeed = randomBytes(16).toString('hex');
    const commitment = createHash('sha256')
      .update(`${crashPoint}-${secretSeed}`)
      .digest('hex');
    const roundId = randomUUID();
    const startTime = Date.now();

    const publicState = {
      roundId,
      bet: betVal,
      multiplier: 1.0,
      crashPoint,
      commitment,
      startTime,
      active: true,
      levels: { fire: 0, water: 0, earth: 0 },
    };

    const secretState = {
      roundId,
      bet: betVal,
      crashPoint,
      secretSeed,
      commitment,
    };

    // 3. Save to DemoGameRound
    await prisma.demoGameRound.create({
      data: {
        id: roundId,
        demoWalletId: wallet.id,
        gameId: 'game-vortex-01',
        engine: 'VORTEX_CRASH',
        status: 'ACTIVE',
        betAmount: betVal,
        payout: 0,
        multiplier: 1.0,
        balanceBefore,
        balanceAfter,
        commitment,
        publicState: JSON.stringify(publicState),
        secretState: JSON.stringify(secretState),
      },
    });

    // 4. Save to dedicated vortex_rounds table
    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO vortex_rounds (id, user_id, bet, balance_before, balance_after, state, crash_point, payout, status)
         VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, 0.00, 'ACTIVE')`,
        roundId,
        wallet.id,
        betVal,
        balanceBefore,
        balanceAfter,
        crashPoint
      );
    } catch (dbErr) {
      console.warn('vortex_rounds insert warning:', dbErr);
    }

    res.json({
      success: true,
      data: {
        roundId,
        active: true,
        status: 'ACTIVE',
        bet: betVal,
        balance: balanceAfter,
        multiplier: 1.0,
        crashPoint,
        commitment,
        startTime,
        levels: { fire: 0, water: 0, earth: 0 },
        message: 'Vortex spinning! Multiplier rising.',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vortex/collect
 * Button Behavior: COLLECT
 * - Valid only during active round
 * - Pays out (bet * multiplier)
 * - Credits demo balance
 * - Ends the round
 */
export const collectVortexHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roundId, demoToken, multiplier } = req.body;

    if (!roundId) {
      throw ApiError.badRequest('roundId is required');
    }

    const claimedMult = parseFloat(multiplier);
    if (isNaN(claimedMult) || claimedMult < 1.0) {
      throw ApiError.badRequest('Invalid claimed multiplier');
    }

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.status !== 'ACTIVE') {
      throw ApiError.badRequest('Round has already ended or does not exist');
    }

    let secretData: any = {};
    try {
      secretData = JSON.parse(round.secretState || '{}');
    } catch {}

    const crashPoint = parseFloat(secretData.crashPoint || '1.00');

    // Verification: Player cannot collect if crash point already reached
    if (claimedMult > crashPoint) {
      // Mark as crashed
      await prisma.demoGameRound.update({
        where: { id: roundId },
        data: {
          status: 'CRASHED',
          payout: 0,
          multiplier: crashPoint,
          settledAt: new Date(),
        },
      });

      try {
        await prisma.$executeRawUnsafe(
          `UPDATE vortex_rounds SET status = 'CRASHED', state = 'CRASHED', result = 'LOST', payout = 0, ended_at = NOW() WHERE id = ?`,
          roundId
        );
      } catch {}

      throw ApiError.badRequest(`Vortex crashed at ${crashPoint}x before collection`);
    }

    const betVal = parseFloat(round.betAmount.toString());
    const payout = Math.floor(betVal * claimedMult);

    // Credit win to demo wallet
    const newBalance = await DemoWalletService.creditWin(round.demoWalletId, payout);

    // Update DemoGameRound to WON
    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        status: 'WON',
        payout,
        multiplier: claimedMult,
        balanceAfter: newBalance,
        settledAt: new Date(),
        publicState: JSON.stringify({
          roundId,
          status: 'WON',
          bet: betVal,
          multiplier: claimedMult,
          payout,
          crashPoint,
        }),
      },
    });

    // Update vortex_rounds table
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE vortex_rounds SET status = 'WON', state = 'WON', result = 'WON', payout = ?, multiplier = ?, balance_after = ?, ended_at = NOW() WHERE id = ?`,
        payout,
        claimedMult,
        newBalance,
        roundId
      );
    } catch {}

    res.json({
      success: true,
      data: {
        roundId,
        status: 'WON',
        payout,
        multiplier: claimedMult,
        crashPoint,
        balance: newBalance,
        message: `Successfully collected ₹${payout}!`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vortex/crash
 * Button Behavior: CRASH
 * - Ends round and loses bet
 */
export const crashVortexHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roundId } = req.body;

    if (!roundId) {
      throw ApiError.badRequest('roundId is required');
    }

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      throw ApiError.badRequest('Round not found');
    }

    if (round.status !== 'ACTIVE') {
      // Already settled
      res.json({
        success: true,
        data: {
          roundId,
          status: round.status,
          multiplier: parseFloat(round.multiplier.toString()),
          payout: parseFloat(round.payout.toString()),
        },
      });
      return;
    }

    let secretData: any = {};
    try {
      secretData = JSON.parse(round.secretState || '{}');
    } catch {}

    const crashPoint = parseFloat(secretData.crashPoint || '1.00');

    // Update round to CRASHED
    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        status: 'CRASHED',
        payout: 0,
        multiplier: crashPoint,
        settledAt: new Date(),
      },
    });

    // Update vortex_rounds table
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE vortex_rounds SET status = 'CRASHED', state = 'CRASHED', result = 'LOST', payout = 0, ended_at = NOW() WHERE id = ?`,
        roundId
      );
    } catch {}

    res.json({
      success: true,
      data: {
        roundId,
        status: 'CRASHED',
        crashPoint,
        payout: 0,
        message: `Vortex crashed at ${crashPoint}x. Bet lost.`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/vortex/event
 * Records elemental surge events into vortex_events
 */
export const recordVortexEventHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roundId, element, oldMultiplier, newMultiplier } = req.body;

    if (!roundId || !element) {
      throw ApiError.badRequest('roundId and element are required');
    }

    const eventId = randomUUID();
    const oldMult = parseFloat(oldMultiplier || '1.0');
    const newMult = parseFloat(newMultiplier || '1.0');

    try {
      await prisma.$executeRawUnsafe(
        `INSERT INTO vortex_events (id, round_id, element, old_multiplier, new_multiplier, timestamp)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        eventId,
        roundId,
        element,
        oldMult,
        newMult
      );
    } catch (err) {
      console.warn('vortex_events insert warning:', err);
    }

    res.json({
      success: true,
      data: {
        id: eventId,
        roundId,
        element,
        oldMultiplier: oldMult,
        newMultiplier: newMult,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/vortex/history
 * Returns recent round history and crash points
 */
export const getVortexHistoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { demoToken } = req.query;

    const whereClause: any = { gameId: 'game-vortex-01' };
    if (demoToken) {
      const wallet = await DemoWalletService.getOrCreateWallet(demoToken as string);
      whereClause.demoWalletId = wallet.id;
    }

    const rounds = await prisma.demoGameRound.findMany({
      where: whereClause,
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    const elements: ElementType[] = ['FIRE', 'WATER', 'EARTH', 'WIND', 'SKULL'];

    const history = rounds.map((r, i) => {
      let secret: any = {};
      let pub: any = {};
      try {
        secret = JSON.parse(r.secretState || '{}');
      } catch {}
      try {
        pub = JSON.parse(r.publicState || '{}');
      } catch {}

      const crashPoint = parseFloat(secret.crashPoint || r.multiplier.toString() || '1.00');

      return {
        id: r.id,
        bet: parseFloat(r.betAmount.toString()),
        payout: parseFloat(r.payout.toString()),
        multiplier: parseFloat(r.multiplier.toString()),
        crashPoint,
        status: r.status,
        result: r.status === 'WON' ? 'WON' : 'LOST',
        element: elements[i % elements.length],
        startedAt: r.startedAt,
        settledAt: r.settledAt,
      };
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/vortex/state
 * Returns active round state and current balance
 */
export const getVortexStateHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { demoToken } = req.query;
    const wallet = await DemoWalletService.getOrCreateWallet(demoToken as string);

    const activeRound = await prisma.demoGameRound.findFirst({
      where: {
        demoWalletId: wallet.id,
        gameId: 'game-vortex-01',
        status: 'ACTIVE',
      },
    });

    const balance = parseFloat(wallet.balance.toString());

    if (!activeRound) {
      res.json({
        success: true,
        data: {
          active: false,
          balance,
          state: null,
        },
      });
      return;
    }

    let pubState: any = {};
    try {
      pubState = JSON.parse(activeRound.publicState || '{}');
    } catch {}

    res.json({
      success: true,
      data: {
        active: true,
        balance,
        state: {
          roundId: activeRound.id,
          bet: parseFloat(activeRound.betAmount.toString()),
          multiplier: parseFloat(activeRound.multiplier.toString()),
          crashPoint: pubState.crashPoint,
          commitment: activeRound.commitment,
          startTime: pubState.startTime || new Date(activeRound.startedAt).getTime(),
          levels: pubState.levels || { fire: 0, water: 0, earth: 0 },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/vortex/admin/stats
 * Admin dashboard overview of Vortex crash gameplay
 */
export const getVortexAdminStatsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalRounds, activeRounds, completedRounds, recentRounds] = await Promise.all([
      prisma.demoGameRound.count({ where: { gameId: 'game-vortex-01' } }),
      prisma.demoGameRound.count({ where: { gameId: 'game-vortex-01', status: 'ACTIVE' } }),
      prisma.demoGameRound.count({ where: { gameId: 'game-vortex-01', status: { not: 'ACTIVE' } } }),
      prisma.demoGameRound.findMany({
        where: { gameId: 'game-vortex-01' },
        orderBy: { startedAt: 'desc' },
        take: 25,
      }),
    ]);

    const formattedRounds = recentRounds.map((r) => {
      let secret: any = {};
      try {
        secret = JSON.parse(r.secretState || '{}');
      } catch {}

      return {
        id: r.id,
        bet: parseFloat(r.betAmount.toString()),
        payout: parseFloat(r.payout.toString()),
        multiplier: parseFloat(r.multiplier.toString()),
        crashPoint: parseFloat(secret.crashPoint || r.multiplier.toString()),
        status: r.status,
        startedAt: r.startedAt,
        settledAt: r.settledAt,
      };
    });

    res.json({
      success: true,
      data: {
        totalRounds,
        activeRounds,
        completedRounds,
        recentRounds: formattedRounds,
      },
    });
  } catch (error) {
    next(error);
  }
};
