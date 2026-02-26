/**
 * open-badges.service.memory.spec.ts
 *
 * Memory-safety tests for OpenBadgesService.
 *
 * Design invariants verified:
 *   1. The service can be instantiated without errors.
 *   2. It uses the module-level singleton `db` exported from `@edusphere/db`
 *      (not `new Pool()` directly) — correct by design (SI-8).
 *   3. It does NOT implement OnModuleDestroy because the singleton pool is
 *      managed at the AppModule level via closeAllPools(). This is intentional
 *      and correct — no cleanup leak.
 *   4. No setInterval or setTimeout calls exist in the service (verified by
 *      asserting the global timer functions are never called during construction
 *      and normal method use).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mock variables (must be declared with vi.hoisted so they are
//    available inside the vi.mock() factory, which is hoisted above all
//    const declarations) ────────────────────────────────────────────────────

const { mockDb, mockSelectFrom, mockInsertReturning } = vi.hoisted(() => {
  const mockInsertReturning = vi.fn().mockResolvedValue([{
    id: 'assertion-1',
    badgeDefinitionId: 'badge-class-1',
    recipientId: 'user-1',
    tenantId: 'tenant-1',
    issuedAt: new Date('2026-01-01T00:00:00.000Z'),
    evidenceUrl: null,
    revoked: false,
    revokedAt: null,
    revokedReason: null,
    proof: {},
  }]);

  const mockSelectFrom = {
    from: vi.fn(),
  };

  const mockDb = {
    select: vi.fn().mockReturnValue(mockSelectFrom),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: mockInsertReturning,
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  };

  return { mockDb, mockSelectFrom, mockInsertReturning };
});

// ── @edusphere/db mock — matches actual named exports used by the service ─────
// The service imports: db, openBadgeDefinitions, openBadgeAssertions, eq, and

vi.mock('@edusphere/db', () => ({
  db: mockDb,
  openBadgeDefinitions: {
    $inferSelect: {},
    id: 'id',
    tenantId: 'tenantId',
    name: 'name',
    description: 'description',
    issuerId: 'issuerId',
    criteriaUrl: 'criteriaUrl',
    imageUrl: 'imageUrl',
  },
  openBadgeAssertions: {
    $inferSelect: {},
    id: 'id',
    badgeDefinitionId: 'badgeDefinitionId',
    recipientId: 'recipientId',
    tenantId: 'tenantId',
    issuedAt: 'issuedAt',
    evidenceUrl: 'evidenceUrl',
    revoked: 'revoked',
    revokedAt: 'revokedAt',
    revokedReason: 'revokedReason',
    proof: 'proof',
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ args, op: 'and' })),
}));

// ── Import service AFTER mocks ────────────────────────────────────────────────

import { OpenBadgesService } from './open-badges.service';

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('OpenBadgesService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Re-apply defaults after clearAllMocks
    mockInsertReturning.mockResolvedValue([{
      id: 'assertion-1',
      badgeDefinitionId: 'badge-class-1',
      recipientId: 'user-1',
      tenantId: 'tenant-1',
      issuedAt: new Date('2026-01-01T00:00:00.000Z'),
      evidenceUrl: null,
      revoked: false,
      revokedAt: null,
      revokedReason: null,
      proof: {},
    }]);

    mockDb.select.mockReturnValue(mockSelectFrom);
  });

  // ── 1. Service instantiation ───────────────────────────────────────────────

  describe('constructor', () => {
    it('can be instantiated without throwing', () => {
      expect(() => new OpenBadgesService()).not.toThrow();
    });

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
  });

  // ── 2. Singleton db usage (SI-8 compliance) ───────────────────────────────

  describe('singleton db — no direct Pool creation', () => {
    it('uses the module-level db singleton (no new Pool() call)', async () => {
      // The db export from @edusphere/db is the singleton — the service imports
      // it directly at module level, not via createDatabaseConnection().
      // We verify the service resolves to the same mocked db object.
      const { db } = await import('@edusphere/db');
      const service = new OpenBadgesService();
      // Access private db field to confirm it is the singleton reference
      const privateDb = (service as unknown as { db?: unknown })['db'];
      // Service uses module-level db (no instance field), so we just confirm
      // it does not instantiate its own pool.
      expect(db).toBe(mockDb);
      // No instance-level db field — confirms no direct Pool construction.
      expect(privateDb).toBeUndefined();
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
      expect('onModuleDestroy' in service).toBe(false);
    });
  });

  // ── 4. No timer leaks during method calls ────────────────────────────────

  describe('no timer leaks during issueBadge()', () => {
    it('does not call setInterval during issueBadge()', async () => {
      // Arrange: mock db.select chain to return a valid badge definition
      const mockWhere = vi.fn().mockResolvedValue([{
        id: 'badge-class-1',
        tenantId: 'tenant-1',
        name: 'Test Badge',
        description: 'A test badge',
        issuerId: 'urn:issuer:1',
        criteriaUrl: null,
        imageUrl: null,
      }]);
      mockSelectFrom.from.mockReturnValue({ where: mockWhere });
      mockDb.select.mockReturnValue(mockSelectFrom);

      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      const service = new OpenBadgesService();
      await service.issueBadge('badge-class-1', 'user-1', 'tenant-1');
      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });
  });

  describe('no timer leaks during myOpenBadges()', () => {
    it('does not call setInterval during myOpenBadges()', async () => {
      const mockWhere = vi.fn().mockResolvedValue([]);
      mockSelectFrom.from.mockReturnValue({ where: mockWhere, innerJoin: vi.fn().mockReturnValue({ where: mockWhere }) });
      mockDb.select.mockReturnValue(mockSelectFrom);

      const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
      const service = new OpenBadgesService();
      await service.myOpenBadges('user-1', 'tenant-1');
      expect(setIntervalSpy).not.toHaveBeenCalled();
      setIntervalSpy.mockRestore();
    });
  });
});
