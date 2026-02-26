import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CachedEmbeddings,
  createEmbeddings,
  EmbeddingOptions,
} from './embeddings';

// ---------------------------------------------------------------------------
// Mock @langchain/openai so no real OpenAI calls are made
// ---------------------------------------------------------------------------
vi.mock('@langchain/openai', () => ({
  OpenAIEmbeddings: vi.fn().mockImplementation(() => ({
    embedQuery: vi.fn(),
    embedDocuments: vi.fn(),
  })),
}));

// Mock ioredis
vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: vi.fn(),
    setex: vi.fn(),
    keys: vi.fn(),
    del: vi.fn(),
  })),
}));

// ---------------------------------------------------------------------------
// Imports after mocking
// ---------------------------------------------------------------------------
import { OpenAIEmbeddings } from '@langchain/openai';
import Redis from 'ioredis';

const MockOpenAIEmbeddings = vi.mocked(OpenAIEmbeddings);
const MockRedis = vi.mocked(Redis);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeFakeEmbedding(seed = 0): number[] {
  return Array.from({ length: 768 }, (_, i) => (i + seed) * 0.001);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('CachedEmbeddings', () => {
  let mockEmbedInstance: {
    embedQuery: ReturnType<typeof vi.fn>;
    embedDocuments: ReturnType<typeof vi.fn>;
  };
  let mockRedisInstance: {
    get: ReturnType<typeof vi.fn>;
    setex: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockEmbedInstance = {
      embedQuery: vi.fn().mockResolvedValue(makeFakeEmbedding()),
      embedDocuments: vi
        .fn()
        .mockResolvedValue([makeFakeEmbedding(1), makeFakeEmbedding(2)]),
    };

    mockRedisInstance = {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue('OK'),
      keys: vi.fn().mockResolvedValue([]),
      del: vi.fn().mockResolvedValue(0),
    };

    MockOpenAIEmbeddings.mockImplementation(() => mockEmbedInstance as never);
    MockRedis.mockImplementation(() => mockRedisInstance as never);
  });

  describe('constructor', () => {
    it('creates instance with default options', () => {
      const embeddings = new CachedEmbeddings('test-api-key');
      expect(embeddings).toBeInstanceOf(CachedEmbeddings);
    });

    it('creates instance with custom model and dimensions', () => {
      const opts: EmbeddingOptions = {
        model: 'text-embedding-ada-002',
        dimensions: 1536,
        cacheEnabled: false,
      };
      const embeddings = new CachedEmbeddings('test-api-key', opts);
      expect(embeddings).toBeInstanceOf(CachedEmbeddings);
    });

    it('passes correct model to OpenAIEmbeddings', () => {
      new CachedEmbeddings('test-key', { model: 'text-embedding-3-large' });
      expect(MockOpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({ modelName: 'text-embedding-3-large' })
      );
    });

    it('uses default model text-embedding-3-small when none provided', () => {
      new CachedEmbeddings('test-key');
      expect(MockOpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({ modelName: 'text-embedding-3-small' })
      );
    });

    it('passes dimensions to OpenAIEmbeddings', () => {
      new CachedEmbeddings('test-key', { dimensions: 512 });
      expect(MockOpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({ dimensions: 512 })
      );
    });
  });

  describe('factory function', () => {
    it('createEmbeddings returns CachedEmbeddings instance', () => {
      const instance = createEmbeddings('test-key');
      expect(instance).toBeInstanceOf(CachedEmbeddings);
    });

    it('createEmbeddings passes options through', () => {
      createEmbeddings('test-key', { model: 'custom-model' });
      expect(MockOpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({ modelName: 'custom-model' })
      );
    });
  });

  describe('embedQuery — without cache', () => {
    it('calls OpenAI embedQuery when cache is disabled', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: false,
      });
      const result = await embeddings.embedQuery('test query');

      expect(mockEmbedInstance.embedQuery).toHaveBeenCalledWith('test query');
      expect(result).toEqual(makeFakeEmbedding());
    });

    it('returns 768-dimension embedding by default', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: false,
      });
      const result = await embeddings.embedQuery('dimension test');

      expect(result).toHaveLength(768);
    });
  });

  describe('embedQuery — with Redis cache', () => {
    it('caches embedding on first call', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: true,
      });
      embeddings.configureCache('redis://localhost:6379');

      mockRedisInstance.get.mockResolvedValue(null);

      await embeddings.embedQuery('new query');

      expect(mockEmbedInstance.embedQuery).toHaveBeenCalledTimes(1);
      expect(mockRedisInstance.setex).toHaveBeenCalledOnce();
    });

    it('returns cached embedding on second call without hitting OpenAI', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: true,
      });
      embeddings.configureCache('redis://localhost:6379');

      const cachedValue = makeFakeEmbedding(99);
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(cachedValue));

      const result = await embeddings.embedQuery('cached query');

      expect(mockEmbedInstance.embedQuery).not.toHaveBeenCalled();
      expect(result).toEqual(cachedValue);
    });

    it('stores embedding with correct TTL (24 hours = 86400s by default)', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: true,
      });
      embeddings.configureCache('redis://localhost:6379');

      mockRedisInstance.get.mockResolvedValue(null);
      await embeddings.embedQuery('ttl test');

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^embedding:/),
        86400,
        expect.any(String)
      );
    });

    it('uses custom cacheTTL when provided', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: true,
        cacheTTL: 3600,
      });
      embeddings.configureCache('redis://localhost:6379');

      mockRedisInstance.get.mockResolvedValue(null);
      await embeddings.embedQuery('custom ttl');

      expect(mockRedisInstance.setex).toHaveBeenCalledWith(
        expect.any(String),
        3600,
        expect.any(String)
      );
    });

    it('cache key is prefixed with "embedding:"', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: true,
      });
      embeddings.configureCache('redis://localhost:6379');

      mockRedisInstance.get.mockResolvedValue(null);
      await embeddings.embedQuery('prefix test');

      expect(mockRedisInstance.get).toHaveBeenCalledWith(
        expect.stringMatching(/^embedding:/)
      );
    });

    it('does not use cache when redis is not configured even if cacheEnabled=true', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: true,
      });
      // No configureCache call

      await embeddings.embedQuery('no redis');

      expect(mockEmbedInstance.embedQuery).toHaveBeenCalledTimes(1);
      expect(mockRedisInstance.get).not.toHaveBeenCalled();
    });
  });

  describe('embedDocuments', () => {
    it('embeds multiple documents without cache', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: false,
      });
      const docs = ['doc one', 'doc two'];
      const result = await embeddings.embedDocuments(docs);

      expect(mockEmbedInstance.embedDocuments).toHaveBeenCalledWith(docs);
      expect(result).toHaveLength(2);
    });

    it('embeds uncached documents and caches results', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: true,
      });
      embeddings.configureCache('redis://localhost:6379');

      mockRedisInstance.get.mockResolvedValue(null);
      mockEmbedInstance.embedDocuments.mockResolvedValue([
        makeFakeEmbedding(10),
        makeFakeEmbedding(20),
      ]);

      const result = await embeddings.embedDocuments(['alpha', 'beta']);

      expect(mockEmbedInstance.embedDocuments).toHaveBeenCalledTimes(1);
      expect(mockRedisInstance.setex).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('uses cached documents and skips embedding for cached ones', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: true,
      });
      embeddings.configureCache('redis://localhost:6379');

      const cachedEmbedding = makeFakeEmbedding(5);
      // First doc cached, second not
      mockRedisInstance.get
        .mockResolvedValueOnce(JSON.stringify(cachedEmbedding))
        .mockResolvedValueOnce(null);
      mockEmbedInstance.embedDocuments.mockResolvedValue([
        makeFakeEmbedding(20),
      ]);

      const result = await embeddings.embedDocuments([
        'cached-doc',
        'uncached-doc',
      ]);

      // Only one doc should have been passed to the LLM
      expect(mockEmbedInstance.embedDocuments).toHaveBeenCalledWith([
        'uncached-doc',
      ]);
      expect(result[0]).toEqual(cachedEmbedding);
      expect(result).toHaveLength(2);
    });
  });

  describe('clearCache', () => {
    it('deletes all embedding keys from Redis', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: true,
      });
      embeddings.configureCache('redis://localhost:6379');

      const fakeKeys = ['embedding:abc123', 'embedding:def456'];
      mockRedisInstance.keys.mockResolvedValue(fakeKeys);

      await embeddings.clearCache();

      expect(mockRedisInstance.keys).toHaveBeenCalledWith('embedding:*');
      expect(mockRedisInstance.del).toHaveBeenCalledWith(...fakeKeys);
    });

    it('does not call del when no keys exist', async () => {
      const embeddings = new CachedEmbeddings('test-key', {
        cacheEnabled: true,
      });
      embeddings.configureCache('redis://localhost:6379');

      mockRedisInstance.keys.mockResolvedValue([]);

      await embeddings.clearCache();

      expect(mockRedisInstance.del).not.toHaveBeenCalled();
    });

    it('does nothing when Redis is not configured', async () => {
      const embeddings = new CachedEmbeddings('test-key');
      // No configureCache

      await embeddings.clearCache(); // Should not throw
      expect(mockRedisInstance.keys).not.toHaveBeenCalled();
    });
  });
});
