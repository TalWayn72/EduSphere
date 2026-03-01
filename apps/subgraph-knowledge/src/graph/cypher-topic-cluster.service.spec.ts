/**
 * Unit tests for CypherTopicClusterService.
 * Direct class instantiation — no NestJS TestingModule.
 * All @edusphere/db helpers are mocked at the module level.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const mockExecuteCypher = vi.fn();

vi.mock('@edusphere/db', () => ({
  db: {},
  executeCypher: (...args: unknown[]) => mockExecuteCypher(...args),
}));

vi.mock('@edusphere/config', () => ({
  graphConfig: { graphName: 'edusphere_graph' },
}));

import { CypherTopicClusterService } from './cypher-topic-cluster.service.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const TENANT = 't-1';
const CLUSTER = {
  id: 'cl-1',
  tenant_id: TENANT,
  name: 'Jewish Philosophy',
  description: 'Medieval and modern Jewish philosophical texts',
};

describe('CypherTopicClusterService', () => {
  let service: CypherTopicClusterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CypherTopicClusterService();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('findTopicClusterById returns the first result when found', async () => {
    mockExecuteCypher.mockResolvedValue([CLUSTER]);

    const result = await service.findTopicClusterById('cl-1', TENANT);

    expect(result).toEqual(CLUSTER);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.any(String),
      { id: 'cl-1', tenantId: TENANT },
      TENANT
    );
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('findTopicClusterById returns null when result is empty', async () => {
    mockExecuteCypher.mockResolvedValue([]);

    const result = await service.findTopicClusterById('missing', TENANT);

    expect(result).toBeNull();
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('findTopicClustersByCourse calls executeCypher and returns all results', async () => {
    const clusters = [CLUSTER, { ...CLUSTER, id: 'cl-2', name: 'Ethics' }];
    mockExecuteCypher.mockResolvedValue(clusters);

    const result = await service.findTopicClustersByCourse('course-1', TENANT);

    expect(result).toEqual(clusters);
    expect(result).toHaveLength(2);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.stringContaining('BELONGS_TO'),
      { tenantId: TENANT, courseId: 'course-1' },
      TENANT
    );
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('findTopicClustersByCourse returns empty array when no results', async () => {
    mockExecuteCypher.mockResolvedValue([]);

    const result = await service.findTopicClustersByCourse('course-x', TENANT);

    expect(result).toEqual([]);
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('createTopicCluster returns the created vertex from executeCypher', async () => {
    mockExecuteCypher.mockResolvedValue([CLUSTER]);

    const result = await service.createTopicCluster(
      'Jewish Philosophy',
      'Medieval and modern Jewish philosophical texts',
      TENANT
    );

    expect(result).toEqual(CLUSTER);
    expect(mockExecuteCypher).toHaveBeenCalledWith(
      expect.anything(),
      'edusphere_graph',
      expect.stringContaining('CREATE'),
      expect.objectContaining({
        name: 'Jewish Philosophy',
        tenantId: TENANT,
      }),
      TENANT
    );
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  it('service instantiates without error', () => {
    expect(() => new CypherTopicClusterService()).not.toThrow();
  });
});
