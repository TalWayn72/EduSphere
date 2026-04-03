/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GraphService spec — tests that the thin facade delegates correctly
 * to GraphQueryFacadeService and GraphMutationFacadeService.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphService } from './graph.service';

// ─── Mock facades ─────────────────────────────────────────────────────────────

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

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const T = 'tenant-1';
const U = 'user-1';
const R = 'STUDENT';

const MOCK_CONCEPT = {
  id: 'concept-1',
  tenantId: T,
  name: 'Free Will',
  definition: 'The ability to choose freely',
  sourceIds: [],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GraphService', () => {
  let service: GraphService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GraphService(mockQueries as any, mockMutations as any);
  });

  // ── Query delegation ──────────────────────────────────────────────────────

  describe('query delegation', () => {
    it('findConceptById delegates to queries', async () => {
      mockQueries.findConceptById.mockResolvedValue(MOCK_CONCEPT);
      const result = await service.findConceptById('concept-1', T, U, R);
      expect(mockQueries.findConceptById).toHaveBeenCalledWith('concept-1', T, U, R);
      expect(result).toEqual(MOCK_CONCEPT);
    });

    it('findConceptByName delegates to queries', async () => {
      mockQueries.findConceptByName.mockResolvedValue(MOCK_CONCEPT);
      await service.findConceptByName('Free Will', T, U, R);
      expect(mockQueries.findConceptByName).toHaveBeenCalledWith('Free Will', T, U, R);
    });

    it('findAllConcepts delegates to queries', async () => {
      mockQueries.findAllConcepts.mockResolvedValue([MOCK_CONCEPT]);
      const result = await service.findAllConcepts(T, U, R, 10);
      expect(mockQueries.findAllConcepts).toHaveBeenCalledWith(T, U, R, 10);
      expect(result).toEqual([MOCK_CONCEPT]);
    });

    it('findRelatedConcepts delegates to queries', async () => {
      mockQueries.findRelatedConcepts.mockResolvedValue([]);
      await service.findRelatedConcepts('c-1', 2, 10, T, U, R);
      expect(mockQueries.findRelatedConcepts).toHaveBeenCalledWith('c-1', 2, 10, T, U, R);
    });

    it('semanticSearch delegates to queries', async () => {
      mockQueries.semanticSearch.mockResolvedValue([]);
      await service.semanticSearch('quantum', 10, T, U, R);
      expect(mockQueries.semanticSearch).toHaveBeenCalledWith('quantum', 10, T, U, R);
    });

    it('findPersonById delegates to queries', async () => {
      mockQueries.findPersonById.mockResolvedValue({ id: 'p-1' });
      await service.findPersonById('p-1', T, U, R);
      expect(mockQueries.findPersonById).toHaveBeenCalledWith('p-1', T, U, R);
    });

    it('getLearningPath delegates to queries', async () => {
      mockQueries.getLearningPath.mockResolvedValue(null);
      await service.getLearningPath('A', 'B', T, U, R);
      expect(mockQueries.getLearningPath).toHaveBeenCalledWith('A', 'B', T, U, R);
    });

    it('getPrerequisiteChain delegates to queries', async () => {
      mockQueries.getPrerequisiteChain.mockResolvedValue([]);
      await service.getPrerequisiteChain('Calculus', T, U, R);
      expect(mockQueries.getPrerequisiteChain).toHaveBeenCalledWith('Calculus', T, U, R);
    });
  });

  // ── Mutation delegation ───────────────────────────────────────────────────

  describe('mutation delegation', () => {
    it('createConcept delegates to mutations', async () => {
      mockMutations.createConcept.mockResolvedValue(MOCK_CONCEPT);
      const result = await service.createConcept('Free Will', 'Def', [], T, U, R);
      expect(mockMutations.createConcept).toHaveBeenCalledWith(
        'Free Will', 'Def', [], T, U, R
      );
      expect(result).toEqual(MOCK_CONCEPT);
    });

    it('updateConcept delegates to mutations', async () => {
      mockMutations.updateConcept.mockResolvedValue(MOCK_CONCEPT);
      await service.updateConcept('concept-1', { name: 'Updated' }, T, U, R);
      expect(mockMutations.updateConcept).toHaveBeenCalledWith(
        'concept-1', { name: 'Updated' }, T, U, R
      );
    });

    it('deleteConcept delegates to mutations', async () => {
      mockMutations.deleteConcept.mockResolvedValue(true);
      const result = await service.deleteConcept('concept-1', T, U, R);
      expect(mockMutations.deleteConcept).toHaveBeenCalledWith('concept-1', T, U, R);
      expect(result).toBe(true);
    });

    it('linkConcepts delegates to mutations', async () => {
      mockMutations.linkConcepts.mockResolvedValue({});
      await service.linkConcepts('c-1', 'c-2', 'RELATES_TO' as any, 0.8, null, T, U, R);
      expect(mockMutations.linkConcepts).toHaveBeenCalledWith(
        'c-1', 'c-2', 'RELATES_TO', 0.8, null, T, U, R
      );
    });

    it('createPerson delegates to mutations', async () => {
      mockMutations.createPerson.mockResolvedValue({ id: 'p-1' });
      await service.createPerson('Maimonides', 'Bio', T, U, R);
      expect(mockMutations.createPerson).toHaveBeenCalledWith('Maimonides', 'Bio', T, U, R);
    });

    it('generateEmbedding delegates to mutations', async () => {
      mockMutations.generateEmbedding.mockResolvedValue(true);
      const result = await service.generateEmbedding('text', 'concept', 'c-1', T, U, R);
      expect(mockMutations.generateEmbedding).toHaveBeenCalledWith(
        'text', 'concept', 'c-1', T, U, R
      );
      expect(result).toBe(true);
    });
  });
});
