/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GraphService extended spec — additional delegation tests.
 * Covers Term, Source, TopicCluster, and edge-case delegation paths.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphService } from './graph.service';

const mockQueries = {
  findConceptById: vi.fn(),
  findConceptByName: vi.fn(),
  findAllConcepts: vi.fn(),
  findRelatedConcepts: vi.fn(),
  semanticSearch: vi.fn(),
  findPersonById: vi.fn(),
  findPersonByName: vi.fn(),
  findTermById: vi.fn(),
  findTermByName: vi.fn(),
  findSourceById: vi.fn(),
  findTopicClusterById: vi.fn(),
  findTopicClustersByCourse: vi.fn(),
  getLearningPath: vi.fn(),
  getRelatedConceptsByName: vi.fn(),
  getPrerequisiteChain: vi.fn(),
};

const mockMutations = {
  createConcept: vi.fn(),
  updateConcept: vi.fn(),
  deleteConcept: vi.fn(),
  linkConcepts: vi.fn(),
  createPerson: vi.fn(),
  createTerm: vi.fn(),
  createSource: vi.fn(),
  createTopicCluster: vi.fn(),
  generateEmbedding: vi.fn(),
};

const T = 'tenant-1';
const U = 'user-1';
const R = 'STUDENT';

describe('GraphService extended', () => {
  let svc: GraphService;

  beforeEach(() => {
    vi.clearAllMocks();
    svc = new GraphService(mockQueries as any, mockMutations as any);
  });

  it('findRelatedConcepts delegates with all args', async () => {
    mockQueries.findRelatedConcepts.mockResolvedValue([]);
    await svc.findRelatedConcepts('c-1', 2, 10, T, U, R);
    expect(mockQueries.findRelatedConcepts).toHaveBeenCalledWith(
      'c-1',
      2,
      10,
      T,
      U,
      R
    );
  });

  it('linkConcepts delegates to mutations', async () => {
    const link = { from: 'c-1', to: 'c-2', type: 'RELATES_TO' };
    mockMutations.linkConcepts.mockResolvedValue(link);
    const result = await svc.linkConcepts(
      'c-1',
      'c-2',
      'RELATES_TO' as any,
      0.8,
      null,
      T,
      U,
      R
    );
    expect(result).toEqual(link);
  });

  it('findPersonById delegates to queries', async () => {
    mockQueries.findPersonById.mockResolvedValue({ id: 'p-1' });
    await svc.findPersonById('p-1', T, U, R);
    expect(mockQueries.findPersonById).toHaveBeenCalledWith('p-1', T, U, R);
  });

  it('findPersonByName delegates to queries', async () => {
    mockQueries.findPersonByName.mockResolvedValue({ id: 'p-1' });
    await svc.findPersonByName('Maimonides', T, U, R);
    expect(mockQueries.findPersonByName).toHaveBeenCalledWith(
      'Maimonides',
      T,
      U,
      R
    );
  });

  it('createPerson delegates to mutations', async () => {
    mockMutations.createPerson.mockResolvedValue({ id: 'p-1' });
    await svc.createPerson('Maimonides', 'Bio', T, U, R);
    expect(mockMutations.createPerson).toHaveBeenCalledWith(
      'Maimonides',
      'Bio',
      T,
      U,
      R
    );
  });

  it('findTermById delegates to queries', async () => {
    mockQueries.findTermById.mockResolvedValue({ id: 't-1' });
    await svc.findTermById('t-1', T, U, R);
    expect(mockQueries.findTermById).toHaveBeenCalledWith('t-1', T, U, R);
  });

  it('findTermByName delegates to queries', async () => {
    mockQueries.findTermByName.mockResolvedValue({ id: 't-1' });
    await svc.findTermByName('Ontology', T, U, R);
    expect(mockQueries.findTermByName).toHaveBeenCalledWith(
      'Ontology',
      T,
      U,
      R
    );
  });

  it('createTerm delegates to mutations', async () => {
    mockMutations.createTerm.mockResolvedValue({ id: 't-1' });
    await svc.createTerm('Ontology', 'Definition', T, U, R);
    expect(mockMutations.createTerm).toHaveBeenCalledWith(
      'Ontology',
      'Definition',
      T,
      U,
      R
    );
  });

  it('findSourceById delegates to queries', async () => {
    mockQueries.findSourceById.mockResolvedValue({ id: 's-1' });
    await svc.findSourceById('s-1', T, U, R);
    expect(mockQueries.findSourceById).toHaveBeenCalledWith('s-1', T, U, R);
  });

  it('createSource delegates to mutations', async () => {
    mockMutations.createSource.mockResolvedValue({ id: 's-1' });
    await svc.createSource('Paper', 'ARTICLE', 'https://example.com', T, U, R);
    expect(mockMutations.createSource).toHaveBeenCalledWith(
      'Paper',
      'ARTICLE',
      'https://example.com',
      T,
      U,
      R
    );
  });

  it('findTopicClusterById delegates to queries', async () => {
    mockQueries.findTopicClusterById.mockResolvedValue({ id: 'tc-1' });
    await svc.findTopicClusterById('tc-1', T, U, R);
    expect(mockQueries.findTopicClusterById).toHaveBeenCalledWith(
      'tc-1',
      T,
      U,
      R
    );
  });

  it('findTopicClustersByCourse delegates to queries', async () => {
    mockQueries.findTopicClustersByCourse.mockResolvedValue([]);
    await svc.findTopicClustersByCourse('course-1', T, U, R);
    expect(mockQueries.findTopicClustersByCourse).toHaveBeenCalledWith(
      'course-1',
      T,
      U,
      R
    );
  });

  it('createTopicCluster delegates to mutations', async () => {
    mockMutations.createTopicCluster.mockResolvedValue({ id: 'tc-1' });
    await svc.createTopicCluster(
      'ML Basics',
      'Machine learning cluster',
      T,
      U,
      R
    );
    expect(mockMutations.createTopicCluster).toHaveBeenCalledWith(
      'ML Basics',
      'Machine learning cluster',
      T,
      U,
      R
    );
  });

  it('generateEmbedding delegates to mutations', async () => {
    mockMutations.generateEmbedding.mockResolvedValue(false);
    const result = await svc.generateEmbedding(
      'text',
      'concept',
      'c-1',
      T,
      U,
      R
    );
    expect(result).toBe(false);
  });
});
