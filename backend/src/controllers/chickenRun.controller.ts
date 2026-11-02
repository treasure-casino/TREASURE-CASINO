import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { DemoWalletService } from '../services/demoWallet.service';
import {
  ActiveChickenRound,
  ChickenDifficulty,
  ChickenRunConfig,
  DEFAULT_CHICKEN_CONFIG,
  initializeRound,
  evaluateStep,
  cashOutRound,
  validateChickenBet,
  TOTAL_TILES,
} from '../games/chickenRun/chickenRunEngine';

export const GAME_ID_CHICKEN_RUN = 'game-chicken-run-01';

// Dynamic runtime configuration
let runtimeChickenConfig: ChickenRunConfig = { ...DEFAULT_CHICKEN_CONFIG };

// In-memory active round sessions
const activeRounds = new Map<string, ActiveChickenRound>();

// Auto-cleanup stale sessions older than 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, r] of activeRounds.entries()) {
    if (r.createdAt < cutoff) {
      activeRounds.delete(id);
    }
  }
}, 5 * 60 * 1000);

/**
 * Ensures game-chicken-run-01 exists in database
 */
export async function ensureChickenRunGameRegistered(): Promise<void> {
  try {
    const existing = await prisma.game.findUnique({
      where: { id: GAME_ID_CHICKEN_RUN },
    });

    if (!existing) {
      await prisma.game.create({
        data: {
          id: GAME_ID_CHICKEN_RUN,
          name: 'Treasure Chicken Run',
          description:
            'Exciting 3D cartoon chicken road crossing casino game with 4 difficulties, progressive multipliers up to 100,000x, and instant cashout.',
          category: 'CASINO',
          providerId: 'prov-inhouse',
          providerCode: 'IN_HOUSE',
          integrationStatus: 'DEMO_ONLY',
          isActive: runtimeChickenConfig.isEnabled,
          isPopular: true,
          isDemo: true,
          volatility: 'MEDIUM',
          deviceSupport: 'ALL',
          rtp: 96.0,
          minBet: runtimeChickenConfig.minBet,
          maxBet: runtimeChickenConfig.maxBet,
        },
      });
      console.log('[CHICKEN RUN] Registered game-chicken-run-01 in database successfully.');
    } else {
      await prisma.game.update({
        where: { id: GAME_ID_CHICKEN_RUN },
        data: {
          name: 'Treasure Chicken Run',
          isActive: runtimeChickenConfig.isEnabled,
          isDemo: true,
          rtp: 96.0,
        },
      });
    }
  } catch (err: any) {
    console.warn('[CHICKEN RUN] Game registration notice:', err.message);
  }
}

/**
 * Helper to extract demo token
 */
function getDemoToken(req: Request): string {
  return (
    (req.headers['x-demo-token'] as string) ||
    req.cookies?.demo_token ||
    (req.query.demoToken as string) ||
    'demo-chicken-runner-user'
  );
}

/**
 * POST /api/chicken-run/start
 * Starts a new round with the given bet and difficulty
 */
