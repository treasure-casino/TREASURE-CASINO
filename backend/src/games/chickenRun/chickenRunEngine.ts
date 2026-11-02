/**
 * TREASURE CHICKEN RUN — Core Math Engine
 *
 * Server-authoritative mechanics for the 2D/3D cartoon chicken road crossing game.
 * 4 Difficulties: EASY, MEDIUM, HARD, HARDCORE
 * 24 Step Tiles per path to the Golden Finish Egg/Treasure Chest.
 * Calibrated 96.0% Theoretical RTP across all steps and difficulties.
 */

import crypto from 'crypto';

export type ChickenDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'HARDCORE';
export type ChickenStepOutcome = 'SAFE' | 'BUST';
export type ChickenRoundStatus = 'ACTIVE' | 'CASHED_OUT' | 'BUSTED';

export interface DifficultyConfig {
  name: ChickenDifficulty;
  label: string;
  totalTiles: number;
  lanesTotalSlots: number;
  trapsPerLane: number;
  survivalProbability: number;
  color: string;
  multipliers: number[];
  winRatePercent: string;
  volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  description: string;
}

export interface ChickenRunConfig {
  minBet: number;
  maxBet: number;
  baseRtp: number;
  totalTiles: number;
  isEnabled: boolean;
  maxMultiplier: number;
  difficulties: Record<ChickenDifficulty, DifficultyConfig>;
}

export const TOTAL_TILES = 24;
export const BASE_RTP = 0.96; // 96.00% Theoretical RTP

/**
 * Computes exact multiplier ladder for given survival probability p and base RTP
 */
export function generateMultiplierLadder(
  survivalProb: number,
  totalSteps: number = TOTAL_TILES,
  baseRtp: number = BASE_RTP
): number[] {
  const ladder: number[] = [];
  for (let k = 1; k <= totalSteps; k++) {
    const rawMultiplier = baseRtp / Math.pow(survivalProb, k);
    let rounded: number;
    if (rawMultiplier < 10) {
      rounded = Math.round(rawMultiplier * 100) / 100;
    } else if (rawMultiplier < 100) {
      rounded = Math.round(rawMultiplier * 10) / 10;
    } else {
      rounded = Math.round(rawMultiplier);
    }
    ladder.push(rounded);
  }
  return ladder;
}

// Pre-calculated difficulty configurations
export const CHICKEN_DIFFICULTIES: Record<ChickenDifficulty, DifficultyConfig> = {
  EASY: {
    name: 'EASY',
    label: 'Easy Road',
    totalTiles: TOTAL_TILES,
    lanesTotalSlots: 25,
    trapsPerLane: 2, // 23 / 25 safe
    survivalProbability: 23 / 25, // 0.920
    color: '#10b981', // Emerald
    multipliers: generateMultiplierLadder(23 / 25, TOTAL_TILES, BASE_RTP),
    winRatePercent: '92.0%',
    volatility: 'LOW',
    description: 'Calm countryside road with very few traps. Frequent steady hops!',
  },
  MEDIUM: {
    name: 'MEDIUM',
    label: 'Medium Highway',
    totalTiles: TOTAL_TILES,
    lanesTotalSlots: 25,
    trapsPerLane: 4, // 21 / 25 safe
    survivalProbability: 21 / 25, // 0.840
    color: '#3b82f6', // Blue
    multipliers: generateMultiplierLadder(21 / 25, TOTAL_TILES, BASE_RTP),
    winRatePercent: '84.0%',
    volatility: 'MEDIUM',
    description: 'Balanced highway with buzzing traffic. Great rewards for brave hops!',
  },
  HARD: {
    name: 'HARD',
    label: 'Hard Expressway',
    totalTiles: TOTAL_TILES,
    lanesTotalSlots: 25,
    trapsPerLane: 7, // 18 / 25 safe
    survivalProbability: 18 / 25, // 0.720
    color: '#f59e0b', // Amber
    multipliers: generateMultiplierLadder(18 / 25, TOTAL_TILES, BASE_RTP),
    winRatePercent: '72.0%',
    volatility: 'HIGH',
    description: 'High-speed speedway! Significant hazard risk with accelerating multipliers.',
  },
  HARDCORE: {
    name: 'HARDCORE',
    label: 'Hardcore Danger Zone',
    totalTiles: TOTAL_TILES,
    lanesTotalSlots: 25,
    trapsPerLane: 11, // 14 / 25 safe
    survivalProbability: 14 / 25, // 0.560
    color: '#ef4444', // Red
    multipliers: generateMultiplierLadder(14 / 25, TOTAL_TILES, BASE_RTP),
    winRatePercent: '56.0%',
    volatility: 'EXTREME',
    description: 'Electrified danger course! Extreme hazard density for colossal payouts.',
  },
};

export const DEFAULT_CHICKEN_CONFIG: ChickenRunConfig = {
  minBet: 10,
  maxBet: 5000,
  baseRtp: BASE_RTP,
  totalTiles: TOTAL_TILES,
  isEnabled: true,
  maxMultiplier: 100000,
  difficulties: CHICKEN_DIFFICULTIES,
};

export interface TileDetail {
  step: number;
  multiplier: number;
  outcome?: ChickenStepOutcome;
  trapSlot?: number;
  selectedSlot?: number;
}

