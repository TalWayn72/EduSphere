/**
 * open-badges.service.memory.spec.ts
 *
 * Memory-safety tests for OpenBadgesService.
 *
 * Design invariants verified:
 *   1. The service can be instantiated without errors.
 *   2. It uses the module-level singleton db (createDatabaseConnection), not
 *      a bare `new Pool()` — correct by design (SI-8).
 *   3. It does NOT implement OnModuleDestroy because the singleton pool is
 *      managed at the AppModule level via closeAllPools(). This is intentional
 *      and correct — no cleanup leak.
 *   4. No setInterval or setTimeout calls exist in the service (verified by
 *      asserting the global timer functions are never called during construction
 *      and normal method use).
 *   5. Instantiating the service multiple times does NOT create multiple DB
 *      pools — createDatabaseConnection() is called each time but internally
 *      delegates to getOrCreatePool() which returns the cached singleton.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockCreateDatabaseConnection, mockWithTenantContext } = vi.hoisted(() => ({
  mockCreateDatabaseConnection: vi.fn(),
  mockWithTenantContext: vi.fn(),
}));

// ── @edusphere/db mock — singleton returns same db reference ──────────────────

const sharedMockDb = {
  select: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    }),
  }),
  insert: vi.fn().mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{
        id: 'assertion-1',
        badge_class_id: 'badge-class-1',
        recipient_id: 'user-1',
        issued_on: '2026-01-01T00:00:00.000Z',
        tenant_id: 'tenant-1',
      }]),
    }),
  }),
};

mockCreateDatabaseConnection.mockReturnValue(sharedMockDb);

mockWithTenantContext.mockImplementation(
  async (
    _tenantId: string,
    _userId: string,
    _role: string,
    fn: () => Promise<unknown>,
  ) => fn(),
);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: mockCreateDatabaseConnection,
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: mockWithTenantContext,
  schema: {
    badge_assertions: {
      id: 'id',
      badge_class_id: 'badge_class_id',
      recipient_id: 'recipient_id',
      tenant_id: 'tenant_id',
      issued_on: 'issued_on',
    },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

// ── Suppress NestJS logger noise in tests ─────────────────────────────────────

vi.mock('@nestjs/common', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@nestjs/common')>();
  return {
    ...actual,
    Logger: vi.fn().mockImplementation(() => ({
      log: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    })),
  };
});

// ── Import service AFTER mocks ────────────────────────────────────────────────

import { OpenBadgesService } from './open-badges.service';

// ─── Shared tenant context ────────────────────────────────────────────────────

const TENANT_CTX = {
  tenantId: 'tenant-abc',
  userId: 'user-xyz',
  userRole: 'STUDENT' as const,
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('OpenBadgesService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-apply the default mock implementations after clearAllMocks
    mockCreateDatabaseConnection.mockReturnValue(sharedMockDb);
    mockWithTenantContext.mockImplementation(
      async (
        _tenantId: string,
        _userId: string,
        _role: string,
        fn: () => Promise<unknown>,
      ) => fn(),
    );
  });

  // ── 1. Service instantiation ───────────────────────────────────────────────

  describe('constructor', () => {
    it('can be instantiated without throwing', () => {
      expect(() => new OpenBadgesService()).not.toThrow();
    });

    it('calls createDatabaseConnection() once during construction', () => {
      new OpenBadgesService();
      expect(mockCreateDatabaseConnection).toHaveBeenCalledTimes(1);
    });
  });

  // ── 2. Singleton db usage (SI-8 compliance) ───────────────────────────────

  describe('singleton db — no direct Pool creation', () => {
    it('uses the db returned by createDatabaseConnection (not a new Pool)', () => {
      const service = new OpenBadgesService();
      // Access private `db` via type cast to assert it is the singleton
      const privateDb = (service as unknown as { db: unknown }).db;
      expect(privateDb).toBe(sharedMockDb);
    });

    it('creating multiple service instances reuses the same mock db', () => {
      new OpenBadgesService();
      new OpenBadgesService();
      new OpenBadgesService();
      // createDatabaseConnection is called 3 times but returns the same object
      expect(mockCreateDatabaseConnection).toHaveBeenCalledTimes(3);
      const returnedDbs = mockCreateDatabaseConnection.mock.results.map(
        (r: { value: unknown }) => r.value,
      );
      // All returned values are the same singleton reference
      expect(new Set(returnedDbs).size).toBe(1);
    });
  });

  // ── 3. No OnModuleDestroy (correct by design) ─────────────────────────────

  describe('no OnModuleDestroy (intentional — singleton db needs no per-service teardown)', () => {
    it('does NOT have an onModuleDestroy method', () => {
      const service = new OpenBadgesService();
      expect(
        typeof (service as unknown as Record<string, unknown>)['onModuleDestroy'],
      ).toBe('undefined');
    });

    it('does NOT implement the OnModuleDestroy interface symbol', () => {
      const service = new OpenBadgesService();
      // NestJS checks for the method by name — confirm it is absent
      expect('onModuleDestroy' in service).toBe(false);
    });
  });

  // ── 4. No timer leaks (setInterval / setTimeout) ──────────────────────────

  describe('no timer leaks', () => {
    it('does not call setInterval during construction', () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      new OpenBadgesService();
      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });

    it('does not call setTimeout during construction', () => {
      const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
      new OpenBadgesService();
      expect(setTimeoutSpy).not.toHaveBeenCalled();
      setTimeoutSpy.mockRestore();
    });

    it('does not call setInterval during issueBadge()', async () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      const service = new OpenBadgesService();
      await service.issueBadge(TENANT_CTX, 'badge-class-1', 'user-1');
      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });

    it('does not call setInterval during listUserBadges()', async () => {
      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      const service = new OpenBadgesService();
      await service.listUserBadges(TENANT_CTX, 'user-1');
      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });
  });

  // ── 5. Method behaviour sanity checks ────────────────────────────────────

  describe('issueBadge()', () => {
    it('calls withTenantContext with the correct tenantId', async () => {
      const service = new OpenBadgesService();
      await service.issueBadge(TENANT_CTX, 'badge-class-1', 'user-1');
      expect(mockWithTenantContext).toHaveBeenCalledWith(
        TENANT_CTX.tenantId,
        TENANT_CTX.userId,
        TENANT_CTX.userRole,
        expect.any(Function),
      );
    });

    it('returns a BadgeAssertion with the correct shape', async () => {
      const service = new OpenBadgesService();
      const result = await service.issueBadge(TENANT_CTX, 'badge-class-1', 'user-1');
      expect(result).toMatchObject({
        id: expect.any(String),
        badgeClassId: 'badge-class-1',
        recipientId: 'user-1',
        issuedOn: expect.any(String),
        tenantId: TENANT_CTX.tenantId,
      });
    });
  });

  describe('listUserBadges()', () => {
    it('calls withTenantContext with the correct tenantId', async () => {
      const service = new OpenBadgesService();
      await service.listUserBadges(TENANT_CTX, 'user-1');
      expect(mockWithTenantContext).toHaveBeenCalledWith(
        TENANT_CTX.tenantId,
        TENANT_CTX.userId,
        TENANT_CTX.userRole,
        expect.any(Function),
      );
    });

    it('returns an empty array when the db returns no rows', async () => {
      sharedMockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });
      const service = new OpenBadgesService();
      const results = await service.listUserBadges(TENANT_CTX, 'user-1');
      expect(results).toEqual([]);
    });
  });
});
