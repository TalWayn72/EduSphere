/**
 * kmeans-data.service.spec.ts
 * Unit tests for KMeansDataService — embedding fetch, concept name resolution,
 * course filtering, and buildConceptsWithEmbeddings.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockExecuteCypher = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({ select: mockSelect })),
  schema: {
    concept_embeddings: { concept_id: 'concept_id', embedding: 'embedding' },
  },
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  db: {},
  executeCypher: (...args: unknown[]) => mockExecuteCypher(...args),
}));

vi.mock('@edusphere/config', () => ({
  graphConfig: { graphName: 'edusphere_graph' },
}));

import { KMeansDataService } from './kmeans-data.service.js';

describe('KMeansDataService', () => {
  let service: KMeansDataService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new KMeansDataService();
  });

  // ── fetchEmbeddingRows ────────────────────────────────────────────────────

  it('selects concept_id and embedding from DB', async () => {
    const rows = [
      { concept_id: 'c-1', embedding: [0.1, 0.2, 0.3] },
      { concept_id: 'c-2', embedding: [0.4, 0.5, 0.6] },
    ];
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        catch: vi.fn().mockResolvedValue(rows),
      }),
    });
    const result = await service.fetchEmbeddingRows('tenant-1');
    expect(result).toHaveLength(2);
    expect(result[0].concept_id).toBe('c-1');
  });

  it('returns empty array on DB error', async () => {
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        catch: vi.fn().mockImplementation((handler: (e: Error) => unknown) => {
          // simulate catch path
          return handler(new Error('DB down'));
        }),
      }),
    });
    const result = await service.fetchEmbeddingRows('tenant-1');
    expect(result).toEqual([]);
  });

  // ── resolveConceptNames ───────────────────────────────────────────────────

  it('returns empty Map for empty conceptIds', async () => {
    const map = await service.resolveConceptNames([], 'tenant-1');
    expect(map.size).toBe(0);
    expect(mockExecuteCypher).not.toHaveBeenCalled();
  });

  it('builds Map from AGE results', async () => {
    mockExecuteCypher.mockResolvedValue([
      { id: 'c-1', name: 'React' },
      { id: 'c-2', name: 'Vue' },
    ]);
    const map = await service.resolveConceptNames(['c-1', 'c-2'], 'tenant-1');
    expect(map.get('c-1')).toBe('React');
    expect(map.get('c-2')).toBe('Vue');
  });

  it('returns partial map if AGE query fails', async () => {
    mockExecuteCypher.mockRejectedValue(new Error('AGE timeout'));
    const map = await service.resolveConceptNames(['c-1'], 'tenant-1');
    expect(map.size).toBe(0); // graceful fallback
  });

  // ── buildConceptsWithEmbeddings ───────────────────────────────────────────

  it('maps rows to ConceptWithEmbedding using nameMap', () => {
    const nameMap = new Map([['c-1', 'React']]);
    const rows = [{ concept_id: 'c-1', embedding: [0.1, 0.2] }];
    const result = service.buildConceptsWithEmbeddings(rows, nameMap);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('React');
    expect(result[0].embedding).toEqual([0.1, 0.2]);
  });

  it('falls back to concept_id as name when not in nameMap', () => {
    const rows = [{ concept_id: 'c-99', embedding: [0.5] }];
    const result = service.buildConceptsWithEmbeddings(rows, new Map());
    expect(result[0].name).toBe('c-99');
  });

  it('filters out rows with empty embeddings', () => {
    const rows = [
      { concept_id: 'c-1', embedding: [] },
      { concept_id: 'c-2', embedding: [0.1, 0.2] },
    ];
    const result = service.buildConceptsWithEmbeddings(rows, new Map());
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('c-2');
  });

  it('parses JSON string embeddings', () => {
    const rows = [{ concept_id: 'c-1', embedding: '[0.1, 0.2, 0.3]' as unknown as number[] }];
    const result = service.buildConceptsWithEmbeddings(rows, new Map());
    expect(result[0].embedding).toEqual([0.1, 0.2, 0.3]);
  });

  // ── onModuleDestroy ───────────────────────────────────────────────────────

  it('calls closeAllPools on destroy', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });
});
