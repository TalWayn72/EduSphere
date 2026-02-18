import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  SemanticRetriever,
  createRetriever,
  RetrievalOptions,
  RetrievalResult,
} from './retriever';
import type { CachedEmbeddings } from './embeddings';
import type { PgVectorStore, SearchResult } from './vectorStore';

// ---------------------------------------------------------------------------
// Build mock instances inline — no module mocking needed here
// because retriever depends on injected instances, not module imports
// ---------------------------------------------------------------------------
function makeFakeEmbedding(seed = 0): number[] {
  return Array.from({ length: 768 }, (_, i) => (i + seed) * 0.001);
}

function makeSearchResult(overrides: Partial<SearchResult> = {}): SearchResult {
  return {
    id: 'doc-1',
    content: 'Sample document content about neural networks.',
    metadata: { source: 'lecture-notes.pdf', page: 5 },
    similarity: 0.92,
    ...overrides,
  };
}

function makeMockEmbeddings() {
  return {
    embedQuery: vi.fn<[string], Promise<number[]>>().mockResolvedValue(makeFakeEmbedding()),
    embedDocuments: vi.fn<[string[]], Promise<number[][]>>().mockResolvedValue([makeFakeEmbedding()]),
    configureCache: vi.fn(),
    clearCache: vi.fn(),
  } as unknown as CachedEmbeddings;
}

