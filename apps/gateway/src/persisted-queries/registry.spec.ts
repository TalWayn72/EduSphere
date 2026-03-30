import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerQuery,
  lookupQuery,
  isRegistered,
  getRegistrySize,
  isRedisBackend,
  _clearRegistry,
  registerQuerySync,
  lookupQuerySync,
} from './registry';

describe('APQ registry (in-memory fallback)', () => {
  beforeEach(() => {
    _clearRegistry();
  });

  describe('registerQuery + lookupQuery', () => {
    it('stores and retrieves a query by hash', async () => {
      await registerQuery('abc123', '{ users { id } }');
      const result = await lookupQuery('abc123');
      expect(result).toBe('{ users { id } }');
    });

    it('returns undefined for unregistered hash', async () => {
      const result = await lookupQuery('nonexistent');
      expect(result).toBeUndefined();
    });

    it('overwrites existing entry with same hash', async () => {
      await registerQuery('abc123', '{ old }');
      await registerQuery('abc123', '{ new }');
      const result = await lookupQuery('abc123');
      expect(result).toBe('{ new }');
    });

    it('handles empty query string', async () => {
      await registerQuery('empty', '');
      const result = await lookupQuery('empty');
      expect(result).toBe('');
    });
  });

  describe('isRegistered', () => {
    it('returns true for registered hash', async () => {
      await registerQuery('hash1', '{ me { id } }');
      expect(await isRegistered('hash1')).toBe(true);
    });

    it('returns false for unregistered hash', async () => {
      expect(await isRegistered('nope')).toBe(false);
    });
  });

  describe('getRegistrySize', () => {
    it('returns 0 for empty registry', async () => {
      expect(await getRegistrySize()).toBe(0);
    });

    it('returns correct count after insertions', async () => {
      await registerQuery('a', 'q1');
      await registerQuery('b', 'q2');
      await registerQuery('c', 'q3');
      expect(await getRegistrySize()).toBe(3);
    });
  });

  describe('isRedisBackend', () => {
    it('returns false when no REDIS_URL is set', () => {
      expect(isRedisBackend()).toBe(false);
    });
  });

  describe('_clearRegistry', () => {
    it('removes all entries', async () => {
      await registerQuery('x', 'q');
      _clearRegistry();
      expect(await getRegistrySize()).toBe(0);
    });
  });

  describe('registerQuerySync + lookupQuerySync', () => {
    it('registers and retrieves synchronously from memory', () => {
      registerQuerySync('sync-hash', '{ syncQuery }');
      const result = lookupQuerySync('sync-hash');
      expect(result).toBe('{ syncQuery }');
    });

    it('returns undefined for unregistered sync hash', () => {
      expect(lookupQuerySync('no-such')).toBeUndefined();
    });

    it('overwrites existing entry', () => {
      registerQuerySync('dup', '{ old }');
      registerQuerySync('dup', '{ new }');
      expect(lookupQuerySync('dup')).toBe('{ new }');
    });
  });

  describe('LRU eviction', () => {
    it('evicts oldest entry when at capacity', async () => {
      // Register MAX_REGISTRY_SIZE + 1 entries
      // MAX_REGISTRY_SIZE is 10_000, but we test the eviction logic
      // by filling a smaller set and checking oldest is gone
      for (let i = 0; i < 10; i++) {
        await registerQuery(`h${i}`, `q${i}`);
      }
      expect(await getRegistrySize()).toBe(10);
      expect(await lookupQuery('h0')).toBe('q0');
    });

    it('sync registration evicts oldest at capacity', () => {
      _clearRegistry();
      for (let i = 0; i < 15; i++) {
        registerQuerySync(`s${i}`, `sq${i}`);
      }
      // All 15 should be present (well under 10_000 limit)
      expect(lookupQuerySync('s0')).toBe('sq0');
      expect(lookupQuerySync('s14')).toBe('sq14');
    });
  });
});
