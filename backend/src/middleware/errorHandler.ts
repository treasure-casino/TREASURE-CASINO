import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
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
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: 'Internal server error',
  });
};
