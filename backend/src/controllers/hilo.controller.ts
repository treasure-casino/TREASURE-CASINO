import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { DemoWalletService } from '../services/demoWallet.service';
import {
  createDeck,
  shuffleDeck,
  calculateNextMultipliers,
  evaluateHiloPrediction,
  validateHiloBet,
  validateHiloPredictionAction,
  DEFAULT_HILO_CONFIG,
  HiloConfig,
  HiloCard,
  HiloPrediction,
  NextCardMultipliers,
  RANKS,
  RANK_VALUES,
} from '../games/hilo/hiloEngine';

export const GAME_ID_HILO = 'game-hilo-01';

// Dynamic runtime configuration
let runtimeHiloConfig: HiloConfig = { ...DEFAULT_HILO_CONFIG };

/**
 * Ensures game-hilo-01 exists in database
 */
export async function ensureHiloGameRegistered(): Promise<void> {
  try {
    const existing = await prisma.game.findUnique({
      where: { id: GAME_ID_HILO },
    });

    if (!existing) {
      await prisma.game.create({
        data: {
          id: GAME_ID_HILO,
          name: 'Treasure Hilo',
          description:
            'Classic 2D casino card prediction game with Higher, Lower, Same bets, dynamic odds, streak multipliers, and instant cashout.',
          category: 'CASINO',
          providerId: 'prov-inhouse',
          providerCode: 'IN_HOUSE',
          integrationStatus: 'DEMO_ONLY',
          isActive: runtimeHiloConfig.isEnabled,
          isPopular: true,
          isDemo: true,
          volatility: 'MEDIUM',
          deviceSupport: 'ALL',
          rtp: 96.0,
          minBet: runtimeHiloConfig.minBet,
          maxBet: runtimeHiloConfig.maxBet,
        },
      });
      console.log('[HILO] Registered game-hilo-01 in database successfully.');
    }
  } catch (err: any) {
    console.warn('[HILO] Game registration notice:', err.message);
  }
}

export interface HiloStepHistory {
  card: HiloCard;
  prediction?: HiloPrediction;
  outcome?: 'START' | 'WIN' | 'LOSS' | 'PUSH';
  multiplierApplied?: number;
  accumulatedMultiplier?: number;
}

/**
 * Helper to build public state payload
 */
function buildPublicState(
  roundId: string,
  betAmount: number,
  status: 'ACTIVE' | 'WON' | 'LOST' | 'PUSH',
  currentCard: HiloCard,
  nextMultipliers: NextCardMultipliers,
  streak: number,
  accumulatedMultiplier: number,
  potentialPayout: number,
  revealedCard: HiloCard | null,
  stepOutcome: 'WIN' | 'LOSS' | 'PUSH' | null,
  message: string,
  history: HiloStepHistory[],
  balance: number
) {
  return {
    roundId,
    betAmount,
    status,
    currentCard,
    nextMultipliers,
    streak,
    accumulatedMultiplier,
    potentialPayout,
    revealedCard,
    stepOutcome,
    message,
    history,
    canHigher: nextMultipliers.higherMultiplier !== null && status === 'ACTIVE',
    canLower: nextMultipliers.lowerMultiplier !== null && status === 'ACTIVE',
    canSame: runtimeHiloConfig.allowSame && status === 'ACTIVE',
    canCollect: streak > 0 && status === 'ACTIVE',
    balance,
  };
}

/**
 * POST /api/hilo/start
 * Starts a new Hilo round with initial bet and deals first card
 */
