import { Response, NextFunction } from 'express';
import { prisma } from '../prisma';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';
import { hashPassword, comparePassword } from '../utils/password';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      include: {
        profile: true,
        wallet: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        status: user.status,
        referralCode: user.referralCode,
        referredBy: user.referredBy,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        profile: user.profile,
        wallet: user.wallet,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { displayName, avatarUrl, dateOfBirth, country, address, city, zipCode, bio } = req.body;

    const updatedProfile = await prisma.userProfile.upsert({
      where: { userId: req.userId! },
      update: {
        displayName,
        avatarUrl,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        country,
        address,
        city,
        zipCode,
        bio,
      },
      create: {
        userId: req.userId!,
        displayName,
        avatarUrl,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        country: country || 'India',
        address,
        city,
        zipCode,
        bio,
      },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw ApiError.badRequest('Current password and new password are required');
    }

    if (newPassword.length < 6) {
      throw ApiError.badRequest('New password must be at least 6 characters');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest('Incorrect current password');
    }

    const newHashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHashed },
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    await prisma.notification.updateMany({
      where: {
        id,
        userId: req.userId!,
      },
      data: { isRead: true },
    });

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
};
