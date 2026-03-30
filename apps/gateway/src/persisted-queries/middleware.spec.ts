import { describe, it, expect, vi, beforeEach } from 'vitest';
import { applyPersistedQueryMiddleware } from './middleware';
import * as registry from './registry';

vi.mock('./registry.js', () => ({
  registerQuerySync: vi.fn(),
  lookupQuerySync: vi.fn(),
}));

describe('persisted-queries middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeRequest(): Request {
    return new Request('http://localhost:4000/graphql', { method: 'POST' });
  }

  describe('applyPersistedQueryMiddleware', () => {
    it('registers and allows when both hash and query present', () => {
      const body = {
        query: '{ me { id } }',
        extensions: {
          persistedQuery: { sha256Hash: 'abc123', version: 1 },
        },
      };

      const result = applyPersistedQueryMiddleware(makeRequest(), body);
      expect(result).toBeNull();
      expect(registry.registerQuerySync).toHaveBeenCalledWith(
        'abc123',
        '{ me { id } }'
      );
    });

    it('substitutes stored query when only hash present and registered', () => {
      vi.mocked(registry.lookupQuerySync).mockReturnValue('{ stored }');
      const body: Record<string, unknown> = {
        extensions: {
          persistedQuery: { sha256Hash: 'known-hash', version: 1 },
        },
      };

      const result = applyPersistedQueryMiddleware(makeRequest(), body as any);
      expect(result).toBeNull();
      expect(body['query']).toBe('{ stored }');
    });

    it('returns 400 PERSISTED_QUERY_NOT_FOUND for unknown hash', async () => {
      vi.mocked(registry.lookupQuerySync).mockReturnValue(undefined);
      const body = {
        extensions: {
          persistedQuery: { sha256Hash: 'unknown-hash', version: 1 },
        },
      };

      const result = applyPersistedQueryMiddleware(makeRequest(), body);
      expect(result).toBeInstanceOf(Response);
      expect(result!.status).toBe(400);
      const json = await result!.json();
      expect(json.errors[0].extensions.code).toBe('PERSISTED_QUERY_NOT_FOUND');
    });

    it('allows requests without hash when not in strict mode', () => {
      const body = { query: '{ me { id } }' };
      const result = applyPersistedQueryMiddleware(makeRequest(), body);
      // In test env, PERSISTED_QUERIES_ONLY is false by default
      expect(result).toBeNull();
    });

    it('allows requests with no extensions at all', () => {
      const body = { query: '{ me { id } }' };
      const result = applyPersistedQueryMiddleware(makeRequest(), body);
      expect(result).toBeNull();
    });

    it('allows requests with empty extensions', () => {
      const body = { query: '{ users { id } }', extensions: {} };
      const result = applyPersistedQueryMiddleware(makeRequest(), body);
      expect(result).toBeNull();
    });

    it('handles extensions without persistedQuery key', () => {
      const body = {
        query: '{ users { id } }',
        extensions: { other: true },
      };
      const result = applyPersistedQueryMiddleware(makeRequest(), body);
      expect(result).toBeNull();
    });

    it('handles persistedQuery without sha256Hash', () => {
      const body = {
        query: '{ me { id } }',
        extensions: { persistedQuery: { version: 1 } },
      };
      const result = applyPersistedQueryMiddleware(makeRequest(), body);
      expect(result).toBeNull();
    });

    it('error response includes correct Content-Type header', async () => {
      vi.mocked(registry.lookupQuerySync).mockReturnValue(undefined);
      const body = {
        extensions: {
          persistedQuery: { sha256Hash: 'bad-hash' },
        },
      };
      const result = applyPersistedQueryMiddleware(makeRequest(), body);
      expect(result!.headers.get('Content-Type')).toBe('application/json');
    });

    it('error message mentions retry for APQ miss', async () => {
      vi.mocked(registry.lookupQuerySync).mockReturnValue(undefined);
      const body = {
        extensions: {
          persistedQuery: { sha256Hash: 'miss-hash' },
        },
      };
      const result = applyPersistedQueryMiddleware(makeRequest(), body);
      const json = await result!.json();
      expect(json.errors[0].message).toContain('Retry with full query');
    });
  });
});
