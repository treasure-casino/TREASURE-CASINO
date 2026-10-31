import { apiClient } from '../api/client';
import { getDemoToken } from '../utils/demoWallet';
import { SpiralState, SpiralRoundStats } from '../types/spiral';

export const spiralApi = {
  spin: async (
    betAmount: number,
    roundId?: string,
    idempotencyKey?: string,
    forcedSymbol?: string
  ): Promise<{ success: boolean; data: SpiralState & { balance: number; betDeducted: number } }> => {
    const res = await apiClient.post('/api/spiral/spin', {
      betAmount,
      roundId,
      idempotencyKey,
      forcedSymbol,
      demoToken: getDemoToken(),
    });
    return res.data;
  },

  halfCashout: async (
    roundId: string
  ): Promise<{ success: boolean; data: SpiralState & { creditedAmount: number; balance: number } }> => {
    const res = await apiClient.post('/api/spiral/half-cashout', {
      roundId,
      demoToken: getDemoToken(),
    });
    return res.data;
  },

  fullCashout: async (
    roundId: string
  ): Promise<{ success: boolean; data: SpiralState & { finalPayout: number; totalPayout: number; balance: number } }> => {
    const res = await apiClient.post('/api/spiral/cashout', {
      roundId,
      demoToken: getDemoToken(),
    });
    return res.data;
  },

  stopAuto: async (): Promise<{ success: boolean }> => {
    const res = await apiClient.post('/api/spiral/stop-auto');
    return res.data;
  },

  getState: async (): Promise<{ success: boolean; data: { active: boolean; balance: number; state: SpiralState | null } }> => {
    const res = await apiClient.get(`/api/spiral/state?demoToken=${getDemoToken()}`);
    return res.data;
  },

  getHistory: async (): Promise<{ success: boolean; data: any[] }> => {
    const res = await apiClient.get(`/api/spiral/history?demoToken=${getDemoToken()}`);
    return res.data;
  },

  getAdminStats: async (): Promise<{
    success: boolean;
    data: {
      totalRounds: number;
      activeRounds: number;
      completedRounds: number;
      recentRounds: SpiralRoundStats[];
    };
  }> => {
    const res = await apiClient.get('/api/spiral/admin/stats');
    return res.data;
  },
};
