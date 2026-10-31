import { Response, NextFunction } from 'express';
import { prisma } from '../../prisma';
import { AdminRequest } from '../../middleware/adminAuth';

export const getDashboardStats = async (_req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const [
      totalUsers,
      activeUsers,
      totalDepositsAgg,
      totalWithdrawalsAgg,
      pendingWithdrawalsCount,
      activeGamesCount,
      openTicketsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.deposit.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.withdrawal.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.withdrawal.count({
        where: { status: 'PENDING' },
      }),
      prisma.game.count({
        where: { isActive: true },
      }),
      prisma.supportTicket.count({
        where: { status: 'OPEN' },
      }),
    ]);

    const totalDeposits = totalDepositsAgg._sum.amount || 0;
    const totalWithdrawals = totalWithdrawalsAgg._sum.amount || 0;
    const grossGamingRevenue = Number(totalDeposits) - Number(totalWithdrawals);

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalDeposits,
        totalWithdrawals,
        pendingWithdrawalsCount,
        activeGamesCount,
        openTicketsCount,
        grossGamingRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardCharts = async (_req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Return structured 7-day revenue and activity mock metrics for admin dashboard charts
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const revenueTimeline = days.map((day, i) => ({
      day,
      deposits: 12500 + i * 3200,
      withdrawals: 4200 + i * 1100,
      users: 15 + i * 4,
    }));

    const gamesByCategory = await prisma.game.groupBy({
      by: ['category'],
      _count: { id: true },
    });

    res.json({
      success: true,
      data: {
        revenueTimeline,
        gamesByCategory,
      },
    });
  } catch (error) {
    next(error);
  }
};

