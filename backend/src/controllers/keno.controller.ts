import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { DemoWalletService } from '../services/demoWallet.service';
import { randomUUID } from 'crypto';
import {
  evaluateKenoRound,
  validateKenoBet,
  DEFAULT_KENO_CONFIG,
  KenoConfig,
} from '../games/keno/kenoEngine';

export const GAME_ID_KENO = 'game-keno-01';

// Dynamic runtime configuration
let runtimeKenoConfig: KenoConfig = { ...DEFAULT_KENO_CONFIG };

/**
 * Ensures game-keno-01 exists in database
 */
export async function ensureKenoGameRegistered(): Promise<void> {
  try {
    const existing = await prisma.game.findUnique({
      where: { id: GAME_ID_KENO },
    });

    if (!existing) {
      await prisma.game.create({
        data: {
          id: GAME_ID_KENO,
          name: 'Treasure Keno',
          description:
            'Classic 2D casino Keno with 1–80 grid, player-selectable 1–10 spots, 20 unique ball draws, Quick Pick, and jackpot payouts up to 100x.',
          category: 'ROULETTE_DICE',
          providerId: 'prov-inhouse',
          providerCode: 'IN_HOUSE',
          integrationStatus: 'DEMO_ONLY',
          isActive: runtimeKenoConfig.isEnabled,
          isPopular: true,
          isDemo: true,
          volatility: 'HIGH',
          deviceSupport: 'ALL',
          rtp: 95.8,
          minBet: runtimeKenoConfig.minBet,
          maxBet: runtimeKenoConfig.maxBet,
        },
      });
      console.log('[KENO] Registered game-keno-01 in database successfully.');
    }
  } catch (err: any) {
    console.warn('[KENO] Game registration notice:', err.message);
  }
}

/**
 * POST /api/keno/draw
 * Executes one atomic Keno draw round.
 */
