import { randomBytes } from 'crypto';

export interface LimboConfig {
  rtp: number; // e.g. 0.96 for 96% RTP (4% house edge)
  minTarget: number;
  maxTarget: number;
  minBet: number;
  maxBet: number;
  maxMultiplier: number;
}

export const DEFAULT_LIMBO_CONFIG: LimboConfig = {
  rtp: 0.96,
  minTarget: 1.01,
  maxTarget: 10000.0,
  minBet: 10,
  maxBet: 5000,
  maxMultiplier: 10000.0,
};

export interface LimboRollResult {
  roundId: string;
  betAmount: number;
  targetMultiplier: number;
  resultMultiplier: number;
  winChance: number;
  isWin: boolean;
  payout: number;
  netProfit: number;
  rawRandom: number;
  timestamp: number;
}

/**
 * Calculates theoretical win probability as a percentage [0.01%, 99.00%]
 * Win Chance (%) = (RTP / Target) * 100
 */
export function calculateWinProbability(
  targetMultiplier: number,
  rtp: number = DEFAULT_LIMBO_CONFIG.rtp
): number {
  if (targetMultiplier <= 0) return 0;
  const rawChance = (rtp / targetMultiplier) * 100;
  // Clamp between 0.01% and 99.00%
  const clamped = Math.min(99.0, Math.max(0.01, rawChance));
  return Number(clamped.toFixed(2));
}

/**
 * Cryptographically generates a Limbo crash/outcome multiplier.
 * Uses standard uniform distribution inverted by house edge:
 * Multiplier M = floor((RTP / U) * 100) / 100
 * Clamped between 1.00x and maxMultiplier.
 */
export function generateLimboMultiplier(
  rtp: number = DEFAULT_LIMBO_CONFIG.rtp,
  maxMultiplier: number = DEFAULT_LIMBO_CONFIG.maxMultiplier,
  forcedMultiplier?: number
): { multiplier: number; rawRandom: number } {
  if (typeof forcedMultiplier === 'number' && !isNaN(forcedMultiplier)) {
    const clamped = Math.min(maxMultiplier, Math.max(1.0, forcedMultiplier));
    return {
      multiplier: Number(clamped.toFixed(2)),
      rawRandom: 0.5,
    };
  }

  // Generate 4 cryptographically secure random bytes (32-bit unsigned integer)
  const buffer = randomBytes(4);
  const randInt = buffer.readUInt32BE(0);

  // Map to uniform interval (0, 1]
  const u = (randInt + 1) / (0x100000000 + 1);

  // Invert with RTP
  const rawMult = rtp / u;

  // Floor to 2 decimals to preserve mathematical house edge integrity
  const floored = Math.floor(rawMult * 100) / 100;
  const clamped = Math.max(1.0, Math.min(maxMultiplier, floored));

  return {
    multiplier: Number(clamped.toFixed(2)),
    rawRandom: u,
  };
}

/**
 * Evaluates a single Limbo round deterministically.
 */
export function evaluateLimboRound(
  roundId: string,
  betAmount: number,
  targetMultiplier: number,
  config: LimboConfig = DEFAULT_LIMBO_CONFIG,
  forcedMultiplier?: number
): LimboRollResult {
  const target = Number(targetMultiplier.toFixed(2));
  const bet = Number(betAmount.toFixed(2));

  const winChance = calculateWinProbability(target, config.rtp);
  const { multiplier: resultMultiplier, rawRandom } = generateLimboMultiplier(
    config.rtp,
    config.maxMultiplier,
    forcedMultiplier
  );

  const isWin = resultMultiplier >= target;
  const payout = isWin ? Number((bet * target).toFixed(2)) : 0;
  const netProfit = isWin ? Number((payout - bet).toFixed(2)) : -bet;

  return {
    roundId,
    betAmount: bet,
    targetMultiplier: target,
    resultMultiplier,
    winChance,
    isWin,
    payout,
    netProfit,
    rawRandom,
    timestamp: Date.now(),
  };
}
