/**
 * graph-source-cluster.service.spec.ts
 * Unit tests for GraphSourceClusterService.
 * Tests Source, TopicCluster, and LearningPath delegation with RLS wrapping.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: () => Promise<unknown>) => fn()
);

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
}));

vi.mock('./graph-types', () => ({
  toUserRole: vi.fn((r: string) => r),
}));

// ── Service mocks ─────────────────────────────────────────────────────────────

const mockFindSourceById = vi.fn();
const mockCreateSource = vi.fn();
vi.mock('./cypher-source.service.js', () => ({
  CypherSourceService: class {
    findSourceById = mockFindSourceById;
    createSource = mockCreateSource;
  },
}));

const mockFindTopicById = vi.fn();
const mockFindTopicByCourse = vi.fn();
const mockCreateTopicCluster = vi.fn();
vi.mock('./cypher-topic-cluster.service.js', () => ({
  CypherTopicClusterService: class {
    findTopicClusterById = mockFindTopicById;
    findTopicClustersByCourse = mockFindTopicByCourse;
    createTopicCluster = mockCreateTopicCluster;
  },
}));

const mockShortestPath = vi.fn();
const mockCollectRelated = vi.fn();
const mockPrerequisiteChain = vi.fn();
vi.mock('./cypher-learning-path.service.js', () => ({
  CypherLearningPathService: class {
    findShortestLearningPath = mockShortestPath;
    collectRelatedConcepts = mockCollectRelated;
    findPrerequisiteChain = mockPrerequisiteChain;
  },
}));

import { GraphSourceClusterService } from './graph-source-cluster.service.js';
import { CypherSourceService } from './cypher-source.service.js';
import { CypherTopicClusterService } from './cypher-topic-cluster.service.js';
import { CypherLearningPathService } from './cypher-learning-path.service.js';

const CTX = { tenantId: 'tenant-1', userId: 'user-1', role: 'STUDENT' };

describe('GraphSourceClusterService', () => {
  let service: GraphSourceClusterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GraphSourceClusterService(
      new CypherSourceService({} as never),
      new CypherTopicClusterService({} as never),
      new CypherLearningPathService({} as never)
    );
  });

  // ── Source operations ─────────────────────────────────────────────────────

  it('findSourceById wraps in tenantContext and calls cypher service', async () => {
    const src = { id: 'src-1', title: 'Book', type: 'BOOK' };
    mockFindSourceById.mockResolvedValue(src);
    const result = await service.findSourceById('src-1', CTX.tenantId, CTX.userId, CTX.role);
    expect(mockWithTenantContext).toHaveBeenCalled();
    expect(mockFindSourceById).toHaveBeenCalledWith('src-1', 'tenant-1');
    expect(result).toBe(src);
  });

  it('createSource delegates to cypher source service', async () => {
    const src = { id: 'src-2', title: 'Paper' };
    mockCreateSource.mockResolvedValue(src);
    const result = await service.createSource('Paper', 'ARTICLE', null, CTX.tenantId, CTX.userId, CTX.role);
    expect(mockCreateSource).toHaveBeenCalledWith('Paper', 'ARTICLE', null, 'tenant-1');
    expect(result).toBe(src);
  });

  // ── TopicCluster operations ───────────────────────────────────────────────

  it('findTopicClusterById wraps and delegates', async () => {
    const cluster = { id: 'tc-1', name: 'Cluster A' };
    mockFindTopicById.mockResolvedValue(cluster);
    const result = await service.findTopicClusterById('tc-1', CTX.tenantId, CTX.userId, CTX.role);
    expect(result).toBe(cluster);
  });

  it('findTopicClustersByCourse returns array', async () => {
    const clusters = [{ id: 'tc-1' }, { id: 'tc-2' }];
    mockFindTopicByCourse.mockResolvedValue(clusters);
    const result = await service.findTopicClustersByCourse('course-1', CTX.tenantId, CTX.userId, CTX.role);
    expect(mockFindTopicByCourse).toHaveBeenCalledWith('course-1', 'tenant-1');
    expect(result).toBe(clusters);
  });

  // ── LearningPath operations ───────────────────────────────────────────────

  it('getLearningPath delegates to findShortestLearningPath', async () => {
    const path = ['c-1', 'c-2', 'c-3'];
    mockShortestPath.mockResolvedValue(path);
    const result = await service.getLearningPath('c-1', 'c-3', CTX.tenantId, CTX.userId, CTX.role);
    expect(mockShortestPath).toHaveBeenCalledWith('c-1', 'c-3', 'tenant-1');
    expect(result).toBe(path);
  });

  it('getPrerequisiteChain delegates to findPrerequisiteChain', async () => {
    mockPrerequisiteChain.mockResolvedValue(['prereq-1', 'prereq-2']);
    await service.getPrerequisiteChain('React', CTX.tenantId, CTX.userId, CTX.role);
    expect(mockPrerequisiteChain).toHaveBeenCalledWith('React', 'tenant-1');
  });
});
