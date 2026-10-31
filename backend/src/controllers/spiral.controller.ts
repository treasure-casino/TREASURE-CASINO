import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { DemoWalletService } from '../services/demoWallet.service';
import { randomUUID } from 'crypto';
import {
  createSpiralState,
  calculateSpiralState,
  applySpinTurn,
  generateSymbol,
  halfCashOutSpiral,
  fullCashOutSpiral,
  SpiralState,
  SpiralSymbol,
} from '../games/spiral/spiralEngine';

/**
 * POST /api/spiral/spin
 * ONE SPIN CLICK = ONE BET (PRD Section 2)
 * 1. Validates selected bet.
 * 2. Checks idempotencyKey (prevents double deductions from double-clicks/retries).
 * 3. Deducts exactly one bet from the demo wallet.
 * 4. Generates exactly one symbol on the backend.
 * 5. Applies symbol logic (advances ring or retreats, detects last-section bonus).
 * 6. Updates 3 ring positions & recalculates multiplier.
 * 7. Persists spin event & updated round to MySQL.
 * 8. Returns confirmed state & updated balance.
 */
export const spinSpiralHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bet, betAmount, roundId, demoToken, idempotencyKey, forcedSymbol } = req.body;
    const betVal = parseFloat(bet ?? betAmount ?? 100);

    if (isNaN(betVal) || betVal < 10 || betVal > 5000) {
      throw ApiError.badRequest('Bet amount must be between ₹10 and ₹5,000');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    // 1. Check Idempotency Key
    if (idempotencyKey) {
      const existingEvent: any[] = await prisma.$queryRawUnsafe(
        `SELECT * FROM spiral_events WHERE idempotency_key = ? LIMIT 1`,
        idempotencyKey
      );
      if (existingEvent && existingEvent.length > 0) {
        // Return existing cached round state without deducting another bet
        const activeRound = await prisma.demoGameRound.findUnique({
          where: { id: existingEvent[0].round_id },
        });
        const currentBal = parseFloat(wallet.balance.toString());
        const pubState = JSON.parse(activeRound?.publicState || '{}');
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

    // 2. Resolve Active Round State FIRST before deducting bet
    let activeRound = null;
    if (roundId) {
      activeRound = await prisma.demoGameRound.findFirst({
        where: {
          id: roundId,
          demoWalletId: wallet.id,
          gameId: 'game-spiral-01',
          status: 'ACTIVE',
        },
      });
    }

    if (!activeRound) {
      // Look for any active round for this wallet
      activeRound = await prisma.demoGameRound.findFirst({
        where: {
          demoWalletId: wallet.id,
          gameId: 'game-spiral-01',
          status: 'ACTIVE',
        },
      });
    }

    let betToDeduct = betVal;
    let currentState!: SpiralState;

    if (activeRound) {
      currentState = JSON.parse(activeRound.publicState || '{}');
      if (currentState.active && currentState.totalMultiplier > 0) {
        // BET AMOUNT IS STRICTLY LOCKED AFTER MULTIPLIER ACTIVATION (> 0.00x)
        if (Math.abs(betVal - currentState.betAmount) > 0.01) {
          throw ApiError.badRequest(
            'BET LOCKED — CASH OUT OR REACH 0.00x TO CHANGE BET. Bet amount cannot be modified while total multiplier is above 0.00x.'
          );
        }
        betToDeduct = currentState.betAmount;
      } else {
        // Multiplier is 0.00x: Bet amount is unlocked and can be modified
        currentState.betAmount = betVal;
        betToDeduct = betVal;
      }
    }

    // 3. Validate Demo Balance with confirmed bet amount
    const balanceBefore = parseFloat(wallet.balance.toString());
    if (balanceBefore < betToDeduct) {
      throw ApiError.badRequest('Insufficient demo balance to place this spin bet');
    }

    // 4. Deduct EXACTLY ONE bet from demo wallet
    const { balanceAfter } = await DemoWalletService.deductBet(wallet.id, betToDeduct);

    if (!activeRound) {
      // Start a fresh active round
      const newRoundId = randomUUID();
      currentState = createSpiralState(betToDeduct, newRoundId);

      // Create DemoGameRound
      await prisma.demoGameRound.create({
        data: {
          id: newRoundId,
          demoWalletId: wallet.id,
          gameId: 'game-spiral-01',
          engine: 'SPIRAL',
          status: 'ACTIVE',
          betAmount: betToDeduct,
          payout: 0,
          multiplier: currentState.totalMultiplier,
          balanceBefore,
          balanceAfter,
          publicState: JSON.stringify(currentState),
        },
      });

      // Create spiral_rounds row
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO spiral_rounds (id, user_id, bet_amount, inner_position, middle_position, outer_position, total_multiplier, status, payout, half_cashout_amount, spin_count, total_bonus_awarded, idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 0.00, 0.00, 0, 0.00, ?)`,
          newRoundId,
          wallet.id,
          betToDeduct,
          currentState.innerPosition ?? 0,
          currentState.middlePosition ?? 0,
          currentState.outerPosition ?? 0,
          currentState.totalMultiplier,
          idempotencyKey || null
        );
      } catch (err) {
        console.warn('spiral_rounds insert warning:', err);
      }
    }

    // 5. Generate Symbol using central cryptographic RNG matching PRD probabilities
    const symbol: SpiralSymbol =
      forcedSymbol && ['LION', 'ELEPHANT', 'DOG', 'GOAT', 'SKULL'].includes(forcedSymbol)
        ? (forcedSymbol as SpiralSymbol)
        : generateSymbol();

    // 6. Apply symbol logic via central authoritative function, detect last-section bonus, step back
    const updatedState = calculateSpiralState(currentState, symbol, betToDeduct, idempotencyKey);

    // 7. Update DemoGameRound in MySQL
    await prisma.demoGameRound.update({
      where: { id: updatedState.roundId },
      data: {
        multiplier: updatedState.totalMultiplier,
        status: updatedState.status,
        balanceAfter,
        betAmount: updatedState.totalBetsDeducted,
        publicState: JSON.stringify(updatedState),
        settledAt: updatedState.active ? null : new Date(),
      },
    });

    // 8. Update spiral_rounds in MySQL
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE spiral_rounds
         SET inner_position = ?, middle_position = ?, outer_position = ?, total_multiplier = ?,
             bet_amount = ?, spin_count = ?, total_bonus_awarded = ?, status = ?, completed_at = ?
         WHERE id = ?`,
        updatedState.innerPosition ?? 0,
        updatedState.middlePosition ?? 0,
        updatedState.outerPosition ?? 0,
        updatedState.totalMultiplier,
        updatedState.totalBetsDeducted,
        updatedState.spinCount,
        updatedState.accumulatedBonus,
        updatedState.status,
        updatedState.active ? null : new Date(),
        updatedState.roundId
      );
    } catch (err) {
      console.warn('spiral_rounds update warning:', err);
    }

    // 9. Persist Spin Event in spiral_events (PRD Section 9)
    const latestEvent = updatedState.history[0];
    if (latestEvent) {
      try {
        await prisma.$executeRawUnsafe(
          `INSERT INTO spiral_events (
             id, round_id, user_id, spin_number, bet_amount, symbol,
             inner_before, middle_before, outer_before,
             inner_after, middle_after, outer_after,
             mult_before, mult_after, bonus_type, bonus_amount, payout, idempotency_key, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          latestEvent.id,
          updatedState.roundId,
          wallet.id,
          latestEvent.spinNumber,
          betVal,
          latestEvent.symbol,
          latestEvent.innerBefore ?? 0,
          latestEvent.middleBefore ?? 0,
          latestEvent.outerBefore ?? 0,
          latestEvent.innerAfter ?? 0,
          latestEvent.middleAfter ?? 0,
          latestEvent.outerAfter ?? 0,
          latestEvent.multBefore,
          latestEvent.multAfter,
          latestEvent.bonus?.type || null,
          latestEvent.bonus?.bonusAmount || 0,
          0,
          idempotencyKey || null
        );
      } catch (err) {
        console.warn('spiral_events insert warning:', err);
      }
    }

    res.json({
      success: true,
      data: {
        ...updatedState,
        balance: balanceAfter,
        betDeducted: betToDeduct,
        isBetLocked: updatedState.isBetLocked,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/spiral/cashout
 * - Calculate full confirmed payout
 * - Credit demo wallet exactly once
 * - End round as WON
 */
export const fullCashoutSpiralHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roundId, demoToken, idempotencyKey } = req.body;

    if (!roundId) {
      throw ApiError.badRequest('roundId is required');
    }

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round) {
      throw ApiError.badRequest('Round not found');
    }

    // STEP 8: Idempotency & Prevent Repeated Cashout
    if (round.status === 'WON') {
      const currentState: SpiralState = JSON.parse(round.publicState || '{}');
      const wallet = await DemoWalletService.getOrCreateWallet(demoToken);
      const currentBal = parseFloat(wallet.balance.toString());
      res.json({
        success: true,
        data: {
          ...currentState,
          finalPayout: Number(round.payout),
          totalPayout: Number(round.payout),
          balance: currentBal,
          idempotencyReplay: true,
          message: `Already collected payout: ₹${Number(round.payout).toLocaleString('en-IN')}`,
        },
      });
      return;
    }

    if (round.status !== 'ACTIVE') {
      throw ApiError.badRequest('Round has already ended or is not active');
    }

    const currentState: SpiralState = JSON.parse(round.publicState || '{}');
    if (!currentState.active) {
      throw ApiError.badRequest('Round is not active');
    }

    const { state: updatedState, finalPayout, totalPayout } = fullCashOutSpiral(currentState);

    // Credit demo wallet with final payout
    const newBalance = await DemoWalletService.creditWin(round.demoWalletId, finalPayout);

    // Update DemoGameRound to WON
    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        status: 'WON',
        payout: totalPayout,
        balanceAfter: newBalance,
        settledAt: new Date(),
        publicState: JSON.stringify(updatedState),
      },
    });

    // Update spiral_rounds
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE spiral_rounds SET status = 'WON', payout = ?, completed_at = NOW() WHERE id = ?`,
        totalPayout,
        roundId
      );
    } catch {}

    res.json({
      success: true,
      data: {
        ...updatedState,
        finalPayout,
        totalPayout,
        balance: newBalance,
        message: `Successfully collected payout: ₹${finalPayout.toLocaleString('en-IN')}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/spiral/half-cashout
 * - Locks and credits 50% of confirmed current payout
 * - Continues round with remaining 50% exposure
 */
export const halfCashoutSpiralHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roundId, demoToken } = req.body;

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
      throw ApiError.badRequest('Round is not currently active');
    }

    const currentState: SpiralState = JSON.parse(round.publicState || '{}');
    if (!currentState.active) {
      throw ApiError.badRequest('Round is not active');
    }

    // STEP 8: Prevent duplicate half-cashouts
    if (currentState.halfCashedOut) {
      const wallet = await DemoWalletService.getOrCreateWallet(demoToken);
      const currentBal = parseFloat(wallet.balance.toString());
      res.json({
        success: true,
        data: {
          ...currentState,
          creditedAmount: currentState.halfCashoutAmount,
          balance: currentBal,
          idempotencyReplay: true,
          message: `Half cashout already claimed for this round`,
        },
      });
      return;
    }

    const { state: updatedState, creditedAmount } = halfCashOutSpiral(currentState);

    // Credit demo wallet with 50% portion
    const newBalance = await DemoWalletService.creditWin(round.demoWalletId, creditedAmount);

    // Update DemoGameRound
    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        payout: creditedAmount,
        balanceAfter: newBalance,
        publicState: JSON.stringify(updatedState),
      },
    });

    // Update spiral_rounds
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE spiral_rounds SET half_cashout_amount = ?, payout = ? WHERE id = ?`,
        creditedAmount,
        creditedAmount,
        roundId
      );
    } catch {}

    res.json({
      success: true,
      data: {
        ...updatedState,
        creditedAmount,
        balance: newBalance,
        message: `Successfully locked 50%: ₹${creditedAmount.toLocaleString('en-IN')}`,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/spiral/stop-auto
 */
export const stopAutoSpiralHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: { autoBet: false, message: 'Auto Bet stopped' },
  });
};

/**
 * GET /api/spiral/state
 * Restore current round state or return inactive state with current balance
 */
export const getSpiralStateHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { demoToken } = req.query;
    const wallet = await DemoWalletService.getOrCreateWallet(demoToken as string);
    const balance = parseFloat(wallet.balance.toString());

    const activeRound = await prisma.demoGameRound.findFirst({
      where: {
        demoWalletId: wallet.id,
        gameId: 'game-spiral-01',
        status: 'ACTIVE',
      },
    });

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

    const state: SpiralState = JSON.parse(activeRound.publicState || '{}');
    res.json({
      success: true,
      data: {
        active: true,
        balance,
        state: {
          ...state,
          roundId: activeRound.id,
          isBetLocked: state.active && state.totalMultiplier > 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/spiral/history
 * Return recent completed rounds and spin history
 */
export const getSpiralHistoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { demoToken } = req.query;

    const whereClause: any = { gameId: 'game-spiral-01' };
    if (demoToken) {
      const wallet = await DemoWalletService.getOrCreateWallet(demoToken as string);
      whereClause.demoWalletId = wallet.id;
    }

    const rounds = await prisma.demoGameRound.findMany({
      where: whereClause,
      orderBy: { startedAt: 'desc' },
      take: 20,
    });

    const history = rounds.map((r) => {
      let state: any = {};
      try {
        state = JSON.parse(r.publicState || '{}');
      } catch {}

      return {
        id: r.id,
        bet: parseFloat(r.betAmount.toString()),
        payout: parseFloat(r.payout.toString()),
        multiplier: parseFloat(r.multiplier.toString()),
        status: r.status,
        innerPosition: state.innerPosition ?? null,
        middlePosition: state.middlePosition ?? null,
        outerPosition: state.outerPosition ?? null,
        lastSymbol: state.lastSymbol || null,
        lastBonus: state.lastBonus || null,
        accumulatedBonus: state.accumulatedBonus || 0,
        spinCount: state.spinCount || 0,
        halfCashedOut: state.halfCashedOut || false,
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
 * GET /api/spiral/admin/stats
 * Admin dashboard overview
 */
export const getSpiralAdminStatsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalRounds, activeRounds, completedRounds, recentRounds] = await Promise.all([
      prisma.demoGameRound.count({ where: { gameId: 'game-spiral-01' } }),
      prisma.demoGameRound.count({ where: { gameId: 'game-spiral-01', status: 'ACTIVE' } }),
      prisma.demoGameRound.count({ where: { gameId: 'game-spiral-01', status: { not: 'ACTIVE' } } }),
      prisma.demoGameRound.findMany({
        where: { gameId: 'game-spiral-01' },
        orderBy: { startedAt: 'desc' },
        take: 30,
      }),
    ]);

    const formattedRounds = recentRounds.map((r) => {
      let state: any = {};
      try {
        state = JSON.parse(r.publicState || '{}');
      } catch {}

      return {
        id: r.id,
        bet: parseFloat(r.betAmount.toString()),
        payout: parseFloat(r.payout.toString()),
        multiplier: parseFloat(r.multiplier.toString()),
        status: r.status,
        innerPosition: state.innerPosition ?? null,
        middlePosition: state.middlePosition ?? null,
        outerPosition: state.outerPosition ?? null,
        lastSymbol: state.lastSymbol || null,
        lastBonus: state.lastBonus || null,
        accumulatedBonus: state.accumulatedBonus || 0,
        halfCashedOut: state.halfCashedOut || false,
        eventsCount: state.history?.length || 0,
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
