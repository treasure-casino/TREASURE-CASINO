export type KenoPayoutTable = Record<number, Record<number, number>>;

export const DEFAULT_KENO_PAYOUT_TABLE: KenoPayoutTable = {
  1: {
    1: 3.49,
  },
  2: {
    1: 1.5,
    2: 4.92,
  },
  3: {
    1: 1.0,
    2: 2.30,
    3: 8.20,
  },
  4: {
    1: 0.5,
    2: 1.82,
    3: 4.20,
    4: 21.0,
  },
  5: {
    1: 0,
    2: 1.10,
    3: 3.75,
    4: 15.0,
    5: 35.0,
  },
  6: {
    1: 0,
    2: 0.5,
    3: 2.90,
    4: 7.60,
    5: 18.0,
    6: 55.0,
  },
  7: {
    1: 0,
    2: 0.25,
    3: 2.30,
    4: 4.10,
    5: 10.0,
    6: 31.0,
    7: 60.0,
  },
  8: {
    1: 0,
    2: 0,
    3: 1.40,
    4: 2.80,
    5: 11.40,
    6: 28.0,
    7: 40.0,
    8: 70.0,
  },
  9: {
    1: 0,
    2: 0,
    3: 1.0,
    4: 2.20,
    5: 6.10,
    6: 17.0,
    7: 25.0,
    8: 55.0,
    9: 85.0,
  },
  10: {
    1: 0,
    2: 0,
    3: 1.0,
    4: 1.5,
    5: 3.30,
    6: 10.20,
    7: 25.0,
    8: 40.0,
    9: 75.0,
    10: 100.0,
  },
};

export const DEFAULT_KENO_CONFIG: KenoConfig = {
  minBet: 10,
  maxBet: 5000,
  minSpots: 1,
  maxSpots: 10,
  drawCount: 20,
  totalNumbers: 80,
  isEnabled: true,
  payoutTable: DEFAULT_KENO_PAYOUT_TABLE,
};

export interface KenoConfig {
  minBet: number;
  maxBet: number;
  minSpots: number;
  maxSpots: number;
  drawCount: number;
  totalNumbers: number;
  isEnabled: boolean;
  payoutTable: KenoPayoutTable;
}

export interface KenoRoundResult {
  roundId: string;
  betAmount: number;
  selectedNumbers: number[];
  drawnNumbers: number[];
  matches: number[];
  matchCount: number;
  multiplier: number;
  payout: number;
  profit: number;
  isWin: boolean;
  balance: number;
}

export interface KenoHistoryItem {
  id: string;
  betAmount: number;
  payout: number;
  multiplier: number;
  selectedNumbers: number[];
  drawnNumbers: number[];
  matches: number[];
  matchCount: number;
  createdAt: string;
}

export interface KenoDrawPayload {
  bet?: number;
  betAmount?: number;
  selectedNumbers: number[];
  demoToken?: string;
  idempotencyKey?: string;
  forcedDraw?: number[];
}

export interface KenoAdminStats {
  config: KenoConfig;
  totalRounds: number;
  totalBets: number;
  totalPayouts: number;
  actualRtp: number;
  recentRounds: {
    id: string;
    bet: number;
    payout: number;
    multiplier: number;
    status: string;
    createdAt: string;
    details: any;
  }[];
}

