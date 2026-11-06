import { apiClient } from '../api/client';

export interface GameProbabilityItem {
  id: string;
  name: string;
  category: string;
  thumbnailUrl: string;
  defaultRtp: number;
  winProbability: number;
  lossProbability: number;
  isSimulationEnabled: boolean;
  updatedAt: string;
  updatedBy: string;
  mode: 'DEMO_SIMULATION_ONLY';
}

export interface SimulationPreviewResult {
  gameId: string;
  targetWinProbability: number;
  targetLossProbability: number;
  sampleRounds: number;
  simulatedWins: number;
  simulatedLosses: number;
  actualWinRate: number;
  actualLossRate: number;
  maxWinStreak: number;
  maxLossStreak: number;
  estimatedEmpiricalRtp: number;
  mode: 'DEMO_SIMULATION_ONLY';
}

export interface ProbabilityAuditLogItem {
  id: string;
  adminUserId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
  admin?: {
    id: string;
    name: string;
    email: string;
  };
}

export const adminProbabilityApi = {
  // Fetch all games with their current probability settings
  getProbabilities: async (): Promise<{ disclaimer: string; games: GameProbabilityItem[] }> => {
    const res = await apiClient.get('/api/admin/probability-settings');
    return res.data.data;
  },

  // Update a single game probability
  updateSingleProbability: async (gameId: string, winProbability: number): Promise<any> => {
    const res = await apiClient.put('/api/admin/probability-settings', {
      gameId,
      winProbability,
    });
    return res.data;
  },

  // Batch update multiple game probabilities
  updateBatchProbabilities: async (
    settings: Array<{ gameId: string; winProbability: number }>
  ): Promise<any> => {
    const res = await apiClient.put('/api/admin/probability-settings', {
      settings,
    });
    return res.data;
  },

  // Reset a game or all games to certified default RTP
  resetProbabilities: async (gameId?: string): Promise<any> => {
    const res = await apiClient.post('/api/admin/probability-settings/reset', {
      gameId,
    });
    return res.data;
  },

  // Run a Monte Carlo simulation preview
  runSimulationPreview: async (
    gameId: string,
    winProbability: number,
    sampleRounds = 1000
  ): Promise<SimulationPreviewResult> => {
    const res = await apiClient.post('/api/admin/probability-settings/simulate', {
      gameId,
      winProbability,
      sampleRounds,
    });
    return res.data.data;
  },

  // Fetch recent audit logs for probability changes
  getAuditLogs: async (): Promise<ProbabilityAuditLogItem[]> => {
    const res = await apiClient.get('/api/admin/probability-settings/audit-logs');
    return res.data.data;
  },
};
