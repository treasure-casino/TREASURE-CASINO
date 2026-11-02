import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { DemoWalletService } from '../services/demoWallet.service';
import {
  createShoe,
  shuffleDeck,
  evaluateHand,
  playDealerTurn,
  determineGameResult,
  calculateInsuranceBet,
  calculateInsurancePayout,
  Card,
  BlackjackConfig,
  DEFAULT_BLACKJACK_CONFIG,
  BlackjackResult,
  InsuranceResult,
} from '../games/blackjack/blackjackEngine';

export const GAME_ID_BLACKJACK = 'game-blackjack-01';

// Dynamic runtime configuration
let runtimeBlackjackConfig: BlackjackConfig = { ...DEFAULT_BLACKJACK_CONFIG };

/**
 * Ensures game-blackjack-01 exists in database
 */
export async function ensureBlackjackGameRegistered(): Promise<void> {
  try {
    const existing = await prisma.game.findUnique({
      where: { id: GAME_ID_BLACKJACK },
    });

    if (!existing) {
      await prisma.game.create({
        data: {
          id: GAME_ID_BLACKJACK,
          name: 'Treasure Blackjack',
          description:
            'Authentic 2D casino Blackjack (21). Classic table rules, 3:2 Natural Blackjack payout, Insurance (2:1), Double Down, and Dealer stands on 17.',
          category: 'TABLE_CARD',
          providerId: 'prov-inhouse',
          providerCode: 'IN_HOUSE',
          integrationStatus: 'DEMO_ONLY',
          isActive: true,
          isPopular: true,
          isDemo: true,
          volatility: 'LOW',
          deviceSupport: 'ALL',
          rtp: 99.5,
          minBet: runtimeBlackjackConfig.minBet,
          maxBet: runtimeBlackjackConfig.maxBet,
        },
      });
      console.log('[BLACKJACK] Game registered successfully in database (game-blackjack-01)');
    }
  } catch (err: any) {
    console.warn('[BLACKJACK] Game registration notice:', err.message);
  }
}

interface InsuranceStateInfo {
  insuranceOffered?: boolean;
  insuranceBetAmount?: number;
  insuranceDecided?: boolean;
  insurancePurchased?: boolean;
  insuranceBet?: number;
  insurancePayout?: number;
  insuranceResult?: InsuranceResult;
}

/**
 * Formats public state for client response (dealer hidden card masked)
 */
function sanitizePublicState(
  roundId: string,
  betAmount: number,
  playerCards: Card[],
  dealerCards: Card[],
  isSettled: boolean,
  result: BlackjackResult,
  message: string,
  payout: number,
  multiplier: number,
  balanceAfter: number,
  insuranceInfo?: InsuranceStateInfo
) {
  const playerEval = evaluateHand(playerCards);
  const dealerEval = evaluateHand(dealerCards);

  // If active, dealer only displays first card
  const visibleDealerCards = isSettled
    ? dealerCards
    : [dealerCards[0], { suit: '♠' as const, rank: '?' as any, value: 0, isAce: false, code: 'HIDDEN' }];

  const visibleDealerScore = isSettled
    ? dealerEval.score
    : dealerCards[0].isAce ? 11 : dealerCards[0].value;

  const insuranceOffered = insuranceInfo?.insuranceOffered ?? false;
  const insuranceDecided = insuranceInfo?.insuranceDecided ?? false;
  const isWaitingForInsurance = !isSettled && insuranceOffered && !insuranceDecided;

  return {
    roundId,
    betAmount,
    status: isSettled ? 'SETTLED' : 'ACTIVE',
    result,
    message,
    playerCards,
    playerScore: playerEval.score,
    isPlayerSoft: playerEval.isSoft,
    isPlayerBlackjack: playerEval.isBlackjack,
    dealerCards: visibleDealerCards,
    dealerScore: visibleDealerScore,
    isDealerBlackjack: isSettled ? dealerEval.isBlackjack : false,
    canHit: !isSettled && !isWaitingForInsurance && playerEval.score < 21,
    canStand: !isSettled && !isWaitingForInsurance,
    canDoubleDown: !isSettled && !isWaitingForInsurance && playerCards.length === 2,
    payout,
    multiplier,
    balance: balanceAfter,
    // Insurance Fields
    insuranceOffered,
    insuranceBetAmount: insuranceInfo?.insuranceBetAmount ?? 0,
    insuranceDecided,
    insurancePurchased: insuranceInfo?.insurancePurchased ?? false,
    insuranceBet: insuranceInfo?.insuranceBet ?? 0,
    insurancePayout: insuranceInfo?.insurancePayout ?? 0,
    insuranceResult: insuranceInfo?.insuranceResult ?? 'NONE',
  };
}

