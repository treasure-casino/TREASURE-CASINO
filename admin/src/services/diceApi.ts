import { apiClient } from '../api/client';
import { getDemoToken } from '../utils/demoWallet';
import { DiceConfig, DiceRollResult, DiceHistoryItem, DiceMode } from '../types/dice';

export const diceApi = {
  roll: async (
    betAmount: number,
    target: number,
    mode: DiceMode,
    idempotencyKey?: string,
    forcedOutcome?: number
  ): Promise<{ success: boolean; data: DiceRollResult }> => {
    const res = await apiClient.post('/api/dice/roll', {
      betAmount,
      target,
      mode,
      idempotencyKey,
      forcedOutcome,
      demoToken: getDemoToken(),
    });
    return res.data;
  },

  getHistory: async (limit: number = 30): Promise<{ success: boolean; data: DiceHistoryItem[] }> => {
    const res = await apiClient.get(`/api/dice/history?demoToken=${getDemoToken()}&limit=${limit}`);
    return res.data;
  },

  getConfig: async (): Promise<{ success: boolean; data: DiceConfig }> => {
    const res = await apiClient.get('/api/dice/config');
    return res.data;
  },

  updateConfig: async (config: Partial<DiceConfig>): Promise<{ success: boolean; data: DiceConfig }> => {
    const res = await apiClient.post('/api/dice/admin/config', config);
    return res.data;
  },
};