function makeMockVectorStore(results: SearchResult[] = [makeSearchResult()]) {
  return {
    similaritySearch: vi.fn<[number[], string, number, number], Promise<SearchResult[]>>()
      .mockResolvedValue(results),
    addDocument: vi.fn(),
    addDocuments: vi.fn(),
    deleteDocument: vi.fn(),
    deleteByMetadata: vi.fn(),
    initialize: vi.fn(),
    close: vi.fn(),
  } as unknown as PgVectorStore;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('SemanticRetriever', () => {
  let mockEmbeddings: CachedEmbeddings;
  let mockVectorStore: PgVectorStore;

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmbeddings = makeMockEmbeddings();
    mockVectorStore = makeMockVectorStore();
  });

  describe('constructor and factory', () => {
    it('creates SemanticRetriever instance', () => {
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);
      expect(retriever).toBeInstanceOf(SemanticRetriever);
    });

    it('factory createRetriever returns SemanticRetriever', () => {
      const retriever = createRetriever(mockEmbeddings, mockVectorStore);
      expect(retriever).toBeInstanceOf(SemanticRetriever);
    });
  });

  describe('retrieve()', () => {
    it('embeds the query before searching', async () => {
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);
      await retriever.retrieve('neural networks', 'tenant-abc');

      expect(mockEmbeddings.embedQuery).toHaveBeenCalledWith('neural networks');
    });

    it('passes query embedding to vector store similaritySearch', async () => {
      const fakeEmb = makeFakeEmbedding(42);
      vi.mocked(mockEmbeddings.embedQuery).mockResolvedValue(fakeEmb);

      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);
      await retriever.retrieve('some query', 'tenant-xyz');

      expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(
        fakeEmb,
        'tenant-xyz',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('passes tenantId correctly to vector store', async () => {
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);
      await retriever.retrieve('query', 'tenant-12345');

      expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(
        expect.any(Array),
        'tenant-12345',
        expect.any(Number),
        expect.any(Number)
      );
    });

    it('uses default topK=5 and similarityThreshold=0.5', async () => {
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);
      await retriever.retrieve('query', 'tenant-abc');

      expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(
        expect.any(Array),
        'tenant-abc',
        5,
        0.5
      );
    });

    it('respects custom topK option', async () => {
      const options: RetrievalOptions = { topK: 10 };
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);
      await retriever.retrieve('query', 'tenant-abc', options);

      expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        10,
        expect.any(Number)
      );
    });

    it('respects custom similarityThreshold option', async () => {
      const options: RetrievalOptions = { similarityThreshold: 0.8 };
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);
      await retriever.retrieve('query', 'tenant-abc', options);

      expect(mockVectorStore.similaritySearch).toHaveBeenCalledWith(
        expect.any(Array),
        expect.any(String),
        expect.any(Number),
        0.8
      );
    });

    it('adds rank information to each result (1-indexed)', async () => {
      const results = [
        makeSearchResult({ id: 'r1', similarity: 0.95 }),
        makeSearchResult({ id: 'r2', similarity: 0.80 }),
        makeSearchResult({ id: 'r3', similarity: 0.65 }),
      ];
      mockVectorStore = makeMockVectorStore(results);
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);

      const retrieved: RetrievalResult[] = await retriever.retrieve('query', 'tenant-abc');

      expect(retrieved[0]!.rank).toBe(1);
      expect(retrieved[1]!.rank).toBe(2);
      expect(retrieved[2]!.rank).toBe(3);
    });

    it('preserves all SearchResult fields in RetrievalResult', async () => {
      const searchResult = makeSearchResult({
        id: 'preserved-doc',
        content: 'Important content',
        metadata: { source: 'textbook.pdf' },
        similarity: 0.88,
      });
      mockVectorStore = makeMockVectorStore([searchResult]);
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);

      const results = await retriever.retrieve('query', 'tenant-abc');

      expect(results[0]!.id).toBe('preserved-doc');
      expect(results[0]!.content).toBe('Important content');
      expect(results[0]!.similarity).toBe(0.88);
      expect(results[0]!.metadata.source).toBe('textbook.pdf');
    });

    it('returns empty array when vector store returns no results', async () => {
      mockVectorStore = makeMockVectorStore([]);
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);

      const results = await retriever.retrieve('obscure query', 'tenant-abc');

      expect(results).toHaveLength(0);
    });

    it('propagates embedding error', async () => {
      vi.mocked(mockEmbeddings.embedQuery).mockRejectedValue(new Error('Embedding API down'));
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);

      await expect(retriever.retrieve('query', 'tenant-abc')).rejects.toThrow('Embedding API down');
    });

    it('propagates vector store error', async () => {
      vi.mocked(mockVectorStore.similaritySearch).mockRejectedValue(
        new Error('PG connection lost')
      );
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);

      await expect(retriever.retrieve('query', 'tenant-abc')).rejects.toThrow('PG connection lost');
    });
  });

  describe('retrieveWithContext()', () => {
    it('returns both results and formatted context string', async () => {
      const result1 = makeSearchResult({ id: 'ctx-1', content: 'First content block' });
      const result2 = makeSearchResult({
        id: 'ctx-2',
        content: 'Second content block',
        metadata: { source: 'second-source.pdf' },
      });
      mockVectorStore = makeMockVectorStore([result1, result2]);
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);

      const { results, context } = await retriever.retrieveWithContext('query', 'tenant-abc');

      expect(results).toHaveLength(2);
      expect(typeof context).toBe('string');
      expect(context.length).toBeGreaterThan(0);
    });

    it('context contains [N] numbered citations', async () => {
      const results = [
        makeSearchResult({ id: 'c1', content: 'Block one' }),
        makeSearchResult({ id: 'c2', content: 'Block two' }),
      ];
      mockVectorStore = makeMockVectorStore(results);
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);

      const { context } = await retriever.retrieveWithContext('query', 'tenant-abc');

      expect(context).toContain('[1]');
      expect(context).toContain('[2]');
    });

    it('context includes source from metadata', async () => {
      const results = [
        makeSearchResult({ metadata: { source: 'important-paper.pdf' } }),
      ];
      mockVectorStore = makeMockVectorStore(results);
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);

      const { context } = await retriever.retrieveWithContext('query', 'tenant-abc');

      expect(context).toContain('important-paper.pdf');
    });

    it('context shows "Unknown" when source is missing from metadata', async () => {
      const results = [makeSearchResult({ metadata: {} })];
      mockVectorStore = makeMockVectorStore(results);
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);

      const { context } = await retriever.retrieveWithContext('query', 'tenant-abc');

      expect(context).toContain('Unknown');
    });

    it('results in retrieveWithContext have rank property', async () => {
      mockVectorStore = makeMockVectorStore([makeSearchResult()]);
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);

      const { results } = await retriever.retrieveWithContext('query', 'tenant-abc');

      expect(results[0]!.rank).toBe(1);
    });

    it('returns empty context and empty results when nothing found', async () => {
      mockVectorStore = makeMockVectorStore([]);
      const retriever = new SemanticRetriever(mockEmbeddings, mockVectorStore);

      const { results, context } = await retriever.retrieveWithContext('query', 'tenant-abc');

      expect(results).toHaveLength(0);
      expect(context).toBe('');
    });
  });
});
