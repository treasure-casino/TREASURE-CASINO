import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'treasure_db',
    url: process.env.DATABASE_URL || 'mysql://root:@localhost:3306/treasure_db?connect_timeout=30',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'treasure_dev_jwt_secret_key_123',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'treasure_dev_jwt_refresh_secret_key_456',
    expiration: process.env.JWT_EXPIRATION || '24h',
    refreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },

  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173,http://localhost:5174,http://127.0.0.1:5173,http://127.0.0.1:5174').split(','),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '300', 10),
  },

  admin: {
    defaultEmail: process.env.ADMIN_DEFAULT_EMAIL || 'admin@treasure.com',
    defaultPassword: process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!',
  },

  payment: {
    simulatedOnly: process.env.SIMULATED_PAYMENTS_ONLY !== 'false',
    simulationDelayMs: parseInt(process.env.PAYMENT_SIMULATION_DELAY_MS || '1000', 10),
  },
};
