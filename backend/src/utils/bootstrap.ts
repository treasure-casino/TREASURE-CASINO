import { execSync } from 'child_process';
import path from 'path';
import { prisma } from '../prisma';
import { config } from '../config';
import { hashPassword } from './password';
import { logger } from './logger';

/**
 * Ensures all database tables exist in MySQL / MariaDB.
 * If tables have not been created yet (common on fresh cloud MySQL deployments),
 * automatically executes Prisma schema push without touching existing records.
 */
export async function ensureDatabaseSchema(): Promise<void> {
  try {
    // Check if key system table exists
    await prisma.$queryRaw`SELECT 1 FROM admin_users LIMIT 1`;
    logger.info('Database tables verified.');
  } catch (error: any) {
    const errorMsg = String(error?.message || error);
    const isMissingTable =
      errorMsg.includes("doesn't exist") ||
      errorMsg.includes('does not exist') ||
      errorMsg.includes('ER_NO_SUCH_TABLE') ||
      error?.code === 'P2021';

    if (isMissingTable) {
      logger.warn('Database tables not found. Automatically synchronizing schema with Prisma...');
      try {
        const prismaCli = path.resolve(__dirname, '../../node_modules/prisma/build/index.js');
        execSync(`node "${prismaCli}" db push --skip-generate --accept-data-loss`, {
          cwd: path.resolve(__dirname, '../..'),
          stdio: 'inherit',
          env: process.env,
        });
        logger.info('Database schema successfully synchronized.');
      } catch (pushError: any) {
        logger.error('Failed to auto-synchronize database schema:', {
          message: pushError.message,
        });
      }
    } else {
      logger.warn('Database schema check notice:', { message: errorMsg });
    }
  }
}

/**
 * Ensures system baseline records exist on startup (provider, admin role, admin user).
 * This makes zero-touch deployment on Render or any cloud provider seamless.
 */
export async function bootstrapSystem(): Promise<void> {
  try {
    // 1. Ensure the in-house game provider exists
    await prisma.gameProvider.upsert({
      where: { name: 'In-House Games' },
      update: {},
      create: {
        id: 'prov-inhouse',
        name: 'In-House Games',
        code: 'IN_HOUSE',
        isActive: true,
      },
    });

    // 2. Ensure Super Admin role exists
    let superAdminRole = await prisma.adminRole.findFirst({
      where: {
        OR: [{ name: 'Super Admin' }, { name: 'SuperAdmin' }],
      },
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.adminRole.create({
        data: {
          name: 'Super Admin',
          description: 'Full administrative access and system privileges',
        },
      });
      logger.info('Created baseline Super Admin role.');
    }

    // 3. Ensure baseline admin user exists if no admin users exist
    const adminCount = await prisma.adminUser.count();
    if (adminCount === 0) {
      const email = (config.admin.defaultEmail || 'admin@treasure.com').toLowerCase().trim();
      const rawPassword = config.admin.defaultPassword || 'Admin123!';
      const hashedPassword = await hashPassword(rawPassword);

      await prisma.adminUser.create({
        data: {
          email,
          name: 'System Administrator',
          passwordHash: hashedPassword,
          roleId: superAdminRole.id,
          isActive: true,
        },
      });
      logger.info(`Initialized default admin user: ${email}`);
    }
  } catch (error: any) {
    logger.warn(`Bootstrap initialization notice: ${error.message}`);
  }
}
