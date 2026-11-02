import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { DemoWalletService } from '../services/demoWallet.service';
import { randomUUID } from 'crypto';
import {
  evaluatePlinkoRound,
  validatePlinkoBet,
  calculateTheoreticalRtp,
  DEFAULT_PLINKO_CONFIG,
  PlinkoConfig,
  PlinkoRows,
  PlinkoRisk,
} from '../games/plinko/plinkoEngine';

export const GAME_ID_PLINKO = 'game-plinko-01';

// Dynamic runtime configuration
let runtimePlinkoConfig: PlinkoConfig = { ...DEFAULT_PLINKO_CONFIG };

/**
 * Ensures game-plinko-01 exists in database
 */
export async function ensurePlinkoGameRegistered(): Promise<void> {
  try {
    const existing = await prisma.game.findUnique({
      where: { id: GAME_ID_PLINKO },
    });

    if (!existing) {
      await prisma.game.create({
        data: {
          id: GAME_ID_PLINKO,
          name: 'Treasure Plinko',
          description:
            'Provably fair 2D casino Plinko board with customizable rows (8, 12, 16), 3 risk tiers, realistic 2D ball pin physics, and payouts up to 1,000x.',
          category: 'CRASH',
          providerId: 'prov-inhouse',
          providerCode: 'IN_HOUSE',
          integrationStatus: 'DEMO_ONLY',
          isActive: true,
          isPopular: true,
          isDemo: true,
          volatility: 'HIGH',
          deviceSupport: 'ALL',
          rtp: runtimePlinkoConfig.rtp * 100,
          minBet: runtimePlinkoConfig.minBet,
          maxBet: runtimePlinkoConfig.maxBet,
        },
      });
      console.log('[PLINKO] Registered game-plinko-01 in database successfully.');
    }
  } catch (err: any) {
    console.warn('[PLINKO] Game registration notice:', err.message);
  }
}

/**
 * POST /api/plinko/drop
 * Executes one atomic Plinko ball drop.
 */
export const dropBallPlinkoHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bet, betAmount, rows, risk, demoToken, idempotencyKey, forcedSlot } = req.body;

    const betVal = parseFloat(bet ?? betAmount ?? 10);
    const rowsVal = parseInt(rows ?? 16, 10) as PlinkoRows;
    const riskVal = (String(risk ?? 'MEDIUM').toUpperCase()) as PlinkoRisk;

    // 1. Validation
    const validation = validatePlinkoBet(betVal, rowsVal, riskVal, runtimePlinkoConfig);
    if (!validation.isValid) {
      throw ApiError.badRequest(validation.error || 'Invalid Plinko parameters');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    // 2. Check Idempotency Key
    if (idempotencyKey) {
      const existingRound = await prisma.demoGameRound.findFirst({
        where: {
          demoWalletId: wallet.id,
          gameId: GAME_ID_PLINKO,
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

    // 4. Server-authoritative Plinko outcome generation
    const outcome = evaluatePlinkoRound(
      roundId,
      betVal,
      rowsVal,
      riskVal,
      runtimePlinkoConfig,
      typeof forcedSlot === 'number' ? forcedSlot : undefined
    );

    // 5. Debit bet atomically from demo wallet
    const { balanceBefore, balanceAfter: balanceAfterDeduct } = await DemoWalletService.deductBet(
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
        gameId: GAME_ID_PLINKO,
        engine: 'PLINKO_2D',
        status: 'SETTLED',
        betAmount: betVal,
        payout: outcome.payout,
        multiplier: outcome.multiplier,
        balanceBefore: currentBalance,
        balanceAfter: finalBalance,
        publicState: JSON.stringify({
          rows: outcome.rows,
          risk: outcome.risk,
          path: outcome.path,
          slotIndex: outcome.slotIndex,
          multiplier: outcome.multiplier,
          payout: outcome.payout,
          profit: outcome.profit,
          isWin: outcome.isWin,
          idempotencyKey: idempotencyKey || null,
        }),
        secretState: JSON.stringify({
          rtp: runtimePlinkoConfig.rtp,
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
        rows: outcome.rows,
        risk: outcome.risk,
        path: outcome.path,
        slotIndex: outcome.slotIndex,
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
 * GET /api/plinko/config
 * Retrieves Plinko board multiplier tables and RTP calculations
 */
export const getPlinkoConfigHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const theoreticalRtp: Record<string, number> = {};
    runtimePlinkoConfig.allowedRows.forEach((r) => {
      runtimePlinkoConfig.allowedRisks.forEach((risk) => {
        theoreticalRtp[`${r}_${risk}`] = Number(
          (calculateTheoreticalRtp(r, risk, runtimePlinkoConfig) * 100).toFixed(2)
        );
      });
    });

    res.status(200).json({
      success: true,
      data: {
        ...runtimePlinkoConfig,
        theoreticalRtp,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/plinko/history
 * Returns recent Plinko drops for the active session
 */
export const getPlinkoHistoryHandler = async (
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
        gameId: GAME_ID_PLINKO,
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
        rows: state.rows ?? 16,
        risk: state.risk ?? 'MEDIUM',
        slotIndex: state.slotIndex ?? 8,
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
 * POST /api/plinko/admin/config
 * Admin configuration update
 */
export const updatePlinkoConfigHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { minBet, maxBet, rtp, multiplierTables } = req.body;

    if (minBet !== undefined && (typeof minBet !== 'number' || minBet < 1)) {
      throw ApiError.badRequest('Invalid minBet value');
    }
    if (maxBet !== undefined && (typeof maxBet !== 'number' || maxBet <= (minBet || runtimePlinkoConfig.minBet))) {
      throw ApiError.badRequest('Invalid maxBet value');
    }

    runtimePlinkoConfig = {
      ...runtimePlinkoConfig,
      ...(minBet !== undefined ? { minBet } : {}),
      ...(maxBet !== undefined ? { maxBet } : {}),
      ...(rtp !== undefined ? { rtp } : {}),
      ...(multiplierTables !== undefined ? { multiplierTables } : {}),
    };

    res.status(200).json({
      success: true,
      message: 'Plinko configuration updated successfully',
      data: runtimePlinkoConfig,
    });
  } catch (error) {
    next(error);
  }
};
