import { apiClient } from '../api/client';
import {
  KenoConfig,
  KenoRoundResult,
  KenoHistoryItem,
  KenoDrawPayload,
  KenoAdminStats,
} from '../types/keno';
import { getDemoToken } from '../utils/demoWallet';

export const kenoApi = {
  /**
   * Executes a Keno draw
   */
  async draw(payload: KenoDrawPayload): Promise<KenoRoundResult> {
    const demoToken = payload.demoToken || getDemoToken();
    const res = await apiClient.post('/api/keno/draw', {
      ...payload,
      demoToken,
    });
    return res.data.data;
  },

  /**
   * Retrieves Keno configuration and payout table
   */
  async getConfig(): Promise<KenoConfig> {
    const res = await apiClient.get('/api/keno/config');
    return res.data.data;
  },

  /**
   * Fetches recent player Keno rounds
   */
  async getHistory(limit = 15): Promise<KenoHistoryItem[]> {
    const demoToken = getDemoToken();
    const res = await apiClient.get(`/api/keno/history?demoToken=${demoToken}&limit=${limit}`);
    return res.data.data || [];
  },

  /**
   * Admin: Get statistics & telemetry
   */
  async getAdminStats(): Promise<KenoAdminStats> {
    const res = await apiClient.get('/api/keno/admin/stats');
    return res.data.data;
  },

  /**
   * Admin: Update configuration
   */
  async updateConfig(config: Partial<KenoConfig>): Promise<KenoConfig> {
    const res = await apiClient.post('/api/keno/admin/config', config);
    return res.data.data;
  },
};

