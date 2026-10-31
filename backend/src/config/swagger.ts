import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './index';

// ==============================================================================
// Complete OpenAPI 3.0 Specification for TREASURE Casino
// ==============================================================================

const swaggerDefinition: swaggerJsdoc.OAS3Definition = {
  openapi: '3.0.0',
  info: {
    title: 'TREASURE Casino REST API',
    version: '1.0.0',
    description:
      'Comprehensive REST API documentation for the TREASURE Casino platform. Covers player authentication, user profiles, simulated wallet transactions, game catalog & demo sessions, rewards, referral systems, and administrative RBAC management.',
    contact: {
      name: 'TREASURE Casino Engineering',
      email: 'support@treasure.com',
    },
  },
  servers: [
    {
      url: process.env.API_BASE_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${config.port}`,
      description: process.env.NODE_ENV === 'production' ? 'Production API Server' : 'Local Development Server',
    },
  ],
  tags: [
    { name: 'System', description: 'System health check and runtime state' },
    { name: 'Authentication', description: 'Player registration, login, token refresh, and logout' },
    { name: 'Users', description: 'Player profile management, security settings, and notifications' },
    { name: 'Wallet & Ledger', description: 'Simulated deposits, withdrawals, and balance movements' },
    { name: 'Games', description: 'Game catalog, favorites, and demo game round simulations' },
    { name: 'Rewards & VIP', description: 'Daily check-ins, VIP tier progression, and coupon codes' },
    { name: 'Referrals', description: 'Referral invitation links and commission earnings' },
    { name: 'Support', description: 'Customer support ticket submission and tracking' },
    { name: 'Admin - Auth', description: 'Administrator authentication and session verification' },
    { name: 'Admin - Dashboard', description: 'Platform analytics, financial summaries, and charts' },
    { name: 'Admin - Users', description: 'Player account management, audit reasons, and status controls' },
    { name: 'Admin - Finance', description: 'Deposit verification and withdrawal approval/rejection' },
    { name: 'Admin - Games', description: 'Game catalog curation, provider configurations, and betting limits' },
    { name: 'Admin - System', description: 'Immutable audit logs and global system settings' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Standard player JWT access token provided in Authorization header: `Bearer <token>`',
      },
      adminBearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Administrator JWT access token provided in Authorization header: `Bearer <token>`',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { type: 'object' },
        },
      },
      ApiErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string', example: 'Detailed error message' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 20 },
          total: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 5 },
        },
      },
      UserProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          displayName: { type: 'string', example: 'LuckyWinner' },
          avatarUrl: { type: 'string', nullable: true },
          dateOfBirth: { type: 'string', format: 'date', nullable: true },
          country: { type: 'string', example: 'India' },
          address: { type: 'string', nullable: true },
          city: { type: 'string', nullable: true },
          zipCode: { type: 'string', nullable: true },
          bio: { type: 'string', nullable: true },
        },
      },
      Wallet: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          balance: { type: 'number', example: 600.0 },
          reservedBalance: { type: 'number', example: 0.0 },
          currency: { type: 'string', example: 'INR' },
          version: { type: 'integer', example: 2 },
        },
      },
      WalletTransaction: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          walletId: { type: 'string', format: 'uuid' },
          type: {
            type: 'string',
            enum: ['DEPOSIT', 'WITHDRAWAL', 'REWARD', 'GAME_WIN', 'GAME_BET', 'REFUND'],
            example: 'DEPOSIT',
          },
          amount: { type: 'number', example: 500.0 },
          balanceBefore: { type: 'number', example: 100.0 },
          balanceAfter: { type: 'number', example: 600.0 },
          referenceId: { type: 'string', nullable: true },
          referenceType: { type: 'string', nullable: true },
          idempotencyKey: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED'], example: 'COMPLETED' },
          description: { type: 'string', example: 'Simulated UPI Deposit of ₹500' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Deposit: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          paymentOrderId: { type: 'string', format: 'uuid' },
          amount: { type: 'number', example: 500.0 },
          status: { type: 'string', enum: ['PENDING', 'COMPLETED', 'FAILED'], example: 'COMPLETED' },
          transactionId: { type: 'string', format: 'uuid', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      Withdrawal: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          amount: { type: 'number', example: 500.0 },
          status: {
            type: 'string',
            enum: ['PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'FAILED'],
            example: 'PENDING',
          },
          bankDetails: { type: 'string' },
          reviewedBy: { type: 'string', nullable: true },
          reviewedAt: { type: 'string', format: 'date-time', nullable: true },
          reason: { type: 'string', nullable: true },
          transactionId: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Game: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Treasure Fortune Slots' },
          description: { type: 'string', example: 'Classic 5-reel gold and diamond slot' },
          thumbnailUrl: { type: 'string', example: '/assets/games/slots-treasure.png' },
          category: {
            type: 'string',
            enum: ['SLOTS', 'ARCADE', 'CARD', 'CASUAL', 'FISHING', 'OTHER'],
            example: 'SLOTS',
          },
          providerId: { type: 'string' },
          isActive: { type: 'boolean', example: true },
          isDemo: { type: 'boolean', example: true },
          rtp: { type: 'number', example: 96.8 },
          minBet: { type: 'number', example: 10.0 },
          maxBet: { type: 'number', example: 5000.0 },
          sortOrder: { type: 'integer', example: 1 },
        },
      },
      Reward: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string', example: 'Daily Check-in Bonus' },
          description: { type: 'string', nullable: true },
          type: { type: 'string', enum: ['DAILY', 'PROMO', 'VIP', 'REFERRAL', 'COUPON'], example: 'DAILY' },
          amount: { type: 'number', example: 50.0 },
          couponCode: { type: 'string', nullable: true },
          minVipLevel: { type: 'integer', example: 0 },
          isActive: { type: 'boolean', example: true },
        },
      },
      SupportTicket: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          subject: { type: 'string', example: 'Question regarding withdrawal' },
          description: { type: 'string', example: 'How long does review take?' },
          status: { type: 'string', enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], example: 'OPEN' },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], example: 'MEDIUM' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      AdminAuditLog: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          adminUserId: { type: 'string', format: 'uuid' },
          action: { type: 'string', example: 'APPROVE_WITHDRAWAL' },
          resource: { type: 'string', example: 'FINANCE' },
          resourceId: { type: 'string', nullable: true },
          details: { type: 'string', nullable: true },
          ipAddress: { type: 'string', example: '127.0.0.1' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    // ─── SYSTEM HEALTH ────────────────────────────────────────────────────────
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Root health check endpoint',
        description: 'Verifies server uptime, MySQL/MariaDB database connectivity, and simulated financial mode.',
        responses: {
          200: {
            description: 'Database is connected and server is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'UP' },
                    database: { type: 'string', example: 'MySQL / MariaDB Connected (treasure_db)' },
                    simulatedMode: { type: 'boolean', example: true },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
          503: {
            description: 'Database connection failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'API prefix health check endpoint',
        description: 'Mirrors root health check under /api for container ingress and load balancers.',
        responses: {
          200: {
            description: 'API is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'UP' },
                    database: { type: 'string', example: 'MySQL / MariaDB Connected (treasure_db)' },
                    simulatedMode: { type: 'boolean', example: true },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ─── AUTHENTICATION ───────────────────────────────────────────────────────
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new player account',
        description:
          'Creates a player user record, user profile, associated wallet with ₹100 starter bonus, and optional referral attribution.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'player1@treasure.com' },
                  password: { type: 'string', format: 'password', minLength: 6, example: 'Secret123!' },
                  phone: { type: 'string', example: '+919876543210' },
                  displayName: { type: 'string', example: 'LuckyWinner' },
                  referralCode: { type: 'string', example: 'TR-ABC123' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Account registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { type: 'object' },
                        tokens: {
                          type: 'object',
                          properties: {
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Missing or invalid input parameters' },
          409: { description: 'Email already registered' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Player login with email/phone and password',
        description: 'Authenticates player credentials and issues JWT access and refresh tokens.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'player1@treasure.com' },
                  password: { type: 'string', format: 'password', example: 'Secret123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        user: { type: 'object' },
                        tokens: {
                          type: 'object',
                          properties: {
                            accessToken: { type: 'string' },
                            refreshToken: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid email or password' },
          403: { description: 'Account suspended or banned' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get currently authenticated player info',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user profile and wallet state',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout player and invalidate current session',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Successfully logged out' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Renew access token using refresh token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['refreshToken'],
                properties: {
                  refreshToken: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'New tokens issued',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid or expired refresh token' },
        },
      },
    },

    // ─── USER PROFILE & SETTINGS ──────────────────────────────────────────────
    '/api/users/profile': {
      get: {
        tags: ['Users'],
        summary: 'Retrieve detailed player profile',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Player profile details and balance summary',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/UserProfile' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update player profile information',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string', example: 'RoyalKing' },
                  avatarUrl: { type: 'string', example: '/avatars/crown.png' },
                  dateOfBirth: { type: 'string', format: 'date', example: '1995-08-15' },
                  country: { type: 'string', example: 'India' },
                  city: { type: 'string', example: 'Mumbai' },
                  address: { type: 'string' },
                  zipCode: { type: 'string', example: '400001' },
                  bio: { type: 'string', example: 'High roller casino enthusiast' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Profile updated successfully' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/users/security/password': {
      put: {
        tags: ['Users'],
        summary: 'Change account password',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', format: 'password' },
                  newPassword: { type: 'string', format: 'password', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Password changed successfully' },
          400: { description: 'Incorrect current password or invalid new password' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/users/notifications': {
      get: {
        tags: ['Users'],
        summary: 'List user notifications',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of in-app notifications' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/users/notifications/{id}/read': {
      put: {
        tags: ['Users'],
        summary: 'Mark notification as read',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          200: { description: 'Notification marked as read' },
          401: { description: 'Unauthorized' },
        },
      },
    },

    // ─── WALLET & TRANSACTIONS ────────────────────────────────────────────────
    '/api/wallet': {
      get: {
        tags: ['Wallet & Ledger'],
        summary: 'Get player wallet balance and reserved balance',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Wallet balances and currency',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Wallet' },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/wallet/transactions': {
      get: {
        tags: ['Wallet & Ledger'],
        summary: 'Get paginated immutable financial ledger transactions',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          {
            name: 'type',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['DEPOSIT', 'WITHDRAWAL', 'REWARD', 'GAME_WIN', 'GAME_BET', 'REFUND'],
            },
          },
        ],
        responses: {
          200: {
            description: 'Paginated transactions list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        transactions: {
                          type: 'array',
                          items: { $ref: '#/components/schemas/WalletTransaction' },
                        },
                        pagination: { $ref: '#/components/schemas/Pagination' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/wallet/deposit': {
      post: {
        tags: ['Wallet & Ledger'],
        summary: 'Initiate a simulated wallet deposit',
        description:
          'Simulated deposit workflow: Creates payment order, applies idempotency key check, executes database transaction, credits wallet balance, and writes immutable ledger entry.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount'],
                properties: {
                  amount: { type: 'number', minimum: 100, maximum: 100000, example: 500.0 },
                  paymentMethod: { type: 'string', example: 'SIMULATED_UPI' },
                  idempotencyKey: { type: 'string', example: 'dep-custom-key-123' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Simulated deposit credited successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string' },
                    data: {
                      type: 'object',
                      properties: {
                        wallet: { $ref: '#/components/schemas/Wallet' },
                        transaction: { $ref: '#/components/schemas/WalletTransaction' },
                        deposit: { $ref: '#/components/schemas/Deposit' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Invalid amount or limit exceeded' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/wallet/withdraw': {
      post: {
        tags: ['Wallet & Ledger'],
        summary: 'Request a simulated withdrawal',
        description:
          'Validates available balance and reserves funds in an atomic database transaction. Funds move from balance to reservedBalance pending administrator review.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'bankDetails'],
                properties: {
                  amount: { type: 'number', minimum: 500, example: 500.0 },
                  bankDetails: {
                    type: 'object',
                    properties: {
                      accountNumber: { type: 'string', example: '918273645012' },
                      ifscCode: { type: 'string', example: 'HDFC0001234' },
                      accountHolder: { type: 'string', example: 'Lucky Player' },
                      upiId: { type: 'string', example: 'player@upi' },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Withdrawal submitted and funds reserved' },
          400: { description: 'Insufficient balance or invalid amount' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/wallet/deposits': {
      get: {
        tags: ['Wallet & Ledger'],
        summary: 'Get player deposit history',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of deposits' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/wallet/withdrawals': {
      get: {
        tags: ['Wallet & Ledger'],
        summary: 'Get player withdrawal request history',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of withdrawal requests' },
          401: { description: 'Unauthorized' },
        },
      },
    },

    // ─── GAMES ────────────────────────────────────────────────────────────────
    '/api/games': {
      get: {
        tags: ['Games'],
        summary: 'Browse available authorized games',
        description: 'Supports filtering by game category (SLOTS, ARCADE, CARD, CASUAL, FISHING) and keyword search.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'category',
            in: 'query',
            schema: {
              type: 'string',
              enum: ['ALL', 'SLOTS', 'ARCADE', 'CARD', 'CASUAL', 'FISHING', 'OTHER'],
              default: 'ALL',
            },
          },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'List of active games',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Game' },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/games/favorites': {
      get: {
        tags: ['Games'],
        summary: 'Get player favorite games',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of favorite games' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/games/{id}': {
      get: {
        tags: ['Games'],
        summary: 'Get specific game details',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Game details' },
          404: { description: 'Game not found' },
        },
      },
    },
    '/api/games/{id}/play-demo': {
      post: {
        tags: ['Games'],
        summary: 'Execute a simulated demo game round',
        description:
          'Determines game outcome based on configured RTP, updates user wallet atomically, and creates a game session record.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  betAmount: { type: 'number', example: 50.0 },
                  choice: { type: 'string', example: 'OVER_3' },
                  action: { type: 'string', example: 'SPIN' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Game round outcome and updated wallet balance',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        outcome: { type: 'string', example: 'WIN' },
                        bet: { type: 'number', example: 50.0 },
                        winAmount: { type: 'number', example: 100.0 },
                        walletBalance: { type: 'number', example: 650.0 },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Insufficient balance or invalid bet' },
          404: { description: 'Game not found' },
        },
      },
    },
    '/api/games/{id}/favorite': {
      post: {
        tags: ['Games'],
        summary: 'Toggle favorite status for a game',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Toggled favorite state' },
        },
      },
    },

    // ─── REWARDS & VIP ────────────────────────────────────────────────────────
    '/api/rewards': {
      get: {
        tags: ['Rewards & VIP'],
        summary: 'Get active rewards and daily check-in status',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of rewards with daily claim status' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/api/rewards/{id}/claim': {
      post: {
        tags: ['Rewards & VIP'],
        summary: 'Claim a reward or daily check-in',
        description: 'Validates daily claim limits and credits the player wallet atomically.',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Reward successfully claimed' },
          400: { description: 'Already claimed today' },
          404: { description: 'Reward not found or inactive' },
        },
      },
    },
    '/api/rewards/coupon': {
      post: {
        tags: ['Rewards & VIP'],
        summary: 'Redeem a promotional coupon code',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['couponCode'],
                properties: {
                  couponCode: { type: 'string', example: 'TREASURE200' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Coupon redeemed successfully' },
          400: { description: 'Invalid or already claimed coupon' },
        },
      },
    },
    '/api/rewards/vip-status': {
      get: {
        tags: ['Rewards & VIP'],
        summary: 'Get player VIP tier and tier benefits',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Current VIP level and next tier progress' },
        },
      },
    },

    // ─── REFERRALS ────────────────────────────────────────────────────────────
    '/api/referrals/code': {
      get: {
        tags: ['Referrals'],
        summary: 'Get unique invitation code and referral URL',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Referral code and invite URL',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        referralCode: { type: 'string', example: 'TR-ABC123' },
                        inviteUrl: { type: 'string', example: 'https://localhost:5000/invite/TR-ABC123' },
                        rewardPerInvite: { type: 'number', example: 100.0 },
                        currency: { type: 'string', example: 'INR' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/referrals/stats': {
      get: {
        tags: ['Referrals'],
        summary: 'Get referral statistics and invited users history',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Total invited, earnings, and list of referees' },
        },
      },
    },

    // ─── SUPPORT ──────────────────────────────────────────────────────────────
    '/api/support/tickets': {
      post: {
        tags: ['Support'],
        summary: 'Submit a customer support ticket',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subject', 'description'],
                properties: {
                  subject: { type: 'string', example: 'Question regarding withdrawal' },
                  description: { type: 'string', example: 'How long does approval take?' },
                  priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], default: 'MEDIUM' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Support ticket submitted' },
          400: { description: 'Missing subject or description' },
        },
      },
      get: {
        tags: ['Support'],
        summary: 'List player support tickets',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'List of submitted support tickets' },
        },
      },
    },

    // ─── ADMIN MANAGEMENT ─────────────────────────────────────────────────────
    '/api/admin/auth/login': {
      post: {
        tags: ['Admin - Auth'],
        summary: 'Administrator login',
        description:
          'Validates admin email/password, records login in admin_audit_logs, and returns admin JWT with RBAC role.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'admin@treasure.com' },
                  password: { type: 'string', format: 'password', example: 'Admin123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Admin authenticated',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string' },
                        admin: { type: 'object' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Invalid admin credentials' },
          403: { description: 'Account deactivated' },
        },
      },
    },
    '/api/admin/auth/me': {
      get: {
        tags: ['Admin - Auth'],
        summary: 'Get active administrator profile and RBAC permissions',
        security: [{ adminBearerAuth: [] }],
        responses: {
          200: { description: 'Admin profile and role details' },
          401: { description: 'Unauthorized admin' },
        },
      },
    },
    '/api/admin/dashboard/stats': {
      get: {
        tags: ['Admin - Dashboard'],
        summary: 'Get high-level dashboard business KPIs',
        description: 'Aggregates total players, total deposits, total payouts, pending payouts, and active games.',
        security: [{ adminBearerAuth: [] }],
        responses: {
          200: { description: 'Aggregated platform metrics' },
        },
      },
    },
    '/api/admin/dashboard/charts': {
      get: {
        tags: ['Admin - Dashboard'],
        summary: 'Get revenue trends and category distribution for charts',
        security: [{ adminBearerAuth: [] }],
        responses: {
          200: { description: 'Chart series data' },
        },
      },
    },
    '/api/admin/users': {
      get: {
        tags: ['Admin - Users'],
        summary: 'List and search registered players',
        security: [{ adminBearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ALL', 'ACTIVE', 'SUSPENDED', 'BANNED'] } },
        ],
        responses: {
          200: { description: 'Paginated user list' },
        },
      },
    },
    '/api/admin/users/{id}': {
      get: {
        tags: ['Admin - Users'],
        summary: 'Get full player profile, wallet transactions, and history',
        security: [{ adminBearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Detailed user record' },
          404: { description: 'User not found' },
        },
      },
    },
    '/api/admin/users/{id}/status': {
      put: {
        tags: ['Admin - Users'],
        summary: 'Modify player status with mandatory audit reason',
        description: 'Updates account status (ACTIVE, SUSPENDED, BANNED) and logs mutation in admin_audit_logs.',
        security: [{ adminBearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status', 'reason'],
                properties: {
                  status: { type: 'string', enum: ['ACTIVE', 'SUSPENDED', 'BANNED'], example: 'SUSPENDED' },
                  reason: { type: 'string', minLength: 5, example: 'Suspicious multiple login attempts' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'User status updated' },
          400: { description: 'Missing reason or invalid status' },
          404: { description: 'User not found' },
        },
      },
    },
    '/api/admin/finance/deposits': {
      get: {
        tags: ['Admin - Finance'],
        summary: 'List all player deposit orders',
        security: [{ adminBearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Paginated deposit records' },
        },
      },
    },
    '/api/admin/finance/withdrawals': {
      get: {
        tags: ['Admin - Finance'],
        summary: 'List player withdrawal payout requests',
        security: [{ adminBearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['ALL', 'PENDING', 'COMPLETED', 'REJECTED'] } },
        ],
        responses: {
          200: { description: 'Paginated withdrawal requests' },
        },
      },
    },
    '/api/admin/finance/withdrawals/{id}/review': {
      put: {
        tags: ['Admin - Finance'],
        summary: 'Approve or Reject a withdrawal payout request',
        description:
          'If approved: Deducts reserved funds and completes payout. If rejected: Returns reserved funds back to available balance, records refund in ledger, and writes audit log.',
        security: [{ adminBearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['decision'],
                properties: {
                  decision: { type: 'string', enum: ['APPROVE', 'REJECT'], example: 'APPROVE' },
                  reason: { type: 'string', example: 'Bank verification confirmed' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Withdrawal review processed' },
          400: { description: 'Invalid status or missing rejection reason' },
          404: { description: 'Withdrawal not found' },
        },
      },
    },
    '/api/admin/games': {
      get: {
        tags: ['Admin - Games'],
        summary: 'List all games for admin management',
        security: [{ adminBearerAuth: [] }],
        responses: {
          200: { description: 'List of games with providers' },
        },
      },
      post: {
        tags: ['Admin - Games'],
        summary: 'Add a new authorized game to catalog',
        security: [{ adminBearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'category', 'providerId'],
                properties: {
                  name: { type: 'string', example: 'Golden Roulette 3D' },
                  description: { type: 'string' },
                  category: {
                    type: 'string',
                    enum: ['SLOTS', 'ARCADE', 'CARD', 'CASUAL', 'FISHING', 'OTHER'],
                    example: 'ARCADE',
                  },
                  providerId: { type: 'string', example: 'prov-inhouse' },
                  thumbnailUrl: { type: 'string', example: '/assets/games/roulette.png' },
                  rtp: { type: 'number', example: 97.3 },
                  minBet: { type: 'number', example: 25.0 },
                  maxBet: { type: 'number', example: 10000.0 },
                  isDemo: { type: 'boolean', example: true },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Game created' },
          400: { description: 'Validation failed' },
        },
      },
    },
    '/api/admin/games/{id}': {
      put: {
        tags: ['Admin - Games'],
        summary: 'Update game details or toggle active status',
        security: [{ adminBearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  description: { type: 'string' },
                  category: { type: 'string', enum: ['SLOTS', 'ARCADE', 'CARD', 'CASUAL', 'FISHING', 'OTHER'] },
                  isActive: { type: 'boolean' },
                  isDemo: { type: 'boolean' },
                  rtp: { type: 'number' },
                  minBet: { type: 'number' },
                  maxBet: { type: 'number' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Game updated' },
        },
      },
    },
    '/api/admin/games/providers': {
      get: {
        tags: ['Admin - Games'],
        summary: 'List integrated game providers',
        security: [{ adminBearerAuth: [] }],
        responses: {
          200: { description: 'List of providers' },
        },
      },
    },
    '/api/admin/audit-logs': {
      get: {
        tags: ['Admin - System'],
        summary: 'View immutable system audit logs',
        security: [{ adminBearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 25 } },
        ],
        responses: {
          200: { description: 'Paginated audit logs with admin user details' },
        },
      },
    },
    '/api/admin/settings': {
      get: {
        tags: ['Admin - System'],
        summary: 'List global runtime system settings',
        security: [{ adminBearerAuth: [] }],
        responses: {
          200: { description: 'System settings list' },
        },
      },
      put: {
        tags: ['Admin - System'],
        summary: 'Update a global system setting',
        security: [{ adminBearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['key', 'value'],
                properties: {
                  key: { type: 'string', example: 'maintenance_mode' },
                  value: { type: 'string', example: 'false' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Setting updated successfully' },
        },
      },
    },
  },
};

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  apis: [
    path.join(__dirname, '../routes/**/*.{ts,js}'),
    path.join(__dirname, '../routes/admin/**/*.{ts,js}'),
    path.join(process.cwd(), 'src/routes/**/*.{ts,js}'),
    path.join(process.cwd(), 'dist/routes/**/*.{ts,js}'),
  ],
};

export const swaggerSpec = swaggerJsdoc(options);
