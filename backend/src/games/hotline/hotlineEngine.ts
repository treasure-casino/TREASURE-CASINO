import crypto from 'crypto';

export interface HotlineConfig {
  minBet: number;
  maxBet: number;
  minNumber: number; // 1
  maxNumber: number; // 100
  baseRtp: number;   // 0.96 (96%)
  maxMultiplier: number; // 1000.00x
  isEnabled: boolean;
}

export const DEFAULT_HOTLINE_CONFIG: HotlineConfig = {
  minBet: 10,
  maxBet: 5000,
  minNumber: 1,
  maxNumber: 100,
  baseRtp: 0.96,
  maxMultiplier: 1000.0,
  isEnabled: true,
};

export interface HotlineRoundParameters {
  betAmount: number;
  selectedNumber: number; // 1 to 100
  autoCashoutMultiplier?: number;
}

export interface HotlineEngineResult {
  revealedNumber: number;       // 1 to 100
  stoppingMultiplier: number;   // The crash / burnout point
  isDirectHit: boolean;         // true if selectedNumber === revealedNumber
  isHotZone: boolean;           // true if |selectedNumber - revealedNumber| <= 3
  bonusMultiplier: number;      // 1.0x (normal), 1.25x (hot zone), 2.0x (direct hit)
  durationMs: number;           // Calculated duration for client animation
}

/**
 * Generates a CSPRNG revealed number between minNumber and maxNumber (1 to 100)
 */
export function generateRevealedNumber(
  min = 1,
  max = 100,
  forcedNumber?: number
): number {
  if (typeof forcedNumber === 'number' && forcedNumber >= min && forcedNumber <= max) {
    return forcedNumber;
  }
  return crypto.randomInt(min, max + 1);
}

/**
 * Generates the server-authoritative stopping multiplier based on standard 96% RTP distribution
 * Formula: M = max(1.00, floor((RTP / U) * 100) / 100)
 * where U is a uniform random float in (0, 1].
 */
export function generateStoppingMultiplier(
  baseRtp = 0.96,
  maxMultiplier = 1000.0,
  forcedMultiplier?: number
): number {
  if (typeof forcedMultiplier === 'number' && forcedMultiplier >= 1.0) {
    return Math.min(maxMultiplier, Math.round(forcedMultiplier * 100) / 100);
  }

  // 32-bit cryptographically secure float in (0, 1]
  const randomBuffer = crypto.randomBytes(4);
  const randomUint = randomBuffer.readUInt32BE(0);
  const u = (randomUint + 1) / (0xffffffff + 1); // strictly > 0 and <= 1

  const rawMult = baseRtp / u;
  // If rawMult < 1.00 (occurs with probability 1 - baseRtp = 4%), immediate stop at 1.00x
  if (rawMult < 1.0) {
    return 1.0;
  }

  const rounded = Math.floor(rawMult * 100) / 100;
  return Math.min(maxMultiplier, Math.max(1.0, rounded));
}

/**
 * Evaluates the Hotline round generation
 */
export function evaluateHotlineRound(
  selectedNumber: number,
  config: HotlineConfig = DEFAULT_HOTLINE_CONFIG,
  forcedNumber?: number,
  forcedMultiplier?: number
): HotlineEngineResult {
  const revealedNumber = generateRevealedNumber(config.minNumber, config.maxNumber, forcedNumber);
  let stoppingMultiplier = generateStoppingMultiplier(config.baseRtp, config.maxMultiplier, forcedMultiplier);

  const diff = Math.abs(selectedNumber - revealedNumber);
  const isDirectHit = diff === 0;
  const isHotZone = diff > 0 && diff <= 3;

  let bonusMultiplier = 1.0;
  if (isDirectHit) {
    bonusMultiplier = 2.0;
    // Boost stopping multiplier on direct hit
    stoppingMultiplier = Math.min(
      config.maxMultiplier,
      Math.round(stoppingMultiplier * bonusMultiplier * 100) / 100
    );
  } else if (isHotZone) {
    bonusMultiplier = 1.25;
    stoppingMultiplier = Math.min(
      config.maxMultiplier,
      Math.round(stoppingMultiplier * bonusMultiplier * 100) / 100
    );
  }

  // Duration for multiplier to rise: ~2000ms for 2x, logarithmic growth
  // t = 1500 * ln(M) + 1200 ms
  const durationMs = Math.min(
    25000,
    Math.max(1500, Math.round(1800 * Math.log(Math.max(1.05, stoppingMultiplier)) + 1200))
  );

  return {
    revealedNumber,
    stoppingMultiplier,
    isDirectHit,
    isHotZone,
    bonusMultiplier,
    durationMs,
  };
}

/**
 * Validates player bet and number selection
 */
export function validateHotlineBet(
  bet: number,
  selectedNumber: number,
  config: HotlineConfig = DEFAULT_HOTLINE_CONFIG
): { isValid: boolean; error?: string } {
  if (!config.isEnabled) {
    return { isValid: false, error: 'Treasure Hotline is currently disabled by administrator' };
  }
  if (isNaN(bet) || bet < config.minBet || bet > config.maxBet) {
    return {
      isValid: false,
      error: `Bet amount must be between ₹${config.minBet} and ₹${config.maxBet}`,
    };
  }
  if (
    !Number.isInteger(selectedNumber) ||
    selectedNumber < config.minNumber ||
    selectedNumber > config.maxNumber
  ) {
    return {
      isValid: false,
      error: `Selected number must be an integer between ${config.minNumber} and ${config.maxNumber}`,
    };
  }
  return { isValid: true };
}

/**
 * Validates Cash Out request against stopping multiplier
 */
export function validateHotlineCashout(
  requestedMultiplier: number,
  stoppingMultiplier: number,
  betAmount: number
): {
  isValid: boolean;
  settledMultiplier: number;
  payout: number;
  profit: number;
  error?: string;
} {
  if (isNaN(requestedMultiplier) || requestedMultiplier < 1.0) {
    return {
      isValid: false,
      settledMultiplier: 0,
      payout: 0,
      profit: 0,
      error: 'Invalid requested cashout multiplier',
    };
  }

  // If requested multiplier exceeded server stopping point, round is already bust
  if (requestedMultiplier > stoppingMultiplier) {
    return {
      isValid: false,
      settledMultiplier: 0,
      payout: 0,
      profit: -betAmount,
      error: `Multiplier already stopped at ${stoppingMultiplier.toFixed(2)}x before cashout`,
    };
  }

  const settledMultiplier = Math.round(requestedMultiplier * 100) / 100;
  const payout = Math.round(betAmount * settledMultiplier * 100) / 100;
  const profit = Math.round((payout - betAmount) * 100) / 100;

  return {
    isValid: true,
    settledMultiplier,
    payout,
    profit,
  };
}

