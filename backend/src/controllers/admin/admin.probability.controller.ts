import { Response, NextFunction } from 'express';
import { prisma } from '../../prisma';
import { ApiError } from '../../utils/ApiError';
import { AdminRequest } from '../../middleware/adminAuth';
import { ensureAllOriginalGamesRegistered } from '../../utils/bootstrap';

const SYSTEM_SETTING_KEY = 'demo_probability_settings';

const FORBIDDEN_GAMES = [
  'mega wheel of fortune',
  'lucky wheel',
  'money coming',
  'crazy 777',
];

export interface StoredGameProbability {
  winProbability: number;
  lossProbability: number;
  isSimulationEnabled: boolean;
  updatedAt: string;
  updatedBy?: string;
}

// Compute standard default demo win probability from baseline RTP
const getDefaultWinProbability = (rtp: number): number => {
  // Balanced baseline centered around 50% corresponding to 96% RTP
  const base = Math.round((rtp / 2) * 10) / 10;
  return Math.min(95, Math.max(5, base || 48.0));
};

export const getGameProbabilities = async (
  _req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const count = await prisma.game.count();
    if (count < 13) {
      await ensureAllOriginalGamesRegistered();
    }

    const [games, settingRecord] = await Promise.all([
      prisma.game.findMany({
        where: {
          AND: FORBIDDEN_GAMES.map((forbidden) => ({
            name: { not: { contains: forbidden } },
          })),
        },
        include: {
          provider: {
            select: { id: true, name: true },
          },
        },
        orderBy: { sortOrder: 'asc' },
      }),
      prisma.systemSetting.findUnique({
        where: { key: SYSTEM_SETTING_KEY },
      }),
    ]);

    let storedMap: Record<string, StoredGameProbability> = {};
    if (settingRecord?.value) {
      try {
        storedMap = JSON.parse(settingRecord.value);
      } catch {
        storedMap = {};
      }
    }

    const payload = games.map((game) => {
      const rtpNum = parseFloat(game.rtp ? game.rtp.toString() : '96.50');
      const stored = storedMap[game.id];

      const winProbability =
        stored && typeof stored.winProbability === 'number'
          ? stored.winProbability
          : getDefaultWinProbability(rtpNum);

      const lossProbability = +(100 - winProbability).toFixed(1);

      return {
        id: game.id,
        name: game.name,
        category: game.category,
        thumbnailUrl: game.thumbnailUrl || '/assets/games/default.png',
        defaultRtp: rtpNum,
        winProbability,
        lossProbability,
        isSimulationEnabled: stored?.isSimulationEnabled ?? true,
        updatedAt: stored?.updatedAt || game.updatedAt.toISOString(),
        updatedBy: stored?.updatedBy || 'SYSTEM',
        mode: 'DEMO_SIMULATION_ONLY',
      };
    });

    res.json({
      success: true,
      data: {
        disclaimer:
          'DEMO / SIMULATION MODE ONLY: These settings apply exclusively to demo play and test simulations. Real-money gameplay outcomes are strictly governed by certified RNG and published game RTP.',
        games: payload,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateGameProbability = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { gameId, winProbability, settings } = req.body;

    // Fetch existing settings
    const existingRecord = await prisma.systemSetting.findUnique({
      where: { key: SYSTEM_SETTING_KEY },
    });

    let currentMap: Record<string, StoredGameProbability> = {};
    if (existingRecord?.value) {
      try {
        currentMap = JSON.parse(existingRecord.value);
      } catch {
        currentMap = {};
      }
    }

    const updatesApplied: Array<{ gameId: string; winProbability: number; lossProbability: number }> = [];

    // 1. Single game update
    if (gameId && typeof winProbability === 'number') {
      const win = Math.round(winProbability * 10) / 10;
      if (win < 1 || win > 99) {
        throw ApiError.badRequest('Win probability must be between 1.0% and 99.0%');
      }

      currentMap[gameId] = {
        winProbability: win,
        lossProbability: +(100 - win).toFixed(1),
        isSimulationEnabled: true,
        updatedAt: new Date().toISOString(),
        updatedBy: req.adminId,
      };

      updatesApplied.push({
        gameId,
        winProbability: win,
        lossProbability: +(100 - win).toFixed(1),
      });
    }

    // 2. Batch update
    if (Array.isArray(settings) && settings.length > 0) {
      for (const item of settings) {
        if (!item.gameId || typeof item.winProbability !== 'number') continue;
        const win = Math.round(item.winProbability * 10) / 10;
        if (win < 1 || win > 99) continue;

        currentMap[item.gameId] = {
          winProbability: win,
          lossProbability: +(100 - win).toFixed(1),
          isSimulationEnabled: item.isSimulationEnabled ?? true,
          updatedAt: new Date().toISOString(),
          updatedBy: req.adminId,
        };

        updatesApplied.push({
          gameId: item.gameId,
          winProbability: win,
          lossProbability: +(100 - win).toFixed(1),
        });
      }
    }

    if (updatesApplied.length === 0) {
      throw ApiError.badRequest('No valid game probability settings provided to update');
    }

    // Persist securely in database SystemSetting
    const updatedSetting = await prisma.systemSetting.upsert({
      where: { key: SYSTEM_SETTING_KEY },
      update: {
        value: JSON.stringify(currentMap),
        description: 'Demo Mode Game Win/Loss Probability configuration map',
        updatedBy: req.adminId,
      },
      create: {
        key: SYSTEM_SETTING_KEY,
        value: JSON.stringify(currentMap),
        description: 'Demo Mode Game Win/Loss Probability configuration map',
        updatedBy: req.adminId,
      },
    });

    // Write immutable entry to AdminAuditLog
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.adminId!,
        action: 'UPDATE_GAME_PROBABILITY',
        resource: 'DEMO_PROBABILITY',
        resourceId: gameId || 'BATCH_UPDATE',
        details: JSON.stringify({
          scope: 'DEMO_SIMULATION_ONLY',
          updatedCount: updatesApplied.length,
          updates: updatesApplied,
          timestamp: new Date().toISOString(),
        }),
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({
      success: true,
      message: `Successfully saved probability settings for ${updatesApplied.length} game(s) (Demo Mode Only)`,
      data: {
        updatedCount: updatesApplied.length,
        settings: currentMap,
        updatedAt: updatedSetting.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resetGameProbabilities = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { gameId } = req.body;

    const existingRecord = await prisma.systemSetting.findUnique({
      where: { key: SYSTEM_SETTING_KEY },
    });

    let currentMap: Record<string, StoredGameProbability> = {};
    if (existingRecord?.value) {
      try {
        currentMap = JSON.parse(existingRecord.value);
      } catch {
        currentMap = {};
      }
    }

    if (gameId) {
      delete currentMap[gameId];
    } else {
      currentMap = {};
    }

    await prisma.systemSetting.upsert({
      where: { key: SYSTEM_SETTING_KEY },
      update: {
        value: JSON.stringify(currentMap),
        updatedBy: req.adminId,
      },
      create: {
        key: SYSTEM_SETTING_KEY,
        value: JSON.stringify(currentMap),
        updatedBy: req.adminId,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.adminId!,
        action: 'RESET_GAME_PROBABILITY',
        resource: 'DEMO_PROBABILITY',
        resourceId: gameId || 'RESET_ALL',
        details: JSON.stringify({
          scope: 'DEMO_SIMULATION_ONLY',
          action: gameId ? `Reset game ${gameId} to baseline default RTP` : 'Reset all games to baseline default RTP',
          timestamp: new Date().toISOString(),
        }),
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({
      success: true,
      message: gameId
        ? `Successfully reset game probability to baseline certified RTP`
        : `Successfully reset all game probabilities to baseline certified RTP`,
    });
  } catch (error) {
    next(error);
  }
};

export const runProbabilitySimulationPreview = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { gameId, winProbability, sampleRounds = 1000 } = req.body;

    if (!gameId) {
      throw ApiError.badRequest('gameId is required for simulation preview');
    }

    const winProb = Math.min(99, Math.max(1, parseFloat(winProbability) || 50.0));
    const rounds = Math.min(10000, Math.max(100, parseInt(sampleRounds as string, 10) || 1000));

    let wins = 0;
    let losses = 0;
    let currentStreak = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let isWinStreak = true;

    for (let i = 0; i < rounds; i++) {
      const roll = Math.random() * 100;
      const isWin = roll < winProb;

      if (isWin) {
        wins++;
        if (isWinStreak) {
          currentStreak++;
        } else {
          isWinStreak = true;
          currentStreak = 1;
        }
        if (currentStreak > maxWinStreak) maxWinStreak = currentStreak;
      } else {
        losses++;
        if (!isWinStreak) {
          currentStreak++;
        } else {
          isWinStreak = false;
          currentStreak = 1;
        }
        if (currentStreak > maxLossStreak) maxLossStreak = currentStreak;
      }
    }

    const actualWinRate = +((wins / rounds) * 100).toFixed(2);
    const actualLossRate = +((losses / rounds) * 100).toFixed(2);
    const simulatedRtp = +((actualWinRate * 1.95) + (actualLossRate * 0)).toFixed(2);

    res.json({
      success: true,
      data: {
        gameId,
        targetWinProbability: winProb,
        targetLossProbability: +(100 - winProb).toFixed(1),
        sampleRounds: rounds,
        simulatedWins: wins,
        simulatedLosses: losses,
        actualWinRate,
        actualLossRate,
        maxWinStreak,
        maxLossStreak,
        estimatedEmpiricalRtp: simulatedRtp,
        mode: 'DEMO_SIMULATION_ONLY',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProbabilityAuditLogs = async (
  _req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const logs = await prisma.adminAuditLog.findMany({
      where: {
        resource: 'DEMO_PROBABILITY',
      },
      include: {
        admin: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    next(error);
  }
};
