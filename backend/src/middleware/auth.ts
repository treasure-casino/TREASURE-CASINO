import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../prisma';

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, status: true },
    });

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw ApiError.forbidden('Account is suspended or banned');
    }

    req.userId = decoded.userId;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized('Invalid or expired token'));
    }
  }
};

export const optionalAuthenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyAccessToken(token);
      req.userId = decoded.userId;
    }
  } catch (_error) {
    // Soft ignore token failure for optional endpoints
  }
  next();
};
