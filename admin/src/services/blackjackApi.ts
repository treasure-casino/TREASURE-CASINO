import { apiClient } from '../api/client';
import { getDemoToken } from '../utils/demoWallet';
import {
  BlackjackRoundData,
  BlackjackHistoryItem,
  BlackjackConfig,
} from '../types/blackjack';

export const blackjackApi = {
  /**
   * Starts a new round and deals initial cards
   */
  deal: async (betAmount: number): Promise<BlackjackRoundData> => {
    const demoToken = getDemoToken();
    const res = await apiClient.post<{ success: boolean; data: BlackjackRoundData }>('/api/blackjack/deal', {
      bet: betAmount,
      demoToken,
    });
    return res.data.data;
  },

  /**
   * Hits (draws 1 card for player)
   */
  hit: async (roundId: string): Promise<BlackjackRoundData> => {
    const demoToken = getDemoToken();
    const res = await apiClient.post<{ success: boolean; data: BlackjackRoundData }>('/api/blackjack/hit', {
      roundId,
      demoToken,
    });
    return res.data.data;
  },

  /**
   * Insurance decision (Buy Insurance or No Insurance)
   */
  insurance: async (roundId: string, buyInsurance: boolean): Promise<BlackjackRoundData> => {
    const demoToken = getDemoToken();
    const res = await apiClient.post<{ success: boolean; data: BlackjackRoundData }>('/api/blackjack/insurance', {
      roundId,
      buyInsurance,
      demoToken,
    });
    return res.data.data;
  },

  /**
   * Stands (dealer plays turn, hand settles)
   */
  stand: async (roundId: string): Promise<BlackjackRoundData> => {
    const demoToken = getDemoToken();
    const res = await apiClient.post<{ success: boolean; data: BlackjackRoundData }>('/api/blackjack/stand', {
      roundId,
      demoToken,
    });
    return res.data.data;
  },

  /**
   * Double Down (doubles bet, draws exactly 1 card, dealer plays, hand settles)
   */
  doubleDown: async (roundId: string): Promise<BlackjackRoundData> => {
    const demoToken = getDemoToken();
    const res = await apiClient.post<{ success: boolean; data: BlackjackRoundData }>('/api/blackjack/double', {
      roundId,
      demoToken,
    });
    return res.data.data;
  },

  /**
   * Retrieves any active in-flight round
   */
  getState: async (): Promise<BlackjackRoundData & { hasActiveRound: boolean }> => {
    const demoToken = getDemoToken();
    const res = await apiClient.get<{ success: boolean; data: BlackjackRoundData & { hasActiveRound: boolean } }>(
      `/api/blackjack/state?demoToken=${demoToken}`
    );
    return res.data.data;
  },

  /**
   * Retrieves recent game history
   */
  getHistory: async (limit = 10): Promise<BlackjackHistoryItem[]> => {
    const demoToken = getDemoToken();
    const res = await apiClient.get<{ success: boolean; data: BlackjackHistoryItem[] }>(
      `/api/blackjack/history?demoToken=${demoToken}&limit=${limit}`
    );
    return res.data.data;
  },

  /**
   * Retrieves blackjack rules and bet configuration
   */
  getConfig: async (): Promise<BlackjackConfig> => {
    const res = await apiClient.get<{ success: boolean; data: BlackjackConfig }>('/api/blackjack/config');
    return res.data.data;
  },

  /**
   * Admin configuration update
   */
  updateConfig: async (config: Partial<BlackjackConfig>): Promise<BlackjackConfig> => {
    const res = await apiClient.post<{ success: boolean; data: BlackjackConfig }>('/api/blackjack/admin/config', config);
    return res.data.data;
  },
};

