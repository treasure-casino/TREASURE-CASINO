import { randomBytes } from 'crypto';

export type DiceMode = 'ROLL_UNDER' | 'ROLL_OVER';

export interface DiceConfig {
  rtp: number; // e.g. 0.96 for 96% RTP (4% house edge)
  minTarget: number;
  maxTarget: number;
  minBet: number;
  maxBet: number;
  maxMultiplier: number;
}

export const DEFAULT_DICE_CONFIG: DiceConfig = {
  rtp: 0.96,
  minTarget: 2.0,
  maxTarget: 98.0,
  minBet: 10,
  maxBet: 5000,
  maxMultiplier: 960.0,
};

export interface DiceRollResult {
  roundId: string;
  betAmount: number;
  target: number;
  mode: DiceMode;
  outcome: number; // 0.00 to 99.99
  winChance: number; // Percentage [2.00% to 98.00%]
  multiplier: number;
  isWin: boolean;
  payout: number;
  netProfit: number;
  rawRandom: number;
  timestamp: number;
}

/**
 * Calculates theoretical win probability as a percentage [2.00%, 98.00%]
 * ROLL_UNDER: Outcome < Target -> Chance = Target%
 * ROLL_OVER:  Outcome > Target -> Chance = (100 - Target)%
 */
export function calculateDiceWinChance(target: number, mode: DiceMode): number {
  const clampedTarget = Math.min(98.0, Math.max(2.0, target));
  const rawChance = mode === 'ROLL_UNDER' ? clampedTarget : 100.0 - clampedTarget;
  return Number(rawChance.toFixed(2));
}

/**
 * Calculates fair multiplier given target and mode with configured RTP:
 * Multiplier = (RTP * 100) / WinChance
 * Clamped to 2 decimal places and bounded by maxMultiplier.
 */
export function calculateDiceMultiplier(
  target: number,
  mode: DiceMode,
  rtp: number = DEFAULT_DICE_CONFIG.rtp,
  maxMultiplier: number = DEFAULT_DICE_CONFIG.maxMultiplier
): number {
  const winChance = calculateDiceWinChance(target, mode);
  if (winChance <= 0) return 1.0;
  const rawMult = (rtp * 100.0) / winChance;
  // Floor to 2 decimals to strictly protect house edge
  const floored = Math.floor(rawMult * 100) / 100;
  return Number(Math.max(1.01, Math.min(maxMultiplier, floored)).toFixed(2));
}

/**
 * Generates cryptographically secure dice roll in [0.00, 99.99]
 */
export function generateDiceOutcome(forcedOutcome?: number): { outcome: number; rawRandom: number } {
  if (typeof forcedOutcome === 'number' && !isNaN(forcedOutcome)) {
    const clamped = Math.max(0.0, Math.min(99.99, forcedOutcome));
    return {
      outcome: Number(clamped.toFixed(2)),
      rawRandom: 0.5,
    };
  }

  // 4 cryptographically secure random bytes (32-bit unsigned integer)
  const buffer = randomBytes(4);
  const randInt = buffer.readUInt32BE(0);

  // Exact 10,000 discrete outcomes from 0 to 9999 -> 0.00 to 99.99
  const outcomeNumber = (randInt % 10000) / 100;

  return {
    outcome: Number(outcomeNumber.toFixed(2)),
    rawRandom: randInt / 0xffffffff,
  };
}

/**
 * Evaluates a single Dice round deterministically.
 */
export function evaluateDiceRound(
  roundId: string,
  betAmount: number,
  target: number,
  mode: DiceMode,
  config: DiceConfig = DEFAULT_DICE_CONFIG,
  forcedOutcome?: number
): DiceRollResult {
  const clampedTarget = Number(Math.min(config.maxTarget, Math.max(config.minTarget, target)).toFixed(2));
  const bet = Number(betAmount.toFixed(2));
  const winChance = calculateDiceWinChance(clampedTarget, mode);
  const multiplier = calculateDiceMultiplier(clampedTarget, mode, config.rtp, config.maxMultiplier);

  const { outcome, rawRandom } = generateDiceOutcome(forcedOutcome);

  // Boundary logic:
  // ROLL_UNDER: strictly outcome < target
  // ROLL_OVER:  strictly outcome > target
  const isWin = mode === 'ROLL_UNDER' ? outcome < clampedTarget : outcome > clampedTarget;

  const payout = isWin ? Number((bet * multiplier).toFixed(2)) : 0;
  const netProfit = isWin ? Number((payout - bet).toFixed(2)) : -bet;

  return {
    roundId,
    betAmount: bet,
    target: clampedTarget,
    mode,
    outcome,
    winChance,
    multiplier,
    isWin,
    payout,
    netProfit,
    rawRandom,
    timestamp: Date.now(),
  };
}

