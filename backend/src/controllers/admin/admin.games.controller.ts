import { Response, NextFunction } from 'express';
import { prisma } from '../../prisma';
import { ApiError } from '../../utils/ApiError';
import { AdminRequest } from '../../middleware/adminAuth';

export const getAdminGames = async (_req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const games = await prisma.game.findMany({
      include: {
        provider: {
          select: { id: true, name: true },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    res.json({
      success: true,
      data: games,
    });
  } catch (error) {
    next(error);
  }
};

export const createGame = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, description, category, providerId, thumbnailUrl, rtp, minBet, maxBet, isDemo, isActive, isFeatured } = req.body;

    if (!name || !category || !providerId) {
      throw ApiError.badRequest('Game name, category, and providerId are required');
    }

    const game = await prisma.game.create({
      data: {
        name: name.trim(),
        description,
        category,
        providerId,
        thumbnailUrl: thumbnailUrl || '/assets/games/default.png',
        rtp: rtp ? parseFloat(rtp) : 96.50,
        minBet: minBet ? parseFloat(minBet) : 10.00,
        maxBet: maxBet ? parseFloat(maxBet) : 5000.00,
        isDemo: isDemo !== false,
        isActive: isActive !== false,
        isFeatured: Boolean(isFeatured),
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.adminId as string,
        action: 'CREATE_GAME',
        resource: 'GAMES',
        resourceId: game.id,
        details: JSON.stringify({ name: game.name }),
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: game,
    });
  } catch (error) {
    next(error);
  }
};

export const updateGame = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { name, description, category, isActive, isFeatured, isDemo, rtp, minBet, maxBet, thumbnailUrl } = req.body;

    const game = await prisma.game.update({
      where: { id },
      data: {
        name,
        description,
        category,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        isFeatured: isFeatured !== undefined ? Boolean(isFeatured) : undefined,
        isDemo: isDemo !== undefined ? Boolean(isDemo) : undefined,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : undefined,
        rtp: rtp !== undefined ? parseFloat(rtp) : undefined,
        minBet: minBet !== undefined ? parseFloat(minBet) : undefined,
        maxBet: maxBet !== undefined ? parseFloat(maxBet) : undefined,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.adminId as string,
        action: 'UPDATE_GAME',
        resource: 'GAMES',
        resourceId: id,
        details: JSON.stringify({ name: game.name, isActive: game.isActive, isFeatured: game.isFeatured }),
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({
      success: true,
      message: 'Game updated successfully',
      data: game,
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminProviders = async (_req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const providers = await prisma.gameProvider.findMany({
      include: {
        _count: { select: { games: true } },
      },
    });

    res.json({
      success: true,
      data: providers,
    });
  } catch (error) {
    next(error);
  }
};
