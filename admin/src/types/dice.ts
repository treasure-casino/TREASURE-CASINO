export type DiceMode = 'ROLL_UNDER' | 'ROLL_OVER';

export interface DiceConfig {
  rtp: number;
  minTarget: number;
  maxTarget: number;
  minBet: number;
  maxBet: number;
  maxMultiplier: number;
  houseEdge: number;
  gameId: string;
  isDemo: boolean;
  isActive: boolean;
}

export interface DiceRollResult {
  roundId: string;
  betAmount: number;
  target: number;
  mode: DiceMode;
  outcome: number;
  winChance: number;
  multiplier: number;
  isWin: boolean;
  payout: number;
  netProfit: number;
  balance: number;
  timestamp: number;
  idempotencyReplay?: boolean;
}

export interface DiceHistoryItem {
  id: string;
  roundId: string;
  betAmount: number;
  multiplier: number;
  outcome: number;
  target: number;
  mode: DiceMode;
  isWin: boolean;
  payout: number;
  winChance: number;
  timestamp: number;
}

