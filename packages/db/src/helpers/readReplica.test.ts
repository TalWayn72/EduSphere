/**
 * readReplica.spec.ts — Singleton behavior tests for read replica helper.
 *
 * Verifies:
 *  - getReadDb() returns the same instance on repeated calls (singleton).
 *  - getWriteDb() returns the same instance on repeated calls (singleton).
 *  - closeReadReplica() resets singletons so next call creates a fresh instance.
 *  - withReadReplica() uses the singleton (no new Drizzle per call).
 *  - createReadConnection/createWriteConnection delegate to singletons.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// We need to mock drizzle and getOrCreatePool before importing the module
const mockDrizzle = vi.fn(() => ({ __drizzle: true }));
const mockPool = { __pool: true };
const mockGetOrCreatePool = vi.fn(() => mockPool);

vi.mock('drizzle-orm/node-postgres', () => ({
  drizzle: mockDrizzle,
}));

vi.mock('../index.js', () => ({
  getOrCreatePool: mockGetOrCreatePool,
}));

// Dynamic import so mocks are in place
const mod = await import('./readReplica.js');

describe('readReplica singleton', () => {
  beforeEach(() => {
    // Reset singleton state between tests
    mod.closeReadReplica();
    mockDrizzle.mockClear();
    mockGetOrCreatePool.mockClear();
    // Each call to drizzle returns a distinct object so we can assert identity
    mockDrizzle.mockImplementation(() => ({ __drizzle: Math.random() }));
  });

  // ─── getReadDb ──────────────────────────────────────────────────────────

  describe('getReadDb()', () => {
    it('returns the same instance on repeated calls (singleton)', () => {
      const first = mod.getReadDb();
      const second = mod.getReadDb();

      expect(first).toBe(second);
      expect(mockDrizzle).toHaveBeenCalledTimes(1);
    });

    it('creates a new instance after closeReadReplica()', () => {
      const first = mod.getReadDb();
      mod.closeReadReplica();
      const second = mod.getReadDb();

      expect(first).not.toBe(second);
      expect(mockDrizzle).toHaveBeenCalledTimes(2);
    });
  });

  // ─── getWriteDb ─────────────────────────────────────────────────────────

  describe('getWriteDb()', () => {
    it('returns the same instance on repeated calls (singleton)', () => {
      const first = mod.getWriteDb();
      const second = mod.getWriteDb();

      expect(first).toBe(second);
      expect(mockDrizzle).toHaveBeenCalledTimes(1);
    });

    it('creates a new instance after closeReadReplica()', () => {
      const first = mod.getWriteDb();
      mod.closeReadReplica();
      const second = mod.getWriteDb();

      expect(first).not.toBe(second);
      expect(mockDrizzle).toHaveBeenCalledTimes(2);
    });
  });

  // ─── closeReadReplica ───────────────────────────────────────────────────

  describe('closeReadReplica()', () => {
    it('resets both read and write singletons', () => {
      const readBefore = mod.getReadDb();
      const writeBefore = mod.getWriteDb();
      expect(mockDrizzle).toHaveBeenCalledTimes(2);

      mod.closeReadReplica();

      const readAfter = mod.getReadDb();
      const writeAfter = mod.getWriteDb();
      expect(mockDrizzle).toHaveBeenCalledTimes(4);

      expect(readAfter).not.toBe(readBefore);
      expect(writeAfter).not.toBe(writeBefore);
    });
  });

  // ─── withReadReplica ────────────────────────────────────────────────────

  describe('withReadReplica()', () => {
    it('passes the singleton read db to the callback', async () => {
      const singleton = mod.getReadDb();
      let receivedDb: unknown = null;

      await mod.withReadReplica(async (db) => {
        receivedDb = db;
        return 'ok';
      });

      expect(receivedDb).toBe(singleton);
      // drizzle called only once — for the singleton
      expect(mockDrizzle).toHaveBeenCalledTimes(1);
    });

    it('does not create a new Drizzle instance per call', async () => {
      await mod.withReadReplica(async () => 1);
      await mod.withReadReplica(async () => 2);
      await mod.withReadReplica(async () => 3);

      // Only 1 drizzle() call despite 3 withReadReplica calls
      expect(mockDrizzle).toHaveBeenCalledTimes(1);
    });

    it('returns the callback result', async () => {
      const result = await mod.withReadReplica(async () => 42);
      expect(result).toBe(42);
    });
  });

  // ─── backward-compatible factories ──────────────────────────────────────

  describe('createReadConnection() (deprecated)', () => {
    it('returns the same singleton as getReadDb()', () => {
      const fromGetter = mod.getReadDb();
      const fromFactory = mod.createReadConnection();
      expect(fromFactory).toBe(fromGetter);
    });
  });

  describe('createWriteConnection() (deprecated)', () => {
    it('returns the same singleton as getWriteDb()', () => {
      const fromGetter = mod.getWriteDb();
      const fromFactory = mod.createWriteConnection();
      expect(fromFactory).toBe(fromGetter);
    });
  });
});
