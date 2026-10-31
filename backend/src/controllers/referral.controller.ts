import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';

export const getReferralCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { referralCode: true },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const host = req.get('host') || 'localhost:5000';
    const inviteUrl = `https://${host}/invite/${user.referralCode}`;

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        inviteUrl,
        rewardPerInvite: 100.00,
        currency: 'INR',
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getReferralStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: req.userId! },
      include: {
        referee: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            profile: {
              select: { displayName: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalInvited = referrals.length;
    const totalEarned = totalInvited * 100.00;

    res.json({
      success: true,
      data: {
        totalInvited,
        totalEarned,
        referrals,
      },
    });
  } catch (error) {
    next(error);
  }
};

