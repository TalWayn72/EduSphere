/**
 * scim.resolver.spec.ts — Unit tests for ScimResolver.
 * Covers: requireAdmin guard, getScimTokens, getScimSyncLog, generateScimToken, revokeScimToken.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockWithTenantContext } = vi.hoisted(() => ({
  mockWithTenantContext: vi.fn(),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    scimSyncLog: {
      tenantId: {},
      createdAt: {},
    },
  },
  withTenantContext: mockWithTenantContext,
  eq: vi.fn(),
  desc: vi.fn(),
}));

vi.mock('@edusphere/auth', () => ({}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { ScimResolver } from './scim.resolver.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTokenService(overrides: Record<string, unknown> = {}) {
  return {
    listTokens: vi.fn().mockResolvedValue([]),
    generateToken: vi
      .fn()
      .mockResolvedValue({ rawToken: 'raw-token', token: {} }),
    revokeToken: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeCtx(
  options: {
    userId?: string;
    role?: string;
    tenantId?: string;
  } = {}
) {
  const { userId, role, tenantId = 'tenant-1' } = options;
  return {
    req: {},
    authContext: userId
      ? { userId, tenantId, roles: role ? [role] : [] }
      : undefined,
  };
}

const ADMIN_CTX = makeCtx({ userId: 'admin-1', role: 'ORG_ADMIN' });
const SUPER_CTX = makeCtx({ userId: 'super-1', role: 'SUPER_ADMIN' });

const SYNC_ROW = {
  id: 'scim-log-1',
  operation: 'USER_PROVISION',
  externalId: 'ext-1',
  status: 'SUCCESS',
  errorMessage: null,
  createdAt: new Date('2026-01-20T08:00:00Z'),
  tenantId: 'tenant-1',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScimResolver', () => {
  let resolver: ScimResolver;
  let mockService: ReturnType<typeof makeTokenService>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockService = makeTokenService();
    resolver = new ScimResolver(mockService as never);
  });

  // 1. requireAdmin throws UnauthorizedException when no userId
  it('throws UnauthorizedException when authContext is absent', async () => {
    await expect(resolver.getScimTokens(makeCtx())).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  // 2. requireAdmin throws ForbiddenException for non-admin role
  it('throws ForbiddenException when user role is LEARNER (not admin)', async () => {
    await expect(
      resolver.getScimTokens(makeCtx({ userId: 'u1', role: 'LEARNER' }))
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // 3. ORG_ADMIN passes requireAdmin
  it('getScimTokens succeeds for ORG_ADMIN role', async () => {
    await expect(resolver.getScimTokens(ADMIN_CTX)).resolves.not.toThrow();
    expect(mockService.listTokens).toHaveBeenCalledWith('tenant-1');
  });

  // 4. SUPER_ADMIN passes requireAdmin
  it('getScimTokens succeeds for SUPER_ADMIN role', async () => {
    await expect(resolver.getScimTokens(SUPER_CTX)).resolves.not.toThrow();
  });

  // 5. getScimSyncLog calls withTenantContext and returns mapped rows
  it('getScimSyncLog maps rows using withTenantContext', async () => {
    mockWithTenantContext.mockImplementation(
      (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) =>
        fn({
          select: () => ({
            from: () => ({
              where: () => ({
                orderBy: () => ({
                  limit: () => Promise.resolve([SYNC_ROW]),
                }),
              }),
            }),
          }),
        })
    );
    const result = (await resolver.getScimSyncLog(
      undefined,
      ADMIN_CTX
    )) as Record<string, unknown>[];
    expect(result).toHaveLength(1);
    expect(result[0]?.['operation']).toBe('USER_PROVISION');
    expect(result[0]?.['id']).toBe('scim-log-1');
  });

  // 6. generateScimToken delegates to tokenService.generateToken
  it('generateScimToken delegates to tokenService.generateToken and returns result', async () => {
    const mockResult = { rawToken: 'abc123', token: { id: 'tok-1' } };
    mockService.generateToken.mockResolvedValue(mockResult);
    const result = await resolver.generateScimToken(
      { description: 'HR System', expiresInDays: 365 },
      ADMIN_CTX
    );
    expect(mockService.generateToken).toHaveBeenCalledWith(
      'tenant-1',
      'admin-1',
      'HR System',
      365
    );
    expect(result).toBe(mockResult);
  });

  // 7. revokeScimToken delegates to tokenService.revokeToken and returns true
  it('revokeScimToken delegates to tokenService and returns true', async () => {
    const result = await resolver.revokeScimToken('token-id-1', ADMIN_CTX);
    expect(mockService.revokeToken).toHaveBeenCalledWith(
      'tenant-1',
      'token-id-1'
    );
    expect(result).toBe(true);
  });

  // 8. requireAdmin throws ForbiddenException when roles array is empty
  it('throws ForbiddenException when roles array is empty', async () => {
    await expect(
      resolver.getScimTokens(makeCtx({ userId: 'u1' })) // no role
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  // 9. getScimTokens passes tenantId from authContext to service
  it('getScimTokens passes the authContext tenantId to tokenService.listTokens', async () => {
    const ctx = makeCtx({
      userId: 'admin-2',
      role: 'ORG_ADMIN',
      tenantId: 'my-tenant',
    });
    await resolver.getScimTokens(ctx);
    expect(mockService.listTokens).toHaveBeenCalledWith('my-tenant');
  });
});
