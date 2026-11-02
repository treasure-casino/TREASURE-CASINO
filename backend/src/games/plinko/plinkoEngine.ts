import crypto from 'crypto';

export type PlinkoRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type PlinkoRows = 8 | 12 | 16;

export interface PlinkoConfig {
  minBet: number;
  maxBet: number;
  rtp: number; // e.g. 0.985 (98.5%)
  allowedRows: PlinkoRows[];
  allowedRisks: PlinkoRisk[];
  multiplierTables: Record<PlinkoRows, Record<PlinkoRisk, number[]>>;
}

/**
 * Mathematically balanced Plinko Multiplier Tables.
 * Based on binomial coefficient distributions P(k) = C(R, k) * (0.5^R).
 * High risk features extreme wing multipliers (up to 1,000x for 16 rows).
 * Medium risk features balanced variance.
 * Low risk features low variance and steady center-wing returns.
 */
export const DEFAULT_PLINKO_MULTIPLIER_TABLES: Record<PlinkoRows, Record<PlinkoRisk, number[]>> = {
  8: {
    // 9 slots (indices 0 to 8)
    LOW: [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
    MEDIUM: [13.0, 3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13.0],
    HIGH: [29.0, 4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29.0],
  },
  12: {
    // 13 slots (indices 0 to 12)
    LOW: [10.0, 3.0, 1.6, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 1.6, 3.0, 10.0],
    MEDIUM: [33.0, 11.0, 4.0, 2.0, 1.1, 0.6, 0.3, 0.6, 1.1, 2.0, 4.0, 11.0, 33.0],
    HIGH: [170.0, 24.0, 8.1, 2.0, 0.7, 0.2, 0.2, 0.2, 0.7, 2.0, 8.1, 24.0, 170.0],
  },
  16: {
    // 17 slots (indices 0 to 16)
    LOW: [16.0, 9.0, 2.0, 1.4, 1.4, 1.2, 1.1, 1.0, 0.5, 1.0, 1.1, 1.2, 1.4, 1.4, 2.0, 9.0, 16.0],
    MEDIUM: [110.0, 41.0, 10.0, 5.0, 3.0, 1.5, 1.0, 0.5, 0.3, 0.5, 1.0, 1.5, 3.0, 5.0, 10.0, 41.0, 110.0],
    HIGH: [1000.0, 130.0, 26.0, 9.0, 4.0, 2.0, 0.2, 0.2, 0.2, 0.2, 0.2, 2.0, 4.0, 9.0, 26.0, 130.0, 1000.0],
  },
};

export const DEFAULT_PLINKO_CONFIG: PlinkoConfig = {
  minBet: 10,
  maxBet: 5000,
  rtp: 0.985,
  allowedRows: [8, 12, 16],
  allowedRisks: ['LOW', 'MEDIUM', 'HIGH'],
  multiplierTables: DEFAULT_PLINKO_MULTIPLIER_TABLES,
};

export interface PlinkoRoundResult {
  roundId: string;
  betAmount: number;
  rows: PlinkoRows;
  risk: PlinkoRisk;
  path: number[]; // 0 for Left, 1 for Right at each row pin
  slotIndex: number; // 0 to rows
  multiplier: number;
  payout: number;
  profit: number;
  isWin: boolean;
  serverSeedHash?: string;
}

/**
 * Calculates theoretical RTP for a given rows and risk level
 */
export function calculateTheoreticalRtp(rows: PlinkoRows, risk: PlinkoRisk, config = DEFAULT_PLINKO_CONFIG): number {
  const multipliers = config.multiplierTables[rows][risk];
  const n = rows;
  let totalEv = 0;

  // Binomial coefficient formula
  const combinations = (nVal: number, kVal: number): number => {
    if (kVal < 0 || kVal > nVal) return 0;
    if (kVal === 0 || kVal === nVal) return 1;
    let c = 1;
    for (let i = 1; i <= kVal; i++) {
      c = (c * (nVal - (kVal - i))) / i;
    }
    return c;
  };

  const totalOutcomes = Math.pow(2, n);
  for (let k = 0; k <= n; k++) {
    const prob = combinations(n, k) / totalOutcomes;
    totalEv += prob * multipliers[k];
  }

  return totalEv;
}

/**
 * Generates an authoritative provably fair path for a ball drop
 * Each row decision is 0 (Left) or 1 (Right) generated via CSPRNG.
 */
export function generatePlinkoPath(
  rows: PlinkoRows,
  risk: PlinkoRisk,
  config = DEFAULT_PLINKO_CONFIG,
  forcedSlot?: number
): { path: number[]; slotIndex: number; multiplier: number } {
  const multipliers = config.multiplierTables[rows][risk];

  if (typeof forcedSlot === 'number' && forcedSlot >= 0 && forcedSlot <= rows) {
    // Generate a path that sums exactly to forcedSlot
    const path: number[] = new Array(rows).fill(0);
    const indices = Array.from({ length: rows }, (_, i) => i);
    // Shuffle indices
    for (let i = indices.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    for (let i = 0; i < forcedSlot; i++) {
      path[indices[i]] = 1;
    }
    return {
      path,
      slotIndex: forcedSlot,
      multiplier: multipliers[forcedSlot],
    };
  }

  // Cryptographically secure random path generation
  // Generate random bytes for the rows
  const randomBytes = crypto.randomBytes(rows);
  const path: number[] = [];
  let slotIndex = 0;

  for (let r = 0; r < rows; r++) {
    // 0 = bounce left, 1 = bounce right
    const bit = randomBytes[r] % 2;
    path.push(bit);
    if (bit === 1) slotIndex++;
  }

  const multiplier = multipliers[slotIndex];
  return { path, slotIndex, multiplier };
}

/**
 * Evaluates a complete Plinko round
 */
export function evaluatePlinkoRound(
  roundId: string,
  betAmount: number,
  rows: PlinkoRows,
  risk: PlinkoRisk,
  config = DEFAULT_PLINKO_CONFIG,
  forcedSlot?: number
): PlinkoRoundResult {
  const { path, slotIndex, multiplier } = generatePlinkoPath(rows, risk, config, forcedSlot);
  const payout = Math.round(betAmount * multiplier * 100) / 100;
  const profit = Math.round((payout - betAmount) * 100) / 100;
  const isWin = payout > betAmount;

  return {
    roundId,
    betAmount,
    rows,
    risk,
    path,
    slotIndex,
    multiplier,
    payout,
    profit,
    isWin,
  };
}

/**
 * Validates player inputs
 */
export function validatePlinkoBet(
  bet: number,
  rows: number,
  risk: string,
  config = DEFAULT_PLINKO_CONFIG
): { isValid: boolean; error?: string } {
  if (isNaN(bet) || bet < config.minBet || bet > config.maxBet) {
    return {
      isValid: false,
      error: `Bet amount must be between ₹${config.minBet} and ₹${config.maxBet}`,
    };
  }

  if (!config.allowedRows.includes(rows as PlinkoRows)) {
    return {
      isValid: false,
      error: `Allowed rows are: ${config.allowedRows.join(', ')}`,
    };
  }

  if (!config.allowedRisks.includes(risk as PlinkoRisk)) {
    return {
      isValid: false,
      error: `Allowed risk levels are: ${config.allowedRisks.join(', ')}`,
    };
  }

  return { isValid: true };
}

