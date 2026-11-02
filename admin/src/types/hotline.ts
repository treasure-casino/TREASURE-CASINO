export interface SlotSymbolDef {
  id: number;
  code: string;
  name: string;
  isWild?: boolean;
  isScatter?: boolean;
  payouts: Record<number, number>;
}

export interface PaylineDef {
  id: number;
  name: string;
  coords: [number, number][];
}

export interface WinningLineResult {
  lineId: number;
  name: string;
  symbolId: number;
  symbolCode: string;
  symbolName: string;
  count: number;
  multiplier: number;
  payout: number;
  positions: [number, number][];
}

export type RiskLevel = 'LOW' | 'HIGH';

export interface HotlineSlotSpinResult {
  roundId: string;
  betAmount: number;
  baseBet?: number;
  totalBet?: number;
  effectiveBet?: number;
  riskLevel?: RiskLevel;
  bonusBetActive?: boolean;
  isFreeSpinRound?: boolean;
  freeSpinsAwarded?: number;
  isFreeSpinsTriggered?: boolean;
  isRetrigger?: boolean;
  balanceBefore: number;
  balanceAfter: number;
  rawGrid: number[][];
  expandedGrid: number[][];
  expandedReels: number[];
  winningLines: WinningLineResult[];
  scatterCount: number;
  scatterMultiplier: number;
  scatterPayout: number;
  scatterPositions: [number, number][];
  totalMultiplier: number;
  totalPayout: number;
  isWin: boolean;
  isBigWin: boolean;
  isMegaWin: boolean;
}

export interface HotlineConfig {
  minBet: number;
  maxBet: number;
  minNumber: number;
  maxNumber: number;
  baseRtp: number;
  rtp?: number;
  theoreticalRtp?: string;
  volatility?: { LOW: string; HIGH: string };
  winRate?: { LOW: string; HIGH: string };
  maxMultiplier: number;
  isEnabled: boolean;
  symbols?: SlotSymbolDef[];
  paylines?: PaylineDef[];
  reelCount?: number;
  rowCount?: number;
  paylineCount?: number;
  scatterProbability?: number;
  scatterProbabilityPercent?: string;
  features?: string[];
}

export const DEFAULT_HOTLINE_CONFIG: HotlineConfig = {
  minBet: 10,
  maxBet: 5000,
  minNumber: 1,
  maxNumber: 100,
  baseRtp: 0.96,
  maxMultiplier: 1000.0,
  isEnabled: true,
  reelCount: 5,
  rowCount: 3,
  paylineCount: 20,
};

export interface HotlineRoundState {
  roundId: string;
  status: 'ACTIVE' | 'WON' | 'LOST';
  betAmount: number;
  selectedNumber: number;
  revealedNumber: number;
  stoppingMultiplier: number;
  isDirectHit: boolean;
  isHotZone: boolean;
  bonusMultiplier: number;
  durationMs: number;
  autoCashoutMultiplier?: number;
  payout?: number;
  multiplier?: number;
  profit?: number;
  balance: number;
}

export interface HotlineHistoryItem {
  id: string;
  status: 'WON' | 'LOST';
  betAmount: number;
  payout: number;
  multiplier: number;
  isWin?: boolean;
  rawGrid?: number[][];
  expandedGrid?: number[][];
  winningLines?: WinningLineResult[];
  scatterCount?: number;
  isBigWin?: boolean;
  isMegaWin?: boolean;
  riskLevel?: RiskLevel;
  bonusBetActive?: boolean;
  isFreeSpinRound?: boolean;
  freeSpinsAwarded?: number;
  isFreeSpinsTriggered?: boolean;
  startedAt: string;
  settledAt?: string;
  details?: any;
  // Legacy number-prediction fields
  selectedNumber?: number;
  revealedNumber?: number;
  stoppingMultiplier?: number;
  isDirectHit?: boolean;
  isHotZone?: boolean;
}

export interface HotlineAdminStats {
  config: HotlineConfig;
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
