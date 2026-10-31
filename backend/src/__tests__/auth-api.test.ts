import { config } from '../config';

const BASE_URL = `http://localhost:${config.port || 5000}`;

describe('E2E Integration & RBAC Security Tests', () => {
  let adminToken: string;
  let playerToken: string;
  const testEmail = `tester_${Date.now()}@example.com`;
  const testPassword = 'Password123!';

  describe('1. Health & Environment Verification', () => {
    it('should report database connected and simulated payment mode active', async () => {
      const response = await fetch(`${BASE_URL}/health`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.status).toBe('UP');
      expect(data.database).toContain('MySQL / MariaDB Connected');
      expect(data.simulatedMode).toBe(true);
    });
  });

  describe('2. Admin Authentication & RBAC', () => {
    it('should reject admin login with invalid password (401)', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@treasure.com',
          password: 'WrongPassword!',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
    });

    it('should authenticate seed admin and issue an admin JWT', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@treasure.com',
          password: 'Admin123!',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.token).toBeDefined();
      expect(data.data.admin.role).toBe('SuperAdmin');

      adminToken = data.data.token;
    });

    it('should reject unauthenticated access to admin dashboard stats (401)', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/dashboard/stats`);
      expect(response.status).toBe(401);
    });

    it('should retrieve real live statistics with admin token', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.totalUsers).toBeGreaterThanOrEqual(1);
      expect(data.data.activeGamesCount).toBeGreaterThanOrEqual(1);
      expect(data.data.grossGamingRevenue).toBeDefined();
    });

    it('should retrieve real registered users from MySQL', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.users)).toBe(true);
      expect(data.data.users.length).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve games catalog from database', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/games`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(8);
    });

    it('should log admin actions and return audit logs', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/audit-logs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.logs)).toBe(true);
      expect(data.data.logs.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Player Auth & Account Provisioning', () => {
    it('should register a new player, provision wallet with starter bonus, and return tokens', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          displayName: 'Test Player',
          phone: '+919999988888',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.user.email).toBe(testEmail.toLowerCase());
      expect(data.data.user.wallet).toBeDefined();
      expect(Number(data.data.user.wallet.balance)).toBe(100.00); // Welcome starter bonus
      expect(data.data.tokens.accessToken).toBeDefined();

      playerToken = data.data.tokens.accessToken;
    });

    it('should reject duplicate player registration with conflict error (409)', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          displayName: 'Duplicate Player',
        }),
      });

      expect(response.status).toBe(409);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
    });

    it('should reject player login with invalid password (401)', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword!',
        }),
      });

      expect(response.status).toBe(401);
      const data = await response.json() as any;
      expect(data.success).toBe(false);
    });

    it('should authenticate player with valid credentials (200)', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.tokens.accessToken).toBeDefined();
    });

    it('should return player profile via /api/auth/me', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${playerToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.email).toBe(testEmail.toLowerCase());
      expect(data.data.wallet.balance).toBeDefined();
    });

    it('should return player wallet balance via /api/wallet', async () => {
      const response = await fetch(`${BASE_URL}/api/wallet`, {
        headers: { Authorization: `Bearer ${playerToken}` },
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(Number(data.data.balance)).toBe(100.00);
    });
  });

  describe('4. Strict RBAC Segregation', () => {
    it('should strictly reject player token on admin endpoints (401/403)', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${playerToken}` },
      });

      // Player token does not have admin_access type, must be rejected
      expect([401, 403]).toContain(response.status);
    });

    it('should strictly reject admin token on player user endpoints (401/403)', async () => {
      const response = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // Admin token does not have user access type, must be rejected
      expect([401, 403]).toContain(response.status);
    });
  });

  describe('5. Simulated Financial Flow (Demo Ledger)', () => {
    it('should process simulated deposit and update wallet ledger', async () => {
      const depositResponse = await fetch(`${BASE_URL}/api/wallet/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${playerToken}`,
        },
        body: JSON.stringify({
          amount: 250.00,
          paymentMethod: 'UPI',
        }),
      });

      expect(depositResponse.status).toBe(201);
      const depositData = await depositResponse.json() as any;
      expect(depositData.success).toBe(true);
      expect(depositData.data.deposit.status).toBe('COMPLETED');
      expect(Number(depositData.data.deposit.amount)).toBe(250.00);

      // Verify wallet reflects new balance: 100 starter + 250 deposit = 350
      const walletResponse = await fetch(`${BASE_URL}/api/wallet`, {
        headers: { Authorization: `Bearer ${playerToken}` },
      });
      const walletData = await walletResponse.json() as any;
      expect(Number(walletData.data.balance)).toBe(350.00);

      // Verify transactions ledger contains deposit
      const txResponse = await fetch(`${BASE_URL}/api/wallet/transactions`, {
        headers: { Authorization: `Bearer ${playerToken}` },
      });
      const txData = await txResponse.json() as any;
      expect(txData.success).toBe(true);
      expect(Array.isArray(txData.data.transactions)).toBe(true);
      const depositTx = txData.data.transactions.find((t: any) => t.type === 'DEPOSIT');
      expect(depositTx).toBeDefined();
      expect(Number(depositTx.amount)).toBe(250.00);
    });
  });

  describe('6. 100+ Games Catalog & Demo Engine Tests', () => {
    it('should serve 100+ unique games without requiring authentication', async () => {
      const response = await fetch(`${BASE_URL}/api/games`);
      expect(response.status).toBe(200);

      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThanOrEqual(100);
    });

    it('should filter games accurately across categories', async () => {
      const [crashRes, diceRes, plinkoRes, kenoRes] = await Promise.all([
        fetch(`${BASE_URL}/api/games?category=CRASH`),
        fetch(`${BASE_URL}/api/games?category=DICE`),
        fetch(`${BASE_URL}/api/games?category=PLINKO`),
        fetch(`${BASE_URL}/api/games?category=KENO`),
      ]);

      const crashData = await crashRes.json() as any;
      const diceData = await diceRes.json() as any;
      const plinkoData = await plinkoRes.json() as any;
      const kenoData = await kenoRes.json() as any;

      expect(crashData.data.length).toBeGreaterThanOrEqual(18);
      expect(diceData.data.length).toBeGreaterThanOrEqual(15);
      expect(plinkoData.data.length).toBe(14);
      expect(kenoData.data.length).toBe(16);
    });

    it('should execute Limbo demo gameplay round with target multiplier', async () => {
      const response = await fetch(`${BASE_URL}/api/games/game-crash-01/play-demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${playerToken}`,
        },
        body: JSON.stringify({
          betAmount: 10,
          action: 'LIMBO_ROLL',
          targetMultiplier: 2.00,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.gameData.gameType).toBe('LIMBO');
      expect(data.data.gameData.rollMultiplier).toBeDefined();
    });

    it('should execute Dice Over/Under demo gameplay round', async () => {
      const response = await fetch(`${BASE_URL}/api/games/game-dice-01/play-demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${playerToken}`,
        },
        body: JSON.stringify({
          betAmount: 10,
          condition: 'OVER',
          target: 50,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.gameData.gameType).toBe('DICE');
      expect(data.data.gameData.roll).toBeGreaterThanOrEqual(1);
    });

    it('should execute Plinko physics demo drop round', async () => {
      const response = await fetch(`${BASE_URL}/api/games/game-plinko-01/play-demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${playerToken}`,
        },
        body: JSON.stringify({
          betAmount: 10,
          rows: 10,
          risk: 'MEDIUM',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.gameData.gameType).toBe('PLINKO');
      expect(data.data.gameData.bucketMultiplier).toBeDefined();
    });

    it('should execute Keno 20-ball draw demo round', async () => {
      const response = await fetch(`${BASE_URL}/api/games/game-keno-01/play-demo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${playerToken}`,
        },
        body: JSON.stringify({
          betAmount: 10,
          picks: [3, 7, 14, 21, 42],
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.gameData.gameType).toBe('KENO');
      expect(data.data.gameData.drawn.length).toBe(20);
    });

    it('should allow admin to update game details and featured status with audit trail', async () => {
      const response = await fetch(`${BASE_URL}/api/admin/games/game-crash-01`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: 'Limbo Rocket Extreme',
          isFeatured: true,
          rtp: 99.00,
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json() as any;
      expect(data.success).toBe(true);
      expect(data.data.name).toBe('Limbo Rocket Extreme');
      expect(data.data.isFeatured).toBe(true);
    });
  });
});
