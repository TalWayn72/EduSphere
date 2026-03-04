/**
 * topic-cluster-kmeans.service.memory.spec.ts
 *
 * Memory-safety tests for TopicClusterKMeansService.
 * Verifies:
 *   1. onModuleDestroy() drains the NATS connection when one was created.
 *   2. onModuleDestroy() is a no-op (does not throw) when no NATS connection exists.
 *   3. onModuleDestroy() nulls the nc reference after drain (idempotent).
 *   4. NATS publish errors are swallowed and do not prevent cluster creation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoist NATS mock ───────────────────────────────────────────────────────────

const { mockDrain, mockPublish, mockConnect } = vi.hoisted(() => {
  const mockDrain = vi.fn().mockResolvedValue(undefined);
  const mockPublish = vi.fn();
  const mockConnect = vi.fn().mockResolvedValue({ drain: mockDrain, publish: mockPublish });
  return { mockDrain, mockPublish, mockConnect };
});

vi.mock('nats', () => ({
  connect: mockConnect,
  StringCodec: vi.fn().mockReturnValue({
    encode: vi.fn().mockReturnValue(new Uint8Array()),
  }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn().mockReturnValue({ servers: 'nats://localhost:4222' }),
}));

vi.mock('./kmeans-math.js', () => ({
  runKMeans: vi.fn().mockReturnValue([
    { label: 'Cluster A', conceptIds: ['c1', 'c2'] },
  ]),
}));

// ── Mocked dependencies ───────────────────────────────────────────────────────

function makeCypherTopicClusterService() {
  return {
    createTopicCluster: vi.fn().mockResolvedValue({ id: 'tc-1', name: 'Cluster A' }),
  };
}

function makeKMeansDataService() {
  return {
    fetchEmbeddingRows: vi.fn().mockResolvedValue([
      { concept_id: 'c1', embedding: [0.1, 0.2, 0.3] },
      { concept_id: 'c2', embedding: [0.4, 0.5, 0.6] },
    ]),
    filterConceptsByCourse: vi.fn().mockResolvedValue(['c1', 'c2']),
    resolveConceptNames: vi.fn().mockResolvedValue(new Map([['c1', 'Alpha'], ['c2', 'Beta']])),
    buildConceptsWithEmbeddings: vi.fn().mockReturnValue([
      { id: 'c1', name: 'Alpha', embedding: [0.1, 0.2, 0.3] },
      { id: 'c2', name: 'Beta', embedding: [0.4, 0.5, 0.6] },
    ]),
  };
}

import { TopicClusterKMeansService } from './topic-cluster-kmeans.service.js';
import type { CypherTopicClusterService } from './cypher-topic-cluster.service.js';
import type { KMeansDataService } from './kmeans-data.service.js';

function makeService(
  cypher?: ReturnType<typeof makeCypherTopicClusterService>,
  data?: ReturnType<typeof makeKMeansDataService>
): TopicClusterKMeansService {
  return new TopicClusterKMeansService(
    (cypher ?? makeCypherTopicClusterService()) as unknown as CypherTopicClusterService,
    (data ?? makeKMeansDataService()) as unknown as KMeansDataService
  );
}

describe('TopicClusterKMeansService — memory safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Test 1: onModuleDestroy drains NATS when connection was established ───
  it('onModuleDestroy() drains NATS connection when nc was created', async () => {
    const svc = makeService();
    // Trigger a cluster operation so that getNats() is called and nc is set
    await svc.clusterConceptsByCourse('course-1', 2, 'tenant-1');
    expect(mockConnect).toHaveBeenCalledTimes(1);

    await svc.onModuleDestroy();
    expect(mockDrain).toHaveBeenCalledTimes(1);
  });

  // ── Test 2: onModuleDestroy is safe when no NATS connection exists ────────
  it('onModuleDestroy() does not throw when nc is null', async () => {
    const svc = makeService();
    // Do NOT call clusterConceptsByCourse — nc remains null
    await expect(svc.onModuleDestroy()).resolves.toBeUndefined();
    expect(mockDrain).not.toHaveBeenCalled();
  });

  // ── Test 3: onModuleDestroy nulls nc so second call skips drain ───────────
  it('calling onModuleDestroy() twice drains only once', async () => {
    const svc = makeService();
    await svc.clusterConceptsByCourse('course-1', 2, 'tenant-1');

    await svc.onModuleDestroy();
    await svc.onModuleDestroy(); // nc is null now, second call should not drain
    expect(mockDrain).toHaveBeenCalledTimes(1);
  });

  // ── Test 4: NATS publish errors do not prevent cluster creation ───────────
  it('NATS publish failure does not throw and clusters are still returned', async () => {
    mockConnect.mockRejectedValueOnce(new Error('NATS unavailable'));
    const cypher = makeCypherTopicClusterService();
    const svc = makeService(cypher);

    const result = await svc.clusterConceptsByCourse('course-1', 2, 'tenant-1');

    // Cluster creation should succeed even when NATS publish fails
    expect(result).toHaveLength(1);
    expect(cypher.createTopicCluster).toHaveBeenCalledTimes(1);
    // drain should NOT be called since connect failed (nc is still null)
    await svc.onModuleDestroy();
    expect(mockDrain).not.toHaveBeenCalled();
  });
});
