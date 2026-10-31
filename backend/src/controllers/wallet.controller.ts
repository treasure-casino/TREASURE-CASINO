import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config';

export const getWallet = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let wallet = await prisma.wallet.findUnique({
      where: { userId: req.userId! },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId: req.userId!,
          balance: new Prisma.Decimal(0.00),
          reservedBalance: new Prisma.Decimal(0.00),
          currency: 'INR',
        },
      });
    }

    res.json({
      success: true,
      data: wallet,
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string || '20', 10)));
    const skip = (page - 1) * limit;
    const type = req.query.type as any;

    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.userId! },
      select: { id: true },
    });

    if (!wallet) {
      throw ApiError.notFound('Wallet not found');
    }

    const where: any = { walletId: wallet.id };
    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.walletTransaction.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        transactions,
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

export const deposit = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { amount, paymentMethod, idempotencyKey } = req.body;
    const depositAmount = parseFloat(amount);

    if (isNaN(depositAmount) || depositAmount <= 0) {
      throw ApiError.badRequest('Please provide a valid deposit amount greater than 0');
    }

    if (depositAmount < 100) {
      throw ApiError.badRequest('Minimum deposit amount is ₹100');
    }

    if (depositAmount > 100000) {
      throw ApiError.badRequest('Maximum deposit amount per transaction is ₹100,000');
    }

    const effectiveIdempotencyKey = idempotencyKey || `dep-${req.userId}-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // Check if idempotency key was already processed
    const existingTx = await prisma.walletTransaction.findUnique({
      where: { idempotencyKey: effectiveIdempotencyKey },
    });

    if (existingTx) {
      res.json({
        success: true,
        message: 'Deposit already processed (Idempotent replay)',
        data: { transaction: existingTx },
      });
      return;
    }

    // Atomic Database Transaction for Simulated Deposit
    const result = await prisma.$transaction(async (tx) => {
      let wallet = await tx.wallet.findUnique({
        where: { userId: req.userId! },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId: req.userId!,
            balance: new Prisma.Decimal(0.00),
            reservedBalance: new Prisma.Decimal(0.00),
            currency: 'INR',
          },
        });
      }

      const balanceBefore = new Prisma.Decimal(wallet.balance);
      const balanceAfter = balanceBefore.add(new Prisma.Decimal(depositAmount));

      // 1. Create payment order
      const paymentOrder = await tx.paymentOrder.create({
        data: {
          userId: req.userId!,
          amount: new Prisma.Decimal(depositAmount),
          currency: 'INR',
          provider: paymentMethod || 'SIMULATED_UPI',
          providerOrderId: `sim-ord-${uuidv4()}`,
          status: 'COMPLETED',
          completedAt: new Date(),
          metadata: JSON.stringify({
            mode: 'SIMULATED',
            simulatedAt: new Date().toISOString(),
            channel: paymentMethod || 'UPI',
          }),
        },
      });

      // 2. Update wallet balance with optimistic locking
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id, version: wallet.version },
        data: {
          balance: balanceAfter,
          version: { increment: 1 },
        },
      });

      // 3. Record in immutable ledger
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'DEPOSIT',
          amount: new Prisma.Decimal(depositAmount),
          balanceBefore,
          balanceAfter,
          referenceId: paymentOrder.id,
          referenceType: 'PAYMENT_ORDER',
          idempotencyKey: effectiveIdempotencyKey,
          status: 'COMPLETED',
          description: `Simulated ${paymentMethod || 'UPI'} Deposit of ₹${depositAmount}`,
        },
      });

      // 4. Create deposit record
      const depositRecord = await tx.deposit.create({
        data: {
          userId: req.userId!,
          paymentOrderId: paymentOrder.id,
          amount: new Prisma.Decimal(depositAmount),
          status: 'COMPLETED',
          transactionId: transaction.id,
          completedAt: new Date(),
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
        deposit: depositRecord,
      };
    });

    res.status(201).json({
      success: true,
      message: 'Deposit credited successfully (Simulated)',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const withdraw = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { amount, bankDetails } = req.body;
    const withdrawAmount = parseFloat(amount);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      throw ApiError.badRequest('Please provide a valid withdrawal amount greater than 0');
    }

    if (withdrawAmount < 500) {
      throw ApiError.badRequest('Minimum withdrawal amount is ₹500');
    }

    if (!bankDetails || (!bankDetails.accountNumber && !bankDetails.upiId)) {
      throw ApiError.badRequest('Valid bank account or UPI ID details are required');
    }

    const idempotencyKey = `wdr-${req.userId}-${Date.now()}-${uuidv4().substring(0, 8)}`;

    // Atomic Database Transaction for Reserving Funds
    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId: req.userId! },
      });

      if (!wallet) {
        throw ApiError.notFound('Wallet not found');
      }

      const availableBalance = new Prisma.Decimal(wallet.balance);
      const reqAmount = new Prisma.Decimal(withdrawAmount);

      if (availableBalance.lessThan(reqAmount)) {
        throw ApiError.badRequest(`Insufficient available balance. Your balance is ₹${wallet.balance}`);
      }

      const balanceBefore = availableBalance;
      const balanceAfter = availableBalance.minus(reqAmount);
      const newReserved = new Prisma.Decimal(wallet.reservedBalance).add(reqAmount);

      // 1. Move funds from available to reservedBalance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id, version: wallet.version },
        data: {
          balance: balanceAfter,
          reservedBalance: newReserved,
          version: { increment: 1 },
        },
      });

      // 2. Create pending withdrawal request
      const withdrawalRecord = await tx.withdrawal.create({
        data: {
          userId: req.userId!,
          amount: reqAmount,
          status: 'PENDING',
          bankDetails: JSON.stringify(bankDetails),
        },
      });

      // 3. Record ledger movement
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'WITHDRAWAL',
          amount: reqAmount,
          balanceBefore,
          balanceAfter,
          referenceId: withdrawalRecord.id,
          referenceType: 'WITHDRAWAL_REQUEST',
          idempotencyKey,
          status: 'PENDING',
          description: `Withdrawal request submitted (Funds reserved: ₹${withdrawAmount})`,
        },
      });

      // Update withdrawal record with transaction ID
      await tx.withdrawal.update({
        where: { id: withdrawalRecord.id },
        data: { transactionId: transaction.id },
      });

      return {
        wallet: updatedWallet,
        withdrawal: withdrawalRecord,
        transaction,
      };
    });

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted. Funds are reserved pending review.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getDeposits = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const deposits = await prisma.deposit.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: deposits,
    });
  } catch (error) {
    next(error);
  }
};

export const getWithdrawals = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const withdrawals = await prisma.withdrawal.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: withdrawals,
    });
  } catch (error) {
    next(error);
  }
};

