import crypto from 'crypto';

export type Suit = '♠' | '♥' | '♦' | '♣';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface HiloCard {
  suit: Suit;
  rank: Rank;
  value: number; // 2..14 (A = 14)
  code: string;  // e.g. "10♠", "A♥"
}

export type HiloPrediction = 'HIGHER' | 'LOWER' | 'SAME';
export type HiloStepOutcome = 'WIN' | 'LOSS' | 'PUSH';

export interface NextCardMultipliers {
  higherMultiplier: number | null; // null if card is Ace (14)
  lowerMultiplier: number | null;  // null if card is 2
  sameMultiplier: number | null;   // null if SAME disabled
  higherWinChance: number;         // percentage e.g. 50.0
  lowerWinChance: number;          // percentage e.g. 50.0
  sameWinChance: number;           // percentage e.g. 7.69
}

export interface HiloConfig {
  minBet: number;
  maxBet: number;
  baseRtp: number;      // default 0.96 (96%)
  allowSame: boolean;    // default true
  isEnabled: boolean;    // default true
  maxStreak: number;     // default 30
}

export const DEFAULT_HILO_CONFIG: HiloConfig = {
  minBet: 10,
  maxBet: 5000,
  baseRtp: 0.96,
  allowSame: true,
  isEnabled: true,
  maxStreak: 30,
};

export const SUITS: Suit[] = ['♠', '♥', '♦', '♣'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13,
  'A': 14,
};

/**
 * Creates a standard 52-card deck
 */
export function createDeck(): HiloCard[] {
  const deck: HiloCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        value: RANK_VALUES[rank],
        code: `${rank}${suit}`,
      });
    }
  }
  return deck;
}

/**
 * CSPRNG Fisher-Yates deck shuffle
 */
export function shuffleDeck(deck: HiloCard[]): HiloCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Calculates step multipliers and win chances for a given starting card rank
 * 2 = lowest (14 - 2 = 12 higher ranks)
 * A = highest (14 - 2 = 12 lower ranks)
 */
export function calculateNextMultipliers(
  card: HiloCard,
  config: HiloConfig = DEFAULT_HILO_CONFIG
): NextCardMultipliers {
  const rankVal = card.value;
  const rtp = config.baseRtp;

  // Higher cards count out of 12 non-equal ranks (3..14)
  const higherCount = 14 - rankVal;
  // Lower cards count out of 12 non-equal ranks (2..13)
  const lowerCount = rankVal - 2;

  let higherMultiplier: number | null = null;
  let higherWinChance = 0;
  if (higherCount > 0) {
    // Probability of drawing a strictly higher rank (out of 12 possible different ranks)
    const prob = higherCount / 12;
    higherWinChance = Math.round(prob * 1000) / 10;
    // Step multiplier: RTP / prob, minimum 1.05x
    higherMultiplier = Math.max(1.05, Math.round((rtp / prob) * 100) / 100);
  }

  let lowerMultiplier: number | null = null;
  let lowerWinChance = 0;
  if (lowerCount > 0) {
    const prob = lowerCount / 12;
    lowerWinChance = Math.round(prob * 1000) / 10;
    lowerMultiplier = Math.max(1.05, Math.round((rtp / prob) * 100) / 100);
  }

  let sameMultiplier: number | null = null;
  let sameWinChance = 0;
  if (config.allowSame) {
    // 1 rank out of 13 ranks in deck
    const prob = 1 / 13;
    sameWinChance = Math.round(prob * 1000) / 10;
    sameMultiplier = Math.round((rtp / prob) * 100) / 100; // ~ 12.48x
  }

  return {
    higherMultiplier,
    lowerMultiplier,
    sameMultiplier,
    higherWinChance,
    lowerWinChance,
    sameWinChance,
  };
}

/**
 * Evaluates a Hilo prediction given the current card and the revealed next card
 */
export function evaluateHiloPrediction(
  currentCard: HiloCard,
  nextCard: HiloCard,
  prediction: HiloPrediction,
  config: HiloConfig = DEFAULT_HILO_CONFIG
): {
  outcome: HiloStepOutcome;
  stepMultiplier: number;
  message: string;
} {
  const multipliers = calculateNextMultipliers(currentCard, config);

  if (nextCard.value === currentCard.value) {
    if (prediction === 'SAME') {
      return {
        outcome: 'WIN',
        stepMultiplier: multipliers.sameMultiplier ?? 12.0,
        message: `Hit SAME rank (${nextCard.rank})! Multiplier applied!`,
      };
    } else {
      // Equal rank on HIGHER or LOWER is PUSH: preserves streak & accumulated multiplier
      return {
        outcome: 'PUSH',
        stepMultiplier: 1.0,
        message: `Equal rank (${nextCard.rank})! PUSH — Current streak and potential payout preserved.`,
      };
    }
  }

  if (nextCard.value > currentCard.value) {
    if (prediction === 'HIGHER') {
      return {
        outcome: 'WIN',
        stepMultiplier: multipliers.higherMultiplier ?? 1.05,
        message: `Correct! ${nextCard.rank} is HIGHER than ${currentCard.rank}.`,
      };
    } else {
      return {
        outcome: 'LOSS',
        stepMultiplier: 0,
        message: `Incorrect! ${nextCard.rank} was HIGHER than ${currentCard.rank}.`,
      };
    }
  }

  // nextCard.value < currentCard.value
  if (prediction === 'LOWER') {
    return {
      outcome: 'WIN',
      stepMultiplier: multipliers.lowerMultiplier ?? 1.05,
      message: `Correct! ${nextCard.rank} is LOWER than ${currentCard.rank}.`,
    };
  } else {
    return {
      outcome: 'LOSS',
      stepMultiplier: 0,
      message: `Incorrect! ${nextCard.rank} was LOWER than ${currentCard.rank}.`,
    };
  }
}

/**
 * Validates player bet
 */
export function validateHiloBet(
  bet: number,
  config: HiloConfig = DEFAULT_HILO_CONFIG
): { isValid: boolean; error?: string } {
  if (!config.isEnabled) {
    return { isValid: false, error: 'Treasure Hilo is currently disabled by administrator' };
  }
  if (isNaN(bet) || bet < config.minBet || bet > config.maxBet) {
    return {
      isValid: false,
      error: `Bet amount must be between ₹${config.minBet} and ₹${config.maxBet}`,
    };
  }
  return { isValid: true };
}

/**
 * Validates prediction eligibility on the current card
 * (e.g. cannot predict HIGHER on Ace or LOWER on 2)
 */
export function validateHiloPredictionAction(
  currentCard: HiloCard,
  prediction: HiloPrediction,
  config: HiloConfig = DEFAULT_HILO_CONFIG
): { isValid: boolean; error?: string } {
  if (prediction === 'HIGHER' && currentCard.value >= 14) {
    return { isValid: false, error: 'Cannot predict HIGHER when current card is Ace (highest card)' };
  }
  if (prediction === 'LOWER' && currentCard.value <= 2) {
    return { isValid: false, error: 'Cannot predict LOWER when current card is 2 (lowest card)' };
  }
  if (prediction === 'SAME' && !config.allowSame) {
    return { isValid: false, error: 'SAME prediction is disabled in current game configuration' };
  }
  return { isValid: true };
}

