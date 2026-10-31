import { randomInt, randomUUID } from 'crypto';

export type SpiralSymbol = 'LION' | 'ELEPHANT' | 'DOG' | 'GOAT' | 'SKULL';

export interface SpiralLevels {
  innerIndex: number | null;
  middleIndex: number | null;
  outerIndex: number | null;
  // Aliases for backwards compatibility
  innerPosition?: number | null;
  middlePosition?: number | null;
  outerPosition?: number | null;
}

export interface SpiralBonusEvent {
  ring: 'INNER' | 'MIDDLE' | 'OUTER';
  type: string;
  bonusAmount: number;
  description: string;
}

export interface SpiralHistoryEvent {
  id: string;
  roundId?: string;
  spinNumber: number;
  symbol: SpiralSymbol;
  prevSymbol?: SpiralSymbol | null;
  innerBefore: number | null;
  middleBefore: number | null;
  outerBefore: number | null;
  innerAfter: number | null;
  middleAfter: number | null;
  outerAfter: number | null;
  multBefore: number;
  multAfter: number;
  bonus: SpiralBonusEvent | null;
  payout: number;
  timestamp: number;
  idempotencyKey?: string;
}

export interface SpiralState {
  roundId: string;
  betAmount: number;
  totalBetsDeducted: number;
  hasStarted: boolean; // false before any advancing spin

  // STEP 1: Three Independent Multiplier Tracks
  outerIndex: number | null; // null when unstarted, 0 to 7 once activated
  middleIndex: number | null; // null when unstarted, 0 to 5 once activated
  innerIndex: number | null; // null when unstarted, 0 to 3 once activated

  // Backwards compatibility aliases
  outerPosition: number | null;
  middlePosition: number | null;
  innerPosition: number | null;

  outerMultiplier: number; // Active outer multiplier (0 when neutral)
  middleMultiplier: number; // Active middle multiplier (0 when neutral)
  innerMultiplier: number; // Active inner multiplier (0 when neutral)

  activeOuter: boolean; // false when neutral, true when active
  activeMiddle: boolean; // false when neutral, true when active
  activeInner: boolean; // false when neutral, true when active

  ringPosition: { inner: number | null; middle: number | null; outer: number | null };
  sectionMultiplier: { inner: number; middle: number; outer: number };

  accumulatedBonus: number;
  earnedMultiplier: number;
  bonusMultiplier: number;
  totalMultiplier: number; // 0.00x before first spin
  potentialPayout: number; // 0 before first spin

  lastSymbol: SpiralSymbol | null;
  prevSymbol?: SpiralSymbol | null;
  active: boolean;
  halfCashedOut: boolean;
  halfCashoutAmount: number;
  payout: number;
  status: 'READY' | 'ACTIVE' | 'WON' | 'HALF_WON' | 'CRASHED';
  isCrash: boolean;
  spinCount: number;
  lastBonus: SpiralBonusEvent | null;
  innerBonusAwarded: boolean;
  middleBonusAwarded: boolean;
  outerBonusAwarded: boolean;
  isBetLocked: boolean;
  history: SpiralHistoryEvent[];
}

// ─── 18 FIXED SECTOR MULTIPLIERS (CLOCKWISE FROM 12 O'CLOCK) ───────────────
export const INNER_MULTIPLIERS = [1.55, 4.85, 10, 7]; // 4 sections: 1-3 multipliers, sec 4 triggers +7x bonus
export const MIDDLE_MULTIPLIERS = [2.5, 7.7, 16, 27, 44, 20.5]; // 6 sections: 1-5 multipliers, sec 6 triggers +20.5x bonus
export const OUTER_MULTIPLIERS = [3.9, 12.5, 28, 52, 85, 133, 200, 700]; // 8 sections: 1-7 multipliers, sec 8 triggers 700x bonus

// Centrally configured symbol probabilities (PRD Section 3)
// LION: 12%, ELEPHANT: 12%, DOG: 11% (Combined 35%)
// GOAT: 33%, SKULL: 32% (Combined 65%)
export const SYMBOL_PROBABILITIES: Record<SpiralSymbol, number> = {
  LION: 12,
  ELEPHANT: 12,
  DOG: 11,
  GOAT: 33,
  SKULL: 32,
};

