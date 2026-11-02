import axios from 'axios';

const API_BASE = '/api/chicken-run';

export type ChickenDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'HARDCORE';
export type ChickenStepOutcome = 'SAFE' | 'BUST';
export type ChickenRoundStatus = 'ACTIVE' | 'CASHED_OUT' | 'BUSTED';

export interface DifficultyConfig {
  name: ChickenDifficulty;
  label: string;
  totalTiles: number;
  lanesTotalSlots: number;
  trapsPerLane: number;
  survivalProbability: number;
  color: string;
  multipliers: number[];
  winRatePercent: string;
  volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  description: string;
}

export interface ChickenRunConfig {
  minBet: number;
  maxBet: number;
  baseRtp: number;
  totalTiles: number;
  isEnabled: boolean;
  maxMultiplier: number;
  difficulties: Record<ChickenDifficulty, DifficultyConfig>;
}

export interface TileDetail {
  step: number;
  multiplier: number;
  outcome?: ChickenStepOutcome;
}

export interface ChickenRunStartResponse {
  roundId: string;
  betAmount: number;
  difficulty: ChickenDifficulty;
  currentStep: number;
  currentMultiplier: number;
  potentialPayout: number;
  status: ChickenRoundStatus;
  tiles: TileDetail[];
  balance: number;
  balanceBefore: number;
  hash: string;
  totalTiles: number;
}

export interface ChickenRunStepResponse {
  roundId: string;
  outcome: ChickenStepOutcome;
  currentStep: number;
  bustedStep?: number;
  currentMultiplier: number;
  payout: number;
  potentialPayout?: number;
  status: ChickenRoundStatus;
  isMaxStepReached?: boolean;
  message: string;
  balance: number;
  tiles: TileDetail[];
}

export interface ChickenRunCashoutResponse {
  roundId: string;
  payout: number;
  multiplier: number;
  currentStep: number;
  status: ChickenRoundStatus;
  message: string;
  balance: number;
}

export interface ChickenRunHistoryItem {
  id: string;
  status: string;
  betAmount: number;
  payout: number;
  multiplier: number;
  createdAt: string;
  details: {
    difficulty?: ChickenDifficulty;
    completedSteps?: number;
    bustedAtStep?: number;
    maxStepReached?: boolean;
    hash?: string;
  };
}

export interface ChickenRunAdminStats {
  config: ChickenRunConfig;
  stats: {
    totalRounds: number;
    wonRounds: number;
    lostRounds: number;
    winRate: string;
    totalWagered: number;
    totalPayout: number;
    maxMultiplier: number;
    theoreticalRtp: string;
    empiricalRtp: string;
  };
}

export const chickenRunApi = {
  start: async (betAmount: number, difficulty: ChickenDifficulty): Promise<ChickenRunStartResponse> => {
    const res = await axios.post<{ success: boolean; data: ChickenRunStartResponse }>(`${API_BASE}/start`, {
      betAmount,
      difficulty,
    });
    return res.data.data;
  },

  step: async (roundId: string): Promise<ChickenRunStepResponse> => {
    const res = await axios.post<{ success: boolean; data: ChickenRunStepResponse }>(`${API_BASE}/step`, {
      roundId,
    });
    return res.data.data;
  },

  cashout: async (roundId: string): Promise<ChickenRunCashoutResponse> => {
    const res = await axios.post<{ success: boolean; data: ChickenRunCashoutResponse }>(`${API_BASE}/cashout`, {
      roundId,
    });
    return res.data.data;
  },

  getConfig: async (): Promise<ChickenRunConfig> => {
    const res = await axios.get<{ success: boolean; data: ChickenRunConfig }>(`${API_BASE}/config`);
    return res.data.data;
  },

  getHistory: async (): Promise<ChickenRunHistoryItem[]> => {
    const res = await axios.get<{ success: boolean; data: ChickenRunHistoryItem[] }>(`${API_BASE}/history`);
    return res.data.data;
  },

  getAdminStats: async (): Promise<ChickenRunAdminStats> => {
    const res = await axios.get<{ success: boolean; data: ChickenRunAdminStats }>(`${API_BASE}/admin/stats`);
    return res.data.data;
  },

  updateConfig: async (params: { isEnabled?: boolean; minBet?: number; maxBet?: number }): Promise<ChickenRunConfig> => {
    const res = await axios.post<{ success: boolean; data: ChickenRunConfig }>(`${API_BASE}/admin/config`, params);
    return res.data.data;
  },
};

