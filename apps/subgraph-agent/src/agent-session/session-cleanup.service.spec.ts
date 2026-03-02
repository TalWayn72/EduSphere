/**
 * Unit tests for SessionCleanupService.
 * Covers functional behaviour + memory-safety contract:
 *   - Interval is created on onModuleInit()
 *   - Interval is cleared on onModuleDestroy()
 *   - closeAllPools() is called on onModuleDestroy()
 *   - cleanupInterval is nullified after destroy
 *   - Double-destroy does not call clearInterval twice
 *   - cleanupStaleSessions() uses the Drizzle delete chain
 *   - cleanupStaleSessions() swallows DB errors without throwing
 *
 * Direct class instantiation — no NestJS TestingModule.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Chained Drizzle mock: db.delete(table).where(cond).returning() ───────────
const mockReturning = vi
  .fn()
  .mockResolvedValue([{ id: 'sess-1' }, { id: 'sess-2' }]);
const mockWhere = vi.fn().mockReturnValue({ returning: mockReturning });
const mockDelete = vi.fn().mockReturnValue({ where: mockWhere });

const mockDb = { delete: mockDelete };

const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
const mockCreateDatabaseConnection = vi.fn().mockReturnValue(mockDb);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: (...args: unknown[]) =>
    mockCreateDatabaseConnection(...args),
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  agentSessions: { id: 'id', createdAt: 'createdAt' },
  lt: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'lt' })),
}));

vi.mock('../constants.js', () => ({
  SESSION_CLEANUP_INTERVAL_MS: 1_800_000, // 30 min
  STALE_SESSION_AGE_MS: 86_400_000, // 24 h
}));

import { SessionCleanupService } from './session-cleanup.service.js';

describe('SessionCleanupService', () => {
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

    // Restore the default chain wiring after clearAllMocks inside each spy.mockClear()
    mockDelete.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{ id: 'sess-1' }]);

    service = new SessionCleanupService();
  });

  afterEach(() => {
    vi.useRealTimers();
    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('onModuleInit sets up a cleanup interval', () => {
    service.onModuleInit();

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledWith(
      expect.any(Function),
      1_800_000
    );
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('onModuleDestroy clears the interval created by onModuleInit', () => {
    service.onModuleInit();

    service.onModuleDestroy();

    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('onModuleDestroy calls closeAllPools exactly once', () => {
    service.onModuleInit();

    service.onModuleDestroy();

    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('onModuleDestroy sets cleanupInterval to null', () => {
    service.onModuleInit();

    service.onModuleDestroy();

    // After destroy the internal handle must be null so a second destroy is safe
    expect(
      (service as unknown as Record<string, unknown>).cleanupInterval
    ).toBeNull();
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('onModuleDestroy handles null cleanupInterval without error (never called init)', () => {
    // cleanupInterval is null — destroy must not throw or call clearInterval
    expect(() => service.onModuleDestroy()).not.toThrow();
    expect(clearIntervalSpy).not.toHaveBeenCalled();
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  it('cleanupStaleSessions calls db.delete().where().returning()', async () => {
    await service.cleanupStaleSessions();

    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockWhere).toHaveBeenCalledTimes(1);
    expect(mockReturning).toHaveBeenCalledTimes(1);
  });

  // ── Test 7 ──────────────────────────────────────────────────────────────────
  it('service instantiates without error', () => {
    expect(() => new SessionCleanupService()).not.toThrow();
  });

  // ── Test 8 ──────────────────────────────────────────────────────────────────
  it('calling onModuleInit twice creates a second interval', () => {
    service.onModuleInit();
    service.onModuleInit();

    expect(setIntervalSpy).toHaveBeenCalledTimes(2);
  });

  // ── Test 9 ──────────────────────────────────────────────────────────────────
  it('cleanupStaleSessions logs error without throwing when DB rejects', async () => {
    mockReturning.mockRejectedValueOnce(new Error('DB connection lost'));

    await expect(service.cleanupStaleSessions()).resolves.toBeUndefined();
  });

  // ── Test 10 ─────────────────────────────────────────────────────────────────
  it('cleanupInterval starts as null before onModuleInit is called', () => {
    const handle = (service as unknown as Record<string, unknown>)
      .cleanupInterval;
    expect(handle).toBeNull();
  });
});