export const INITIAL_TOTAL_MULTIPLIER = 0.0;

/**
 * Generate a symbol using cryptographically secure RNG matching exact PRD probabilities
 */
export function generateSymbol(): SpiralSymbol {
  const roll = randomInt(100); // 0 to 99
  if (roll < 12) return 'LION'; // 12% [0..11]
  if (roll < 24) return 'ELEPHANT'; // 12% [12..23]
  if (roll < 35) return 'DOG'; // 11% [24..34]
  if (roll < 68) return 'GOAT'; // 33% [35..67]
  return 'SKULL'; // 32% [68..99]
}

/**
 * STEP 1: Create initial clean neutral state before any spin.
 * - All indices = null
 * - All multipliers = 0
 * - Total Multiplier = 0.00x
 * - Potential payout = 0
 * - Never initialize Section 1 automatically.
 */
export function createSpiralState(betAmount: number, roundId?: string): SpiralState {
  return {
    roundId: roundId || randomUUID(),
    betAmount,
    totalBetsDeducted: 0,
    hasStarted: false,
    outerIndex: null,
    middleIndex: null,
    innerIndex: null,
    outerPosition: null,
    middlePosition: null,
    innerPosition: null,
    outerMultiplier: 0,
    middleMultiplier: 0,
    innerMultiplier: 0,
    activeOuter: false,
    activeMiddle: false,
    activeInner: false,
    ringPosition: { inner: null, middle: null, outer: null },
    sectionMultiplier: { inner: 0, middle: 0, outer: 0 },
    accumulatedBonus: 0,
    earnedMultiplier: 0,
    bonusMultiplier: 0,
    totalMultiplier: 0,
    potentialPayout: 0,
    lastSymbol: null,
    prevSymbol: null,
    active: true,
    halfCashedOut: false,
    halfCashoutAmount: 0,
    payout: 0,
    status: 'ACTIVE',
    isCrash: false,
    spinCount: 0,
    lastBonus: null,
    innerBonusAwarded: false,
    middleBonusAwarded: false,
    outerBonusAwarded: false,
    isBetLocked: false,
    history: [],
  };
}

/**
 * STEP 4 & STEP 5: Authoritative Central Calculation Function
 *
 * calculateSpiralState(previousState, symbol)
 *
 * 1. Reads the previous authoritative state.
 * 2. Applies exactly one symbol transition.
 * 3. Updates only the corresponding circle.
 * 4. Recalculates all derived values from the resulting state.
 * 5. Returns one complete consistent state.
 * 6. Never mutates the original state.
 * 7. Never adds old multipliers to new multipliers.
 * 8. Never stores Total Multiplier as an independently incrementing variable.
 *
 * AUTHORITATIVE TOTAL MULTIPLIER FORMULA:
 * - Total Multiplier = sum of the active current multipliers of Outer + Middle + Inner (+ accumulated bonus).
 * - Goat: Total remains exactly unchanged.
 * - Skull: Recalculates using new section indexes after moving backward one step.
 * - Bonus: Section 4 / 6 / 8 bonuses are accumulated in accumulatedBonus and rings step backward without duplicate bonus.
 */
