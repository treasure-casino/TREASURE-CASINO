import { PrismaClient } from '@prisma/client';
import { ApiError } from './ApiError';

const prisma = new PrismaClient();

export async function validateIdempotencyKey(key: string): Promise<boolean> {
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    throw ApiError.badRequest('Idempotency key is required');
  }
  if (key.length > 255) {
    throw ApiError.badRequest('Idempotency key must be at most 255 characters');
  }
  return true;
}

export async function checkIdempotency(key: string): Promise<{ exists: boolean; transaction?: any }> {
  const existing = await prisma.walletTransaction.findUnique({
    where: { idempotencyKey: key },
  });

  if (existing) {
    return { exists: true, transaction: existing };
  }

  return { exists: false };
}
