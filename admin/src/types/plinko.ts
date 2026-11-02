export type PlinkoRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type PlinkoRows = 8 | 12 | 16;

export interface PlinkoConfig {
  minBet: number;
  maxBet: number;
  rtp: number;
  allowedRows: PlinkoRows[];
  allowedRisks: PlinkoRisk[];
  multiplierTables: Record<PlinkoRows, Record<PlinkoRisk, number[]>>;
  theoreticalRtp?: Record<string, number>;
}

export interface PlinkoRoundResult {
  roundId: string;
  betAmount: number;
  rows: PlinkoRows;
  risk: PlinkoRisk;
  path: number[]; // 0 for Left, 1 for Right at each row pin
  slotIndex: number;
  multiplier: number;
  payout: number;
  profit: number;
  isWin: boolean;
  balance: number;
}

export interface PlinkoHistoryItem {
  id: string;
  betAmount: number;
  payout: number;
  multiplier: number;
  rows: PlinkoRows;
  risk: PlinkoRisk;
  slotIndex: number;
  createdAt: string;
}

export interface PlinkoDropPayload {
  bet?: number;
  betAmount?: number;
  rows?: PlinkoRows;
  risk?: PlinkoRisk;
  demoToken?: string;
  idempotencyKey?: string;
  forcedSlot?: number;
}

