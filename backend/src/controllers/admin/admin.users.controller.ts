import { Response, NextFunction } from 'express';
import { prisma } from '../../prisma';
import { ApiError } from '../../utils/ApiError';
import { AdminRequest } from '../../middleware/adminAuth';

export const getUsers = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const skip = (page - 1) * limit;
    const search = req.query.search as string;
    const status = req.query.status as any;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { phone: { contains: search } },
        { referralCode: { contains: search } },
        { profile: { displayName: { contains: search } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: {
          profile: true,
          wallet: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          phone: u.phone,
          status: u.status,
          referralCode: u.referralCode,
          profile: u.profile,
          wallet: u.wallet,
          createdAt: u.createdAt,
        })),
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

export const getUserDetails = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        profile: true,
        wallet: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        },
        deposits: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        withdrawals: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        gameSessions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
        supportTickets: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status, reason } = req.body;

    if (!status || !['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
      throw ApiError.badRequest('Invalid status. Permitted: ACTIVE, SUSPENDED, BANNED');
    }

    if (!reason || reason.trim().length < 5) {
      throw ApiError.badRequest('An audit reason of at least 5 characters is mandatory for user status modification');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const previousStatus = user.status;

    const updatedUser = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id },
        data: { status },
      });

      await tx.adminAuditLog.create({
        data: {
          adminUserId: req.adminId as string,
          action: 'UPDATE_USER_STATUS',
          resource: 'USERS',
          resourceId: id,
          details: JSON.stringify({
            previousStatus,
            newStatus: status,
            reason: reason.trim(),
          }),
          ipAddress: req.ip || '127.0.0.1',
        },
      });

      return u;
    });

    res.json({
      success: true,
      message: `User status changed to ${status}`,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
