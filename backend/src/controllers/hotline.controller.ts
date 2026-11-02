import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { DemoWalletService } from '../services/demoWallet.service';
import {
  evaluateHotlineRound,
  validateHotlineBet,
  validateHotlineCashout,
  DEFAULT_HOTLINE_CONFIG,
  HotlineConfig,
} from '../games/hotline/hotlineEngine';
import {
  HOTLINE_SYMBOLS,
  HOTLINE_SYMBOLS_LOW,
  HOTLINE_SYMBOLS_HIGH,
  HOTLINE_PAYLINES,
  executeHotlineSlotSpin,
  RiskLevel,
  SCATTER_PROBABILITY,
  HOTLINE_THEORETICAL_MATH,
} from '../games/hotline/hotlineSlotEngine';

export const GAME_ID_HOTLINE = 'game-hotline-01';

// Dynamic runtime configuration
let runtimeHotlineConfig: HotlineConfig = { ...DEFAULT_HOTLINE_CONFIG };

/**
 * Ensures game-hotline-01 exists in database
 */
export async function ensureHotlineGameRegistered(): Promise<void> {
  try {
    const existing = await prisma.game.findUnique({
      where: { id: GAME_ID_HOTLINE },
    });

    if (!existing) {
      await prisma.game.create({
        data: {
          id: GAME_ID_HOTLINE,
          name: 'Treasure Hotline',
          description:
            'Retro 1980s neon 5-reel video slot inspired by Hotline with expanding wilds, 20 paylines, and scatter pays.',
          category: 'SLOTS',
          providerId: 'prov-inhouse',
          providerCode: 'IN_HOUSE',
          integrationStatus: 'DEMO_ONLY',
          isActive: runtimeHotlineConfig.isEnabled,
          isPopular: true,
          isDemo: true,
          volatility: 'HIGH',
          deviceSupport: 'ALL',
          rtp: 96.0,
          minBet: runtimeHotlineConfig.minBet,
          maxBet: runtimeHotlineConfig.maxBet,
        },
      });
      console.log('[HOTLINE] Registered game-hotline-01 in database successfully.');
    } else {
      await prisma.game.update({
        where: { id: GAME_ID_HOTLINE },
        data: {
          category: 'SLOTS',
          description:
            'Retro 1980s neon 5-reel video slot inspired by Hotline with expanding wilds, 20 paylines, and scatter pays.',
        },
      });
    }
  } catch (err: any) {
    console.warn('[HOTLINE] Game registration notice:', err.message);
  }
}

/**
 * POST /api/hotline/spin
 * 5-Reel 80s Video Slot Spin with Expanding Wilds and Scatter evaluation
 */
