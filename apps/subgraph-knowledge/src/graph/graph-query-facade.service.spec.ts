import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Sub-service mocks ─────────────────────────────────────────────────────
const mockFindConceptById = vi.fn();
const mockFindConceptByName = vi.fn();
const mockFindAllConcepts = vi.fn();

vi.mock('./graph-concept.service', () => ({
  GraphConceptService: class {
    findConceptById = mockFindConceptById;
    findConceptByName = mockFindConceptByName;
    findAllConcepts = mockFindAllConcepts;
  },
}));

const mockFindRelatedConcepts = vi.fn();
vi.mock('./graph-concept-link.service', () => ({
  GraphConceptLinkService: class {
    findRelatedConcepts = mockFindRelatedConcepts;
  },
}));

const mockSemanticSearch = vi.fn();
vi.mock('./graph-search.service', () => ({
  GraphSearchService: class {
    semanticSearch = mockSemanticSearch;
  },
}));

const mockFindPersonById = vi.fn();
const mockFindPersonByName = vi.fn();
const mockFindTermById = vi.fn();
const mockFindTermByName = vi.fn();
vi.mock('./graph-person-term.service', () => ({
  GraphPersonTermService: class {
    findPersonById = mockFindPersonById;
    findPersonByName = mockFindPersonByName;
    findTermById = mockFindTermById;
    findTermByName = mockFindTermByName;
  },
}));

const mockFindSourceById = vi.fn();
const mockFindTopicClusterById = vi.fn();
const mockFindTopicClustersByCourse = vi.fn();
const mockGetLearningPath = vi.fn();
const mockGetRelatedConceptsByName = vi.fn();
const mockGetPrerequisiteChain = vi.fn();
vi.mock('./graph-source-cluster.service', () => ({
  GraphSourceClusterService: class {
    findSourceById = mockFindSourceById;
    findTopicClusterById = mockFindTopicClusterById;
    findTopicClustersByCourse = mockFindTopicClustersByCourse;
    getLearningPath = mockGetLearningPath;
    getRelatedConceptsByName = mockGetRelatedConceptsByName;
    getPrerequisiteChain = mockGetPrerequisiteChain;
  },
}));

import { GraphQueryFacadeService } from './graph-query-facade.service.js';
import { GraphConceptService } from './graph-concept.service.js';
import { GraphConceptLinkService } from './graph-concept-link.service.js';
import { GraphSearchService } from './graph-search.service.js';
import { GraphPersonTermService } from './graph-person-term.service.js';
import { GraphSourceClusterService } from './graph-source-cluster.service.js';

const T = 'tenant-1';
const U = 'user-1';
const R = 'INSTRUCTOR';

describe('GraphQueryFacadeService', () => {
  let facade: GraphQueryFacadeService;

  beforeEach(() => {
    vi.clearAllMocks();
    facade = new GraphQueryFacadeService(
      new GraphConceptService(null as never, null as never),
      new GraphConceptLinkService(null as never),
      new GraphSearchService(null as never, null as never),
      new GraphPersonTermService(null as never, null as never),
      new GraphSourceClusterService(null as never, null as never, null as never)
    );
  });

  // ── Concept queries ───────────────────────────────────────────────────
  it('findConceptById delegates to concept service', async () => {
    const expected = { id: 'c1', name: 'React' };
    mockFindConceptById.mockResolvedValue(expected);
    const result = await facade.findConceptById('c1', T, U, R);
    expect(result).toBe(expected);
    expect(mockFindConceptById).toHaveBeenCalledWith('c1', T, U, R);
  });

  it('findConceptByName delegates to concept service', async () => {
    mockFindConceptByName.mockResolvedValue({ name: 'Vue' });
    await facade.findConceptByName('Vue', T, U, R);
    expect(mockFindConceptByName).toHaveBeenCalledWith('Vue', T, U, R);
  });

  it('findAllConcepts delegates with optional limit', async () => {
    mockFindAllConcepts.mockResolvedValue([]);
    await facade.findAllConcepts(T, U, R, 50);
    expect(mockFindAllConcepts).toHaveBeenCalledWith(T, U, R, 50);
  });

  // ── Relation queries ──────────────────────────────────────────────────
  it('findRelatedConcepts delegates to conceptLink service', async () => {
    mockFindRelatedConcepts.mockResolvedValue([]);
    await facade.findRelatedConcepts('c1', 3, 10, T, U, R);
    expect(mockFindRelatedConcepts).toHaveBeenCalledWith('c1', 3, 10, T, U, R);
  });

  // ── Search ────────────────────────────────────────────────────────────
  it('semanticSearch delegates to search service', async () => {
    const hits = [{ id: 'c2', score: 0.9 }];
    mockSemanticSearch.mockResolvedValue(hits);
    const result = await facade.semanticSearch('graph theory', 5, T, U, R);
    expect(result).toBe(hits);
    expect(mockSemanticSearch).toHaveBeenCalledWith('graph theory', 5, T, U, R);
  });

  // ── Person / Term ─────────────────────────────────────────────────────
  it('findPersonById delegates to personTerm service', async () => {
    mockFindPersonById.mockResolvedValue({ id: 'p1' });
    await facade.findPersonById('p1', T, U, R);
    expect(mockFindPersonById).toHaveBeenCalledWith('p1', T, U, R);
  });

  it('findTermByName delegates to personTerm service', async () => {
    mockFindTermByName.mockResolvedValue(null);
    await facade.findTermByName('Ontology', T, U, R);
    expect(mockFindTermByName).toHaveBeenCalledWith('Ontology', T, U, R);
  });

  // ── Source / TopicCluster / LearningPath ──────────────────────────────
  it('findSourceById delegates to sourceCluster service', async () => {
    mockFindSourceById.mockResolvedValue({ id: 's1' });
    await facade.findSourceById('s1', T, U, R);
    expect(mockFindSourceById).toHaveBeenCalledWith('s1', T, U, R);
  });

  it('findTopicClustersByCourse delegates correctly', async () => {
    mockFindTopicClustersByCourse.mockResolvedValue([]);
    await facade.findTopicClustersByCourse('course-1', T, U, R);
    expect(mockFindTopicClustersByCourse).toHaveBeenCalledWith(
      'course-1',
      T,
      U,
      R
    );
  });

  it('getLearningPath delegates from/to correctly', async () => {
    mockGetLearningPath.mockResolvedValue([]);
    await facade.getLearningPath('c1', 'c2', T, U, R);
    expect(mockGetLearningPath).toHaveBeenCalledWith('c1', 'c2', T, U, R);
  });

  it('getPrerequisiteChain delegates correctly', async () => {
    mockGetPrerequisiteChain.mockResolvedValue([]);
    await facade.getPrerequisiteChain('React', T, U, R);
    expect(mockGetPrerequisiteChain).toHaveBeenCalledWith('React', T, U, R);
  });

  // ── Error propagation ─────────────────────────────────────────────────
  it('propagates errors from sub-services', async () => {
    mockFindConceptById.mockRejectedValue(new Error('Not found'));
    await expect(facade.findConceptById('bad', T, U, R)).rejects.toThrow(
      'Not found'
    );
  });
});
