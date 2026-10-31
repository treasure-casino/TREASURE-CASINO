export type SpiralSymbol = 'LION' | 'ELEPHANT' | 'DOG' | 'GOAT' | 'SKULL';

export interface SpiralBonusEvent {
  ring: 'INNER' | 'MIDDLE' | 'OUTER';
  type: string;
  bonusAmount: number;
  description: string;
}

export interface SpiralHistoryEvent {
  id: string;
  spinNumber: number;
  symbol: SpiralSymbol;
  innerBefore: number;
  middleBefore: number;
  outerBefore: number;
  innerAfter: number;
  middleAfter: number;
  outerAfter: number;
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
  hasStarted: boolean;
  innerIndex?: number | null; // null when unstarted, 1 to 4 once activated
  middleIndex?: number | null; // null when unstarted, 1 to 6 once activated
  outerIndex?: number | null; // null when unstarted, 1 to 8 once activated
  innerPosition: number | null; // null when unstarted, 1 to 4 once activated
  middlePosition: number | null; // null when unstarted, 1 to 6 once activated
  outerPosition: number | null; // null when unstarted, 1 to 8 once activated
  innerMultiplier: number;
  middleMultiplier: number;
  outerMultiplier: number;
  activeOuter: boolean;
  activeMiddle: boolean;
  activeInner: boolean;
  ringPosition?: { inner: number | null; middle: number | null; outer: number | null };
  sectionMultiplier?: { inner: number; middle: number; outer: number };
  earnedMultiplier?: number;
  bonusMultiplier?: number;
  potentialPayout?: number;
  accumulatedBonus?: number;
  totalMultiplier: number;
  isBetLocked?: boolean;
  lastSymbol: SpiralSymbol | null;
  lastBonus?: SpiralBonusEvent | null;
  active: boolean;
  halfCashedOut: boolean;
  halfCashoutAmount: number;
  payout: number;
  status: 'READY' | 'ACTIVE' | 'WON' | 'HALF_WON' | 'CRASHED';
  isCrash: boolean;
  spinCount: number;
  history: SpiralHistoryEvent[];
}

export interface SpiralRoundStats {
  id: string;
  bet: number;
  payout: number;
  multiplier: number;
  status: string;
  innerPosition: number;
  middlePosition: number;
  outerPosition: number;
  lastSymbol: SpiralSymbol | null;
  lastBonus?: SpiralBonusEvent | null;
  accumulatedBonus?: number;
  spinCount?: number;
  halfCashedOut: boolean;
  eventsCount?: number;
  startedAt: string;
  settledAt: string | null;
}
