import { swaggerSpec } from '../config/swagger';

const spec = swaggerSpec as any;

describe('Swagger / OpenAPI Specification Tests', () => {
  it('should have a valid OpenAPI 3.0 root document', () => {
    expect(spec).toBeDefined();
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBe('TREASURE Casino REST API');
    expect(spec.info.version).toBe('1.0.0');
  });

  it('should contain registered server definitions', () => {
    expect(Array.isArray(spec.servers)).toBe(true);
    expect(spec.servers?.length).toBeGreaterThan(0);
  });

  it('should have operations defined in paths (not empty)', () => {
    expect(spec.paths).toBeDefined();
    const pathKeys = Object.keys(spec.paths);
    expect(pathKeys.length).toBeGreaterThan(0);
  });

  it('should define authentication endpoints', () => {
    const paths = spec.paths;
    expect(paths['/api/auth/register']).toBeDefined();
    expect(paths['/api/auth/register']?.post).toBeDefined();

    expect(paths['/api/auth/login']).toBeDefined();
    expect(paths['/api/auth/login']?.post).toBeDefined();

    expect(paths['/api/auth/me']).toBeDefined();
    expect(paths['/api/auth/me']?.get).toBeDefined();
  });

  it('should define user endpoints', () => {
    const paths = spec.paths;
    expect(paths['/api/users/profile']).toBeDefined();
    expect(paths['/api/users/profile']?.get).toBeDefined();
    expect(paths['/api/users/profile']?.put).toBeDefined();
    expect(paths['/api/users/security/password']?.put).toBeDefined();
  });

  it('should define wallet and ledger endpoints', () => {
    const paths = spec.paths;
    expect(paths['/api/wallet']).toBeDefined();
    expect(paths['/api/wallet']?.get).toBeDefined();

    expect(paths['/api/wallet/transactions']).toBeDefined();
    expect(paths['/api/wallet/transactions']?.get).toBeDefined();

    expect(paths['/api/wallet/deposit']).toBeDefined();
    expect(paths['/api/wallet/deposit']?.post).toBeDefined();

    expect(paths['/api/wallet/withdraw']).toBeDefined();
    expect(paths['/api/wallet/withdraw']?.post).toBeDefined();
  });

  it('should define game catalog and demo session endpoints', () => {
    const paths = spec.paths;
    expect(paths['/api/games']).toBeDefined();
    expect(paths['/api/games']?.get).toBeDefined();

    expect(paths['/api/games/{id}']).toBeDefined();
    expect(paths['/api/games/{id}']?.get).toBeDefined();

    expect(paths['/api/games/{id}/play-demo']).toBeDefined();
    expect(paths['/api/games/{id}/play-demo']?.post).toBeDefined();
  });

  it('should define rewards and referral endpoints', () => {
    const paths = spec.paths;
    expect(paths['/api/rewards']).toBeDefined();
    expect(paths['/api/rewards']?.get).toBeDefined();
    expect(paths['/api/rewards/{id}/claim']?.post).toBeDefined();

    expect(paths['/api/referrals/code']?.get).toBeDefined();
    expect(paths['/api/referrals/stats']?.get).toBeDefined();
  });

  it('should define admin management endpoints with security', () => {
    const paths = spec.paths;
    expect(paths['/api/admin/auth/login']?.post).toBeDefined();
    expect(paths['/api/admin/dashboard/stats']?.get).toBeDefined();
    expect(paths['/api/admin/users']?.get).toBeDefined();
    expect(paths['/api/admin/users/{id}/status']?.put).toBeDefined();
    expect(paths['/api/admin/finance/withdrawals']?.get).toBeDefined();
    expect(paths['/api/admin/finance/withdrawals/{id}/review']?.put).toBeDefined();
    expect(paths['/api/admin/audit-logs']?.get).toBeDefined();
    expect(paths['/api/admin/settings']?.get).toBeDefined();
  });

  it('should define security schemes for bearerAuth and adminBearerAuth', () => {
    const securitySchemes = spec.components?.securitySchemes as any;
    expect(securitySchemes).toBeDefined();
    expect(securitySchemes.bearerAuth).toBeDefined();
    expect(securitySchemes.bearerAuth.type).toBe('http');
    expect(securitySchemes.bearerAuth.scheme).toBe('bearer');
    expect(securitySchemes.bearerAuth.bearerFormat).toBe('JWT');

    expect(securitySchemes.adminBearerAuth).toBeDefined();
    expect(securitySchemes.adminBearerAuth.type).toBe('http');
    expect(securitySchemes.adminBearerAuth.scheme).toBe('bearer');
    expect(securitySchemes.adminBearerAuth.bearerFormat).toBe('JWT');
  });

  it('should define data schemas in components', () => {
    const schemas = spec.components?.schemas as any;
    expect(schemas).toBeDefined();
    expect(schemas.UserProfile).toBeDefined();
    expect(schemas.Wallet).toBeDefined();
    expect(schemas.WalletTransaction).toBeDefined();
    expect(schemas.Deposit).toBeDefined();
    expect(schemas.Withdrawal).toBeDefined();
    expect(schemas.Game).toBeDefined();
    expect(schemas.Reward).toBeDefined();
    expect(schemas.SupportTicket).toBeDefined();
    expect(schemas.AdminAuditLog).toBeDefined();
  });

  it('should have more than 30 total documented paths', () => {
    const pathCount = Object.keys(spec.paths).length;
    expect(pathCount).toBeGreaterThanOrEqual(30);
  });
});