export async function startChickenRunHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!runtimeChickenConfig.isEnabled) {
      res.status(403).json({ success: false, message: 'Treasure Chicken Run is currently disabled by administrator' });
      return;
    }

    const { betAmount, difficulty = 'MEDIUM', idempotencyKey } = req.body;
    const betVal = parseFloat(betAmount);

    const validation = validateChickenBet(betVal, runtimeChickenConfig);
    if (!validation.isValid) {
      res.status(400).json({ success: false, message: validation.message });
      return;
    }

    const diff: ChickenDifficulty = ['EASY', 'MEDIUM', 'HARD', 'HARDCORE'].includes(difficulty)
      ? difficulty
      : 'MEDIUM';

    const demoToken = getDemoToken(req);
    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    // Check balance before deduction
    const currentBal = parseFloat(wallet.balance.toString());
    if (currentBal < betVal) {
      res.status(400).json({
        success: false,
        message: 'Insufficient demo balance to place bet',
        balance: currentBal,
      });
      return;
    }

    // Deduct bet
    const { balanceBefore, balanceAfter } = await DemoWalletService.deductBet(wallet.id, betVal);

    // Initialize round session
    const roundId = `cr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const round = initializeRound(roundId, wallet.id, betVal, diff, runtimeChickenConfig);
    activeRounds.set(roundId, round);

    res.status(200).json({
      success: true,
      data: {
        roundId: round.roundId,
        betAmount: round.betAmount,
        difficulty: round.difficulty,
        currentStep: round.currentStep,
        currentMultiplier: round.currentMultiplier,
        potentialPayout: round.accumulatedPayout,
        status: round.status,
        tiles: round.tiles,
        balance: balanceAfter,
        balanceBefore,
        hash: round.hash,
        totalTiles: runtimeChickenConfig.totalTiles,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/chicken-run/step
 * Evaluates chicken hop forward one tile
 */
export async function stepChickenRunHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { roundId } = req.body;
    if (!roundId) {
      res.status(400).json({ success: false, message: 'Missing roundId' });
      return;
    }

    const round = activeRounds.get(roundId);
    if (!round) {
      res.status(404).json({ success: false, message: 'Active round not found or has already finished' });
      return;
    }

    if (round.status !== 'ACTIVE') {
      res.status(400).json({ success: false, message: `Round is already ${round.status}` });
      return;
    }

    const demoToken = getDemoToken(req);
    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    // Evaluate the step
    const stepResult = evaluateStep(round, undefined, runtimeChickenConfig);
    let finalBalance = parseFloat(wallet.balance.toString());

    if (stepResult.outcome === 'BUST') {
      // Record bust loss in DB
      activeRounds.delete(roundId);

      await prisma.demoGameRound.create({
        data: {
          demoWalletId: wallet.id,
          gameId: GAME_ID_CHICKEN_RUN,
          engine: 'CHICKEN_ROAD_24T',
          status: 'LOST',
          betAmount: round.betAmount,
          payout: 0,
          multiplier: 0,
          balanceBefore: finalBalance + round.betAmount,
          balanceAfter: finalBalance,
          publicState: JSON.stringify({
            difficulty: round.difficulty,
            bustedAtStep: round.currentStep + 1,
            completedSteps: round.currentStep,
            hash: round.hash,
            seed: round.seed,
          }),
        },
      });

      res.status(200).json({
        success: true,
        data: {
          roundId,
          outcome: 'BUST',
          currentStep: round.currentStep,
          bustedStep: round.currentStep + 1,
          currentMultiplier: 0,
          payout: 0,
          status: 'BUSTED',
          message: `Chicken busted at Tile #${round.currentStep + 1}! Better luck on the next run.`,
          balance: finalBalance,
          tiles: round.tiles,
        },
      });
      return;
    }

    // Step was SAFE
    if (stepResult.isMaxStepReached) {
      // Auto cash out at finish line
      finalBalance = await DemoWalletService.creditWin(wallet.id, stepResult.payout);
      activeRounds.delete(roundId);

      await prisma.demoGameRound.create({
        data: {
          demoWalletId: wallet.id,
          gameId: GAME_ID_CHICKEN_RUN,
          engine: 'CHICKEN_ROAD_24T',
          status: 'WON',
          betAmount: round.betAmount,
          payout: stepResult.payout,
          multiplier: stepResult.multiplier,
          balanceBefore: finalBalance - stepResult.payout,
          balanceAfter: finalBalance,
          publicState: JSON.stringify({
            difficulty: round.difficulty,
            completedSteps: round.currentStep,
            maxStepReached: true,
            hash: round.hash,
            seed: round.seed,
          }),
        },
      });

      res.status(200).json({
        success: true,
        data: {
          roundId,
          outcome: 'SAFE',
          currentStep: round.currentStep,
          currentMultiplier: stepResult.multiplier,
          payout: stepResult.payout,
          potentialPayout: stepResult.payout,
          status: 'CASHED_OUT',
          isMaxStepReached: true,
          message: `🏆 GOLDEN FINISH! Chicken completed all 24 tiles for ₹${stepResult.payout.toFixed(2)} (${stepResult.multiplier}x)!`,
          balance: finalBalance,
          tiles: round.tiles,
        },
      });
      return;
    }

    // Safe hop, round continues
    res.status(200).json({
      success: true,
      data: {
        roundId,
        outcome: 'SAFE',
        currentStep: round.currentStep,
        currentMultiplier: round.currentMultiplier,
        potentialPayout: round.accumulatedPayout,
        status: 'ACTIVE',
        isMaxStepReached: false,
        message: `Hop safe! Multiplier reached ${round.currentMultiplier}x.`,
        balance: finalBalance,
        tiles: round.tiles,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/chicken-run/cashout
 * Cashes out an active round
 */
export async function cashoutChickenRunHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { roundId } = req.body;
    if (!roundId) {
      res.status(400).json({ success: false, message: 'Missing roundId' });
      return;
    }

    const round = activeRounds.get(roundId);
    if (!round) {
      res.status(404).json({ success: false, message: 'Active round not found or has already finished' });
      return;
    }

    if (round.status !== 'ACTIVE') {
      res.status(400).json({ success: false, message: `Round is already ${round.status}` });
      return;
    }

    if (round.currentStep < 1) {
      res.status(400).json({ success: false, message: 'Must jump at least 1 safe tile before cashing out' });
      return;
    }

    const demoToken = getDemoToken(req);
    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    const { payout, multiplier, step } = cashOutRound(round);
    activeRounds.delete(roundId);

    // Credit demo wallet
    const newBalance = await DemoWalletService.creditWin(wallet.id, payout);

    // Record win in DB
    await prisma.demoGameRound.create({
      data: {
        demoWalletId: wallet.id,
        gameId: GAME_ID_CHICKEN_RUN,
        engine: 'CHICKEN_ROAD_24T',
        status: 'WON',
        betAmount: round.betAmount,
        payout,
        multiplier,
        balanceBefore: newBalance - payout,
        balanceAfter: newBalance,
        publicState: JSON.stringify({
          difficulty: round.difficulty,
          completedSteps: step,
          hash: round.hash,
          seed: round.seed,
        }),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        roundId,
        payout,
        multiplier,
        currentStep: step,
        status: 'CASHED_OUT',
        message: `🎉 Cashed out ₹${payout.toFixed(2)} (${multiplier}x) at Step ${step}!`,
        balance: newBalance,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chicken-run/config
 * Retrieves current public configuration
 */
export async function getChickenRunConfigHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: runtimeChickenConfig,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chicken-run/history
 * Returns recent round history
 */
export async function getChickenRunHistoryHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const demoToken = getDemoToken(req);
    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    const rounds = await prisma.demoGameRound.findMany({
      where: {
        gameId: GAME_ID_CHICKEN_RUN,
        demoWalletId: wallet.id,
      },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    res.status(200).json({
      success: true,
      data: rounds.map((r) => ({
        id: r.id,
        status: r.status,
        betAmount: parseFloat(r.betAmount.toString()),
        payout: parseFloat(r.payout?.toString() || '0'),
        multiplier: parseFloat(r.multiplier?.toString() || '0'),
        createdAt: r.startedAt,
        details: r.publicState ? JSON.parse(r.publicState) : {},
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/chicken-run/admin/stats
 * Admin dashboard statistics
 */
export async function getChickenRunAdminStatsHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const totalRounds = await prisma.demoGameRound.count({
      where: { gameId: GAME_ID_CHICKEN_RUN },
    });

    const wonRounds = await prisma.demoGameRound.count({
      where: { gameId: GAME_ID_CHICKEN_RUN, status: 'WON' },
    });

    const lostRounds = await prisma.demoGameRound.count({
      where: { gameId: GAME_ID_CHICKEN_RUN, status: 'LOST' },
    });

    const aggregates = await prisma.demoGameRound.aggregate({
      where: { gameId: GAME_ID_CHICKEN_RUN },
      _sum: {
        betAmount: true,
        payout: true,
      },
      _max: {
        multiplier: true,
      },
    });

    const totalWagered = parseFloat(aggregates._sum.betAmount?.toString() || '0');
    const totalPayout = parseFloat(aggregates._sum.payout?.toString() || '0');
    const maxMultiplier = parseFloat(aggregates._max.multiplier?.toString() || '0');
    const empiricalRtp = totalWagered > 0 ? (totalPayout / totalWagered) * 100 : 96.0;

    res.status(200).json({
      success: true,
      data: {
        config: runtimeChickenConfig,
        stats: {
          totalRounds,
          wonRounds,
          lostRounds,
          winRate: totalRounds > 0 ? `${((wonRounds / totalRounds) * 100).toFixed(1)}%` : '0%',
          totalWagered,
          totalPayout,
          maxMultiplier,
          theoreticalRtp: '96.0%',
          empiricalRtp: `${empiricalRtp.toFixed(2)}%`,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/chicken-run/admin/config
 * Updates game runtime config
 */
export async function updateChickenRunConfigHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { isEnabled, minBet, maxBet } = req.body;

    if (typeof isEnabled === 'boolean') {
      runtimeChickenConfig.isEnabled = isEnabled;
    }
    if (typeof minBet === 'number' && minBet >= 1) {
      runtimeChickenConfig.minBet = minBet;
    }
    if (typeof maxBet === 'number' && maxBet >= runtimeChickenConfig.minBet) {
      runtimeChickenConfig.maxBet = maxBet;
    }

    // Keep database game status in sync
    await prisma.game.update({
      where: { id: GAME_ID_CHICKEN_RUN },
      data: {
        isActive: runtimeChickenConfig.isEnabled,
        minBet: runtimeChickenConfig.minBet,
        maxBet: runtimeChickenConfig.maxBet,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Treasure Chicken Run configuration updated successfully',
      data: runtimeChickenConfig,
    });
  } catch (err) {
    next(err);
  }
}
