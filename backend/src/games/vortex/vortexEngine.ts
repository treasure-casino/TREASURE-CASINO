import { randomInt, randomUUID } from 'crypto';

export type ElementType = 'FIRE' | 'WATER' | 'EARTH' | 'WIND' | 'SKULL';

export interface VortexLevels {
  fire: number;
  water: number;
  earth: number;
}

export interface VortexHistoryItem {
  element: ElementType;
  multiplier: number;
  timestamp: number;
}

export interface VortexState {
  roundId: string;
  balance: number;
  bet: number;
  levels: VortexLevels;
  multiplier: number;
  active: boolean;
  lastElement: ElementType | null;
  bonusTriggered: boolean;
  message: string;
  history: VortexHistoryItem[];
}

export const FIRE = [3, 5, 9, 16, 28, 45, 70];
export const WATER = [1.5, 2.2, 3.5, 5];
export const EARTH = [2, 3.5, 6, 10, 16, 25];

// Bonus Rule: Convergence of all 3 elements gives a +2.0x one-time boost
export const CONVERGENCE_BONUS_BOOST = 2.0;

export function calculateMultiplier(levels: VortexLevels, bonusTriggered = false): number {
  const fireVal = levels.fire > 0 ? FIRE[Math.min(levels.fire - 1, FIRE.length - 1)] : 1;
  const waterVal = levels.water > 0 ? WATER[Math.min(levels.water - 1, WATER.length - 1)] : 1;
  const earthVal = levels.earth > 0 ? EARTH[Math.min(levels.earth - 1, EARTH.length - 1)] : 1;

  const base = Math.max(1, fireVal, waterVal, earthVal);
  const bonus = bonusTriggered ? CONVERGENCE_BONUS_BOOST : 0;
  return +(base + bonus).toFixed(2);
}

export function randomElement(): ElementType {
  const elements: ElementType[] = ['FIRE', 'WATER', 'EARTH', 'WIND', 'SKULL'];
  return elements[randomInt(elements.length)];
}

export function createVortexState(
  balance: number,
  bet: number,
  roundId?: string
): VortexState {
  if (!Number.isFinite(balance) || !Number.isFinite(bet)) {
    throw new Error('Invalid balance or bet');
  }

  if (bet <= 0 || bet > balance) {
    throw new Error('Invalid bet amount');
  }

  return {
    roundId: roundId || randomUUID(),
    balance,
    bet,
    levels: { fire: 0, water: 0, earth: 0 },
    multiplier: 1,
    active: false,
    lastElement: null,
    bonusTriggered: false,
    message: 'Ready to start',
    history: [],
  };
}

export function startVortexRound(state: VortexState): VortexState {
  if (state.active) {
    throw new Error('Round already active');
  }

  if (state.bet <= 0 || state.bet > state.balance) {
    throw new Error('Insufficient balance');
  }

  return {
    ...state,
    balance: +(state.balance - state.bet).toFixed(2),
    levels: { fire: 0, water: 0, earth: 0 },
    multiplier: 1,
    active: true,
    lastElement: null,
    bonusTriggered: false,
    message: 'Vortex started',
    history: [],
  };
}

export function spinVortex(
  state: VortexState,
  forcedElement?: ElementType
): VortexState {
  if (!state.active) {
    throw new Error('No active round');
  }

  const element = forcedElement || randomElement();
  const levels: VortexLevels = { ...state.levels };
  let message = `${element} activated`;
  let bonusTriggered = state.bonusTriggered;

  switch (element) {
    case 'FIRE':
      levels.fire = Math.min(levels.fire + 1, FIRE.length);
      break;

    case 'WATER':
      levels.water = Math.min(levels.water + 1, WATER.length);
      break;

    case 'EARTH':
      levels.earth = Math.min(levels.earth + 1, EARTH.length);
      break;

    case 'WIND':
      message = 'Wind boost activated';
      break;

    case 'SKULL':
      // Priority: FIRE, then EARTH, then WATER
      if (levels.fire > 0) {
        levels.fire--;
        message = 'Skull reduced Fire level';
      } else if (levels.earth > 0) {
        levels.earth--;
        message = 'Skull reduced Earth level';
      } else if (levels.water > 0) {
        levels.water--;
        message = 'Skull reduced Water level';
      } else {
        message = 'Skull appeared (no elemental levels to reduce)';
      }
      break;
  }

  // Check Convergence Bonus Trigger (all 3 elements >= 1 and not previously triggered)
  if (!bonusTriggered && levels.fire >= 1 && levels.water >= 1 && levels.earth >= 1) {
    bonusTriggered = true;
    message = `${message} — Convergence Bonus Triggered (+${CONVERGENCE_BONUS_BOOST}x)!`;
  }

  const multiplier = calculateMultiplier(levels, bonusTriggered);

  return {
    ...state,
    levels,
    multiplier,
    lastElement: element,
    bonusTriggered,
    message,
    history: [
      {
        element,
        multiplier,
        timestamp: Date.now(),
      },
      ...state.history,
    ].slice(0, 20),
  };
}

export function collectVortex(state: VortexState): VortexState {
  if (!state.active) {
    throw new Error('No active round');
  }

  const payout = Math.floor(state.bet * state.multiplier);

  return {
    ...state,
    balance: +(state.balance + payout).toFixed(2),
    active: false,
    message: `Collected ${payout}`,
    history: state.history,
  };
}