/**
 * POST /api/blackjack/deal
 * Starts a new round of Blackjack. Deals 2 cards to player and 2 cards to dealer.
 * Offers Insurance if dealer's upcard is an Ace!
 */
export const dealBlackjackHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { bet, betAmount, demoToken, idempotencyKey } = req.body;
    const betVal = parseFloat(bet ?? betAmount ?? 100);

    if (isNaN(betVal) || betVal < runtimeBlackjackConfig.minBet || betVal > runtimeBlackjackConfig.maxBet) {
      throw ApiError.badRequest(
        `Bet must be between ₹${runtimeBlackjackConfig.minBet} and ₹${runtimeBlackjackConfig.maxBet}`
      );
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    // Check if player already has an active blackjack round
    const activeRound = await prisma.demoGameRound.findFirst({
      where: {
        demoWalletId: wallet.id,
        gameId: GAME_ID_BLACKJACK,
        status: 'ACTIVE',
      },
    });

    if (activeRound) {
      // Resume existing active round
      const pub = JSON.parse(activeRound.publicState || '{}');
      const sec = JSON.parse(activeRound.secretState || '{}');
      const responseData = sanitizePublicState(
        activeRound.id,
        parseFloat(activeRound.betAmount.toString()),
        pub.playerCards || [],
        sec.dealerCards || [],
        false,
        'IN_PLAY',
        pub.insuranceOffered && !pub.insuranceDecided
          ? 'Dealer shows an Ace! Choose BUY INSURANCE or NO INSURANCE.'
          : 'Resuming active hand. Choose your action.',
        0,
        0,
        wallet.balance,
        {
          insuranceOffered: pub.insuranceOffered,
          insuranceBetAmount: pub.insuranceBetAmount,
          insuranceDecided: pub.insuranceDecided,
          insurancePurchased: pub.insurancePurchased,
          insuranceBet: pub.insuranceBet,
          insurancePayout: pub.insurancePayout,
          insuranceResult: pub.insuranceResult,
        }
      );
      res.json({ success: true, data: responseData });
      return;
    }

    // Deduct main bet from demo wallet
    const { balanceBefore, balanceAfter } = await DemoWalletService.deductBet(wallet.id, betVal);

    // Shuffle fresh shoe
    const shoe = shuffleDeck(createShoe(runtimeBlackjackConfig.decksCount));

    // Deal: Player 1, Dealer 1, Player 2, Dealer 2
    const playerCards: Card[] = [shoe.shift()!, shoe.shift()!];
    const dealerCards: Card[] = [shoe.shift()!, shoe.shift()!];

    const playerEval = evaluateHand(playerCards);
    const dealerEval = evaluateHand(dealerCards);

    const dealerUpcardIsAce = dealerCards[0].isAce;
    const insuranceBetAmount = calculateInsuranceBet(betVal);

    let isSettled = false;
    let result: BlackjackResult = 'IN_PLAY';
    let payout = 0;
    let multiplier = 0;
    let message = 'Your turn! Choose HIT, STAND, or DOUBLE DOWN.';
    let currentBalance = balanceAfter;

    let insuranceOffered = false;
    let insuranceDecided = false;

    if (dealerUpcardIsAce) {
      // Rule 1: Dealer upcard is an Ace -> Offer Insurance!
      insuranceOffered = true;
      insuranceDecided = false;
      message = `Dealer shows an Ace! Insurance is offered for ₹${insuranceBetAmount.toFixed(2)} (pays 2:1).`;
    } else {
      // If dealer upcard is NOT an Ace, resolve immediate Natural Blackjacks
      if (playerEval.isBlackjack || dealerEval.isBlackjack) {
        isSettled = true;
        const gameOutcome = determineGameResult(playerEval, dealerEval, runtimeBlackjackConfig);
        result = gameOutcome.result;
        multiplier = gameOutcome.payoutMultiplier;
        payout = +(betVal * multiplier).toFixed(2);
        message = gameOutcome.message;

        if (payout > 0) {
          currentBalance = await DemoWalletService.creditWin(wallet.id, payout);
        }
      }
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const commitment = crypto
      .createHash('sha256')
      .update(`${salt}:${JSON.stringify(dealerCards)}`)
      .digest('hex');

    const createdRound = await prisma.demoGameRound.create({
      data: {
        demoWalletId: wallet.id,
        gameId: GAME_ID_BLACKJACK,
        engine: 'BLACKJACK',
        status: isSettled ? 'SETTLED' : 'ACTIVE',
        betAmount: betVal,
        payout,
        multiplier,
        balanceBefore,
        balanceAfter: currentBalance,
        publicState: JSON.stringify({
          playerCards,
          dealerUpcard: dealerCards[0],
          idempotencyKey,
          insuranceOffered,
          insuranceBetAmount,
          insuranceDecided,
          insurancePurchased: false,
          insuranceBet: 0,
          insurancePayout: 0,
          insuranceResult: 'NONE',
        }),
        secretState: JSON.stringify({
          dealerCards,
          remainingDeck: shoe,
          salt,
        }),
        commitment,
        settledAt: isSettled ? new Date() : null,
      },
    });

    const responseData = sanitizePublicState(
      createdRound.id,
      betVal,
      playerCards,
      dealerCards,
      isSettled,
      result,
      message,
      payout,
      multiplier,
      currentBalance,
      {
        insuranceOffered,
        insuranceBetAmount,
        insuranceDecided,
        insurancePurchased: false,
        insuranceBet: 0,
        insurancePayout: 0,
        insuranceResult: 'NONE',
      }
    );

    res.json({
      success: true,
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/blackjack/insurance
 * Resolves player decision for Insurance (BUY INSURANCE or NO INSURANCE).
 */
export const insuranceBlackjackHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { roundId, buyInsurance, demoToken } = req.body;
    if (!roundId) {
      throw ApiError.badRequest('roundId is required');
    }

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.demoWalletId !== wallet.id || round.status !== 'ACTIVE') {
      throw ApiError.badRequest('No active Blackjack round found with this ID');
    }

    const pub = JSON.parse(round.publicState || '{}');
    const sec = JSON.parse(round.secretState || '{}');

    if (!pub.insuranceOffered) {
      throw ApiError.badRequest('Insurance is not offered for this round (Dealer upcard is not an Ace)');
    }

    if (pub.insuranceDecided) {
      throw ApiError.badRequest('Insurance decision has already been recorded for this round');
    }

    const playerCards: Card[] = pub.playerCards || [];
    const dealerCards: Card[] = sec.dealerCards || [];
    const remainingDeck: Card[] = sec.remainingDeck || [];

    const betVal = parseFloat(round.betAmount.toString());
    const insuranceBetAmount = calculateInsuranceBet(betVal);

    let currentBalance = wallet.balance;
    let insurancePurchased = false;
    let insuranceBet = 0;
    let insurancePayout = 0;
    let insuranceResult: InsuranceResult = 'DECLINED';

    // 1. Process Insurance Purchase
    if (buyInsurance === true) {
      if (currentBalance < insuranceBetAmount) {
        throw ApiError.badRequest(
          `Insufficient demo balance for Insurance (Available: ₹${currentBalance.toFixed(2)}, Required: ₹${insuranceBetAmount.toFixed(2)})`
        );
      }

      // Atomically deduct insurance bet
      const deduction = await DemoWalletService.deductBet(wallet.id, insuranceBetAmount);
      currentBalance = deduction.balanceAfter;
      insurancePurchased = true;
      insuranceBet = insuranceBetAmount;
    }

    const playerEval = evaluateHand(playerCards);
    const dealerEval = evaluateHand(dealerCards);

    let isSettled = false;
    let result: BlackjackResult = 'IN_PLAY';
    let mainPayout = 0;
    let multiplier = 0;
    let message = '';

    // 2. Check if Dealer has Blackjack
    if (dealerEval.isBlackjack) {
      // Dealer has Blackjack!
      isSettled = true;

      if (insurancePurchased) {
        // Insurance pays 2:1 profit (3x insurance stake returned)
        insurancePayout = calculateInsurancePayout(insuranceBet);
        insuranceResult = 'WON';
        currentBalance = await DemoWalletService.creditWin(wallet.id, insurancePayout);
      }

      if (playerEval.isBlackjack) {
        // Both have Blackjack: Push on main hand
        result = 'PUSH';
        multiplier = 1.0;
        mainPayout = +(betVal * multiplier).toFixed(2);
        currentBalance = await DemoWalletService.creditWin(wallet.id, mainPayout);

        message = insurancePurchased
          ? `Dealer has Blackjack! Insurance won +₹${(insurancePayout - insuranceBet).toFixed(2)} (2:1). Main hand pushed.`
          : 'Both player and dealer have Blackjack! Push (Main bet returned).';
      } else {
        // Main hand loses to Dealer Blackjack
        result = 'DEALER_BLACKJACK';
        multiplier = 0;
        mainPayout = 0;

        message = insurancePurchased
          ? `Dealer has Blackjack! Insurance won +₹${(insurancePayout - insuranceBet).toFixed(2)} (2:1). Main bet lost.`
          : 'Dealer has Blackjack. Dealer wins.';
      }
    } else {
      // Dealer DOES NOT have Blackjack
      if (insurancePurchased) {
        insurancePayout = 0;
        insuranceResult = 'LOST';
      }

      if (playerEval.isBlackjack) {
        // Player has Natural Blackjack and Dealer does not
        isSettled = true;
        result = 'PLAYER_BLACKJACK';
        multiplier = runtimeBlackjackConfig.blackjackPayoutMultiplier;
        mainPayout = +(betVal * multiplier).toFixed(2);
        currentBalance = await DemoWalletService.creditWin(wallet.id, mainPayout);

        message = insurancePurchased
          ? `Dealer has no Blackjack (Insurance lost -₹${insuranceBet.toFixed(2)}). You have Natural Blackjack (3:2) +₹${(mainPayout - betVal).toFixed(2)}!`
          : 'Blackjack! Natural 21 pays 3:2!';
      } else {
        // Game continues!
        isSettled = false;
        result = 'IN_PLAY';
        message = insurancePurchased
          ? `Dealer has no Blackjack. Insurance of ₹${insuranceBet.toFixed(2)} lost. Your turn: HIT, STAND, or DOUBLE DOWN.`
          : 'Insurance declined. Dealer has no Blackjack. Your turn: HIT, STAND, or DOUBLE DOWN.';
      }
    }

    const totalPayout = +(mainPayout + insurancePayout).toFixed(2);

    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        status: isSettled ? 'SETTLED' : 'ACTIVE',
        payout: totalPayout,
        multiplier,
        balanceAfter: currentBalance,
        publicState: JSON.stringify({
          ...pub,
          insuranceOffered: true,
          insuranceDecided: true,
          insurancePurchased,
          insuranceBet,
          insurancePayout,
          insuranceResult,
        }),
        settledAt: isSettled ? new Date() : null,
      },
    });

    const responseData = sanitizePublicState(
      roundId,
      betVal,
      playerCards,
      dealerCards,
      isSettled,
      result,
      message,
      totalPayout,
      multiplier,
      currentBalance,
      {
        insuranceOffered: true,
        insuranceBetAmount,
        insuranceDecided: true,
        insurancePurchased,
        insuranceBet,
        insurancePayout,
        insuranceResult,
      }
    );

    res.json({
      success: true,
      data: responseData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/blackjack/hit
 * Draws one card for the player.
 */
export const hitBlackjackHandler = async (
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

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.demoWalletId !== wallet.id || round.status !== 'ACTIVE') {
      throw ApiError.badRequest('No active Blackjack round found with this ID');
    }

    const pub = JSON.parse(round.publicState || '{}');
    const sec = JSON.parse(round.secretState || '{}');

    // Rule 4: Must decide on insurance first
    if (pub.insuranceOffered && !pub.insuranceDecided) {
      throw ApiError.badRequest('Please decide on Insurance before taking an action');
    }

    const playerCards: Card[] = pub.playerCards || [];
    const dealerCards: Card[] = sec.dealerCards || [];
    const remainingDeck: Card[] = sec.remainingDeck || [];

    if (remainingDeck.length === 0) {
      throw ApiError.internal('Deck is empty');
    }

    // Draw card for player
    const drawnCard = remainingDeck.shift()!;
    playerCards.push(drawnCard);

    const playerEval = evaluateHand(playerCards);
    const betVal = parseFloat(round.betAmount.toString());

    let isSettled = false;
    let result: BlackjackResult = 'IN_PLAY';
    let payout = 0;
    let multiplier = 0;
    let message = `You hit ${drawnCard.rank}${drawnCard.suit}. Total: ${playerEval.score}.`;
    let currentBalance = wallet.balance;

    if (playerEval.isBusted) {
      // Player busts immediately
      isSettled = true;
      result = 'PLAYER_BUST';
      multiplier = 0;
      payout = 0;
      message = `Bust! You drew ${drawnCard.rank}${drawnCard.suit} and exceeded 21 (${playerEval.score}). Dealer wins.`;
    } else if (playerEval.score === 21) {
      // Player hit 21 -> Automatically proceed to Dealer turn
      isSettled = true;
      const { dealerCards: finalDealerCards } = playDealerTurn(
        dealerCards,
        remainingDeck,
        runtimeBlackjackConfig.dealerStandsOnSoft17
      );
      dealerCards.splice(0, dealerCards.length, ...finalDealerCards);
      const finalDealerEval = evaluateHand(dealerCards);

      const gameOutcome = determineGameResult(playerEval, finalDealerEval, runtimeBlackjackConfig);
      result = gameOutcome.result;
      multiplier = gameOutcome.payoutMultiplier;
      payout = +(betVal * multiplier).toFixed(2);
      message = `21! ${gameOutcome.message}`;

      if (payout > 0) {
        currentBalance = await DemoWalletService.creditWin(wallet.id, payout);
      }
    }

    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        status: isSettled ? 'SETTLED' : 'ACTIVE',
        payout,
        multiplier,
        balanceAfter: currentBalance,
        publicState: JSON.stringify({ ...pub, playerCards }),
        secretState: JSON.stringify({ ...sec, dealerCards, remainingDeck }),
        settledAt: isSettled ? new Date() : null,
      },
    });

    const responseData = sanitizePublicState(
      roundId,
      betVal,
      playerCards,
      dealerCards,
      isSettled,
      result,
      message,
      payout,
      multiplier,
      currentBalance,
      pub
    );

    res.json({ success: true, data: responseData });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/blackjack/stand
 * Player stands. Dealer reveals hidden card and draws until >= 17.
 */
