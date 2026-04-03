import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── OpenTelemetry mock ───────────────────────────────────────────────────────
vi.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: () => ({
      startSpan: vi.fn(() => ({
        setAttribute: vi.fn(),
        setStatus: vi.fn(),
        recordException: vi.fn(),
        end: vi.fn(),
      })),
    }),
  },
  SpanStatusCode: { OK: 0, ERROR: 1 },
}));

// ─── graph-resolver.helpers mock ──────────────────────────────────────────────
const mockGetGraphAuthContext = vi.fn();
vi.mock('./graph-resolver.helpers.js', () => ({
  getGraphAuthContext: (...args: unknown[]) => mockGetGraphAuthContext(...args),
}));

// ─── GraphService mock ────────────────────────────────────────────────────────
const mockGraphService = {
  findConceptById: vi.fn(),
  findConceptByName: vi.fn(),
  findAllConcepts: vi.fn(),
  findRelatedConcepts: vi.fn(),
  findPersonById: vi.fn(),
  findPersonByName: vi.fn(),
  findTermById: vi.fn(),
  findTermByName: vi.fn(),
  findSourceById: vi.fn(),
  findTopicClusterById: vi.fn(),
  findTopicClustersByCourse: vi.fn(),
  semanticSearch: vi.fn(),
  getLearningPath: vi.fn(),
  getRelatedConceptsByName: vi.fn(),
  getPrerequisiteChain: vi.fn(),
};
vi.mock('./graph.service', () => ({
  GraphService: vi.fn(() => mockGraphService),
}));

import { GraphQueryResolver } from './graph-query.resolver';
import type { GraphQLContext } from './graph-resolver.helpers';
import type { GraphService } from './graph.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AUTH = { tenantId: 't1', userId: 'u1', role: 'STUDENT' };
const CTX = {
  authContext: { tenantId: 't1', userId: 'u1', roles: ['STUDENT'], scopes: [] },
} as GraphQLContext;

function makeResolver(): GraphQueryResolver {
  return new GraphQueryResolver(mockGraphService as unknown as GraphService);
}

