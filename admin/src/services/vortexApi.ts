/**
 * TREASURE VORTEX - API Client Service
 */

import { apiClient } from '../api/client';
import { getDemoToken } from '../utils/demoWallet';
import {
  VortexStartResponse,
  VortexSpinResponse,
  VortexCollectResponse,
  VortexCrashResponse,
  VortexRoundHistoryItem,
  VortexPublicState,
  VortexAdminStats,
  ElementType,
} from '../types/vortex';

export const vortexApi = {
  /**
   * START Button: Prepares game, sets status to READY, does not deduct bet
   */
  startRound: async (betAmount: number): Promise<VortexStartResponse> => {
    const res = await apiClient.post('/api/vortex/start', {
      betAmount,
      demoToken: getDemoToken(),
    });
    if (!res.data?.success) {
      throw new Error(res.data?.error || res.data?.message || 'Failed to prepare vortex');
    }
    return res.data.data;
  },

  /**
   * SPIN VORTEX Button: Deducts bet once, launches round, returns crash point & commitment
   */
  spinVortex: async (betAmount: number): Promise<VortexSpinResponse> => {
    const res = await apiClient.post('/api/vortex/spin', {
      betAmount,
      demoToken: getDemoToken(),
    });
    if (!res.data?.success) {
      throw new Error(res.data?.error || res.data?.message || 'Failed to spin vortex');
    }
    return res.data.data;
  },

  /**
   * COLLECT Button: Valid only during flight, collects payout (bet * multiplier), credits wallet
   */
  collectPayout: async (roundId: string, multiplier: number): Promise<VortexCollectResponse> => {
    const res = await apiClient.post('/api/vortex/collect', {
      roundId,
      demoToken: getDemoToken(),
      multiplier,
    });
    if (!res.data?.success) {
      throw new Error(res.data?.error || res.data?.message || 'Failed to collect payout');
    }
    return res.data.data;
  },

  /**
   * CRASH: Settles round when multiplier hits or exceeds crash point
   */
  notifyCrash: async (roundId: string, crashPoint: number): Promise<VortexCrashResponse> => {
    const res = await apiClient.post('/api/vortex/crash', {
      roundId,
      demoToken: getDemoToken(),
      crashPoint,
    });
    if (!res.data?.success) {
      throw new Error(res.data?.error || res.data?.message || 'Failed to settle crash');
    }
    return res.data.data;
  },

  /**
   * EVENT: Records elemental surge events to vortex_events
   */
  recordEvent: async (
    roundId: string,
    element: ElementType,
    oldMultiplier: number,
    newMultiplier: number
  ) => {
    const res = await apiClient.post('/api/vortex/event', {
      roundId,
      element,
      oldMultiplier,
      newMultiplier,
      elementMultiplier: newMultiplier,
      multiplier: newMultiplier,
    });
    return res.data?.data;
  },

  /**
   * STATE: Recovers active round state if player refreshes
   */
  getState: async (): Promise<{ active: boolean; balance: number; state: VortexPublicState | null }> => {
    const res = await apiClient.get('/api/vortex/state', {
      params: { demoToken: getDemoToken() },
    });
    return res.data?.data;
  },

  /**
   * HISTORY: Retrieves recent vortex rounds and elemental history
   */
  getHistory: async (): Promise<VortexRoundHistoryItem[]> => {
    const res = await apiClient.get('/api/vortex/history', {
      params: { demoToken: getDemoToken() },
    });
    return res.data?.data || [];
  },

  /**
   * ADMIN STATS: Retrieves overall performance metrics
   */
  getAdminStats: async (): Promise<VortexAdminStats> => {
    const res = await apiClient.get('/api/vortex/admin/stats');
    return res.data?.data;
  },
};