export const standBlackjackHandler = async (
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

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.demoWalletId !== wallet.id || round.status !== 'ACTIVE') {
      throw ApiError.badRequest('No active Blackjack round found with this ID');
    }

    const pub = JSON.parse(round.publicState || '{}');
    const sec = JSON.parse(round.secretState || '{}');

    // Rule 4: Must decide on insurance first
    if (pub.insuranceOffered && !pub.insuranceDecided) {
      throw ApiError.badRequest('Please decide on Insurance before taking an action');
    }

    const playerCards: Card[] = pub.playerCards || [];
    const initialDealerCards: Card[] = sec.dealerCards || [];
    const remainingDeck: Card[] = sec.remainingDeck || [];

    const betVal = parseFloat(round.betAmount.toString());

    // Dealer turn
    const { dealerCards: finalDealerCards } = playDealerTurn(
      initialDealerCards,
      remainingDeck,
      runtimeBlackjackConfig.dealerStandsOnSoft17
    );

    const playerEval = evaluateHand(playerCards);
    const dealerEval = evaluateHand(finalDealerCards);

    const gameOutcome = determineGameResult(playerEval, dealerEval, runtimeBlackjackConfig);
    const result = gameOutcome.result;
    const multiplier = gameOutcome.payoutMultiplier;
    const payout = +(betVal * multiplier).toFixed(2);
    const message = gameOutcome.message;

    let currentBalance = wallet.balance;
    if (payout > 0) {
      currentBalance = await DemoWalletService.creditWin(wallet.id, payout);
    }

    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        status: 'SETTLED',
        payout,
        multiplier,
        balanceAfter: currentBalance,
        publicState: JSON.stringify({ ...pub, playerCards }),
        secretState: JSON.stringify({ ...sec, dealerCards: finalDealerCards, remainingDeck }),
        settledAt: new Date(),
      },
    });

    const responseData = sanitizePublicState(
      roundId,
      betVal,
      playerCards,
      finalDealerCards,
      true,
      result,
      message,
      payout,
      multiplier,
      currentBalance,
      pub
    );

    res.json({ success: true, data: responseData });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/blackjack/double
 * Doubles bet, draws exactly one card for player, then proceeds to dealer turn.
 */
