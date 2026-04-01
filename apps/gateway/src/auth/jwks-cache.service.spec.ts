import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwksCacheService } from './jwks-cache.service';

describe('JwksCacheService', () => {
  let service: JwksCacheService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new JwksCacheService();
  });

  describe('get', () => {
    it('returns null for uncached URL', () => {
      expect(service.get('https://example.com/.well-known/jwks')).toBeNull();
    });

    it('returns cached keys before TTL expires', () => {
      const keys = [{ kty: 'RSA', kid: 'key-1' }];
      service.set('https://example.com/jwks', keys);
      expect(service.get('https://example.com/jwks')).toEqual(keys);
    });

    it('returns null after TTL expires', () => {
      const keys = [{ kty: 'RSA', kid: 'key-1' }];
      service.set('https://example.com/jwks', keys);

      // Advance time past TTL (10 minutes)
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60 * 1000);
      expect(service.get('https://example.com/jwks')).toBeNull();
    });

    it('cleans up expired entry on access', () => {
      const keys = [{ kty: 'RSA' }];
      service.set('https://example.com/jwks', keys);
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 11 * 60 * 1000);
      service.get('https://example.com/jwks'); // triggers delete
      vi.restoreAllMocks();
      expect(service.get('https://example.com/jwks')).toBeNull();
    });
  });

  describe('set', () => {
    it('stores keys for a URL', () => {
      const keys = [{ kty: 'EC', kid: 'ec-1' }];
      service.set('https://auth.example.com/jwks', keys);
      expect(service.get('https://auth.example.com/jwks')).toEqual(keys);
    });

    it('overwrites existing entry', () => {
      service.set('https://a.com/jwks', [{ kid: 'old' }]);
      service.set('https://a.com/jwks', [{ kid: 'new' }]);
      expect(service.get('https://a.com/jwks')).toEqual([{ kid: 'new' }]);
    });

    it('evicts oldest entry when at max capacity (10)', () => {
      for (let i = 0; i < 10; i++) {
        service.set(`https://realm-${i}.com/jwks`, [{ kid: `k-${i}` }]);
      }
      // Adding 11th should evict the first
      service.set('https://realm-10.com/jwks', [{ kid: 'k-10' }]);
      expect(service.get('https://realm-0.com/jwks')).toBeNull();
      expect(service.get('https://realm-10.com/jwks')).toEqual([
        { kid: 'k-10' },
      ]);
    });

    it('stores empty keys array', () => {
      service.set('https://empty.com/jwks', []);
      expect(service.get('https://empty.com/jwks')).toEqual([]);
    });
  });

  describe('onModuleDestroy', () => {
    it('clears all cached entries', () => {
      service.set('https://a.com/jwks', [{ kid: 'a' }]);
      service.set('https://b.com/jwks', [{ kid: 'b' }]);
      service.onModuleDestroy();
      expect(service.get('https://a.com/jwks')).toBeNull();
      expect(service.get('https://b.com/jwks')).toBeNull();
    });

    it('can be called multiple times safely', () => {
      service.onModuleDestroy();
      service.onModuleDestroy();
      expect(service.get('https://any.com')).toBeNull();
    });
  });

  describe('multiple URLs', () => {
    it('stores and retrieves keys for different URLs independently', () => {
      const keys1 = [{ kid: 'realm-1' }];
      const keys2 = [{ kid: 'realm-2' }];
      service.set('https://kc1.com/jwks', keys1);
      service.set('https://kc2.com/jwks', keys2);
      expect(service.get('https://kc1.com/jwks')).toEqual(keys1);
      expect(service.get('https://kc2.com/jwks')).toEqual(keys2);
    });
  });
});
