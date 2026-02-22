/**
 * pool.memory.test.ts
 *
 * Wave 5-A: Memory leak tests for the singleton pool registry in packages/db.
 *
 * Verifies:
 *   1. Two calls to createDatabaseConnection() with the same URL reuse the
 *      same Pool instance (Pool constructor called exactly once).
 *   2. closeAllPools() calls pool.end() on every registered pool.
 *   3. After closeAllPools(), the internal registry is cleared so subsequent
 *      calls are treated as fresh connections (no stale entries).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── pg Pool mock ─────────────────────────────────────────────────────────────
//
// We use vi.hoisted so the mock factory runs before module imports.

const { MockPool, mockPoolEnd, mockPoolConstructor } = vi.hoisted(() => {
  const mockPoolEnd = vi.fn().mockResolvedValue(undefined);

  // Track every constructed instance
  const instances: { end: typeof mockPoolEnd }[] = [];

  const mockPoolConstructor = vi.fn().mockImplementation(function (
    this: { end: typeof mockPoolEnd },
  ) {
    this.end = mockPoolEnd;
    instances.push(this);
  });

  // Expose the instances array for assertions
  (mockPoolConstructor as unknown as { instances: typeof instances }).instances =
    instances;

  return { MockPool: mockPoolConstructor, mockPoolEnd, mockPoolConstructor };
});

vi.mock('pg', () => ({
  Pool: MockPool,
}));

// Import AFTER mock registration so the module picks up the mocked `pg`.
import {
  createDatabaseConnection,
  closeAllPools,
  getOrCreatePool,
} from './index';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TEST_URL_A = 'postgres://user:pw@localhost:5432/test_a';
const TEST_URL_B = 'postgres://user:pw@localhost:5432/test_b';

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('DB pool singleton registry — memory safety', () => {
  beforeEach(async () => {
    // Start every test with a clean registry.
    await closeAllPools();
    vi.clearAllMocks();
    (
      MockPool as unknown as { instances: unknown[] }
    ).instances.length = 0;
  });

  afterEach(async () => {
    // Clean up any pools registered during the test.
    await closeAllPools();
  });

  // ── Test 1: same URL → same Pool instance ─────────────────────────────────

  describe('createDatabaseConnection() — pool reuse', () => {
    it('returns a drizzle instance without throwing', () => {
      const db = createDatabaseConnection(TEST_URL_A);
      expect(db).toBeDefined();
    });

    it('constructs exactly one Pool for two calls with the same URL', () => {
      createDatabaseConnection(TEST_URL_A);
      createDatabaseConnection(TEST_URL_A);

      // Pool constructor must have been called exactly once for URL_A.
      const constructorCallsForA = mockPoolConstructor.mock.calls.filter(
        (args) => {
          const opts = args[0] as { connectionString?: string };
          return opts.connectionString === TEST_URL_A;
        },
      );
      expect(constructorCallsForA).toHaveLength(1);
    });

    it('returns the same Pool instance for the same URL', () => {
      const pool1 = getOrCreatePool(TEST_URL_A);
      const pool2 = getOrCreatePool(TEST_URL_A);
      expect(pool1).toBe(pool2);
    });

    it('creates separate Pool instances for different URLs', () => {
      const pool1 = getOrCreatePool(TEST_URL_A);
      const pool2 = getOrCreatePool(TEST_URL_B);
      expect(pool1).not.toBe(pool2);
    });

    it('calls Pool constructor once per unique URL across N calls', () => {
      for (let i = 0; i < 5; i++) {
        createDatabaseConnection(TEST_URL_A);
      }
      const callsForA = mockPoolConstructor.mock.calls.filter((args) => {
        const opts = args[0] as { connectionString?: string };
        return opts.connectionString === TEST_URL_A;
      });
      expect(callsForA).toHaveLength(1);
    });
  });

  // ── Test 2: closeAllPools() calls pool.end() ──────────────────────────────

  describe('closeAllPools() — pool teardown', () => {
    it('calls pool.end() on a registered pool', async () => {
      getOrCreatePool(TEST_URL_A);
      await closeAllPools();
      expect(mockPoolEnd).toHaveBeenCalledTimes(1);
    });

    it('calls pool.end() on all registered pools', async () => {
      getOrCreatePool(TEST_URL_A);
      getOrCreatePool(TEST_URL_B);
      await closeAllPools();
      expect(mockPoolEnd).toHaveBeenCalledTimes(2);
    });

    it('resolves even when no pools have been registered', async () => {
      await expect(closeAllPools()).resolves.toBeUndefined();
    });

    it('does not throw when pool.end() rejects', async () => {
      mockPoolEnd.mockRejectedValueOnce(new Error('pool already closed'));
      getOrCreatePool(TEST_URL_A);
      await expect(closeAllPools()).resolves.toBeUndefined();
    });
  });

  // ── Test 3: registry cleared after closeAllPools() ────────────────────────

  describe('closeAllPools() — registry cleared', () => {
    it('creates a fresh Pool instance after closeAllPools()', async () => {
      const firstPool = getOrCreatePool(TEST_URL_A);
      await closeAllPools();
      vi.clearAllMocks();

      const secondPool = getOrCreatePool(TEST_URL_A);

      // A new instance must have been constructed — same reference would mean
      // the stale (drained) pool was returned, which is a memory / connection leak.
      expect(secondPool).not.toBe(firstPool);
      expect(mockPoolConstructor).toHaveBeenCalledTimes(1);
    });

    it('consecutive closeAllPools() calls after an empty registry are no-ops', async () => {
      await closeAllPools(); // first — nothing registered
      await closeAllPools(); // second — still nothing
      expect(mockPoolEnd).not.toHaveBeenCalled();
    });

    it('new pools registered after closeAllPools() get pool.end() on next close', async () => {
      getOrCreatePool(TEST_URL_A);
      await closeAllPools();
      vi.clearAllMocks();

      getOrCreatePool(TEST_URL_B);
      await closeAllPools();

      expect(mockPoolEnd).toHaveBeenCalledTimes(1);
    });
  });
});