export const doubleDownBlackjackHandler = async (
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

    const round = await prisma.demoGameRound.findUnique({
      where: { id: roundId },
    });

    if (!round || round.demoWalletId !== wallet.id || round.status !== 'ACTIVE') {
      throw ApiError.badRequest('No active Blackjack round found with this ID');
    }

    const pub = JSON.parse(round.publicState || '{}');
    const sec = JSON.parse(round.secretState || '{}');

    // Rule 4: Must decide on insurance first
    if (pub.insuranceOffered && !pub.insuranceDecided) {
      throw ApiError.badRequest('Please decide on Insurance before taking an action');
    }

    const playerCards: Card[] = pub.playerCards || [];
    if (playerCards.length !== 2) {
      throw ApiError.badRequest('Double Down is only permitted on your initial 2 cards');
    }

    const initialDealerCards: Card[] = sec.dealerCards || [];
    const remainingDeck: Card[] = sec.remainingDeck || [];

    const originalBet = parseFloat(round.betAmount.toString());

    // Deduct additional bet equal to original bet
    const { balanceAfter } = await DemoWalletService.deductBet(wallet.id, originalBet);
    const totalBet = +(originalBet * 2).toFixed(2);

    // Draw exactly one card for player
    const drawnCard = remainingDeck.shift()!;
    playerCards.push(drawnCard);

    const playerEval = evaluateHand(playerCards);

    let isSettled = true;
    let result: BlackjackResult = 'IN_PLAY';
    let payout = 0;
    let multiplier = 0;
    let message = '';
    let finalDealerCards = initialDealerCards;
    let currentBalance = balanceAfter;

    if (playerEval.isBusted) {
      // Player busted on double down
      result = 'PLAYER_BUST';
      multiplier = 0;
      payout = 0;
      message = `Bust on Double Down! You drew ${drawnCard.rank}${drawnCard.suit} (Total: ${playerEval.score}). Dealer wins.`;
    } else {
      // Dealer plays turn
      const dealerResult = playDealerTurn(
        initialDealerCards,
        remainingDeck,
        runtimeBlackjackConfig.dealerStandsOnSoft17
      );
      finalDealerCards = dealerResult.dealerCards;
      const dealerEval = evaluateHand(finalDealerCards);

      const gameOutcome = determineGameResult(playerEval, dealerEval, runtimeBlackjackConfig);
      result = gameOutcome.result;
      multiplier = gameOutcome.payoutMultiplier;
      payout = +(totalBet * multiplier).toFixed(2);
      message = `Double Down! ${gameOutcome.message}`;

      if (payout > 0) {
        currentBalance = await DemoWalletService.creditWin(wallet.id, payout);
      }
    }

    await prisma.demoGameRound.update({
      where: { id: roundId },
      data: {
        betAmount: totalBet,
        status: 'SETTLED',
        payout,
        multiplier,
        balanceAfter: currentBalance,
        publicState: JSON.stringify({ ...pub, playerCards, doubled: true }),
        secretState: JSON.stringify({ ...sec, dealerCards: finalDealerCards, remainingDeck }),
        settledAt: new Date(),
      },
    });

    const responseData = sanitizePublicState(
      roundId,
      totalBet,
      playerCards,
      finalDealerCards,
      true,
      result,
      message,
      payout,
      multiplier,
      currentBalance,
      pub
    );

    res.json({ success: true, data: responseData });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/blackjack/state
 * Retrieves any currently active round for this demo token
 */
export const getBlackjackStateHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const demoToken = (req.query.demoToken as string) || (req.headers['x-demo-token'] as string);
    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    const activeRound = await prisma.demoGameRound.findFirst({
      where: {
        demoWalletId: wallet.id,
        gameId: GAME_ID_BLACKJACK,
        status: 'ACTIVE',
      },
    });

    if (!activeRound) {
      res.json({
        success: true,
        data: {
          hasActiveRound: false,
          balance: wallet.balance,
        },
      });
      return;
    }

    const pub = JSON.parse(activeRound.publicState || '{}');
    const sec = JSON.parse(activeRound.secretState || '{}');
    const responseData = sanitizePublicState(
      activeRound.id,
      parseFloat(activeRound.betAmount.toString()),
      pub.playerCards || [],
      sec.dealerCards || [],
      false,
      'IN_PLAY',
      pub.insuranceOffered && !pub.insuranceDecided
        ? 'Dealer shows an Ace! Choose BUY INSURANCE or NO INSURANCE.'
        : 'Active round found',
      0,
      0,
      wallet.balance,
      {
        insuranceOffered: pub.insuranceOffered,
        insuranceBetAmount: pub.insuranceBetAmount,
        insuranceDecided: pub.insuranceDecided,
        insurancePurchased: pub.insurancePurchased,
        insuranceBet: pub.insuranceBet,
        insurancePayout: pub.insurancePayout,
        insuranceResult: pub.insuranceResult,
      }
    );

    res.json({
      success: true,
      data: {
        hasActiveRound: true,
        ...responseData,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/blackjack/history
 * Returns recent rounds
 */
export const getBlackjackHistoryHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const demoToken = (req.query.demoToken as string) || (req.headers['x-demo-token'] as string);
    const limit = Math.min(parseInt((req.query.limit as string) || '15', 10), 50);

    const wallet = await DemoWalletService.getOrCreateWallet(demoToken);

    const rounds = await prisma.demoGameRound.findMany({
      where: {
        demoWalletId: wallet.id,
        gameId: GAME_ID_BLACKJACK,
        status: 'SETTLED',
      },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });

    const formattedHistory = rounds.map((r) => {
      const pub = JSON.parse(r.publicState || '{}');
      const sec = JSON.parse(r.secretState || '{}');
      const playerEval = evaluateHand(pub.playerCards || []);
      const dealerEval = evaluateHand(sec.dealerCards || []);
      const payoutVal = parseFloat(r.payout.toString());
      const betVal = parseFloat(r.betAmount.toString());
      const insuranceBet = pub.insuranceBet || 0;
      const totalCost = +(betVal + insuranceBet).toFixed(2);

      return {
        id: r.id,
        betAmount: betVal,
        payout: payoutVal,
        multiplier: parseFloat(r.multiplier.toString()),
        profit: +(payoutVal - totalCost).toFixed(2),
        isWin: payoutVal > totalCost,
        isPush: payoutVal === totalCost && totalCost > 0,
        playerScore: playerEval.score,
        dealerScore: dealerEval.score,
        playerCards: pub.playerCards || [],
        dealerCards: sec.dealerCards || [],
        insurancePurchased: pub.insurancePurchased || false,
        insuranceBet,
        insurancePayout: pub.insurancePayout || 0,
        insuranceResult: pub.insuranceResult || 'NONE',
        startedAt: r.startedAt,
      };
    });

    res.json({
      success: true,
      data: formattedHistory,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/blackjack/config
 */
export const getBlackjackConfigHandler = (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: runtimeBlackjackConfig,
  });
};

/**
 * POST /api/blackjack/admin/config
 */
export const updateBlackjackConfigHandler = (req: Request, res: Response): void => {
  const { minBet, maxBet, blackjackPayoutMultiplier, regularWinPayoutMultiplier } = req.body;

  if (minBet !== undefined && (typeof minBet !== 'number' || minBet < 1)) {
    throw ApiError.badRequest('Invalid minBet value');
  }
  if (maxBet !== undefined && (typeof maxBet !== 'number' || maxBet <= (minBet ?? runtimeBlackjackConfig.minBet))) {
    throw ApiError.badRequest('Invalid maxBet value');
  }

  runtimeBlackjackConfig = {
    ...runtimeBlackjackConfig,
    ...(minBet !== undefined && { minBet }),
    ...(maxBet !== undefined && { maxBet }),
    ...(blackjackPayoutMultiplier !== undefined && { blackjackPayoutMultiplier }),
    ...(regularWinPayoutMultiplier !== undefined && { regularWinPayoutMultiplier }),
  };

  res.json({
    success: true,
    message: 'Blackjack configuration updated successfully',
    data: runtimeBlackjackConfig,
  });
};
