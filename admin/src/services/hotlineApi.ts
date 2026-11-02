import { apiClient } from '../api/client';
import {
  HotlineConfig,
  HotlineRoundState,
  HotlineHistoryItem,
  HotlineAdminStats,
  HotlineSlotSpinResult,
  RiskLevel,
} from '../types/hotline';
import { getDemoToken } from '../utils/demoWallet';

const API_BASE = '/api';

export const hotlineApi = {
  // 5-Reel Slot Spin with PRD options (Risk Level, Bonus Bet, Free Spins)
  spin: async (
    optionsOrBet:
      | number
      | {
          betAmount: number;
          riskLevel?: RiskLevel;
          bonusBetActive?: boolean;
          isFreeSpin?: boolean;
          idempotencyKey?: string;
        }
  ): Promise<HotlineSlotSpinResult> => {
    const token = getDemoToken();
    const payload =
      typeof optionsOrBet === 'number'
        ? { betAmount: optionsOrBet, demoToken: token }
        : { ...optionsOrBet, demoToken: token };

    const res = await apiClient.post(`${API_BASE}/hotline/spin`, payload);
    return res.data.data;
  },

  // Start new round
  startRound: async (
    betAmount: number,
    selectedNumber: number,
    autoCashoutMultiplier?: number,
    forcedNumber?: number,
    forcedMultiplier?: number
  ): Promise<HotlineRoundState> => {
    const token = getDemoToken();
    const res = await apiClient.post(`${API_BASE}/hotline/start`, {
      betAmount,
      selectedNumber,
      autoCashoutMultiplier,
      forcedNumber,
      forcedMultiplier,
      demoToken: token,
    });
    return res.data.data;
  },

  // Cash out
  cashout: async (
    roundId: string,
    multiplier: number
  ): Promise<{
    roundId: string;
    status: 'WON' | 'LOST';
    betAmount: number;
    multiplier: number;
    payout: number;
    profit?: number;
    balance: number;
  }> => {
    const token = getDemoToken();
    const res = await apiClient.post(`${API_BASE}/hotline/cashout`, {
      roundId,
      multiplier,
      demoToken: token,
    });
    return res.data.data;
  },

  // Settle Loss (when stopping point reached without cashout)
  settleLoss: async (roundId: string): Promise<any> => {
    const token = getDemoToken();
    const res = await apiClient.post(`${API_BASE}/hotline/settle-loss`, {
      roundId,
      demoToken: token,
    });
    return res.data.data;
  },

  // Get config
  getConfig: async (): Promise<HotlineConfig> => {
    const res = await apiClient.get(`${API_BASE}/hotline/config`);
    return res.data.data;
  },

  // Get history
  getHistory: async (limit = 15): Promise<HotlineHistoryItem[]> => {
    const token = getDemoToken();
    const res = await apiClient.get(`${API_BASE}/hotline/history`, {
      params: { demoToken: token, limit },
    });
    return res.data.data;
  },

  // Admin: Get telemetry
  getAdminStats: async (): Promise<HotlineAdminStats> => {
    const res = await apiClient.get(`${API_BASE}/hotline/admin/stats`);
    return res.data.data;
  },

  // Admin: Update config
  updateConfig: async (updates: Partial<HotlineConfig>): Promise<HotlineConfig> => {
    const res = await apiClient.post(`${API_BASE}/hotline/admin/config`, updates);
    return res.data.data;
  },
};