export function calculateSpiralState(
  previousState: SpiralState,
  symbol: SpiralSymbol,
  additionalBet = 0,
  idempotencyKey?: string
): SpiralState {
  if (!previousState.active) {
    throw new Error('Round is not active');
  }

  // Clone to guarantee immutability (Rule 6: Never mutate the original state)
  const next: SpiralState = {
    ...previousState,
    history: [...previousState.history],
  };

  next.spinCount++;
  next.totalBetsDeducted += additionalBet;
  next.prevSymbol = previousState.lastSymbol;
  next.lastSymbol = symbol;

  const innerBefore = previousState.innerIndex ?? previousState.innerPosition ?? null;
  const middleBefore = previousState.middleIndex ?? previousState.middlePosition ?? null;
  const outerBefore = previousState.outerIndex ?? previousState.outerPosition ?? null;
  const multBefore = previousState.totalMultiplier;

  let innerIdx = innerBefore;
  let middleIdx = middleBefore;
  let outerIdx = outerBefore;
  let bonusEvent: SpiralBonusEvent | null = null;
  let accumulatedBonus = previousState.accumulatedBonus ?? 0;
  let innerBonusAwarded = previousState.innerBonusAwarded ?? false;
  let middleBonusAwarded = previousState.middleBonusAwarded ?? false;
  let outerBonusAwarded = previousState.outerBonusAwarded ?? false;

  // ─── STEP 3: STRICT SYMBOL MAPPING ───────────────────────────────────────
  switch (symbol) {
    case 'GOAT':
      // Return exactly the previous state. Absolutely NO multiplier, index, total, bonus, or indicator changes.
      next.innerIndex = innerBefore;
      next.middleIndex = middleBefore;
      next.outerIndex = outerBefore;
      next.innerPosition = innerBefore;
      next.middlePosition = middleBefore;
      next.outerPosition = outerBefore;
      next.innerMultiplier = previousState.innerMultiplier;
      next.middleMultiplier = previousState.middleMultiplier;
      next.outerMultiplier = previousState.outerMultiplier;
      next.activeOuter = outerBefore !== null;
      next.activeMiddle = middleBefore !== null;
      next.activeInner = innerBefore !== null;
      next.totalMultiplier = multBefore;
      next.potentialPayout = previousState.potentialPayout;
      next.isBetLocked = previousState.active && multBefore > 0;
      next.lastBonus = null;

      // Section 6 Logging for GOAT
      if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SPIRAL === 'true') {
        console.log(`[SPIRAL TRANSITION] Round ID: ${next.roundId}`);
        console.log(`  Previous symbol: ${previousState.lastSymbol ?? 'NONE'} | Current symbol: GOAT`);
        console.log(`  Previous outerIndex: ${outerBefore} -> New outerIndex: ${outerBefore} (${previousState.outerMultiplier}x)`);
        console.log(`  Previous middleIndex: ${middleBefore} -> New middleIndex: ${middleBefore} (${previousState.middleMultiplier}x)`);
        console.log(`  Previous innerIndex: ${innerBefore} -> New innerIndex: ${innerBefore} (${previousState.innerMultiplier}x)`);
        console.log(`  Previous Total Multiplier: ${multBefore.toFixed(2)}x -> New Total Multiplier: ${multBefore.toFixed(2)}x`);
        console.log(`  Bonus event: NONE`);
        console.log(`  Payout: ₹${next.potentialPayout}`);
      }

      // Append spin history event
      next.history.unshift({
        id: randomUUID(),
        roundId: next.roundId,
        spinNumber: next.spinCount,
        symbol: 'GOAT',
        prevSymbol: previousState.lastSymbol,
        innerBefore,
        middleBefore,
        outerBefore,
        innerAfter: innerBefore,
        middleAfter: middleBefore,
        outerAfter: outerBefore,
        multBefore,
        multAfter: multBefore,
        bonus: null,
        payout: 0,
        timestamp: Date.now(),
        idempotencyKey,
      });

      return next;

    case 'LION':
      // outerIndex = outerIndex === null ? 0 : outerIndex + 1
      // Middle and Inner unchanged
      next.hasStarted = true;
      if (outerIdx === null) {
        outerIdx = 0;
      } else if (!outerBonusAwarded) {
        outerIdx = Math.min(7, outerIdx + 1);
      } else {
        // Outer bonus already awarded this round; capped at section 6 (200x)
        outerIdx = Math.min(6, outerIdx + 1);
      }
      break;

    case 'ELEPHANT':
      // middleIndex = middleIndex === null ? 0 : middleIndex + 1
      // Outer and Inner unchanged
      next.hasStarted = true;
      if (middleIdx === null) {
        middleIdx = 0;
      } else if (!middleBonusAwarded) {
        middleIdx = Math.min(5, middleIdx + 1);
      } else {
        // Middle bonus already awarded this round; capped at section 4 (44x)
        middleIdx = Math.min(4, middleIdx + 1);
      }
      break;

    case 'DOG':
      // innerIndex = innerIndex === null ? 0 : innerIndex + 1
      // Outer and Middle unchanged
      next.hasStarted = true;
      if (innerIdx === null) {
        innerIdx = 0;
      } else if (!innerBonusAwarded) {
        innerIdx = Math.min(3, innerIdx + 1);
      } else {
        // Inner bonus already awarded this round; capped at section 2 (10x)
        innerIdx = Math.min(2, innerIdx + 1);
      }
      break;

    case 'SKULL':
      // For every ACTIVE circle:
      // - Decrease its index by exactly 1.
      // - If index is greater than 0, move to index - 1.
      // - If index is 0, apply documented minimum-boundary behavior (move to null).
      // - Inactive circles (null) remain null (never negative, never activated).
      next.hasStarted = true;
      if (innerIdx !== null) {
        innerIdx = innerIdx > 0 ? innerIdx - 1 : null;
      }
      if (middleIdx !== null) {
        middleIdx = middleIdx > 0 ? middleIdx - 1 : null;
      }
      if (outerIdx !== null) {
        outerIdx = outerIdx > 0 ? outerIdx - 1 : null;
      }
      break;
  }

  // ─── STEP 6: BONUS SECTIONS (EXPLICIT BONUS RULES, NO DUPLICATE BONUS) ───
  // Inner final section: +7x BONUS (index 3 is Section 4)
  if (symbol === 'DOG' && innerIdx === 3 && !innerBonusAwarded) {
    bonusEvent = {
      ring: 'INNER',
      type: 'INNER_BONUS',
      bonusAmount: 7,
      description: 'Inner Ring Section 4 Bonus: +7x awarded! Ring steps backward.',
    };
    accumulatedBonus = +(accumulatedBonus + 7).toFixed(2);
    innerBonusAwarded = true;
    innerIdx = 2; // Step back by 1 to index 2 (10x)
  }

  // Middle final section: +20.5x BONUS (index 5 is Section 6)
  if (symbol === 'ELEPHANT' && middleIdx === 5 && !middleBonusAwarded) {
    bonusEvent = {
      ring: 'MIDDLE',
      type: 'MIDDLE_BONUS',
      bonusAmount: 20.5,
      description: 'Middle Ring Section 6 Bonus: +20.5x awarded! Ring steps backward.',
    };
    accumulatedBonus = +(accumulatedBonus + 20.5).toFixed(2);
    middleBonusAwarded = true;
    middleIdx = 4; // Step back by 1 to index 4 (44x)
  }

  // Outer final section: 700x BONUS (index 7 is Section 8)
  if (symbol === 'LION' && outerIdx === 7 && !outerBonusAwarded) {
    bonusEvent = {
      ring: 'OUTER',
      type: 'OUTER_BONUS',
      bonusAmount: 700,
      description: 'Outer Ring Section 8 MEGA BONUS: 700x awarded! Ring steps backward.',
    };
    accumulatedBonus = +(accumulatedBonus + 700).toFixed(2);
    outerBonusAwarded = true;
    outerIdx = 6; // Step back by 1 to index 6 (200x)
  }

  // ─── TRACK MULTIPLIER DERIVATIONS ─────────────────────────────────────────
  const innerMultiplier =
    innerIdx !== null && innerIdx >= 0 && innerIdx < INNER_MULTIPLIERS.length
      ? INNER_MULTIPLIERS[innerIdx]
      : 0;
  const middleMultiplier =
    middleIdx !== null && middleIdx >= 0 && middleIdx < MIDDLE_MULTIPLIERS.length
      ? MIDDLE_MULTIPLIERS[middleIdx]
      : 0;
  const outerMultiplier =
    outerIdx !== null && outerIdx >= 0 && outerIdx < OUTER_MULTIPLIERS.length
      ? OUTER_MULTIPLIERS[outerIdx]
      : 0;

  // ─── STEP 4: AUTHORITATIVE TOTAL MULTIPLIER FORMULA ──────────────────────
  // For ordinary active sections:
  // Total Multiplier = sum of the active current multipliers of Outer + Middle + Inner (+ accumulatedBonus).
  // Recalculated from actual active circle states after EVERY confirmed symbol.
  const earnedMultiplier = +(
    (outerIdx !== null ? outerMultiplier : 0) +
    (middleIdx !== null ? middleMultiplier : 0) +
    (innerIdx !== null ? innerMultiplier : 0)
  ).toFixed(2);

  const newTotalMultiplier = next.hasStarted
    ? +(earnedMultiplier + accumulatedBonus).toFixed(2)
    : 0.0;

  // Potential payout in simulated INR
  const potentialPayout = Math.round(next.betAmount * newTotalMultiplier);

  // Apply updated fields to next state
  next.innerIndex = innerIdx;
  next.middleIndex = middleIdx;
  next.outerIndex = outerIdx;
  next.innerPosition = innerIdx;
  next.middlePosition = middleIdx;
  next.outerPosition = outerIdx;

  next.innerMultiplier = innerMultiplier;
  next.middleMultiplier = middleMultiplier;
  next.outerMultiplier = outerMultiplier;
  next.activeOuter = outerIdx !== null;
  next.activeMiddle = middleIdx !== null;
  next.activeInner = innerIdx !== null;

  next.ringPosition = { inner: innerIdx, middle: middleIdx, outer: outerIdx };
  next.sectionMultiplier = { inner: innerMultiplier, middle: middleMultiplier, outer: outerMultiplier };

  next.innerBonusAwarded = innerBonusAwarded;
  next.middleBonusAwarded = middleBonusAwarded;
  next.outerBonusAwarded = outerBonusAwarded;

  next.accumulatedBonus = accumulatedBonus;
  next.earnedMultiplier = earnedMultiplier;
  next.bonusMultiplier = accumulatedBonus;
  next.totalMultiplier = newTotalMultiplier;
  next.potentialPayout = potentialPayout;
  next.lastBonus = bonusEvent;
  next.isBetLocked = next.active && newTotalMultiplier > 0;

  // ─── STEP 6: TRANSITION LOGGING ──────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production' || process.env.DEBUG_SPIRAL === 'true') {
    console.log(`[SPIRAL TRANSITION] Round ID: ${next.roundId}`);
    console.log(`  Previous symbol: ${previousState.lastSymbol ?? 'NONE'} | Current symbol: ${symbol}`);
    console.log(`  Previous outerIndex: ${outerBefore} -> New outerIndex: ${outerIdx} (${outerMultiplier}x)`);
    console.log(`  Previous middleIndex: ${middleBefore} -> New middleIndex: ${middleIdx} (${middleMultiplier}x)`);
    console.log(`  Previous innerIndex: ${innerBefore} -> New innerIndex: ${innerIdx} (${innerMultiplier}x)`);
    console.log(`  Previous Total Multiplier: ${multBefore.toFixed(2)}x -> New Total Multiplier: ${newTotalMultiplier.toFixed(2)}x`);
    console.log(`  Bonus event: ${bonusEvent ? `${bonusEvent.type} (+${bonusEvent.bonusAmount}x)` : 'NONE'}`);
    console.log(`  Payout: ₹${potentialPayout}`);
  }

  // History tracking
  next.history.unshift({
    id: randomUUID(),
    roundId: next.roundId,
    spinNumber: next.spinCount,
    symbol,
    prevSymbol: previousState.lastSymbol,
    innerBefore,
    middleBefore,
    outerBefore,
    innerAfter: innerIdx,
    middleAfter: middleIdx,
    outerAfter: outerIdx,
    multBefore,
    multAfter: newTotalMultiplier,
    bonus: bonusEvent,
    payout: 0,
    timestamp: Date.now(),
    idempotencyKey,
  });

  return next;
}

