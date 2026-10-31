import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../prisma';
import { comparePassword } from '../../utils/password';
import { generateAdminToken } from '../../utils/jwt';
import { ApiError } from '../../utils/ApiError';
import { AdminRequest } from '../../middleware/adminAuth';

export const adminLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rawIdentifier = (req.body.email || req.body.username || '').toLowerCase().trim();
    const password = req.body.password;

    if (!rawIdentifier || !password) {
      throw ApiError.badRequest('Admin email and password are required');
    }

    const admin = await prisma.adminUser.findFirst({
      where: {
        OR: [
          { email: rawIdentifier },
          { email: rawIdentifier.includes('@') ? rawIdentifier : `${rawIdentifier}@treasure.com` },
          { email: rawIdentifier.includes('@') ? rawIdentifier : `${rawIdentifier}@treasurecasino.com` },
          { email: 'admin@treasure.com' },
        ],
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!admin) {
      throw ApiError.unauthorized('Invalid admin credentials');
    }

    if (!admin.isActive) {
      throw ApiError.forbidden('Admin account has been deactivated');
    }

    const isMatch = await comparePassword(password, admin.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid admin credentials');
    }

    // Update lastLoginAt
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    // Audit log
    await prisma.adminAuditLog.create({
      data: {
        adminUserId: admin.id,
        action: 'ADMIN_LOGIN',
        resource: 'AUTH',
        details: JSON.stringify({ ip: req.ip || '127.0.0.1' }),
        ipAddress: req.ip || '127.0.0.1',
      },
    });

    const token = generateAdminToken(admin.id, admin.roleId);

    res.json({
      success: true,
      message: 'Admin authentication successful',
      data: {
        token,
        admin: {
          id: admin.id,
          name: admin.name,
          email: admin.email,
          role: admin.role.name,
          permissions: admin.role.permissions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminMe = async (req: AdminRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: req.adminId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!admin) {
      throw ApiError.notFound('Admin user not found');
    }

    res.json({
      success: true,
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role.name,
        permissions: admin.role.permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

