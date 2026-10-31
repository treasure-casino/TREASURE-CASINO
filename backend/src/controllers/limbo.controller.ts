import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { DemoWalletService } from '../services/demoWallet.service';
import { randomUUID } from 'crypto';
import {
  evaluateLimboRound,
  calculateWinProbability,
  DEFAULT_LIMBO_CONFIG,
  LimboConfig,
} from '../games/limbo/limboEngine';

export const GAME_ID_LIMBO = 'game-limbo-01';

// In-memory runtime config override for dynamic admin controls
let runtimeLimboConfig: LimboConfig = { ...DEFAULT_LIMBO_CONFIG };

/**
 * Ensure game-limbo-01 exists in database
 */
export async function ensureLimboGameRegistered(): Promise<void> {
  try {
    const existing = await prisma.game.findUnique({
      where: { id: GAME_ID_LIMBO },
    });

    if (!existing) {
      await prisma.game.create({
        data: {
          id: GAME_ID_LIMBO,
          name: 'Treasure Limbo',
          description:
            'High-speed 2D neon multiplier game with dynamic target selection, provably fair engine, and payouts up to 10,000x.',
          category: 'CRASH',
          providerId: 'prov-inhouse',
          providerCode: 'IN_HOUSE',
          integrationStatus: 'DEMO_ONLY',
          isActive: true,
          isPopular: true,
          isDemo: true,
          volatility: 'HIGH',
          deviceSupport: 'ALL',
          rtp: runtimeLimboConfig.rtp * 100,
          minBet: runtimeLimboConfig.minBet,
          maxBet: runtimeLimboConfig.maxBet,
        },
      });
    }
  } catch (err: any) {
    // If DB is temporarily unreachable during startup, it will retry on first request
    console.warn('[LIMBO] Game registration notice:', err.message);
  }
}

/**
 * POST /api/limbo/roll
 * Executes one atomic Limbo roll.
 */
