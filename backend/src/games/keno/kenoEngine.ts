import crypto from 'crypto';

export type KenoPayoutTable = Record<number, Record<number, number>>;

export interface KenoConfig {
  minBet: number;
  maxBet: number;
  minSpots: number;
  maxSpots: number;
  drawCount: number; // exactly 20
  totalNumbers: number; // 80
  isEnabled: boolean;
  payoutTable: KenoPayoutTable;
}

/**
 * Standard balanced casino Keno Payout Table (Spots 1 to 10).
 * Key = Spots selected (1..10)
 * Subkey = Matches / Hits count (0..Spots)
 * Value = Multiplier payout
 */
export const DEFAULT_KENO_PAYOUT_TABLE: KenoPayoutTable = {
  1: {
    1: 3.49,
  },
  2: {
    1: 1.5,
    2: 4.92,
  },
  3: {
    1: 1.0,
    2: 2.30,
    3: 8.20,
  },
  4: {
    1: 0.5,
    2: 1.82,
    3: 4.20,
    4: 21.0,
  },
  5: {
    1: 0,
    2: 1.10,
    3: 3.75,
    4: 15.0,
    5: 35.0,
  },
  6: {
    1: 0,
    2: 0.5,
    3: 2.90,
    4: 7.60,
    5: 18.0,
    6: 55.0,
  },
  7: {
    1: 0,
    2: 0.25,
    3: 2.30,
    4: 4.10,
    5: 10.0,
    6: 31.0,
    7: 60.0,
  },
  8: {
    1: 0,
    2: 0,
    3: 1.40,
    4: 2.80,
    5: 11.40,
    6: 28.0,
    7: 40.0,
    8: 70.0,
  },
  9: {
    1: 0,
    2: 0,
    3: 1.0,
    4: 2.20,
    5: 6.10,
    6: 17.0,
    7: 25.0,
    8: 55.0,
    9: 85.0,
  },
  10: {
    1: 0,
    2: 0,
    3: 1.0,
    4: 1.5,
    5: 3.30,
    6: 10.20,
    7: 25.0,
    8: 40.0,
    9: 75.0,
    10: 100.0,
  },
};

export const DEFAULT_KENO_CONFIG: KenoConfig = {
  minBet: 10,
  maxBet: 5000,
  minSpots: 1,
  maxSpots: 10,
  drawCount: 20,
  totalNumbers: 80,
  isEnabled: true,
  payoutTable: DEFAULT_KENO_PAYOUT_TABLE,
};

export interface KenoRoundResult {
  roundId: string;
  betAmount: number;
  selectedNumbers: number[];
  drawnNumbers: number[];
  matches: number[];
  matchCount: number;
  multiplier: number;
  payout: number;
  profit: number;
  isWin: boolean;
}

/**
 * Draws exactly 20 unique numbers from 1 to 80 using CSPRNG Fisher-Yates shuffle
 */
export function drawKenoNumbers(
  drawCount = 20,
  totalNumbers = 80,
  forcedDraw?: number[]
): number[] {
  if (forcedDraw && forcedDraw.length === drawCount) {
    return [...forcedDraw];
  }

  // Create pool 1 to 80
  const pool = Array.from({ length: totalNumbers }, (_, i) => i + 1);

  // Partial Fisher-Yates shuffle for drawCount elements
  for (let i = pool.length - 1; i > pool.length - 1 - drawCount; i--) {
    const j = crypto.randomInt(0, i + 1);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  // Take the last drawCount elements and return them
  return pool.slice(pool.length - drawCount);
}

/**
 * Evaluates a complete Keno round
 */
export function evaluateKenoRound(
  roundId: string,
  betAmount: number,
  selectedNumbers: number[],
  config = DEFAULT_KENO_CONFIG,
  forcedDraw?: number[]
): KenoRoundResult {
  const drawnNumbers = drawKenoNumbers(config.drawCount, config.totalNumbers, forcedDraw);

  // Set for O(1) matching
  const drawnSet = new Set(drawnNumbers);
  const matches = selectedNumbers.filter((num) => drawnSet.has(num));
  const matchCount = matches.length;

  const spotCount = selectedNumbers.length;
  const spotPayouts = config.payoutTable[spotCount] || {};
  const multiplier = spotPayouts[matchCount] ?? 0;

  const payout = Math.round(betAmount * multiplier * 100) / 100;
  const profit = Math.round((payout - betAmount) * 100) / 100;
  const isWin = payout > betAmount;

  return {
    roundId,
    betAmount,
    selectedNumbers: [...selectedNumbers].sort((a, b) => a - b),
    drawnNumbers,
    matches: [...matches].sort((a, b) => a - b),
    matchCount,
    multiplier,
    payout,
    profit,
    isWin,
  };
}

/**
 * Validates player inputs for Keno
 */
export function validateKenoBet(
  bet: number,
  selectedNumbers: number[],
  config = DEFAULT_KENO_CONFIG
): { isValid: boolean; error?: string } {
  if (!config.isEnabled) {
    return { isValid: false, error: 'Treasure Keno is currently disabled by administrator' };
  }

  if (isNaN(bet) || bet < config.minBet || bet > config.maxBet) {
    return {
      isValid: false,
      error: `Bet amount must be between ₹${config.minBet} and ₹${config.maxBet}`,
    };
  }

  if (!Array.isArray(selectedNumbers) || selectedNumbers.length < config.minSpots || selectedNumbers.length > config.maxSpots) {
    return {
      isValid: false,
      error: `You must select between ${config.minSpots} and ${config.maxSpots} numbers`,
    };
  }

  // Check unique integers 1 to 80
  const uniqueSet = new Set<number>();
  for (const n of selectedNumbers) {
    if (!Number.isInteger(n) || n < 1 || n > config.totalNumbers) {
      return {
        isValid: false,
        error: `All numbers must be integers between 1 and ${config.totalNumbers}`,
      };
    }
    if (uniqueSet.has(n)) {
      return {
        isValid: false,
        error: 'Duplicate numbers are not permitted',
      };
    }
    uniqueSet.add(n);
  }

  return { isValid: true };
}

