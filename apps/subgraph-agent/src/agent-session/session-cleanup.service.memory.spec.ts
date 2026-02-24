/**
 * session-cleanup.service.memory.spec.ts
 *
 * Memory-safety tests for SessionCleanupService.
 * Verifies:
 *   1. onModuleDestroy() calls clearInterval with the active handle.
 *   2. cleanupInterval is null after destroy (no dangling handle).
 *   3. Multiple init/destroy cycles do not accumulate intervals.
 *   4. onModuleDestroy() calls closeAllPools() to release DB connections.
 *   5. Destroying before init (cleanupInterval === null) is safe / does not throw.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoist mocks — must be set up before any import of the service ─────────────

const { mockCloseAllPools, mockDb } = vi.hoisted(() => {
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

  const mockReturning = vi.fn().mockResolvedValue([]);
  const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });
  const mockDb = { delete: mockDelete };

  return { mockCloseAllPools, mockDb };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: mockCloseAllPools,
  agentSessions: {
    id: 'id',
    createdAt: 'createdAt',
  },
}));

vi.mock('drizzle-orm', () => ({
  lt: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'lt' })),
}));

// Mock constants so the service can be imported without a physical constants.js
// at the package root. The service imports from '../../constants.js' (package root).
vi.mock('../constants.js', () => ({
  SESSION_CLEANUP_INTERVAL_MS: 30 * 60 * 1000, // 30 minutes
  STALE_SESSION_AGE_MS: 24 * 60 * 60 * 1000,   // 24 hours
}));

import { SessionCleanupService } from './session-cleanup.service.js';

// Helper to access private fields without repeated casting
function getPrivate<T>(svc: SessionCleanupService, field: string): T {
  return (svc as unknown as Record<string, T>)[field];
}

describe('SessionCleanupService — memory safety', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Test 1: clearInterval is called on destroy with the active handle ──────
  it('calls clearInterval with the active handle on module destroy', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const svc = new SessionCleanupService();
    svc.onModuleInit();

    const handle = getPrivate<ReturnType<typeof setInterval>>(svc, 'cleanupInterval');
    expect(handle).not.toBeNull();

    svc.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledWith(handle);
    clearIntervalSpy.mockRestore();
  });

  // ── Test 2: cleanupInterval is null after destroy ──────────────────────────
  it('sets cleanupInterval to null after module destroy', () => {
    const svc = new SessionCleanupService();
    svc.onModuleInit();
    expect(getPrivate(svc, 'cleanupInterval')).not.toBeNull();

    svc.onModuleDestroy();
    expect(getPrivate(svc, 'cleanupInterval')).toBeNull();
  });

  // ── Test 3: multiple init/destroy cycles — no interval accumulation ────────
  it('does not accumulate intervals across multiple init/destroy cycles', () => {
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const svc = new SessionCleanupService();

    // First cycle
    svc.onModuleInit();
    svc.onModuleDestroy();

    // Second cycle
    svc.onModuleInit();
    svc.onModuleDestroy();

    expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    expect(clearIntervalSpy).toHaveBeenCalledTimes(2);
    expect(getPrivate(svc, 'cleanupInterval')).toBeNull();

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  // ── Test 4: closeAllPools is called on destroy ─────────────────────────────
  it('calls closeAllPools() on module destroy to release DB connections', () => {
    const svc = new SessionCleanupService();
    svc.onModuleInit();
    svc.onModuleDestroy();

    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // ── Test 5: safe to destroy when cleanupInterval is already null ───────────
  it('does not throw when onModuleDestroy() is called before onModuleInit()', () => {
    const svc = new SessionCleanupService();
    // cleanupInterval starts as null — destroy should be a no-op for the timer
    expect(() => svc.onModuleDestroy()).not.toThrow();
  });

  // ── Test 6: destroy is idempotent ─────────────────────────────────────────
  it('is idempotent — calling onModuleDestroy() twice does not throw', () => {
    const svc = new SessionCleanupService();
    svc.onModuleInit();
    svc.onModuleDestroy();
    expect(() => svc.onModuleDestroy()).not.toThrow();
    expect(getPrivate(svc, 'cleanupInterval')).toBeNull();
  });

  // ── Test 7: cleanupStaleSessions resolves without throwing ────────────────
  it('cleanupStaleSessions completes without throwing when DB returns results', async () => {
    const svc = new SessionCleanupService();
    svc.onModuleInit();
    await expect(svc.cleanupStaleSessions()).resolves.toBeUndefined();
    svc.onModuleDestroy();
  });
});