/**
 * applySpinTurn: alias for calculateSpiralState to ensure complete compatibility
 */
export function applySpinTurn(
  state: SpiralState,
  symbol: SpiralSymbol,
  additionalBet = 0,
  idempotencyKey?: string
): SpiralState {
  return calculateSpiralState(state, symbol, additionalBet, idempotencyKey);
}

/**
 * calculateMultipliers helper: exports derivation for testing/inspecting
 */
export function calculateMultipliers(
  innerPos: number | null,
  middlePos: number | null,
  outerPos: number | null,
  accumulatedBonus = 0,
  hasStarted = false
) {
  const innerMultiplier =
    innerPos !== null && innerPos >= 0 && innerPos < INNER_MULTIPLIERS.length
      ? INNER_MULTIPLIERS[innerPos]
      : 0;
  const middleMultiplier =
    middlePos !== null && middlePos >= 0 && middlePos < MIDDLE_MULTIPLIERS.length
      ? MIDDLE_MULTIPLIERS[middlePos]
      : 0;
  const outerMultiplier =
    outerPos !== null && outerPos >= 0 && outerPos < OUTER_MULTIPLIERS.length
      ? OUTER_MULTIPLIERS[outerPos]
      : 0;

  const ringPosition = { inner: innerPos, middle: middlePos, outer: outerPos };
  const sectionMultiplier = { inner: innerMultiplier, middle: middleMultiplier, outer: outerMultiplier };

  if (!hasStarted) {
    return {
      ringPosition,
      sectionMultiplier,
      earnedMultiplier: 0,
      bonusMultiplier: 0,
      totalMultiplier: 0,
      innerMultiplier: 0,
      middleMultiplier: 0,
      outerMultiplier: 0,
    };
  }

  // Authoritative: sum of the active current multipliers of Outer + Middle + Inner
  const earnedMultiplier = +(
    (outerPos !== null ? outerMultiplier : 0) +
    (middlePos !== null ? middleMultiplier : 0) +
    (innerPos !== null ? innerMultiplier : 0)
  ).toFixed(2);

  const totalMultiplier = +(earnedMultiplier + accumulatedBonus).toFixed(2);

  return {
    ringPosition,
    sectionMultiplier,
    earnedMultiplier,
    bonusMultiplier: accumulatedBonus,
    totalMultiplier,
    innerMultiplier,
    middleMultiplier,
    outerMultiplier,
  };
}

