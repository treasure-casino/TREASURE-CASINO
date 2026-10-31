import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TR-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawEmail = req.body.email || (req.body.phoneNumber ? `${req.body.phoneNumber}@treasurecasino.com` : undefined);
    const phone = req.body.phone || req.body.phoneNumber;
    const password = req.body.password;
    const displayName = req.body.displayName || req.body.name;
    const referralCode = req.body.referralCode;

    if (!rawEmail || !password) {
      throw ApiError.badRequest('Email or phone number and password are required');
    }

    const email = rawEmail.toLowerCase().trim();

    if (password.length < 6) {
      throw ApiError.badRequest('Password must be at least 6 characters long');
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists');
    }

    let validReferrer: any = null;
    if (referralCode) {
      validReferrer = await prisma.user.findUnique({
        where: { referralCode: referralCode.trim() },
      });
    }

    const hashedPassword = await hashPassword(password);
    const userReferralCode = generateReferralCode();

    // Atomic creation: User, UserProfile, Wallet, and optional Referral relationship
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          phone: phone ? phone.trim() : null,
          passwordHash: hashedPassword,
          status: 'ACTIVE',
          referralCode: userReferralCode,
          referredBy: validReferrer ? validReferrer.referralCode : null,
          profile: {
            create: {
              displayName: displayName ? displayName.trim() : email.split('@')[0],
              country: 'India',
            },
          },
          wallet: {
            create: {
              balance: 100.00, // Starter bonus in simulated INR
              reservedBalance: 0.00,
              currency: 'INR',
            },
          },
        },
        include: {
          profile: true,
          wallet: true,
        },
      });

      // Record welcome starter bonus in wallet ledger
      if (user.wallet) {
        await tx.walletTransaction.create({
          data: {
            walletId: user.wallet.id,
            type: 'REWARD',
            amount: 100.00,
            balanceBefore: 0.00,
            balanceAfter: 100.00,
            description: 'Starter registration bonus',
            status: 'COMPLETED',
            idempotencyKey: `starter-${user.id}`,
          },
        });
      }

      // If referred, create referral entry
      if (validReferrer) {
        await tx.referral.create({
          data: {
            referrerId: validReferrer.id,
            refereeId: user.id,
            status: 'COMPLETED',
            rewardClaimed: false,
          },
        });
      }

      return user;
    });

    const accessToken = generateAccessToken(result.id);
    const refreshToken = generateRefreshToken(result.id);

    // Save session
    await prisma.userSession.create({
      data: {
        userId: result.id,
        token: accessToken,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'Unknown',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: result.id,
          email: result.email,
          phone: result.phone,
          status: result.status,
          referralCode: result.referralCode,
          profile: result.profile,
          wallet: result.wallet,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawIdentifier = (req.body.email || req.body.phone || req.body.phoneNumber || '').trim();
    const password = req.body.password;

    if (!rawIdentifier || !password) {
      throw ApiError.badRequest('Email or phone number and password are required');
    }

    const emailCandidate = rawIdentifier.includes('@') ? rawIdentifier : `${rawIdentifier}@treasurecasino.com`;

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: rawIdentifier.toLowerCase() },
          { email: emailCandidate.toLowerCase() },
          { phone: rawIdentifier },
        ],
      },
      include: {
        profile: true,
        wallet: true,
      },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw ApiError.forbidden('Your account has been suspended or banned. Please contact support.');
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.userSession.create({
      data: {
        userId: user.id,
        token: accessToken,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'Unknown',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          status: user.status,
          referralCode: user.referralCode,
          profile: user.profile,
          wallet: user.wallet,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      await prisma.userSession.deleteMany({
        where: { token },
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      throw ApiError.badRequest('Refresh token is required');
    }

    const decoded = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user || user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw ApiError.unauthorized('Invalid session');
    }

    const newAccessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    next(ApiError.unauthorized('Invalid or expired refresh token'));
  }
};

