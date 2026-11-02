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
  higherMultiplier: number | null;
  lowerMultiplier: number | null;
  sameMultiplier: number | null;
  higherWinChance: number;
  lowerWinChance: number;
  sameWinChance: number;
}

export interface HiloConfig {
  minBet: number;
  maxBet: number;
  baseRtp: number;
  allowSame: boolean;
  isEnabled: boolean;
  maxStreak: number;
}

export const DEFAULT_HILO_CONFIG: HiloConfig = {
  minBet: 10,
  maxBet: 5000,
  baseRtp: 0.96,
  allowSame: true,
  isEnabled: true,
  maxStreak: 30,
};

export interface HiloStepHistory {
  card: HiloCard;
  prediction?: HiloPrediction;
  outcome?: 'START' | 'WIN' | 'LOSS' | 'PUSH';
  multiplierApplied?: number;
  accumulatedMultiplier?: number;
}

export interface HiloRoundState {
  roundId: string;
  betAmount: number;
  status: 'ACTIVE' | 'WON' | 'LOST' | 'PUSH';
  currentCard: HiloCard;
  nextMultipliers: NextCardMultipliers;
  streak: number;
  accumulatedMultiplier: number;
  potentialPayout: number;
  revealedCard: HiloCard | null;
  stepOutcome: HiloStepOutcome | null;
  message: string;
  history: HiloStepHistory[];
  canHigher: boolean;
  canLower: boolean;
  canSame: boolean;
  canCollect: boolean;
  balance: number;
}

export interface HiloHistoryItem {
  id: string;
  status: 'ACTIVE' | 'WON' | 'LOST' | 'PUSH';
  betAmount: number;
  payout: number;
  multiplier: number;
  streak: number;
  currentCard: HiloCard;
  history: HiloStepHistory[];
  startedAt: string;
  settledAt?: string;
}

export interface HiloAdminStats {
  config: HiloConfig;
  totalRounds: number;
  totalBets: number;
  totalPayouts: number;
  actualRtp: number;
  recentRounds: Array<{
    id: string;
    bet: number;
    payout: number;
    multiplier: number;
    status: string;
    createdAt: string;
    details: any;
  }>;
}

