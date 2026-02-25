/**
 * Memory-safety tests for SessionCleanupService.
 *
 * Verifies:
 *  1. onModuleInit() creates the cleanup interval.
 *  2. onModuleDestroy() calls clearInterval and nullifies the handle.
 *  3. onModuleDestroy() calls closeAllPools() exactly once.
 *  4. Multiple onModuleDestroy() calls do NOT call clearInterval twice.
 *  5. cleanupStaleSessions() deletes rows older than the cutoff.
 *  6. cleanupStaleSessions() does not throw on DB error (logs instead).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionCleanupService } from './session-cleanup.service';

// --- Module-level mocks must appear before any import that transitively loads them ---

const mockDelete = vi.fn().mockReturnThis();
const mockWhere = vi.fn().mockReturnThis();
const mockReturning = vi.fn().mockResolvedValue([{ id: 'sess-1' }, { id: 'sess-2' }]);

const mockDb = {
  delete: mockDelete,
};

// Wire the chained calls: delete → where → returning
mockDelete.mockReturnValue({ where: mockWhere });
mockWhere.mockReturnValue({ returning: mockReturning });

const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
const mockCreateDatabaseConnection = vi.fn().mockReturnValue(mockDb);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: (...args: unknown[]) => mockCreateDatabaseConnection(...args),
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  agentSessions: { id: 'id', createdAt: 'createdAt' },
  lt: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'lt' })),
}));

describe('SessionCleanupService — memory safety', () => {
  let service: SessionCleanupService;
  let setIntervalSpy: ReturnType<typeof vi.spyOn>;
  let clearIntervalSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    setIntervalSpy = vi.spyOn(global, 'setInterval');
    clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    mockDelete.mockClear();
    mockWhere.mockClear();
    mockReturning.mockClear();
    mockCloseAllPools.mockClear();

    service = new SessionCleanupService();
  });

  afterEach(() => {
    vi.useRealTimers();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('should call setInterval during onModuleInit()', () => {
    service.onModuleInit();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    // Verify the interval is set to 30 minutes (1800000 ms)
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 30 * 60 * 1000);
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('should call clearInterval on onModuleDestroy()', () => {
    service.onModuleInit();

    service.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('should call closeAllPools() on onModuleDestroy()', () => {
    service.onModuleInit();

    service.onModuleDestroy();

    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('should not call clearInterval twice if onModuleDestroy is called twice', () => {
    service.onModuleInit();

    service.onModuleDestroy();
    service.onModuleDestroy(); // idempotent: handle is null after first call

    // clearInterval should only be invoked once with an actual handle
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('should call db.delete().where().returning() in cleanupStaleSessions()', async () => {
    await service.cleanupStaleSessions();

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockWhere).toHaveBeenCalledTimes(1);
    expect(mockReturning).toHaveBeenCalledTimes(1);
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  it('should NOT throw when cleanupStaleSessions encounters a DB error', async () => {
    mockReturning.mockRejectedValueOnce(new Error('DB connection lost'));

    // Must resolve without throwing
    await expect(service.cleanupStaleSessions()).resolves.toBeUndefined();
  });

  // ── Test 7 ──────────────────────────────────────────────────────────────────
  it('should NOT call clearInterval if onModuleInit was never called', () => {
    // Destroy without init — the interval handle is null, clearInterval must not fire
    service.onModuleDestroy();

    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });
});
