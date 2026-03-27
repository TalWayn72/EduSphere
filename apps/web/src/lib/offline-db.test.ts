/**
 * Tests for lib/offline-db.ts — IndexedDB storage abstraction
 *
 * Covers: idbStorage export, getItem, setItem, removeItem methods.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockDel = vi.fn();

vi.mock('idb-keyval', () => ({
  get: (...args: unknown[]) => mockGet(...args),
  set: (...args: unknown[]) => mockSet(...args),
  del: (...args: unknown[]) => mockDel(...args),
}));

import { idbStorage } from './offline-db';

describe('idbStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is exported as an object with getItem, setItem, removeItem', () => {
    expect(idbStorage).toBeDefined();
    expect(typeof idbStorage.getItem).toBe('function');
    expect(typeof idbStorage.setItem).toBe('function');
    expect(typeof idbStorage.removeItem).toBe('function');
  });

  describe('getItem', () => {
    it('returns the value from idb-keyval get()', async () => {
      mockGet.mockResolvedValue('cached-value');
      const result = await idbStorage.getItem('test-key');
      expect(mockGet).toHaveBeenCalledWith('test-key');
      expect(result).toBe('cached-value');
    });

    it('returns null when idb-keyval get() returns undefined', async () => {
      mockGet.mockResolvedValue(undefined);
      const result = await idbStorage.getItem('missing-key');
      expect(result).toBeNull();
    });
  });

  describe('setItem', () => {
    it('calls idb-keyval set() with key and value', async () => {
      mockSet.mockResolvedValue(undefined);
      await idbStorage.setItem('key', 'value');
      expect(mockSet).toHaveBeenCalledWith('key', 'value');
    });
  });

  describe('removeItem', () => {
    it('calls idb-keyval del() with key', async () => {
      mockDel.mockResolvedValue(undefined);
      await idbStorage.removeItem('key');
      expect(mockDel).toHaveBeenCalledWith('key');
    });
  });
});
