import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma';
import { ApiError } from '../../utils/ApiError';
import { AdminRequest } from '../../middleware/adminAuth';

export const getAdminDeposits = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const skip = (page - 1) * limit;

    const [deposits, total] = await Promise.all([
      prisma.deposit.findMany({
        include: {
          user: {
            select: { id: true, email: true, phone: true },
          },
          paymentOrder: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deposit.count(),
    ]);

    res.json({
      success: true,
      data: {
        deposits,
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

export const getAdminWithdrawals = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const skip = (page - 1) * limit;
    const status = req.query.status as any;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [withdrawals, total] = await Promise.all([
      prisma.withdrawal.findMany({
        where,
        include: {
          user: {
            select: { id: true, email: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.withdrawal.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        withdrawals,
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

export const reviewWithdrawal = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { decision, reason } = req.body;

    if (!['APPROVE', 'REJECT'].includes(decision)) {
      throw ApiError.badRequest('Decision must be either APPROVE or REJECT');
    }

    if (decision === 'REJECT' && (!reason || reason.trim().length < 5)) {
      throw ApiError.badRequest('A recorded rejection reason of at least 5 characters is mandatory');
    }

    const withdrawal = await prisma.withdrawal.findUnique({
      where: { id },
    });

    if (!withdrawal) {
      throw ApiError.notFound('Withdrawal request not found');
    }

    if (withdrawal.status !== 'PENDING') {
      throw ApiError.badRequest(`Cannot review withdrawal with status: ${withdrawal.status}`);
    }

    // Atomic Database Transaction for financial safety
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId: withdrawal.userId },
      });

      if (!wallet) {
        throw ApiError.notFound('Associated user wallet not found');
      }

      const withdrawAmount = new Prisma.Decimal(withdrawal.amount);
      const currentReserved = new Prisma.Decimal(wallet.reservedBalance);

      if (decision === 'APPROVE') {
        const newReserved = currentReserved.minus(withdrawAmount);
        const safeReserved = newReserved.lessThan(0) ? new Prisma.Decimal(0) : newReserved;

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id, version: wallet.version },
          data: {
            reservedBalance: safeReserved,
            version: { increment: 1 },
          },
        });

        const updatedWithdrawal = await tx.withdrawal.update({
          where: { id },
          data: {
            status: 'COMPLETED',
            reviewedBy: req.adminId as string,
            reviewedAt: new Date(),
            completedAt: new Date(),
          },
        });

        if (withdrawal.transactionId) {
          await tx.walletTransaction.update({
            where: { id: withdrawal.transactionId },
            data: { status: 'COMPLETED' },
          });
        }

        await tx.adminAuditLog.create({
          data: {
            adminUserId: req.adminId as string,
            action: 'APPROVE_WITHDRAWAL',
            resource: 'FINANCE',
            resourceId: id,
            details: JSON.stringify({
              userId: withdrawal.userId,
              amount: withdrawal.amount,
              status: 'COMPLETED',
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        return { wallet: updatedWallet, withdrawal: updatedWithdrawal };
      } else {
        const currentBalance = new Prisma.Decimal(wallet.balance);
        const restoredBalance = currentBalance.add(withdrawAmount);
        const newReserved = currentReserved.minus(withdrawAmount);
        const safeReserved = newReserved.lessThan(0) ? new Prisma.Decimal(0) : newReserved;

        const updatedWallet = await tx.wallet.update({
          where: { id: wallet.id, version: wallet.version },
          data: {
            balance: restoredBalance,
            reservedBalance: safeReserved,
            version: { increment: 1 },
          },
        });

        const updatedWithdrawal = await tx.withdrawal.update({
          where: { id },
          data: {
            status: 'REJECTED',
            reason: reason ? reason.trim() : 'Rejected by administrator review',
            reviewedBy: req.adminId as string,
            reviewedAt: new Date(),
            completedAt: new Date(),
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'REFUND',
            amount: withdrawAmount,
            balanceBefore: currentBalance,
            balanceAfter: restoredBalance,
            referenceId: withdrawal.id,
            referenceType: 'WITHDRAWAL_REFUND',
            description: `Withdrawal rejected: funds restored (${reason || 'Admin review'})`,
            status: 'COMPLETED',
            idempotencyKey: `wdr-ref-${withdrawal.id}`,
          },
        });

        await tx.adminAuditLog.create({
          data: {
            adminUserId: req.adminId as string,
            action: 'REJECT_WITHDRAWAL',
            resource: 'FINANCE',
            resourceId: id,
            details: JSON.stringify({
              userId: withdrawal.userId,
              amount: withdrawal.amount,
              reason: reason || 'Rejected by administrator',
            }),
            ipAddress: req.ip || '127.0.0.1',
          },
        });

        return { wallet: updatedWallet, withdrawal: updatedWithdrawal };
      }
    });

    res.json({
      success: true,
      message: `Withdrawal request has been ${decision === 'APPROVE' ? 'approved' : 'rejected'}.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
