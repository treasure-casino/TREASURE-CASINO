import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../prisma';

export interface AdminRequest extends Request {
  adminId?: string;
  adminRoleId?: string;
}

export const adminAuthenticate = async (
  req: AdminRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No admin token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAdminToken(token);

    const admin = await prisma.adminUser.findUnique({
      where: { id: decoded.adminId },
      select: { id: true, isActive: true, roleId: true },
    });

    if (!admin) {
      throw ApiError.unauthorized('Admin user not found');
    }

    if (!admin.isActive) {
      throw ApiError.forbidden('Admin account is deactivated');
    }

    req.adminId = decoded.adminId;
    req.adminRoleId = decoded.roleId;
    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized('Invalid or expired admin token'));
    }
  }
};

export const requirePermission = (resource: string, action: string) => {
  return async (req: AdminRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.adminRoleId) {
        throw ApiError.forbidden('No role assigned');
      }

      const role = await prisma.adminRole.findUnique({
        where: { id: req.adminRoleId },
        select: { name: true },
      });

      if (role?.name === 'SuperAdmin' || role?.name === 'Super Admin') {
        return next();
      }

      const permission = await prisma.adminPermission.findUnique({
        where: {
          roleId_resource_action: {
            roleId: req.adminRoleId,
            resource,
            action,
          },
        },
      });

      if (!permission) {
        throw ApiError.forbidden(`Missing permission: ${resource}:${action}`);
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        next(error);
      } else {
        next(ApiError.forbidden('Permission check failed'));
      }
    }
  };
};