export const spinHotlineHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!runtimeHotlineConfig.isEnabled) {
      throw ApiError.badRequest('Treasure Hotline is currently inactive in maintenance mode');
    }

    const {
      bet,
      betAmount,
      riskLevel = 'LOW',
      bonusBetActive = false,
      isFreeSpin = false,
      demoToken,
      idempotencyKey,
    } = req.body;

    const baseBet = parseFloat(bet ?? betAmount ?? 50);

    if (isNaN(baseBet) || baseBet < runtimeHotlineConfig.minBet || baseBet > runtimeHotlineConfig.maxBet) {
      throw ApiError.badRequest(
        `Bet amount must be between ₹${runtimeHotlineConfig.minBet} and ₹${runtimeHotlineConfig.maxBet}`
      );
    }

    const validatedRisk: RiskLevel = riskLevel === 'HIGH' ? 'HIGH' : 'LOW';
    const totalBetToDeduct = isFreeSpin ? 0 : (bonusBetActive ? +(baseBet * 1.5).toFixed(2) : baseBet);

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    // Idempotency check if provided
    if (idempotencyKey) {
      const existingRound = await prisma.demoGameRound.findFirst({
        where: {
          demoWalletId: wallet.id,
          gameId: GAME_ID_HOTLINE,
          publicState: { contains: idempotencyKey },
        },
      });
      if (existingRound) {
        const parsed = JSON.parse(existingRound.publicState || '{}');
        res.status(200).json({
          success: true,
          message: 'Spin already processed (idempotent)',
          data: {
            roundId: existingRound.id,
            status: existingRound.status,
            betAmount: parseFloat(existingRound.betAmount.toString()),
            payout: parseFloat(existingRound.payout?.toString() || '0'),
            multiplier: parseFloat(existingRound.multiplier?.toString() || '0'),
            balanceBefore: parseFloat(existingRound.balanceBefore?.toString() || '0'),
            balanceAfter: parseFloat(existingRound.balanceAfter?.toString() || '0'),
            ...parsed,
          },
        });
        return;
      }
    }

    // Deduct bet from demo wallet if not free spin
    let balanceBefore = parseFloat(wallet.balance.toString());
    let balanceAfterBet = balanceBefore;
    if (totalBetToDeduct > 0) {
      const deduction = await DemoWalletService.deductBet(wallet.id, totalBetToDeduct);
      balanceBefore = deduction.balanceBefore;
      balanceAfterBet = deduction.balanceAfter;
    }

    // Execute server-authoritative slot spin
    const spinResult = executeHotlineSlotSpin({
      betAmount: baseBet,
      riskLevel: validatedRisk,
      bonusBetActive: Boolean(bonusBetActive),
      isFreeSpin: Boolean(isFreeSpin),
    });

    let finalBalance = balanceAfterBet;
    if (spinResult.totalPayout > 0) {
      finalBalance = await DemoWalletService.creditWin(wallet.id, spinResult.totalPayout);
    }

    // Record demo game round
    const publicData = {
      rawGrid: spinResult.rawGrid,
      expandedGrid: spinResult.expandedGrid,
      expandedReels: spinResult.expandedReels,
      winningLines: spinResult.winningLines,
      scatterCount: spinResult.scatterCount,
      scatterMultiplier: spinResult.scatterMultiplier,
      scatterPayout: spinResult.scatterPayout,
      scatterPositions: spinResult.scatterPositions,
      isBigWin: spinResult.isBigWin,
      isMegaWin: spinResult.isMegaWin,
      riskLevel: spinResult.riskLevel,
      bonusBetActive: spinResult.bonusBetActive,
      isFreeSpinRound: spinResult.isFreeSpinRound,
      freeSpinsAwarded: spinResult.freeSpinsAwarded,
      isFreeSpinsTriggered: spinResult.isFreeSpinsTriggered,
      isRetrigger: spinResult.isRetrigger,
      baseBet: spinResult.baseBet,
      totalBet: spinResult.totalBet,
      idempotencyKey,
    };

    const round = await prisma.demoGameRound.create({
      data: {
        demoWalletId: wallet.id,
        gameId: GAME_ID_HOTLINE,
        engine: 'HOTLINE_SLOT_5X3',
        status: spinResult.totalPayout > 0 ? 'WON' : 'LOST',
        betAmount: spinResult.totalBet,
        payout: spinResult.totalPayout,
        multiplier: spinResult.totalMultiplier,
        balanceBefore,
        balanceAfter: finalBalance,
        publicState: JSON.stringify(publicData),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        roundId: round.id,
        betAmount: baseBet,
        baseBet: spinResult.baseBet,
        totalBet: spinResult.totalBet,
        riskLevel: spinResult.riskLevel,
        bonusBetActive: spinResult.bonusBetActive,
        isFreeSpinRound: spinResult.isFreeSpinRound,
        freeSpinsAwarded: spinResult.freeSpinsAwarded,
        isFreeSpinsTriggered: spinResult.isFreeSpinsTriggered,
        isRetrigger: spinResult.isRetrigger,
        balanceBefore,
        balanceAfter: finalBalance,
        rawGrid: spinResult.rawGrid,
        expandedGrid: spinResult.expandedGrid,
        expandedReels: spinResult.expandedReels,
        winningLines: spinResult.winningLines,
        scatterCount: spinResult.scatterCount,
        scatterMultiplier: spinResult.scatterMultiplier,
        scatterPayout: spinResult.scatterPayout,
        scatterPositions: spinResult.scatterPositions,
        totalMultiplier: spinResult.totalMultiplier,
        totalPayout: spinResult.totalPayout,
        isWin: spinResult.isWin,
        isBigWin: spinResult.isBigWin,
        isMegaWin: spinResult.isMegaWin,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/hotline/start
 * Starts a new Hotline round, deducts bet, evaluates revealed number & stopping multiplier
 */
export const startHotlineHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      bet,
      betAmount,
      selectedNumber,
      autoCashoutMultiplier,
      demoToken,
      idempotencyKey,
      forcedNumber,
      forcedMultiplier,
    } = req.body;

    const betVal = parseFloat(bet ?? betAmount ?? 50);
    const targetNum = parseInt(selectedNumber ?? 50, 10);

    const validation = validateHotlineBet(betVal, targetNum, runtimeHotlineConfig);
    if (!validation.isValid) {
      throw ApiError.badRequest(validation.error || 'Invalid Hotline bet parameters');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    // Idempotency check
    if (idempotencyKey) {
      const existingRound = await prisma.demoGameRound.findFirst({
        where: {
          demoWalletId: wallet.id,
          gameId: GAME_ID_HOTLINE,
          publicState: { contains: idempotencyKey },
        },
      });
      if (existingRound) {
        res.status(200).json({
          success: true,
          message: 'Round already processed (idempotent)',
          data: {
            roundId: existingRound.id,
            status: existingRound.status,
            betAmount: Number(existingRound.betAmount),
            multiplier: Number(existingRound.multiplier),
            payout: Number(existingRound.payout),
            balance: Number(existingRound.balanceAfter ?? wallet.balance),
            ...JSON.parse(existingRound.publicState || '{}'),
          },
        });
        return;
      }
    }

    // Deduct bet from demo wallet
    const { balanceBefore, balanceAfter } = await DemoWalletService.deductBet(wallet.id, betVal);

    // Evaluate server outcome
    const roundResult = evaluateHotlineRound(
      targetNum,
      runtimeHotlineConfig,
      forcedNumber,
      forcedMultiplier
    );

    const publicPayload = {
      selectedNumber: targetNum,
      revealedNumber: roundResult.revealedNumber,
      stoppingMultiplier: roundResult.stoppingMultiplier,
      isDirectHit: roundResult.isDirectHit,
      isHotZone: roundResult.isHotZone,
      bonusMultiplier: roundResult.bonusMultiplier,
      durationMs: roundResult.durationMs,
      autoCashoutMultiplier: autoCashoutMultiplier ? Number(autoCashoutMultiplier) : undefined,
      idempotencyKey,
    };

    const round = await prisma.demoGameRound.create({
      data: {
        demoWalletId: wallet.id,
        gameId: GAME_ID_HOTLINE,
        engine: 'HOTLINE',
        status: 'ACTIVE',
        betAmount: betVal,
        payout: 0,
        multiplier: 1.0,
        balanceBefore,
        balanceAfter,
        publicState: JSON.stringify(publicPayload),
        secretState: JSON.stringify({
          stoppingMultiplier: roundResult.stoppingMultiplier,
        }),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        roundId: round.id,
        status: 'ACTIVE',
        betAmount: betVal,
        balance: balanceAfter,
        ...publicPayload,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/hotline/cashout
 * Cashing out at player's chosen multiplier before the stopping point
 */
export const cashoutHotlineHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roundId, multiplier, demoToken } = req.body;

    if (!roundId) {
      throw ApiError.badRequest('roundId is required for cashout');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    const round = await prisma.demoGameRound.findFirst({
      where: {
        id: roundId,
        demoWalletId: wallet.id,
        gameId: GAME_ID_HOTLINE,
        status: 'ACTIVE',
      },
    });

    if (!round) {
      throw ApiError.badRequest('No active Hotline round found with given ID');
    }

    const sec = JSON.parse(round.secretState || '{}');
    const stoppingMultiplier = sec.stoppingMultiplier ?? 1.0;
    const betVal = Number(round.betAmount);
    const requestedMult = parseFloat(multiplier);

    const cashoutValidation = validateHotlineCashout(requestedMult, stoppingMultiplier, betVal);

    if (!cashoutValidation.isValid) {
      // Burned out before cashout
      await prisma.demoGameRound.update({
        where: { id: round.id },
        data: {
          status: 'LOST',
          multiplier: 0,
          payout: 0,
          settledAt: new Date(),
        },
      });

      res.status(200).json({
        success: true,
        message: cashoutValidation.error || 'Hotline burned out before cashout',
        data: {
          roundId: round.id,
          status: 'LOST',
          betAmount: betVal,
          multiplier: 0,
          payout: 0,
          balance: wallet.balance,
        },
      });
      return;
    }

    // Successful Cashout
    const newBalance = await DemoWalletService.creditWin(wallet.id, cashoutValidation.payout);

    await prisma.demoGameRound.update({
      where: { id: round.id },
      data: {
        status: 'WON',
        multiplier: cashoutValidation.settledMultiplier,
        payout: cashoutValidation.payout,
        balanceAfter: newBalance,
        settledAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      message: `Cashed out at ${cashoutValidation.settledMultiplier.toFixed(2)}x for ₹${cashoutValidation.payout.toFixed(2)}!`,
      data: {
        roundId: round.id,
        status: 'WON',
        betAmount: betVal,
        multiplier: cashoutValidation.settledMultiplier,
        payout: cashoutValidation.payout,
        profit: cashoutValidation.profit,
        balance: newBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/hotline/settle-loss
 * Settles an active round that stopped without player cashing out
 */
export const settleLossHotlineHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roundId, demoToken } = req.body;

    if (!roundId) {
      throw ApiError.badRequest('roundId is required');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    const round = await prisma.demoGameRound.findFirst({
      where: {
        id: roundId,
        demoWalletId: wallet.id,
        gameId: GAME_ID_HOTLINE,
        status: 'ACTIVE',
      },
    });

    if (round) {
      await prisma.demoGameRound.update({
        where: { id: round.id },
        data: {
          status: 'LOST',
          multiplier: 0,
          payout: 0,
          settledAt: new Date(),
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Round settled as lost',
      data: {
        roundId,
        status: 'LOST',
        payout: 0,
        balance: wallet.balance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hotline/config
 * Retrieves Hotline limits, RTP, and number boundaries
 */
export const getHotlineConfigHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: {
        ...runtimeHotlineConfig,
        symbols: HOTLINE_SYMBOLS,
        symbolsLow: HOTLINE_SYMBOLS_LOW,
        symbolsHigh: HOTLINE_SYMBOLS_HIGH,
        paylines: HOTLINE_PAYLINES,
        reelCount: 5,
        rowCount: 3,
        paylineCount: HOTLINE_PAYLINES.length,
        riskLevels: ['LOW', 'HIGH'],
        bonusBetMultiplier: 1.5,
        rtp: runtimeHotlineConfig.baseRtp,
        theoreticalRtp: '96.0%',
        volatility: {
          LOW: 'LOW',
          HIGH: 'HIGH',
        },
        winRate: {
          LOW: '42.1%',
          HIGH: '44.4%',
        },
        mathConfig: HOTLINE_THEORETICAL_MATH,
        scatterProbability: SCATTER_PROBABILITY,
        scatterProbabilityPercent: '1.0%',
        freeSpinsConfig: {
          scatters3: 10,
          scatters4: 15,
          scatters5: 20,
          retrigger: 5,
        },
        features: [
          'EXPANDING_WILDS',
          'SCATTER_PAYS',
          '20_PAYLINES',
          'FREE_SPINS',
          'BONUS_BET',
          'LOW_HIGH_RISK',
        ],
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hotline/history
 * Returns recent Hotline rounds for player session
 */
export const getHotlineHistoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { demoToken } = req.query;
    const limit = Math.min(50, parseInt((req.query.limit as string) || '15', 10));

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken as string);

    const rounds = await prisma.demoGameRound.findMany({
      where: {
        demoWalletId: wallet.id,
        gameId: GAME_ID_HOTLINE,
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        status: true,
        betAmount: true,
        payout: true,
        multiplier: true,
        publicState: true,
        startedAt: true,
        settledAt: true,
      },
    });

    const parsed = rounds.map((r) => {
      let state: any = {};
      try {
        state = JSON.parse(r.publicState || '{}');
      } catch {}
      return {
        id: r.id,
        status: r.status,
        betAmount: Number(r.betAmount),
        payout: Number(r.payout),
        multiplier: Number(r.multiplier),
        isWin: Number(r.payout) > 0,
        rawGrid: state.rawGrid,
        expandedGrid: state.expandedGrid,
        winningLines: state.winningLines || [],
        scatterCount: state.scatterCount || 0,
        isBigWin: state.isBigWin || false,
        isMegaWin: state.isMegaWin || false,
        riskLevel: state.riskLevel || 'LOW',
        bonusBetActive: state.bonusBetActive || false,
        isFreeSpinRound: state.isFreeSpinRound || false,
        freeSpinsAwarded: state.freeSpinsAwarded || 0,
        isFreeSpinsTriggered: state.isFreeSpinsTriggered || false,
        selectedNumber: state.selectedNumber,
        revealedNumber: state.revealedNumber,
        stoppingMultiplier: state.stoppingMultiplier,
        startedAt: r.startedAt,
        settledAt: r.settledAt,
      };
    });

    res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hotline/admin/stats
 * Admin dashboard telemetry & recent rounds
 */
export const getHotlineAdminStatsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalRounds, recentRounds] = await Promise.all([
      prisma.demoGameRound.count({
        where: { gameId: GAME_ID_HOTLINE },
      }),
      prisma.demoGameRound.findMany({
        where: { gameId: GAME_ID_HOTLINE },
        orderBy: { startedAt: 'desc' },
        take: 30,
      }),
    ]);

    const totalBets = recentRounds.reduce((acc, r) => acc + Number(r.betAmount), 0);
    const totalPayouts = recentRounds.reduce((acc, r) => acc + Number(r.payout), 0);
    const actualRtp = totalBets > 0 ? Number(((totalPayouts / totalBets) * 100).toFixed(2)) : 96.0;

    res.status(200).json({
      success: true,
      data: {
        config: runtimeHotlineConfig,
        totalRounds,
        totalBets,
        totalPayouts,
        actualRtp,
        recentRounds: recentRounds.map((r) => ({
          id: r.id,
          bet: Number(r.betAmount),
          payout: Number(r.payout),
          multiplier: Number(r.multiplier),
          status: r.status,
          createdAt: r.startedAt,
          details: JSON.parse(r.publicState || '{}'),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/hotline/admin/config
 * Updates Hotline configuration
 */
export const updateHotlineConfigHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { isEnabled, minBet, maxBet, baseRtp, maxMultiplier, minNumber, maxNumber } = req.body;

    runtimeHotlineConfig = {
      ...runtimeHotlineConfig,
      ...(isEnabled !== undefined ? { isEnabled: Boolean(isEnabled) } : {}),
      ...(minBet !== undefined ? { minBet: Number(minBet) } : {}),
      ...(maxBet !== undefined ? { maxBet: Number(maxBet) } : {}),
      ...(baseRtp !== undefined ? { baseRtp: Number(baseRtp) } : {}),
      ...(maxMultiplier !== undefined ? { maxMultiplier: Number(maxMultiplier) } : {}),
      ...(minNumber !== undefined ? { minNumber: Number(minNumber) } : {}),
      ...(maxNumber !== undefined ? { maxNumber: Number(maxNumber) } : {}),
    };

    if (isEnabled !== undefined) {
      await prisma.game.updateMany({
        where: { id: GAME_ID_HOTLINE },
        data: { isActive: Boolean(isEnabled) },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hotline configuration updated successfully',
      data: runtimeHotlineConfig,
    });
  } catch (error) {
    next(error);
  }
};

