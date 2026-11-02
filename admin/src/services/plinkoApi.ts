import { apiClient } from '../api/client';
import {
  PlinkoConfig,
  PlinkoRoundResult,
  PlinkoHistoryItem,
  PlinkoDropPayload,
} from '../types/plinko';
import { getDemoToken } from '../utils/demoWallet';

export const plinkoApi = {
  /**
   * Drops a ball on the Plinko board
   */
  async dropBall(payload: PlinkoDropPayload): Promise<PlinkoRoundResult> {
    const demoToken = payload.demoToken || getDemoToken();
    const res = await apiClient.post('/api/plinko/drop', {
      ...payload,
      demoToken,
    });
    return res.data.data;
  },

  /**
   * Retrieves Plinko board configuration & RTP tables
   */
  async getConfig(): Promise<PlinkoConfig> {
    const res = await apiClient.get('/api/plinko/config');
    return res.data.data;
  },

  /**
   * Fetches recent Plinko round history
   */
  async getHistory(limit = 15): Promise<PlinkoHistoryItem[]> {
    const demoToken = getDemoToken();
    const res = await apiClient.get(`/api/plinko/history?demoToken=${demoToken}&limit=${limit}`);
    return res.data.data || [];
  },
};