export const rollLimboHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bet, betAmount, target, targetMultiplier, demoToken, idempotencyKey, forcedMultiplier } =
      req.body;

    const betVal = parseFloat(bet ?? betAmount ?? 10);
    const targetVal = parseFloat(target ?? targetMultiplier ?? 2.0);

    // 1. Validation
    if (isNaN(betVal) || betVal < runtimeLimboConfig.minBet || betVal > runtimeLimboConfig.maxBet) {
      throw ApiError.badRequest(
        `Bet amount must be between ₹${runtimeLimboConfig.minBet} and ₹${runtimeLimboConfig.maxBet}`
      );
    }

    if (
      isNaN(targetVal) ||
      targetVal < runtimeLimboConfig.minTarget ||
      targetVal > runtimeLimboConfig.maxTarget
    ) {
      throw ApiError.badRequest(
        `Target multiplier must be between ${runtimeLimboConfig.minTarget.toFixed(
          2
        )}x and ${runtimeLimboConfig.maxTarget.toFixed(2)}x`
      );
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    // 2. Check Idempotency Key
    if (idempotencyKey) {
      const existingRound = await prisma.demoGameRound.findFirst({
        where: {
          demoWalletId: wallet.id,
          gameId: GAME_ID_LIMBO,
          publicState: { contains: idempotencyKey },
        },
      });

      if (existingRound) {
        const pubState = JSON.parse(existingRound.publicState || '{}');
        const dbWallet = await prisma.demoWallet.findUnique({ where: { id: wallet.id } });
        const currentBal = dbWallet ? parseFloat(dbWallet.balance.toString()) : wallet.balance;
        res.json({
          success: true,
          data: {
            ...pubState,
            balance: currentBal,
            idempotencyReplay: true,
          },
        });
        return;
      }
    }

    // 3. Atomic Bet Deduction
    const { balanceBefore, balanceAfter: balanceAfterDeduction } = await DemoWalletService.deductBet(
      wallet.id,
      betVal
    );

    // 4. Evaluate Limbo Outcome
    const roundId = randomUUID();
    const roundResult = evaluateLimboRound(
      roundId,
      betVal,
      targetVal,
      runtimeLimboConfig,
      forcedMultiplier !== undefined ? parseFloat(forcedMultiplier) : undefined
    );

    // 5. Credit Win if won
    let finalBalance = balanceAfterDeduction;
    if (roundResult.isWin && roundResult.payout > 0) {
      finalBalance = await DemoWalletService.creditWin(wallet.id, roundResult.payout);
    }

    // 6. Record round in database
    const publicStateData = {
      roundId,
      betAmount: roundResult.betAmount,
      targetMultiplier: roundResult.targetMultiplier,
      resultMultiplier: roundResult.resultMultiplier,
      winChance: roundResult.winChance,
      isWin: roundResult.isWin,
      payout: roundResult.payout,
      netProfit: roundResult.netProfit,
      idempotencyKey: idempotencyKey || null,
      timestamp: roundResult.timestamp,
    };

    await prisma.demoGameRound.create({
      data: {
        id: roundId,
        demoWalletId: wallet.id,
        gameId: GAME_ID_LIMBO,
        engine: 'LIMBO',
        status: 'COMPLETED',
        betAmount: betVal,
        payout: roundResult.payout,
        multiplier: roundResult.resultMultiplier,
        balanceBefore: balanceBefore,
        balanceAfter: finalBalance,
        publicState: JSON.stringify(publicStateData),
        settledAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        ...publicStateData,
        balance: finalBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/limbo/history
 * Returns recent roll history.
 */
export const getLimboHistoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { demoToken, limit = '30' } = req.query;
    const take = Math.min(100, Math.max(1, parseInt(limit as string) || 30));

    const whereClause: any = { gameId: GAME_ID_LIMBO };
    if (demoToken) {
      const wallet = await DemoWalletService.getOrCreateWallet(demoToken as string);
      whereClause.demoWalletId = wallet.id;
    }

    const rounds = await prisma.demoGameRound.findMany({
      where: whereClause,
      orderBy: { startedAt: 'desc' },
      take,
    });

    const formatted = rounds.map((r) => {
      let parsedState: any = {};
      try {
        parsedState = JSON.parse(r.publicState || '{}');
      } catch {
        // fallback
      }
      return {
        id: r.id,
        roundId: r.id,
        betAmount: Number(r.betAmount),
        multiplier: Number(r.multiplier),
        resultMultiplier: Number(r.multiplier),
        targetMultiplier: parsedState.targetMultiplier ?? 2.0,
        isWin: parsedState.isWin ?? Number(r.payout) > 0,
        payout: Number(r.payout),
        winChance: parsedState.winChance ?? calculateWinProbability(parsedState.targetMultiplier ?? 2.0),
        timestamp: r.startedAt.getTime(),
      };
    });

    res.json({
      success: true,
      data: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/limbo/config
 * Returns game configuration.
 */
export const getLimboConfigHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        ...runtimeLimboConfig,
        houseEdge: Number((1 - runtimeLimboConfig.rtp).toFixed(4)),
        gameId: GAME_ID_LIMBO,
        isDemo: true,
        isActive: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/limbo/admin/config
 * Updates game configuration.
 */
export const updateLimboConfigHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rtp, minBet, maxBet, minTarget, maxTarget, maxMultiplier } = req.body;

    if (rtp !== undefined) {
      const numRtp = parseFloat(rtp);
      if (numRtp >= 0.8 && numRtp <= 0.99) {
        runtimeLimboConfig.rtp = numRtp;
      }
    }

    if (minBet !== undefined) {
      const numMin = parseFloat(minBet);
      if (numMin > 0 && numMin <= runtimeLimboConfig.maxBet) {
        runtimeLimboConfig.minBet = numMin;
      }
    }

    if (maxBet !== undefined) {
      const numMax = parseFloat(maxBet);
      if (numMax >= runtimeLimboConfig.minBet) {
        runtimeLimboConfig.maxBet = numMax;
      }
    }

    if (minTarget !== undefined) {
      const numMinT = parseFloat(minTarget);
      if (numMinT >= 1.01) {
        runtimeLimboConfig.minTarget = numMinT;
      }
    }

    if (maxTarget !== undefined) {
      const numMaxT = parseFloat(maxTarget);
      if (numMaxT <= 10000.0) {
        runtimeLimboConfig.maxTarget = numMaxT;
      }
    }

    if (maxMultiplier !== undefined) {
      const numMaxM = parseFloat(maxMultiplier);
      if (numMaxM >= 10.0) {
        runtimeLimboConfig.maxMultiplier = numMaxM;
      }
    }

    // Update in database if present
    try {
      await prisma.game.update({
        where: { id: GAME_ID_LIMBO },
        data: {
          rtp: runtimeLimboConfig.rtp * 100,
          minBet: runtimeLimboConfig.minBet,
          maxBet: runtimeLimboConfig.maxBet,
        },
      });
    } catch {
      // non-blocking
    }

    res.json({
      success: true,
      data: {
        ...runtimeLimboConfig,
        houseEdge: Number((1 - runtimeLimboConfig.rtp).toFixed(4)),
        gameId: GAME_ID_LIMBO,
      },
    });
  } catch (error) {
    next(error);
  }
};
