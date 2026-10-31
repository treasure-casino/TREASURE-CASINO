import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { DemoWalletService } from '../services/demoWallet.service';
import { randomUUID } from 'crypto';
import {
  evaluateDiceRound,
  calculateDiceWinChance,
  calculateDiceMultiplier,
  DEFAULT_DICE_CONFIG,
  DiceConfig,
  DiceMode,
} from '../games/dice/diceEngine';

export const GAME_ID_DICE = 'game-dice-01';

// Dynamic runtime configuration
let runtimeDiceConfig: DiceConfig = { ...DEFAULT_DICE_CONFIG };

/**
 * Ensures game-dice-01 exists in database
 */
export async function ensureDiceGameRegistered(): Promise<void> {
  try {
    const existing = await prisma.game.findUnique({
      where: { id: GAME_ID_DICE },
    });

    if (!existing) {
      await prisma.game.create({
        data: {
          id: GAME_ID_DICE,
          name: 'Treasure Dice',
          description:
            'Provably fair 2D casino dice game with customizable Roll Under / Roll Over sliders, real-time odds calculation, and payouts up to 960x.',
          category: 'CRASH',
          providerId: 'prov-inhouse',
          providerCode: 'IN_HOUSE',
          integrationStatus: 'DEMO_ONLY',
          isActive: true,
          isPopular: true,
          isDemo: true,
          volatility: 'MEDIUM',
          deviceSupport: 'ALL',
          rtp: runtimeDiceConfig.rtp * 100,
          minBet: runtimeDiceConfig.minBet,
          maxBet: runtimeDiceConfig.maxBet,
        },
      });
    }
  } catch (err: any) {
    console.warn('[DICE] Game registration notice:', err.message);
  }
}

/**
 * POST /api/dice/roll
 * Executes one atomic Dice roll.
 */
export const rollDiceHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bet, betAmount, target, mode, demoToken, idempotencyKey, forcedOutcome } = req.body;

    const betVal = parseFloat(bet ?? betAmount ?? 10);
    const targetVal = parseFloat(target ?? 50.0);
    const modeVal: DiceMode = mode === 'ROLL_OVER' ? 'ROLL_OVER' : 'ROLL_UNDER';

    // 1. Validation
    if (isNaN(betVal) || betVal < runtimeDiceConfig.minBet || betVal > runtimeDiceConfig.maxBet) {
      throw ApiError.badRequest(
        `Bet amount must be between ₹${runtimeDiceConfig.minBet} and ₹${runtimeDiceConfig.maxBet}`
      );
    }

    if (
      isNaN(targetVal) ||
      targetVal < runtimeDiceConfig.minTarget ||
      targetVal > runtimeDiceConfig.maxTarget
    ) {
      throw ApiError.badRequest(
        `Target must be between ${runtimeDiceConfig.minTarget} and ${runtimeDiceConfig.maxTarget}`
      );
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    // 2. Check Idempotency Key
    if (idempotencyKey) {
      const existingRound = await prisma.demoGameRound.findFirst({
        where: {
          demoWalletId: wallet.id,
          gameId: GAME_ID_DICE,
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

    // 4. Evaluate Dice Outcome
    const roundId = randomUUID();
    const roundResult = evaluateDiceRound(
      roundId,
      betVal,
      targetVal,
      modeVal,
      runtimeDiceConfig,
      forcedOutcome !== undefined ? parseFloat(forcedOutcome) : undefined
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
      target: roundResult.target,
      mode: roundResult.mode,
      outcome: roundResult.outcome,
      winChance: roundResult.winChance,
      multiplier: roundResult.multiplier,
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
        gameId: GAME_ID_DICE,
        engine: 'DICE',
        status: 'COMPLETED',
        betAmount: betVal,
        payout: roundResult.payout,
        multiplier: roundResult.multiplier,
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
 * GET /api/dice/history
 * Returns recent roll history.
 */
export const getDiceHistoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { demoToken, limit = '30' } = req.query;
    const take = Math.min(100, Math.max(1, parseInt(limit as string) || 30));

    const whereClause: any = { gameId: GAME_ID_DICE };
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
        outcome: parsedState.outcome ?? 50.0,
        target: parsedState.target ?? 50.0,
        mode: parsedState.mode ?? 'ROLL_UNDER',
        isWin: parsedState.isWin ?? Number(r.payout) > 0,
        payout: Number(r.payout),
        winChance:
          parsedState.winChance ??
          calculateDiceWinChance(parsedState.target ?? 50.0, parsedState.mode ?? 'ROLL_UNDER'),
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
 * GET /api/dice/config
 * Returns game configuration.
 */
export const getDiceConfigHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        ...runtimeDiceConfig,
        houseEdge: Number((1 - runtimeDiceConfig.rtp).toFixed(4)),
        gameId: GAME_ID_DICE,
        isDemo: true,
        isActive: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/dice/admin/config
 * Updates game configuration.
 */
export const updateDiceConfigHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rtp, minBet, maxBet, minTarget, maxTarget, maxMultiplier, isActive } = req.body;

    if (rtp !== undefined) {
      const numRtp = parseFloat(rtp);
      if (numRtp >= 0.8 && numRtp <= 0.99) {
        runtimeDiceConfig.rtp = numRtp;
      }
    }

    if (minBet !== undefined) {
      const numMin = parseFloat(minBet);
      if (numMin > 0 && numMin <= runtimeDiceConfig.maxBet) {
        runtimeDiceConfig.minBet = numMin;
      }
    }

    if (maxBet !== undefined) {
      const numMax = parseFloat(maxBet);
      if (numMax >= runtimeDiceConfig.minBet) {
        runtimeDiceConfig.maxBet = numMax;
      }
    }

    if (minTarget !== undefined) {
      const numMinT = parseFloat(minTarget);
      if (numMinT >= 1.0 && numMinT <= runtimeDiceConfig.maxTarget) {
        runtimeDiceConfig.minTarget = numMinT;
      }
    }

    if (maxTarget !== undefined) {
      const numMaxT = parseFloat(maxTarget);
      if (numMaxT <= 99.0 && numMaxT >= runtimeDiceConfig.minTarget) {
        runtimeDiceConfig.maxTarget = numMaxT;
      }
    }

    if (maxMultiplier !== undefined) {
      const numMaxM = parseFloat(maxMultiplier);
      if (numMaxM >= 10.0) {
        runtimeDiceConfig.maxMultiplier = numMaxM;
      }
    }

    try {
      await prisma.game.update({
        where: { id: GAME_ID_DICE },
        data: {
          rtp: runtimeDiceConfig.rtp * 100,
          minBet: runtimeDiceConfig.minBet,
          maxBet: runtimeDiceConfig.maxBet,
          ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
        },
      });
    } catch {
      // non-blocking
    }

    res.json({
      success: true,
      data: {
        ...runtimeDiceConfig,
        houseEdge: Number((1 - runtimeDiceConfig.rtp).toFixed(4)),
        gameId: GAME_ID_DICE,
      },
    });
  } catch (error) {
    next(error);
  }
};

