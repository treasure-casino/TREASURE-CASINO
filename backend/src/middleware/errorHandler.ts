import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { cleanOrigin, isOriginAllowed } from './cors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Ensure CORS headers are set on error responses for allowed origins
  const origin = req.headers.origin;
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', cleanOrigin(origin));
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, Origin, X-Requested-With, x-demo-token'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  }

  if (err instanceof ApiError) {
    logger.warn(`API Error: ${err.statusCode} - ${err.message}`);
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      message: err.message,
    });
    return;
  }

  logger.error('Unexpected error', {
    name: err.name,
    message: err.message,
    code: (err as any).code,
  });

  const isDbError =
    err.message?.includes('Table') ||
    err.message?.includes('database') ||
    err.message?.includes('Prisma') ||
    (err as any).code?.startsWith?.('P');

  res.status(500).json({
    success: false,
    error: isDbError ? 'Database service error: tables not initialized or query failed' : 'Internal server error',
    message: isDbError ? 'Database service error: tables not initialized or query failed' : 'Internal server error',
  });
};
