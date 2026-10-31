import jwt from 'jsonwebtoken';
import { config } from '../config';

interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

interface AdminTokenPayload {
  adminId: string;
  roleId: string;
  type: 'admin_access';
}

export function generateAccessToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'access' } as TokenPayload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiration as any }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh' } as TokenPayload,
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiration as any }
  );
}

export function generateAdminToken(adminId: string, roleId: string): string {
  return jwt.sign(
    { adminId, roleId, type: 'admin_access' } as AdminTokenPayload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiration as any }
  );
}

export function verifyAccessToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, config.jwt.secret) as TokenPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function verifyRefreshToken(token: string): TokenPayload {
  const decoded = jwt.verify(token, config.jwt.refreshSecret) as TokenPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return decoded;
}

export function verifyAdminToken(token: string): AdminTokenPayload {
  const decoded = jwt.verify(token, config.jwt.secret) as AdminTokenPayload;
  if (decoded.type !== 'admin_access') {
    throw new Error('Invalid token type');
  }
  return decoded;
}
