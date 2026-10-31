export interface LimboConfig {
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

export interface LimboRollResult {
  roundId: string;
  betAmount: number;
  targetMultiplier: number;
  resultMultiplier: number;
  winChance: number;
  isWin: boolean;
  payout: number;
  netProfit: number;
  balance: number;
  timestamp: number;
  idempotencyReplay?: boolean;
}

export interface LimboHistoryItem {
  id: string;
  roundId: string;
  betAmount: number;
  multiplier: number;
  resultMultiplier: number;
  targetMultiplier: number;
  isWin: boolean;
  payout: number;
  winChance: number;
  timestamp: number;
}

