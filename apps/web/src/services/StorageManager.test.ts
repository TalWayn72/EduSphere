import { describe, it, expect, beforeEach } from 'vitest';
import {
  WebStorageManager,
  STORAGE_QUOTA_FRACTION,
  STORAGE_WARN_FRACTION,
} from './StorageManager';

describe('WebStorageManager', () => {
  let manager: WebStorageManager;

  beforeEach(() => {
    manager = new WebStorageManager();
    localStorage.clear();
  });

  // ── clearLocalStorage ─────────────────────────────────────────────────────

  describe('clearLocalStorage', () => {
    it('removes edusphere_ cache keys', () => {
      localStorage.setItem('edusphere_cache_x', 'data');
      localStorage.setItem('edusphere_offline_y', 'blob');
      manager.clearLocalStorage();
      expect(localStorage.getItem('edusphere_cache_x')).toBeNull();
      expect(localStorage.getItem('edusphere_offline_y')).toBeNull();
    });

    it('preserves edusphere_locale so language survives cache clear', () => {
      localStorage.setItem('edusphere_locale', 'he');
      localStorage.setItem('edusphere_cache_x', 'data');
      manager.clearLocalStorage();
      expect(localStorage.getItem('edusphere_locale')).toBe('he');
    });

    it('does not remove keys from other origins', () => {
      localStorage.setItem('other_app_key', 'value');
      manager.clearLocalStorage();
      expect(localStorage.getItem('other_app_key')).toBe('value');
    });

    it('returns approximate bytes freed (UTF-16 estimate)', () => {
      // key = 'edusphere_cache_x' (17 chars), val = 'data' (4 chars) → (17+4)*2 = 42 bytes
      localStorage.setItem('edusphere_cache_x', 'data');
      const freed = manager.clearLocalStorage();
      expect(freed).toBeGreaterThan(0);
    });

    it('returns 0 when only preserved keys are present', () => {
      localStorage.setItem('edusphere_locale', 'es');
      const freed = manager.clearLocalStorage();
      expect(freed).toBe(0);
    });
  });

  // ── getStats constants ────────────────────────────────────────────────────

  it('STORAGE_QUOTA_FRACTION is 0.5', () => {
    expect(STORAGE_QUOTA_FRACTION).toBe(0.5);
  });

  it('STORAGE_WARN_FRACTION is 0.8', () => {
    expect(STORAGE_WARN_FRACTION).toBe(0.8);
  });
});
