import { Request, Response, NextFunction } from 'express';
import cors, { CorsOptions } from 'cors';
import { config } from '../config';
import { logger } from '../utils/logger';

export const cleanOrigin = (url: string): string => url.trim().replace(/\/+$/, '');

const configuredOrigins = (config.cors.origin || []).map(cleanOrigin).filter(Boolean);

export const allowedOrigins: string[] = Array.from(
  new Set([
    ...configuredOrigins,
    'https://treasure-casino-admin.onrender.com',
    'https://treasure-casino-frontend.onrender.com',
    'https://treasure-casino.onrender.com',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ])
);

export const isOriginAllowed = (origin?: string): boolean => {
  if (!origin) return true; // Non-browser clients (curl, mobile apps, server-to-server)
  const normalized = cleanOrigin(origin);
  if (allowedOrigins.includes(normalized)) return true;
  if (normalized.startsWith('http://localhost:') || normalized.startsWith('http://127.0.0.1:')) return true;
  return false;
};

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || isOriginAllowed(origin)) {
      return callback(null, true);
    }
    logger.warn(`CORS rejected for unauthorized origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Accept',
    'Origin',
    'X-Requested-With',
    'x-demo-token',
  ],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

/**
 * Custom preflight & CORS header middleware
 * Ensures CORS headers are set early, preflight OPTIONS are answered with 204,
 * and error responses preserve CORS headers.
 */
export const preflightCorsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(origin)) {
    const normalized = cleanOrigin(origin);
    res.setHeader('Access-Control-Allow-Origin', normalized);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, Accept, Origin, X-Requested-With, x-demo-token'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
  }

  // Handle preflight OPTIONS immediately before any downstream middlewares/auth
  if (req.method === 'OPTIONS') {
    if (!origin || isOriginAllowed(origin)) {
      res.status(204).end();
      return;
    }
    res.status(403).json({ success: false, error: 'CORS origin not allowed' });
    return;
  }

  next();
};

export const corsMiddleware = cors(corsOptions);

