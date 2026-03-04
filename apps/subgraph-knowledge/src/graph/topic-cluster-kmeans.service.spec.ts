import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TopicClusterKMeansService } from './topic-cluster-kmeans.service';
import type { NatsConnection } from 'nats';

// ── Module-level mocks ───────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => ({
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        catch: vi.fn().mockResolvedValue([]),
      }),
    }),
  }),
  schema: {
    concept_embeddings: {
      concept_id: 'concept_id',
      embedding: 'embedding',
    },
  },
  eq: vi.fn(),
  sql: vi.fn(),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  db: {},
  executeCypher: vi.fn().mockResolvedValue([]),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({ encode: vi.fn((s: string) => s) })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));

vi.mock('@edusphere/config', () => ({
  graphConfig: { graphName: 'edusphere_graph' },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const mockTopicClusterService = {
  createTopicCluster: vi
    .fn()
    .mockResolvedValue({ id: 'tc-1', name: 'Test Cluster' }),
};

type ConceptInput = { id: string; name: string; embedding: number[] };
type ServicePrivate = {
  getNats: () => Promise<NatsConnection>;
};

function makeService(): TopicClusterKMeansService {
  return new TopicClusterKMeansService(mockTopicClusterService as never);
}

// ── Test suite ───────────────────────────────────────────────────────────────

describe('TopicClusterKMeansService', () => {
  let service: TopicClusterKMeansService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = makeService();
  });

  // ── cosineSimilarity ────────────────────────────────────────────────────────

  describe('cosineSimilarity', () => {
    it('returns 1 for identical non-zero vectors', () => {
      const v = [1, 0, 0];
      expect(service.cosineSimilarity(v, v)).toBeCloseTo(1);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(service.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });

    it('returns 0 when one vector is all zeros', () => {
      expect(service.cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });

    it('returns ~0.707 for [1,1] vs [1,0]', () => {
      expect(service.cosineSimilarity([1, 1], [1, 0])).toBeCloseTo(0.707, 2);
    });
  });

  // ── cosineDistance ──────────────────────────────────────────────────────────

  describe('cosineDistance', () => {
    it('returns 0 for identical vectors', () => {
      expect(service.cosineDistance([1, 0], [1, 0])).toBeCloseTo(0);
    });

    it('returns 1 for orthogonal vectors', () => {
      expect(service.cosineDistance([1, 0], [0, 1])).toBeCloseTo(1);
    });
  });

  // ── meanVector ───────────────────────────────────────────────────────────────

  describe('meanVector', () => {
    it('returns empty array for empty input', () => {
      expect(service.meanVector([])).toEqual([]);
    });

    it('returns the vector itself for single input', () => {
      expect(service.meanVector([[2, 4]])).toEqual([2, 4]);
    });

    it('computes correct component-wise mean', () => {
      const result = service.meanVector([
        [1, 0],
        [3, 4],
      ]);
      expect(result[0]).toBeCloseTo(2);
      expect(result[1]).toBeCloseTo(2);
    });
  });

  // ── initCentroidsKMeansPlusPlus ─────────────────────────────────────────────

  describe('initCentroidsKMeansPlusPlus', () => {
    it('returns empty array for empty input', () => {
      expect(service.initCentroidsKMeansPlusPlus([], 3)).toEqual([]);
    });

    it('returns k centroids for a set of k+N points', () => {
      const points = [
        [1, 0, 0],
        [0, 1, 0],
        [0, 0, 1],
        [0.9, 0.1, 0],
        [0.1, 0.9, 0],
      ];
      const centroids = service.initCentroidsKMeansPlusPlus(points, 3);
      expect(centroids).toHaveLength(3);
    });

    it('returns k centroids even when k > point count', () => {
      const points = [[1, 0], [0, 1]];
      const centroids = service.initCentroidsKMeansPlusPlus(points, 5);
      expect(centroids).toHaveLength(5);
    });
  });

  // ── runKMeans ────────────────────────────────────────────────────────────────

  describe('runKMeans', () => {
    const concepts: ConceptInput[] = [
      { id: 'c1', name: 'Alpha', embedding: [1, 0, 0] },
      { id: 'c2', name: 'Beta', embedding: [0.95, 0.05, 0] },
      { id: 'c3', name: 'Gamma', embedding: [0, 0, 1] },
      { id: 'c4', name: 'Delta', embedding: [0.05, 0, 0.95] },
      { id: 'c5', name: 'Epsilon', embedding: [0.9, 0.1, 0] },
    ];

    it('assigns all concepts to some cluster', () => {
      const clusters = service.runKMeans(concepts, 2);
      const totalAssigned = clusters.reduce(
        (sum, c) => sum + c.conceptIds.length,
        0
      );
      expect(totalAssigned).toBe(concepts.length);
    });

    it('produces exactly k clusters when k <= concept count', () => {
      expect(service.runKMeans(concepts, 2)).toHaveLength(2);
    });

    it('clamps k to concept count when k > concept count', () => {
      const small: ConceptInput[] = [
        { id: 'c1', name: 'A', embedding: [1, 0] },
        { id: 'c2', name: 'B', embedding: [0, 1] },
      ];
      expect(service.runKMeans(small, 10)).toHaveLength(2);
    });

    it('returns empty array when concept list is empty', () => {
      expect(service.runKMeans([], 3)).toEqual([]);
    });

    it('places all concepts in one cluster when k=1', () => {
      const clusters = service.runKMeans(concepts, 1);
      expect(clusters).toHaveLength(1);
      expect(clusters[0]?.conceptIds).toHaveLength(concepts.length);
    });

    it('builds label from concept names (not a generic fallback)', () => {
      const clusters = service.runKMeans(concepts, 1);
      expect(clusters[0]?.label).not.toBe('Cluster 1');
    });

    it('groups semantically similar vectors into the same cluster', () => {
      // c1, c2, c5 are near [1,0,0]; c3, c4 are near [0,0,1]
      const clusters = service.runKMeans(concepts, 2);
      const clusterWithC1 = clusters.find((c) => c.conceptIds.includes('c1'));
      const clusterWithC3 = clusters.find((c) => c.conceptIds.includes('c3'));
      expect(clusterWithC1?.conceptIds).toContain('c2');
      expect(clusterWithC3?.conceptIds).toContain('c4');
    });
  });

  // ── clusterConceptsByCourse ────────────────────────────────────────────────

  describe('clusterConceptsByCourse', () => {
    it('returns empty array when DB returns no embeddings', async () => {
      const result = await service.clusterConceptsByCourse(
        'course-1',
        3,
        'tenant-1'
      );
      expect(result).toEqual([]);
    });
  });

  // ── onModuleDestroy ─────────────────────────────────────────────────────────

  describe('onModuleDestroy', () => {
    it('resolves without throwing when NATS was never connected', async () => {
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });

    it('drains NATS connection when nc was initialized', async () => {
      const natsModule = await import('nats');
      const mockDrain = vi.fn().mockResolvedValue(undefined);
      vi.mocked(natsModule.connect).mockResolvedValueOnce({
        publish: vi.fn(),
        drain: mockDrain,
      } as unknown as NatsConnection);

      // Trigger connection
      await (service as unknown as ServicePrivate).getNats();
      await service.onModuleDestroy();

      expect(mockDrain).toHaveBeenCalledTimes(1);
    });
  });
});
