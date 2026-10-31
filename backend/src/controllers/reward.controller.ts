import { Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';

export const getRewards = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rewards = await prisma.reward.findMany({
      where: { isActive: true },
    });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayClaims = await prisma.rewardClaim.findMany({
      where: {
        userId: req.userId!,
        claimedAt: { gte: startOfToday },
      },
      select: { rewardId: true },
    });

    const claimedIds = new Set(todayClaims.map((c) => c.rewardId));

    const enrichedRewards = rewards.map((r) => ({
      ...r,
      isClaimedToday: claimedIds.has(r.id),
    }));

    res.json({
      success: true,
      data: enrichedRewards,
    });
  } catch (error) {
    next(error);
  }
};

export const claimReward = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    const reward = await prisma.reward.findUnique({
      where: { id },
    });

    if (!reward || !reward.isActive) {
      throw ApiError.notFound('Reward not found or is currently inactive');
    }

    if (reward.type === 'DAILY') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const alreadyClaimed = await prisma.rewardClaim.findFirst({
        where: {
          userId: req.userId!,
          rewardId: reward.id,
          claimedAt: { gte: startOfToday },
        },
      });

      if (alreadyClaimed) {
        throw ApiError.badRequest('You have already claimed this daily reward today. Return tomorrow!');
      }
    }

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
      const balanceAfter = balanceBefore.add(new Prisma.Decimal(reward.amount));

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id, version: wallet.version },
        data: {
          balance: balanceAfter,
          version: { increment: 1 },
        },
      });

      const claim = await tx.rewardClaim.create({
        data: {
          userId: req.userId!,
          rewardId: reward.id,
          amount: reward.amount,
        },
      });

      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'REWARD',
          amount: reward.amount,
          balanceBefore,
          balanceAfter,
          referenceId: reward.id,
          referenceType: 'REWARD_CLAIM',
          description: `Claimed ${reward.name} (+₹${reward.amount})`,
          idempotencyKey: `claim-${claim.id}`,
        },
      });

      return {
        reward,
        claim,
        walletBalance: updatedWallet.balance,
        transaction,
      };
    });

    res.json({
      success: true,
      message: `Congratulations! ₹${reward.amount} has been added to your wallet.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const claimCoupon = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { couponCode } = req.body;

    if (!couponCode) {
      throw ApiError.badRequest('Please provide a coupon code');
    }

    const reward = await prisma.reward.findUnique({
      where: { couponCode: couponCode.trim().toUpperCase() },
    });

    if (!reward || !reward.isActive) {
      throw ApiError.badRequest('Invalid or expired coupon code');
    }

    const existingClaim = await prisma.rewardClaim.findFirst({
      where: {
        userId: req.userId!,
        rewardId: reward.id,
      },
    });

    if (existingClaim) {
      throw ApiError.badRequest('You have already redeemed this coupon code');
    }

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
      const balanceAfter = balanceBefore.add(new Prisma.Decimal(reward.amount));

      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id, version: wallet.version },
        data: {
          balance: balanceAfter,
          version: { increment: 1 },
        },
      });

      const claim = await tx.rewardClaim.create({
        data: {
          userId: req.userId!,
          rewardId: reward.id,
          amount: reward.amount,
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'REWARD',
          amount: reward.amount,
          balanceBefore,
          balanceAfter,
          referenceId: reward.id,
          referenceType: 'COUPON_CODE',
          description: `Coupon ${reward.couponCode} applied (+₹${reward.amount})`,
          idempotencyKey: `coupon-${claim.id}`,
        },
      });

      return {
        reward,
        walletBalance: updatedWallet.balance,
      };
    });

    res.json({
      success: true,
      message: `Coupon applied successfully! ₹${reward.amount} credited.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getVipStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const vipLevels = await prisma.vipLevel.findMany({
      orderBy: { level: 'asc' },
    });

    res.json({
      success: true,
      data: {
        currentLevel: 1,
        levelName: 'Bronze',
        points: 1250,
        nextLevelPoints: 5000,
        cashbackPercent: 1.0,
        levels: vipLevels.map((l) => ({
          ...l,
          benefits: l.benefits ? JSON.parse(l.benefits) : null,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