describe('GraphQueryResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGraphAuthContext.mockReturnValue(AUTH);
  });

  it('concept() delegates to graphService.findConceptById', async () => {
    mockGraphService.findConceptById.mockResolvedValue({ id: 'c1' });
    const r = makeResolver();
    const result = await r.concept('c1', CTX);
    expect(mockGraphService.findConceptById).toHaveBeenCalledWith(
      'c1',
      't1',
      'u1',
      'STUDENT'
    );
    expect(result).toEqual({ id: 'c1' });
  });

  it('conceptByName() delegates correctly', async () => {
    mockGraphService.findConceptByName.mockResolvedValue({ name: 'Math' });
    const r = makeResolver();
    await r.conceptByName('Math', CTX);
    expect(mockGraphService.findConceptByName).toHaveBeenCalledWith(
      'Math',
      't1',
      'u1',
      'STUDENT'
    );
  });

  it('concepts() passes default limit', async () => {
    mockGraphService.findAllConcepts.mockResolvedValue([]);
    const r = makeResolver();
    await r.concepts(20, CTX);
    expect(mockGraphService.findAllConcepts).toHaveBeenCalledWith(
      't1',
      'u1',
      'STUDENT',
      20
    );
  });

  it('relatedConcepts() passes depth and limit', async () => {
    mockGraphService.findRelatedConcepts.mockResolvedValue([]);
    const r = makeResolver();
    await r.relatedConcepts('c1', 3, 5, CTX);
    expect(mockGraphService.findRelatedConcepts).toHaveBeenCalledWith(
      'c1',
      3,
      5,
      't1',
      'u1',
      'STUDENT'
    );
  });

  it('person() delegates to findPersonById', async () => {
    mockGraphService.findPersonById.mockResolvedValue({ id: 'p1' });
    const r = makeResolver();
    await r.person('p1', CTX);
    expect(mockGraphService.findPersonById).toHaveBeenCalledWith(
      'p1',
      't1',
      'u1',
      'STUDENT'
    );
  });

  it('personByName() delegates correctly', async () => {
    mockGraphService.findPersonByName.mockResolvedValue({ name: 'Ada' });
    const r = makeResolver();
    await r.personByName('Ada', CTX);
    expect(mockGraphService.findPersonByName).toHaveBeenCalledWith(
      'Ada',
      't1',
      'u1',
      'STUDENT'
    );
  });

  it('term() delegates to findTermById', async () => {
    mockGraphService.findTermById.mockResolvedValue({ id: 't1' });
    const r = makeResolver();
    await r.term('t1', CTX);
    expect(mockGraphService.findTermById).toHaveBeenCalledWith(
      't1',
      't1',
      'u1',
      'STUDENT'
    );
  });

  it('source() delegates to findSourceById', async () => {
    mockGraphService.findSourceById.mockResolvedValue({ id: 's1' });
    const r = makeResolver();
    await r.source('s1', CTX);
    expect(mockGraphService.findSourceById).toHaveBeenCalledWith(
      's1',
      't1',
      'u1',
      'STUDENT'
    );
  });

  it('searchSemantic() returns results from graphService', async () => {
    mockGraphService.semanticSearch.mockResolvedValue([{ id: 'r1' }]);
    const r = makeResolver();
    const result = await r.searchSemantic('algebra', 5, CTX);
    expect(mockGraphService.semanticSearch).toHaveBeenCalledWith(
      'algebra',
      5,
      't1',
      'u1',
      'STUDENT'
    );
    expect(result).toEqual([{ id: 'r1' }]);
  });

  it('searchSemantic() propagates errors from graphService', async () => {
    mockGraphService.semanticSearch.mockRejectedValue(
      new Error('search failed')
    );
    const r = makeResolver();
    await expect(r.searchSemantic('q', 10, CTX)).rejects.toThrow(
      'search failed'
    );
  });

  it('learningPath() delegates with from/to', async () => {
    mockGraphService.getLearningPath.mockResolvedValue([]);
    const r = makeResolver();
    await r.learningPath('a', 'b', CTX);
    expect(mockGraphService.getLearningPath).toHaveBeenCalledWith(
      'a',
      'b',
      't1',
      'u1',
      'STUDENT'
    );
  });

  it('prerequisiteChain() delegates correctly', async () => {
    mockGraphService.getPrerequisiteChain.mockResolvedValue([]);
    const r = makeResolver();
    await r.prerequisiteChain('Calculus', CTX);
    expect(mockGraphService.getPrerequisiteChain).toHaveBeenCalledWith(
      'Calculus',
      't1',
      'u1',
      'STUDENT'
    );
  });

  it('throws UnauthorizedException when auth is missing', async () => {
    mockGetGraphAuthContext.mockImplementation(() => {
      throw new Error('Authentication required');
    });
    const r = makeResolver();
    await expect(() => r.concept('c1', {} as GraphQLContext)).rejects.toThrow(
      'Authentication required'
    );
  });

  it('topicClustersByCourse() delegates correctly', async () => {
    mockGraphService.findTopicClustersByCourse.mockResolvedValue([]);
    const r = makeResolver();
    await r.topicClustersByCourse('course-1', CTX);
    expect(mockGraphService.findTopicClustersByCourse).toHaveBeenCalledWith(
      'course-1',
      't1',
      'u1',
      'STUDENT'
    );
  });

  it('relatedConceptsByName() passes conceptName and depth', async () => {
    mockGraphService.getRelatedConceptsByName.mockResolvedValue([]);
    const r = makeResolver();
    await r.relatedConceptsByName('Algebra', 4, CTX);
    expect(mockGraphService.getRelatedConceptsByName).toHaveBeenCalledWith(
      'Algebra',
      4,
      't1',
      'u1',
      'STUDENT'
    );
  });
});
