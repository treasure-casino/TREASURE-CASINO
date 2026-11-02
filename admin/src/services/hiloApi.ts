import { apiClient } from '../api/client';
import {
  HiloConfig,
  HiloRoundState,
  HiloHistoryItem,
  HiloAdminStats,
  HiloPrediction,
  HiloCard,
} from '../types/hilo';
import { getDemoToken } from '../utils/demoWallet';

const API_BASE = '/api';

export const hiloApi = {
  // Start new round
  startRound: async (betAmount: number, initialCard?: HiloCard): Promise<HiloRoundState> => {
    const token = getDemoToken();
    const res = await apiClient.post(`${API_BASE}/hilo/start`, {
      betAmount,
      demoToken: token,
      initialCard,
    });
    return res.data.data;
  },

  // Make prediction
  predict: async (
    roundId: string,
    prediction: HiloPrediction,
    forcedNextCard?: HiloCard
  ): Promise<HiloRoundState> => {
    const token = getDemoToken();
    const res = await apiClient.post(`${API_BASE}/hilo/predict`, {
      roundId,
      prediction,
      demoToken: token,
      forcedNextCard,
    });
    return res.data.data;
  },

  // Collect winnings
  collect: async (roundId: string): Promise<{ roundId: string; status: string; payout: number; multiplier: number; balance: number }> => {
    const token = getDemoToken();
    const res = await apiClient.post(`${API_BASE}/hilo/collect`, {
      roundId,
      demoToken: token,
    });
    return res.data.data;
  },

  // Get configuration & odds
  getConfig: async (): Promise<{ config: HiloConfig; rankMultipliersTable: Record<string, any> }> => {
    const res = await apiClient.get(`${API_BASE}/hilo/config`);
    return res.data.data;
  },

  // Get user round history
  getHistory: async (limit = 15): Promise<HiloHistoryItem[]> => {
    const token = getDemoToken();
    const res = await apiClient.get(`${API_BASE}/hilo/history`, {
      params: { demoToken: token, limit },
    });
    return res.data.data;
  },

  // Admin: Get telemetry
  getAdminStats: async (): Promise<HiloAdminStats> => {
    const res = await apiClient.get(`${API_BASE}/hilo/admin/stats`);
    return res.data.data;
  },

  // Admin: Update config
  updateConfig: async (updates: Partial<HiloConfig>): Promise<HiloConfig> => {
    const res = await apiClient.post(`${API_BASE}/hilo/admin/config`, updates);
    return res.data.data;
  },
};