export interface ActiveChickenRound {
  roundId: string;
  userId: string;
  betAmount: number;
  difficulty: ChickenDifficulty;
  currentStep: number; // 0 = at start, 1..24 = on path
  currentMultiplier: number;
  accumulatedPayout: number;
  status: ChickenRoundStatus;
  createdAt: number;
  updatedAt: number;
  tiles: TileDetail[];
  seed: string;
  hash: string;
}

/**
 * Generates a cryptographically secure random float in [0, 1)
 */
export function secureRandomFloat(): number {
  const buf = crypto.randomBytes(4);
  return buf.readUInt32LE(0) / 0x100000000;
}

/**
 * Creates a new active round session
 */
export function initializeRound(
  roundId: string,
  userId: string,
  betAmount: number,
  difficulty: ChickenDifficulty,
  config: ChickenRunConfig = DEFAULT_CHICKEN_CONFIG
): ActiveChickenRound {
  const diffConfig = config.difficulties[difficulty] || config.difficulties.MEDIUM;
  const seed = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256').update(seed).digest('hex');

  const tiles: TileDetail[] = diffConfig.multipliers.map((m, idx) => ({
    step: idx + 1,
    multiplier: m,
  }));

  return {
    roundId,
    userId,
    betAmount,
    difficulty,
    currentStep: 0,
    currentMultiplier: 1.0,
    accumulatedPayout: 0,
    status: 'ACTIVE',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    tiles,
    seed,
    hash,
  };
}

/**
 * Evaluates the next step for an active round
 * Returns whether the chicken safely jumped or got busted.
 */
export function evaluateStep(
  round: ActiveChickenRound,
  forcedOutcome?: ChickenStepOutcome,
  config: ChickenRunConfig = DEFAULT_CHICKEN_CONFIG
): {
  round: ActiveChickenRound;
  outcome: ChickenStepOutcome;
  multiplier: number;
  payout: number;
  isMaxStepReached: boolean;
} {
  if (round.status !== 'ACTIVE') {
    throw new Error(`Round ${round.roundId} is not ACTIVE (status: ${round.status})`);
  }

  if (round.currentStep >= config.totalTiles) {
    throw new Error(`Round ${round.roundId} has already reached the maximum step`);
  }

  const nextStepIndex = round.currentStep; // 0-based for tile array
  const nextStepNum = nextStepIndex + 1;
  const diffConfig = config.difficulties[round.difficulty] || config.difficulties.MEDIUM;

  let outcome: ChickenStepOutcome;
  if (forcedOutcome) {
    outcome = forcedOutcome;
  } else {
    const roll = secureRandomFloat();
    outcome = roll < diffConfig.survivalProbability ? 'SAFE' : 'BUST';
  }

  const targetTile = round.tiles[nextStepIndex];
  targetTile.outcome = outcome;

  if (outcome === 'SAFE') {
    round.currentStep = nextStepNum;
    round.currentMultiplier = targetTile.multiplier;
    round.accumulatedPayout = Math.round(round.betAmount * round.currentMultiplier * 100) / 100;
    round.updatedAt = Date.now();

    const isMaxStepReached = round.currentStep >= config.totalTiles;
    if (isMaxStepReached) {
      // Reached the final golden egg/chest -> auto victory cashout!
      round.status = 'CASHED_OUT';
    }

    return {
      round,
      outcome: 'SAFE',
      multiplier: round.currentMultiplier,
      payout: round.accumulatedPayout,
      isMaxStepReached,
    };
  } else {
    // Chicken busted
    round.status = 'BUSTED';
    round.accumulatedPayout = 0;
    round.updatedAt = Date.now();

    return {
      round,
      outcome: 'BUST',
      multiplier: 0,
      payout: 0,
      isMaxStepReached: false,
    };
  }
}

/**
 * Cashes out an active round after at least 1 safe step
 */
export function cashOutRound(round: ActiveChickenRound): {
  payout: number;
  multiplier: number;
  step: number;
} {
  if (round.status !== 'ACTIVE') {
    throw new Error(`Round ${round.roundId} is not ACTIVE (status: ${round.status})`);
  }

  if (round.currentStep < 1) {
    throw new Error('Cannot cash out before taking at least 1 step');
  }

  round.status = 'CASHED_OUT';
  round.updatedAt = Date.now();

  const payout = Math.round(round.betAmount * round.currentMultiplier * 100) / 100;
  round.accumulatedPayout = payout;

  return {
    payout,
    multiplier: round.currentMultiplier,
    step: round.currentStep,
  };
}

/**
 * Validates player bet
 */
export function validateChickenBet(
  bet: number,
  config: ChickenRunConfig = DEFAULT_CHICKEN_CONFIG
): { isValid: boolean; message?: string } {
  if (typeof bet !== 'number' || isNaN(bet)) {
    return { isValid: false, message: 'Bet must be a valid number' };
  }
  if (bet < config.minBet) {
    return { isValid: false, message: `Minimum bet is ₹${config.minBet}` };
  }
  if (bet > config.maxBet) {
    return { isValid: false, message: `Maximum bet is ₹${config.maxBet}` };
  }
  return { isValid: true };
}

