import { apiClient } from '../api/client';
import { getDemoToken } from '../utils/demoWallet';
import { LimboConfig, LimboRollResult, LimboHistoryItem } from '../types/limbo';

export const limboApi = {
  roll: async (
    betAmount: number,
    targetMultiplier: number,
    idempotencyKey?: string,
    forcedMultiplier?: number
  ): Promise<{ success: boolean; data: LimboRollResult }> => {
    const res = await apiClient.post('/api/limbo/roll', {
      betAmount,
      targetMultiplier,
      idempotencyKey,
      forcedMultiplier,
      demoToken: getDemoToken(),
    });
    return res.data;
  },

  getHistory: async (limit: number = 30): Promise<{ success: boolean; data: LimboHistoryItem[] }> => {
    const res = await apiClient.get(`/api/limbo/history?demoToken=${getDemoToken()}&limit=${limit}`);
    return res.data;
  },

  getConfig: async (): Promise<{ success: boolean; data: LimboConfig }> => {
    const res = await apiClient.get('/api/limbo/config');
    return res.data;
  },

  updateConfig: async (config: Partial<LimboConfig>): Promise<{ success: boolean; data: LimboConfig }> => {
    const res = await apiClient.post('/api/limbo/admin/config', config);
    return res.data;
  },
};