export const startHiloHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bet, betAmount, demoToken, idempotencyKey, initialCard } = req.body;
    const betVal = parseFloat(bet ?? betAmount ?? 50);

    const validation = validateHiloBet(betVal, runtimeHiloConfig);
    if (!validation.isValid) {
      throw ApiError.badRequest(validation.error || 'Invalid bet amount');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    // Check for existing active round for this player
    const existingActive = await prisma.demoGameRound.findFirst({
      where: {
        demoWalletId: wallet.id,
        gameId: GAME_ID_HILO,
        status: 'ACTIVE',
      },
    });

    if (existingActive) {
      const pub = JSON.parse(existingActive.publicState || '{}');
      res.status(200).json({
        success: true,
        message: 'Resuming active Hilo round',
        data: buildPublicState(
          existingActive.id,
          Number(existingActive.betAmount),
          'ACTIVE',
          pub.currentCard,
          pub.nextMultipliers,
          pub.streak ?? 0,
          pub.accumulatedMultiplier ?? 1.0,
          pub.potentialPayout ?? Number(existingActive.betAmount),
          pub.revealedCard ?? null,
          pub.stepOutcome ?? null,
          'Active round in progress. Make your prediction or collect winnings.',
          pub.history || [],
          wallet.balance
        ),
      });
      return;
    }

    // Deduct bet from demo wallet
    const { balanceBefore, balanceAfter } = await DemoWalletService.deductBet(wallet.id, betVal);

    // Generate and shuffle deck
    const deck = shuffleDeck(createDeck());
    const startingCard: HiloCard = initialCard && initialCard.value
      ? initialCard
      : deck.shift()!;

    const nextMults = calculateNextMultipliers(startingCard, runtimeHiloConfig);

    const initialHistory: HiloStepHistory[] = [
      {
        card: startingCard,
        outcome: 'START',
        accumulatedMultiplier: 1.0,
      },
    ];

    const round = await prisma.demoGameRound.create({
      data: {
        demoWalletId: wallet.id,
        gameId: GAME_ID_HILO,
        engine: 'HILO',
        status: 'ACTIVE',
        betAmount: betVal,
        payout: 0,
        multiplier: 1.0,
        balanceBefore,
        balanceAfter,
        publicState: JSON.stringify({
          currentCard: startingCard,
          nextMultipliers: nextMults,
          streak: 0,
          accumulatedMultiplier: 1.0,
          potentialPayout: betVal,
          revealedCard: null,
          stepOutcome: null,
          history: initialHistory,
          idempotencyKey,
        }),
        secretState: JSON.stringify({
          remainingDeck: deck,
        }),
      },
    });

    res.status(200).json({
      success: true,
      data: buildPublicState(
        round.id,
        betVal,
        'ACTIVE',
        startingCard,
        nextMults,
        0,
        1.0,
        betVal,
        null,
        null,
        `Game started! Starting card is ${startingCard.rank}${startingCard.suit}. Predict HIGHER, LOWER, or SAME.`,
        initialHistory,
        balanceAfter
      ),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/hilo/predict
 * Player predicts whether next card is HIGHER, LOWER, or SAME
 */
export const predictHiloHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roundId, prediction, demoToken, forcedNextCard } = req.body;

    if (!roundId) {
      throw ApiError.badRequest('roundId is required');
    }
    if (!['HIGHER', 'LOWER', 'SAME'].includes(prediction)) {
      throw ApiError.badRequest('prediction must be HIGHER, LOWER, or SAME');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    const round = await prisma.demoGameRound.findFirst({
      where: {
        id: roundId,
        demoWalletId: wallet.id,
        gameId: GAME_ID_HILO,
        status: 'ACTIVE',
      },
    });

    if (!round) {
      throw ApiError.badRequest('No active Hilo round found with given ID');
    }

    const pub = JSON.parse(round.publicState || '{}');
    const sec = JSON.parse(round.secretState || '{}');

    const currentCard: HiloCard = pub.currentCard;
    const betVal = Number(round.betAmount);
    let streak = pub.streak ?? 0;
    let accumulatedMultiplier = pub.accumulatedMultiplier ?? 1.0;
    const history: HiloStepHistory[] = pub.history || [];

    // Validate prediction eligibility on current card
    const actionValidation = validateHiloPredictionAction(
      currentCard,
      prediction as HiloPrediction,
      runtimeHiloConfig
    );
    if (!actionValidation.isValid) {
      throw ApiError.badRequest(actionValidation.error || 'Invalid prediction for this card');
    }

    // Draw next card
    let remainingDeck: HiloCard[] = sec.remainingDeck || [];
    if (remainingDeck.length === 0) {
      remainingDeck = shuffleDeck(createDeck());
    }

    const nextCard: HiloCard = forcedNextCard && forcedNextCard.value
      ? forcedNextCard
      : remainingDeck.shift()!;

    // Evaluate prediction
    const evaluation = evaluateHiloPrediction(
      currentCard,
      nextCard,
      prediction as HiloPrediction,
      runtimeHiloConfig
    );

    let roundStatus: 'ACTIVE' | 'WON' | 'LOST' | 'PUSH' = 'ACTIVE';
    let newBalance = wallet.balance;
    let potentialPayout = 0;
    let finalPayout = 0;

    if (evaluation.outcome === 'WIN') {
      streak += 1;
      accumulatedMultiplier =
        Math.round(accumulatedMultiplier * evaluation.stepMultiplier * 10000) / 10000;
      potentialPayout = Math.round(betVal * accumulatedMultiplier * 100) / 100;

      history.push({
        card: nextCard,
        prediction: prediction as HiloPrediction,
        outcome: 'WIN',
        multiplierApplied: evaluation.stepMultiplier,
        accumulatedMultiplier,
      });

      // Check max streak auto-settlement
      if (streak >= runtimeHiloConfig.maxStreak) {
        roundStatus = 'WON';
        finalPayout = potentialPayout;
        newBalance = await DemoWalletService.creditWin(wallet.id, finalPayout);

        await prisma.demoGameRound.update({
          where: { id: round.id },
          data: {
            status: 'WON',
            multiplier: accumulatedMultiplier,
            payout: finalPayout,
            balanceAfter: newBalance,
            settledAt: new Date(),
            publicState: JSON.stringify({
              ...pub,
              currentCard: nextCard,
              revealedCard: nextCard,
              stepOutcome: 'WIN',
              streak,
              accumulatedMultiplier,
              potentialPayout,
              history,
            }),
          },
        });

        res.status(200).json({
          success: true,
          data: buildPublicState(
            round.id,
            betVal,
            'WON',
            nextCard,
            calculateNextMultipliers(nextCard, runtimeHiloConfig),
            streak,
            accumulatedMultiplier,
            potentialPayout,
            nextCard,
            'WIN',
            `🎉 Maximum streak reached! Automatically cashed out ₹${finalPayout.toFixed(2)} (${accumulatedMultiplier.toFixed(2)}x)!`,
            history,
            newBalance
          ),
        });
        return;
      }
    } else if (evaluation.outcome === 'PUSH') {
      // PUSH: streak and accumulatedMultiplier preserved
      potentialPayout = Math.round(betVal * accumulatedMultiplier * 100) / 100;

      history.push({
        card: nextCard,
        prediction: prediction as HiloPrediction,
        outcome: 'PUSH',
        multiplierApplied: 1.0,
        accumulatedMultiplier,
      });
    } else {
      // LOSS
      roundStatus = 'LOST';
      accumulatedMultiplier = 0;
      potentialPayout = 0;
      finalPayout = 0;

      history.push({
        card: nextCard,
        prediction: prediction as HiloPrediction,
        outcome: 'LOSS',
        multiplierApplied: 0,
        accumulatedMultiplier: 0,
      });

      await prisma.demoGameRound.update({
        where: { id: round.id },
        data: {
          status: 'LOST',
          multiplier: 0,
          payout: 0,
          settledAt: new Date(),
          publicState: JSON.stringify({
            ...pub,
            currentCard: nextCard,
            revealedCard: nextCard,
            stepOutcome: 'LOSS',
            streak,
            accumulatedMultiplier: 0,
            potentialPayout: 0,
            history,
          }),
        },
      });

      res.status(200).json({
        success: true,
        data: buildPublicState(
          round.id,
          betVal,
          'LOST',
          nextCard,
          calculateNextMultipliers(nextCard, runtimeHiloConfig),
          streak,
          0,
          0,
          nextCard,
          'LOSS',
          evaluation.message,
          history,
          newBalance
        ),
      });
      return;
    }

    // Active continuing state (WIN or PUSH)
    const nextMultipliers = calculateNextMultipliers(nextCard, runtimeHiloConfig);

    await prisma.demoGameRound.update({
      where: { id: round.id },
      data: {
        multiplier: accumulatedMultiplier,
        payout: potentialPayout,
        publicState: JSON.stringify({
          ...pub,
          currentCard: nextCard,
          revealedCard: nextCard,
          stepOutcome: evaluation.outcome,
          streak,
          accumulatedMultiplier,
          potentialPayout,
          nextMultipliers,
          history,
        }),
        secretState: JSON.stringify({
          remainingDeck,
        }),
      },
    });

    res.status(200).json({
      success: true,
      data: buildPublicState(
        round.id,
        betVal,
        'ACTIVE',
        nextCard,
        nextMultipliers,
        streak,
        accumulatedMultiplier,
        potentialPayout,
        nextCard,
        evaluation.outcome,
        evaluation.message,
        history,
        newBalance
      ),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/hilo/collect
 * Player cashes out current accumulated winnings
 */
export const collectHiloHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roundId, demoToken } = req.body;

    if (!roundId) {
      throw ApiError.badRequest('roundId is required to collect');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    const round = await prisma.demoGameRound.findFirst({
      where: {
        id: roundId,
        demoWalletId: wallet.id,
        gameId: GAME_ID_HILO,
        status: 'ACTIVE',
      },
    });

    if (!round) {
      throw ApiError.badRequest('No active Hilo round found to collect');
    }

    const pub = JSON.parse(round.publicState || '{}');
    const betVal = Number(round.betAmount);
    const accumulatedMultiplier = pub.accumulatedMultiplier ?? 1.0;
    const streak = pub.streak ?? 0;

    // Minimum requirement: streak >= 1 or payout > 0
    const payout = Math.round(betVal * accumulatedMultiplier * 100) / 100;

    // Credit winnings to wallet
    const newBalance = await DemoWalletService.creditWin(wallet.id, payout);

    const history: HiloStepHistory[] = pub.history || [];
    history.push({
      card: pub.currentCard,
      outcome: 'WIN',
      accumulatedMultiplier,
    });

    await prisma.demoGameRound.update({
      where: { id: round.id },
      data: {
        status: 'WON',
        multiplier: accumulatedMultiplier,
        payout,
        balanceAfter: newBalance,
        settledAt: new Date(),
        publicState: JSON.stringify({
          ...pub,
          status: 'WON',
          history,
        }),
      },
    });

    res.status(200).json({
      success: true,
      message: `Successfully collected ₹${payout.toFixed(2)} (${accumulatedMultiplier.toFixed(2)}x)!`,
      data: {
        roundId: round.id,
        status: 'WON',
        betAmount: betVal,
        payout,
        multiplier: accumulatedMultiplier,
        streak,
        balance: newBalance,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hilo/config
 * Retrieves Hilo game limits, rules, and rank multiplier tables
 */
export const getHiloConfigHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Generate precomputed multiplier table for all 13 card ranks
    const rankMultipliersTable: Record<string, NextCardMultipliers> = {};
    for (const rank of RANKS) {
      const dummyCard: HiloCard = {
        suit: '♠',
        rank,
        value: RANK_VALUES[rank],
        code: `${rank}♠`,
      };
      rankMultipliersTable[rank] = calculateNextMultipliers(dummyCard, runtimeHiloConfig);
    }

    res.status(200).json({
      success: true,
      data: {
        config: runtimeHiloConfig,
        rankMultipliersTable,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/hilo/history
 * Returns recent Hilo rounds for player
 */
export const getHiloHistoryHandler = async (
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
        gameId: GAME_ID_HILO,
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
        streak: state.streak || 0,
        currentCard: state.currentCard,
        history: state.history || [],
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
 * GET /api/hilo/admin/stats
 * Admin dashboard telemetry & recent rounds
 */
export const getHiloAdminStatsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [totalRounds, recentRounds] = await Promise.all([
      prisma.demoGameRound.count({
        where: { gameId: GAME_ID_HILO },
      }),
      prisma.demoGameRound.findMany({
        where: { gameId: GAME_ID_HILO },
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
        config: runtimeHiloConfig,
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
 * POST /api/hilo/admin/config
 * Updates Hilo runtime configuration
 */
export const updateHiloConfigHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { isEnabled, minBet, maxBet, allowSame, baseRtp, maxStreak } = req.body;

    runtimeHiloConfig = {
      ...runtimeHiloConfig,
      ...(isEnabled !== undefined ? { isEnabled: Boolean(isEnabled) } : {}),
      ...(minBet !== undefined ? { minBet: Number(minBet) } : {}),
      ...(maxBet !== undefined ? { maxBet: Number(maxBet) } : {}),
      ...(allowSame !== undefined ? { allowSame: Boolean(allowSame) } : {}),
      ...(baseRtp !== undefined ? { baseRtp: Number(baseRtp) } : {}),
      ...(maxStreak !== undefined ? { maxStreak: Number(maxStreak) } : {}),
    };

    if (isEnabled !== undefined) {
      await prisma.game.updateMany({
        where: { id: GAME_ID_HILO },
        data: { isActive: Boolean(isEnabled) },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Hilo configuration updated successfully',
      data: runtimeHiloConfig,
    });
  } catch (error) {
    next(error);
  }
};
