import crypto from 'crypto';

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number;
  isAce: boolean;
  code: string;
}

export interface HandEvaluation {
  cards: Card[];
  score: number;
  isSoft: boolean;
  isBusted: boolean;
  isBlackjack: boolean;
}

export type BlackjackGameStatus = 'ACTIVE' | 'SETTLED';

export type BlackjackResult =
  | 'IN_PLAY'
  | 'PLAYER_BLACKJACK'
  | 'DEALER_BLACKJACK'
  | 'PUSH'
  | 'PLAYER_BUST'
  | 'DEALER_BUST'
  | 'PLAYER_WIN'
  | 'DEALER_WIN';

export type InsuranceResult = 'WON' | 'LOST' | 'DECLINED' | 'NONE';

/**
 * Calculates exact insurance bet (50% of original bet)
 */
export function calculateInsuranceBet(originalBet: number): number {
  return +(originalBet * 0.5).toFixed(2);
}

/**
 * Calculates insurance payout (2:1 profit + original insurance bet returned = 3x insurance bet)
 */
export function calculateInsurancePayout(insuranceBet: number): number {
  return +(insuranceBet * 3).toFixed(2);
}

export interface BlackjackConfig {
  minBet: number;
  maxBet: number;
  blackjackPayoutMultiplier: number; // 2.5 (3:2 profit + original bet)
  regularWinPayoutMultiplier: number; // 2.0 (1:1 profit + original bet)
  pushPayoutMultiplier: number; // 1.0 (original bet returned)
  decksCount: number; // default 6 decks standard shoe
  dealerStandsOnSoft17: boolean; // true
}

export const DEFAULT_BLACKJACK_CONFIG: BlackjackConfig = {
  minBet: 10,
  maxBet: 5000,
  blackjackPayoutMultiplier: 2.5,
  regularWinPayoutMultiplier: 2.0,
  pushPayoutMultiplier: 1.0,
  decksCount: 6,
  dealerStandsOnSoft17: true,
};

/**
 * Creates a single 52-card standard deck
 */
export function createStandardDeck(): Card[] {
  const suits: Suit[] = ['♠', '♥', '♦', '♣'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      let value = parseInt(rank, 10);
      if (['J', 'Q', 'K'].includes(rank)) value = 10;
      if (rank === 'A') value = 11;
      const suitChar = suit === '♠' ? 'S' : suit === '♥' ? 'H' : suit === '♦' ? 'D' : 'C';

      deck.push({
        suit,
        rank,
        value,
        isAce: rank === 'A',
        code: `${rank}${suitChar}`,
      });
    }
  }

  return deck;
}

/**
 * Creates a multi-deck shoe (e.g. 6 decks = 312 cards)
 */
export function createShoe(decksCount = 6): Card[] {
  const shoe: Card[] = [];
  for (let i = 0; i < decksCount; i++) {
    shoe.push(...createStandardDeck());
  }
  return shoe;
}

/**
 * Cryptographically secure Fisher-Yates shuffle
 */
export function shuffleDeck(cards: Card[]): Card[] {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Generate secure random integer in [0, i]
    const randomBuffer = crypto.randomBytes(4);
    const randomUInt = randomBuffer.readUInt32BE(0);
    const j = randomUInt % (i + 1);

    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

/**
 * Evaluates hand score, accounting for flexible Ace values (1 or 11)
 */
export function evaluateHand(cards: Card[]): HandEvaluation {
  let total = 0;
  let softAces = 0;

  for (const card of cards) {
    total += card.value;
    if (card.isAce) {
      softAces++;
    }
  }

  // Reduce Aces from 11 to 1 as needed if over 21
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces--;
  }

  const isBusted = total > 21;
  const isBlackjack = cards.length === 2 && total === 21;
  const isSoft = softAces > 0;

  return {
    cards,
    score: total,
    isSoft,
    isBusted,
    isBlackjack,
  };
}

/**
 * Plays the dealer's turn according to standard casino rules:
 * Dealer must draw cards until reaching at least 17.
 */
export function playDealerTurn(
  initialDealerCards: Card[],
  deck: Card[],
  dealerStandsOnSoft17 = true
): { dealerCards: Card[]; remainingDeck: Card[] } {
  const dealerCards = [...initialDealerCards];
  const remainingDeck = [...deck];

  let evalHand = evaluateHand(dealerCards);

  // Stand condition: score >= 17 (or soft 17 handling)
  while (evalHand.score < 17 && remainingDeck.length > 0) {
    const card = remainingDeck.shift()!;
    dealerCards.push(card);
    evalHand = evaluateHand(dealerCards);
  }

  return { dealerCards, remainingDeck };
}

/**
 * Compares final player hand and dealer hand, returning the result and payout multiplier
 */
export function determineGameResult(
  playerEval: HandEvaluation,
  dealerEval: HandEvaluation,
  config = DEFAULT_BLACKJACK_CONFIG
): {
  result: BlackjackResult;
  payoutMultiplier: number;
  message: string;
} {
  // 1. Player Busted
  if (playerEval.isBusted) {
    return {
      result: 'PLAYER_BUST',
      payoutMultiplier: 0,
      message: `Bust! You exceeded 21 with ${playerEval.score}.`,
    };
  }

  // 2. Initial Natural Blackjacks
  if (playerEval.isBlackjack) {
    if (dealerEval.isBlackjack) {
      return {
        result: 'PUSH',
        payoutMultiplier: config.pushPayoutMultiplier,
        message: 'Both player and dealer have Blackjack! Push (Bet returned).',
      };
    }
    return {
      result: 'PLAYER_BLACKJACK',
      payoutMultiplier: config.blackjackPayoutMultiplier,
      message: 'Blackjack! Natural 21 pays 3:2!',
    };
  }

  // 3. Dealer has Blackjack while Player does not
  if (dealerEval.isBlackjack) {
    return {
      result: 'DEALER_BLACKJACK',
      payoutMultiplier: 0,
      message: 'Dealer has Blackjack. Dealer wins.',
    };
  }

  // 4. Dealer Busted
  if (dealerEval.isBusted) {
    return {
      result: 'DEALER_BUST',
      payoutMultiplier: config.regularWinPayoutMultiplier,
      message: `Dealer busts with ${dealerEval.score}! You win!`,
    };
  }

  // 5. Compare Points
  if (playerEval.score > dealerEval.score) {
    return {
      result: 'PLAYER_WIN',
      payoutMultiplier: config.regularWinPayoutMultiplier,
      message: `You win with ${playerEval.score} vs Dealer's ${dealerEval.score}!`,
    };
  }

  if (playerEval.score < dealerEval.score) {
    return {
      result: 'DEALER_WIN',
      payoutMultiplier: 0,
      message: `Dealer wins with ${dealerEval.score} vs your ${playerEval.score}.`,
    };
  }

  // 6. Push (Equal Points)
  return {
    result: 'PUSH',
    payoutMultiplier: config.pushPayoutMultiplier,
    message: `Push! Both hands tied at ${playerEval.score}. Bet returned.`,
  };
}