export const drawKenoHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bet, betAmount, selectedNumbers, demoToken, idempotencyKey, forcedDraw } = req.body;

    const betVal = parseFloat(bet ?? betAmount ?? 10);
    const spots = Array.isArray(selectedNumbers) ? selectedNumbers.map((n: any) => parseInt(n, 10)) : [];

    // 1. Validation
    const validation = validateKenoBet(betVal, spots, runtimeKenoConfig);
    if (!validation.isValid) {
      throw ApiError.badRequest(validation.error || 'Invalid Keno parameters');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    // 2. Idempotency Check
    if (idempotencyKey) {
      const existingRound = await prisma.demoGameRound.findFirst({
        where: {
          demoWalletId: wallet.id,
          gameId: GAME_ID_KENO,
          publicState: { contains: idempotencyKey },
        },
      });
      if (existingRound) {
        res.status(200).json({
          success: true,
          message: 'Round already processed (idempotent)',
          data: {
            roundId: existingRound.id,
            betAmount: Number(existingRound.betAmount),
            multiplier: Number(existingRound.multiplier),
            payout: Number(existingRound.payout),
            balance: Number(existingRound.balanceAfter ?? wallet.balance),
            publicState: JSON.parse(existingRound.publicState || '{}'),
          },
        });
        return;
      }
    }

    // 3. Balance verification
    const currentBalance = Number(wallet.balance);
    if (currentBalance < betVal) {
      throw ApiError.badRequest(
        `Insufficient demo balance. Available: ₹${currentBalance.toFixed(2)}, Required: ₹${betVal.toFixed(2)}`
      );
    }

    const roundId = randomUUID();

    // 4. Server-authoritative Keno draw & outcome evaluation
    const outcome = evaluateKenoRound(
      roundId,
      betVal,
      spots,
      runtimeKenoConfig,
      Array.isArray(forcedDraw) ? forcedDraw : undefined
    );

    // 5. Debit bet atomically from demo wallet
    const { balanceAfter: balanceAfterDeduct } = await DemoWalletService.deductBet(
      wallet.id,
      betVal
    );

    // 6. Credit payout to demo wallet if any
    let finalBalance = balanceAfterDeduct;
    if (outcome.payout > 0) {
      finalBalance = await DemoWalletService.creditWin(wallet.id, outcome.payout);
    }

    // 7. Record game round in DB
    await prisma.demoGameRound.create({
      data: {
        id: roundId,
        demoWalletId: wallet.id,
        gameId: GAME_ID_KENO,
        engine: 'KENO_2D',
        status: 'SETTLED',
        betAmount: betVal,
        payout: outcome.payout,
        multiplier: outcome.multiplier,
        balanceBefore: currentBalance,
        balanceAfter: finalBalance,
        publicState: JSON.stringify({
          selectedNumbers: outcome.selectedNumbers,
          drawnNumbers: outcome.drawnNumbers,
          matches: outcome.matches,
          matchCount: outcome.matchCount,
          multiplier: outcome.multiplier,
          payout: outcome.payout,
          profit: outcome.profit,
          isWin: outcome.isWin,
          idempotencyKey: idempotencyKey || null,
        }),
        secretState: JSON.stringify({
          spotsCount: outcome.selectedNumbers.length,
        }),
        startedAt: new Date(),
        settledAt: new Date(),
      },
    });

    res.status(200).json({
      success: true,
      data: {
        roundId,
        betAmount: outcome.betAmount,
        selectedNumbers: outcome.selectedNumbers,
        drawnNumbers: outcome.drawnNumbers,
        matches: outcome.matches,
        matchCount: outcome.matchCount,
        multiplier: outcome.multiplier,
        payout: outcome.payout,
        profit: outcome.profit,
        isWin: outcome.isWin,
        balance: finalBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/keno/config
 * Retrieves Keno rules, spot limits, and full payout table
 */
export const getKenoConfigHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(200).json({
      success: true,
      data: runtimeKenoConfig,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/keno/history
 * Returns recent Keno rounds for player session
 */
export const getKenoHistoryHandler = async (
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
        gameId: GAME_ID_KENO,
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        betAmount: true,
        payout: true,
        multiplier: true,
        publicState: true,
        startedAt: true,
      },
    });

    const parsed = rounds.map((r) => {
      let state: any = {};
      try {
        state = JSON.parse(r.publicState || '{}');
      } catch {}
      return {
        id: r.id,
        betAmount: Number(r.betAmount),
        payout: Number(r.payout),
        multiplier: Number(r.multiplier),
        selectedNumbers: state.selectedNumbers || [],
        drawnNumbers: state.drawnNumbers || [],
        matches: state.matches || [],
        matchCount: state.matchCount || 0,
        createdAt: r.startedAt,
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
 * GET /api/keno/admin/stats
 * Admin dashboard statistics for Keno
 */
export const getKenoAdminStatsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalRounds, recentRounds] = await Promise.all([
      prisma.demoGameRound.count({
        where: { gameId: GAME_ID_KENO },
      }),
      prisma.demoGameRound.findMany({
        where: { gameId: GAME_ID_KENO },
        orderBy: { startedAt: 'desc' },
        take: 30,
      }),
    ]);

    const totalBets = recentRounds.reduce((acc, r) => acc + Number(r.betAmount), 0);
    const totalPayouts = recentRounds.reduce((acc, r) => acc + Number(r.payout), 0);
    const actualRtp = totalBets > 0 ? Number(((totalPayouts / totalBets) * 100).toFixed(2)) : 95.8;

    res.status(200).json({
      success: true,
      data: {
        config: runtimeKenoConfig,
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
 * POST /api/keno/admin/config
 * Updates Keno configuration (enable/disable, spots, bet limits, payout tables)
 */
export const updateKenoConfigHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { isEnabled, minBet, maxBet, minSpots, maxSpots, payoutTable } = req.body;

    runtimeKenoConfig = {
      ...runtimeKenoConfig,
      ...(isEnabled !== undefined ? { isEnabled: Boolean(isEnabled) } : {}),
      ...(minBet !== undefined ? { minBet: Number(minBet) } : {}),
      ...(maxBet !== undefined ? { maxBet: Number(maxBet) } : {}),
      ...(minSpots !== undefined ? { minSpots: Number(minSpots) } : {}),
      ...(maxSpots !== undefined ? { maxSpots: Number(maxSpots) } : {}),
      ...(payoutTable !== undefined ? { payoutTable } : {}),
    };

    // Update game active status in database if isEnabled changed
    if (isEnabled !== undefined) {
      await prisma.game.updateMany({
        where: { id: GAME_ID_KENO },
        data: { isActive: Boolean(isEnabled) },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Keno configuration updated successfully',
      data: runtimeKenoConfig,
    });
  } catch (error) {
    next(error);
  }
};

