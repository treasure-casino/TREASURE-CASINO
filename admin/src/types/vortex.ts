/**
 * TREASURE VORTEX - Type Definitions
 * 3D Elemental Crash Game
 */

export type ElementType = 'FIRE' | 'WATER' | 'EARTH' | 'WIND' | 'SKULL';

export interface VortexLevels {
  fire: number;   // 0 - 7
  water: number;  // 0 - 4
  earth: number;  // 0 - 6
}

export type VortexGameStatus = 'IDLE' | 'READY' | 'FLYING' | 'WON' | 'CRASHED';

export interface VortexRoundHistoryItem {
  id: string;
  bet: number;
  payout: number;
  multiplier: number;
  crashPoint: number;
  status: 'WON' | 'CRASHED' | 'ACTIVE';
  result?: 'WON' | 'LOST';
  element: ElementType;
  startedAt?: string;
  settledAt?: string | null;
}

export interface VortexPublicState {
  roundId: string;
  active: boolean;
  status: 'READY' | 'ACTIVE' | 'WON' | 'CRASHED';
  bet: number;
  balance: number;
  multiplier: number;
  crashPoint?: number;
  commitment?: string;
  startTime?: number;
  levels: VortexLevels;
  message?: string;
}

export interface VortexStartResponse {
  status: 'READY';
  ready: boolean;
  bet: number;
  balance: number;
  message: string;
}

export interface VortexSpinResponse {
  roundId: string;
  active: boolean;
  status: 'ACTIVE';
  bet: number;
  balance: number;
  multiplier: number;
  crashPoint: number;
  commitment: string;
  startTime: number;
  levels: VortexLevels;
  message: string;
}

export interface VortexCollectResponse {
  roundId: string;
  status: 'WON';
  payout: number;
  multiplier: number;
  crashPoint: number;
  balance: number;
  message: string;
}

export interface VortexCrashResponse {
  roundId: string;
  status: 'CRASHED';
  crashPoint: number;
  payout: number;
  message: string;
}

export interface VortexAdminStats {
  totalRounds: number;
  activeRounds: number;
  completedRounds: number;
  recentRounds: Array<{
    id: string;
    bet: number;
    payout: number;
    multiplier: number;
    crashPoint: number;
    status: string;
    startedAt: string;
    settledAt: string | null;
  }>;
}

export const FIRE_TIERS = [3, 5, 9, 16, 28, 45, 70];
export const WATER_TIERS = [1.5, 2.2, 3.5, 5];
export const EARTH_TIERS = [2, 3.5, 6, 10, 16, 25];

