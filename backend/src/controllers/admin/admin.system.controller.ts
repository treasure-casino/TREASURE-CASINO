import { Response, NextFunction } from 'express';
import { prisma } from '../../prisma';
import { ApiError } from '../../utils/ApiError';
import { AdminRequest } from '../../middleware/adminAuth';

export const getAuditLogs = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '25', 10)));
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        include: {
          admin: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminAuditLog.count(),
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSettings = async (_req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await prisma.systemSetting.findMany();
    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    next(error);
  }
};

export const updateSetting = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      throw ApiError.badRequest('Key and value are required');
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value: String(value),
        updatedBy: req.adminId,
      },
      create: {
        key,
        value: String(value),
        updatedBy: req.adminId,
      },
    });

    await prisma.adminAuditLog.create({
      data: {
        adminUserId: req.adminId!,
        action: 'UPDATE_SYSTEM_SETTING',
        resource: 'SETTINGS',
        resourceId: key,
        details: JSON.stringify({ key, value }),
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    res.json({
      success: true,
      message: 'Setting updated successfully',
      data: setting,
    });
  } catch (error) {
    next(error);
  }
};