/**
 * STEP 8: Cash Out and Payout Functions
 */
export function halfCashOutSpiral(state: SpiralState): {
  state: SpiralState;
  creditedAmount: number;
} {
  if (!state.active) {
    throw new Error('Round is not active');
  }

  if (state.totalMultiplier <= 0) {
    throw new Error('No earned multiplier to cash out yet');
  }

  if (state.halfCashedOut) {
    throw new Error('Half cashout already claimed for this round');
  }

  const currentTotalPotential = Math.floor(state.betAmount * state.totalMultiplier);
  const halfAmount = Math.floor(currentTotalPotential * 0.5);

  const next: SpiralState = {
    ...state,
    halfCashedOut: true,
    halfCashoutAmount: halfAmount,
    status: 'HALF_WON',
    isBetLocked: state.active && state.totalMultiplier > 0,
  };

  return {
    state: next,
    creditedAmount: halfAmount,
  };
}

export function fullCashOutSpiral(state: SpiralState): {
  state: SpiralState;
  finalPayout: number;
  totalPayout: number;
} {
  if (!state.active) {
    throw new Error('Round is not active');
  }

  if (state.totalMultiplier <= 0) {
    throw new Error('No earned multiplier to cash out yet');
  }

  const currentTotalPotential = Math.floor(state.betAmount * state.totalMultiplier);
  let finalPayout: number;

  if (state.halfCashedOut) {
    finalPayout = Math.floor(currentTotalPotential * 0.5);
  } else {
    finalPayout = currentTotalPotential;
  }

  const totalPayout = finalPayout + state.halfCashoutAmount;

  const next: SpiralState = {
    ...state,
    active: false,
    payout: totalPayout,
    status: 'WON',
    isBetLocked: false,
  };

  return {
    state: next,
    finalPayout,
    totalPayout,
  };
}
