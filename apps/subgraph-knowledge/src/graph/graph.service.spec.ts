import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GraphService } from './graph.service';
import { GraphConceptService } from './graph-concept.service';
import { GraphSearchService } from './graph-search.service';
import { GraphPersonTermService } from './graph-person-term.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, callback: () => unknown) => callback()
  ),
  // Drizzle table reference used in semanticSearch select/where clauses.
  // Column values are irrelevant — only their existence matters for mocked db.select().
  transcript_segments: {
    id: 'id',
    text: 'text',
    transcript_id: 'transcript_id',
  },
  // sql tagged-template helper used in the ILIKE fallback where clause.
  sql: vi.fn((...args: unknown[]) => args),
}));

const mockCypherService = {
  findConceptById: vi.fn(),
  findConceptByName: vi.fn(),
  findConceptByNameCaseInsensitive: vi.fn(),
  findAllConcepts: vi.fn(),
  createConcept: vi.fn(),
  updateConcept: vi.fn(),
  deleteConcept: vi.fn(),
  findRelatedConcepts: vi.fn(),
  linkConcepts: vi.fn(),
  linkConceptsAndFetch: vi.fn().mockResolvedValue({ from: null, to: null }),
  findPersonById: vi.fn(),
  findPersonByName: vi.fn(),
  createPerson: vi.fn(),
  findTermById: vi.fn(),
  findTermByName: vi.fn(),
  createTerm: vi.fn(),
  findSourceById: vi.fn(),
  createSource: vi.fn(),
  findTopicClusterById: vi.fn(),
  findTopicClustersByCourse: vi.fn(),
  createTopicCluster: vi.fn(),
  // Learning Path methods
  findShortestLearningPath: vi.fn(),
  collectRelatedConcepts: vi.fn(),
  findPrerequisiteChain: vi.fn(),
};

const mockEmbeddingService = {
  callEmbeddingProvider: vi.fn(),
  generateEmbedding: vi.fn(),
};

const RAW_CONCEPT = {
  id: 'concept-1',
  tenant_id: 'tenant-1',
  name: 'Free Will',
  definition: 'The ability to choose freely',
  source_ids: '[]',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const MAPPED_CONCEPT = {
  id: 'concept-1',
  tenantId: 'tenant-1',
  name: 'Free Will',
  definition: 'The ability to choose freely',
  sourceIds: [],
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
};

describe('GraphService', () => {
  let service: GraphService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCypherService.linkConceptsAndFetch.mockResolvedValue({
      from: null,
      to: null,
    });
    service = new GraphService(
      new GraphConceptService(mockCypherService as any),
      new GraphSearchService(
        mockCypherService as any,
        mockEmbeddingService as any
      ),
      new GraphPersonTermService(
        mockCypherService as any,
        mockCypherService as any,
        mockCypherService as any,
        mockCypherService as any,
        mockCypherService as any
      )
    );
  });

  // ─── findConceptById ───────────────────────────────────────────────────────

  describe('findConceptById()', () => {
    it('returns mapped concept when found', async () => {
      mockCypherService.findConceptById.mockResolvedValue(RAW_CONCEPT);
      const result = await service.findConceptById(
        'concept-1',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toMatchObject(MAPPED_CONCEPT);
    });

    it('throws NotFoundException when concept not found', async () => {
      mockCypherService.findConceptById.mockResolvedValue(null);
      await expect(
        service.findConceptById('bad-id', 'tenant-1', 'user-1', 'STUDENT')
      ).rejects.toThrow(NotFoundException);
    });

    it('delegates to cypherService.findConceptById with id and tenantId', async () => {
      mockCypherService.findConceptById.mockResolvedValue(RAW_CONCEPT);
      await service.findConceptById(
        'concept-1',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(mockCypherService.findConceptById).toHaveBeenCalledWith(
        'concept-1',
        'tenant-1'
      );
    });
  });

  // ─── findConceptByName ─────────────────────────────────────────────────────

  describe('findConceptByName()', () => {
    it('returns mapped concept when found', async () => {
      mockCypherService.findConceptByName.mockResolvedValue(RAW_CONCEPT);
      const result = await service.findConceptByName(
        'Free Will',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toMatchObject({ name: 'Free Will' });
    });

    it('throws NotFoundException when concept not found', async () => {
      mockCypherService.findConceptByName.mockResolvedValue(null);
      await expect(
        service.findConceptByName('Unknown', 'tenant-1', 'user-1', 'STUDENT')
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findAllConcepts ───────────────────────────────────────────────────────

  describe('findAllConcepts()', () => {
    it('returns array of mapped concepts', async () => {
      mockCypherService.findAllConcepts.mockResolvedValue([RAW_CONCEPT]);
      const result = await service.findAllConcepts(
        'tenant-1',
        'user-1',
        'STUDENT',
        10
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: 'Free Will' });
    });

    it('returns empty array when no concepts', async () => {
      mockCypherService.findAllConcepts.mockResolvedValue([]);
      const result = await service.findAllConcepts(
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual([]);
    });

    it('delegates limit param to cypherService', async () => {
      mockCypherService.findAllConcepts.mockResolvedValue([]);
      await service.findAllConcepts('tenant-1', 'user-1', 'STUDENT', 50);
      expect(mockCypherService.findAllConcepts).toHaveBeenCalledWith(
        'tenant-1',
        50
      );
    });
  });

  // ─── createConcept ─────────────────────────────────────────────────────────

  describe('createConcept()', () => {
    it('creates and returns mapped concept', async () => {
      mockCypherService.createConcept.mockResolvedValue('concept-new');
      mockCypherService.findConceptById.mockResolvedValue({
        ...RAW_CONCEPT,
        id: 'concept-new',
        name: 'New Concept',
      });
      const result = await service.createConcept(
        'New Concept',
        'A new concept',
        [],
        'tenant-1',
        'user-1',
        'INSTRUCTOR'
      );
      expect(result).toMatchObject({ name: 'New Concept' });
    });

    it('passes correct props to cypherService.createConcept', async () => {
      mockCypherService.createConcept.mockResolvedValue('concept-1');
      mockCypherService.findConceptById.mockResolvedValue(RAW_CONCEPT);
      await service.createConcept(
        'Free Will',
        'Definition',
        ['src-1'],
        'tenant-1',
        'user-1',
        'INSTRUCTOR'
      );
      expect(mockCypherService.createConcept).toHaveBeenCalledWith({
        tenant_id: 'tenant-1',
        name: 'Free Will',
        definition: 'Definition',
        source_ids: ['src-1'],
      });
    });

    it('throws NotFoundException if concept not found after creation', async () => {
      mockCypherService.createConcept.mockResolvedValue('new-id');
      mockCypherService.findConceptById.mockResolvedValue(null);
      await expect(
        service.createConcept('X', 'Y', [], 'tenant-1', 'user-1', 'INSTRUCTOR')
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── deleteConcept ─────────────────────────────────────────────────────────

  describe('deleteConcept()', () => {
    it('returns true on success', async () => {
      mockCypherService.deleteConcept.mockResolvedValue(true);
      const result = await service.deleteConcept(
        'concept-1',
        'tenant-1',
        'user-1',
        'ORG_ADMIN'
      );
      expect(result).toBe(true);
    });

    it('delegates to cypherService.deleteConcept with id and tenantId', async () => {
      mockCypherService.deleteConcept.mockResolvedValue(true);
      await service.deleteConcept(
        'concept-1',
        'tenant-1',
        'user-1',
        'ORG_ADMIN'
      );
      expect(mockCypherService.deleteConcept).toHaveBeenCalledWith(
        'concept-1',
        'tenant-1'
      );
    });
  });

  // ─── semanticSearch ────────────────────────────────────────────────────────

  describe('semanticSearch()', () => {
    it('returns vector results when embedding provider succeeds', async () => {
      // db.execute is used for the pgvector query inside withTenantContext
      const mockDbModule = await import('@edusphere/db');
      vi.mocked(mockEmbeddingService.callEmbeddingProvider).mockResolvedValue([
        0.1, 0.2,
      ]);
      // db.execute is called for pgvector; db.select for ILIKE fallback
      // withTenantContext is already mocked to just call callback
      // We need to mock db.execute to return rows
      (mockDbModule.db as any).execute = vi.fn().mockResolvedValue([
        {
          id: 'e1',
          segment_id: 'seg-1',
          transcript_id: 'tr-1',
          text: 'test text',
          similarity: '0.9',
        },
      ]);
      (mockDbModule.db as any).select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi
            .fn()
            .mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
        }),
      });
      mockCypherService.findAllConcepts.mockResolvedValue([]);

      const result = await service.semanticSearch(
        'test',
        10,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].entityType).toBe('transcript_segment');
    });

    it('falls back to ILIKE when embedding provider throws', async () => {
      const mockDbModule = await import('@edusphere/db');
      vi.mocked(mockEmbeddingService.callEmbeddingProvider).mockRejectedValue(
        new Error('no provider')
      );
      (mockDbModule.db as any).select = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi
              .fn()
              .mockResolvedValue([
                { id: 'seg-1', text: 'test text', transcript_id: 'tr-1' },
              ]),
          }),
        }),
      });
      mockCypherService.findAllConcepts.mockResolvedValue([]);

      const result = await service.semanticSearch(
        'test',
        10,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result.length).toBeGreaterThan(0);
    });
  });
  describe('updateConcept', () => {
    it('updates concept', async () => {
      mockCypherService.updateConcept.mockResolvedValue({
        ...RAW_CONCEPT,
        name: 'Updated',
      });
      const result = await service.updateConcept(
        'concept-1',
        { name: 'Updated' },
        'tenant-1',
        'user-1',
        'INSTRUCTOR'
      );
      expect(result).toMatchObject({ name: 'Updated' });
    });
    it('throws NotFoundException when null returned', async () => {
      mockCypherService.updateConcept.mockResolvedValue(null);
      await expect(
        service.updateConcept('x', {}, 'tenant-1', 'user-1', 'INSTRUCTOR')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('generateEmbedding', () => {
    it('returns true when embedding succeeds for transcript_segment', async () => {
      vi.mocked(mockEmbeddingService.generateEmbedding).mockResolvedValue({
        id: 'e1',
        type: 'content',
        refId: 'seg-1',
        embedding: [0.1],
        createdAt: new Date().toISOString(),
      });
      const result = await service.generateEmbedding(
        'text',
        'transcript_segment',
        'seg-1',
        'tenant-1',
        'user-1',
        'INSTRUCTOR'
      );
      expect(result).toBe(true);
    });

    it('returns false for unsupported entityType', async () => {
      const result = await service.generateEmbedding(
        'text',
        'Concept',
        'c-1',
        'tenant-1',
        'user-1',
        'INSTRUCTOR'
      );
      expect(result).toBe(false);
    });

    it('returns false when embeddingService.generateEmbedding throws', async () => {
      vi.mocked(mockEmbeddingService.generateEmbedding).mockRejectedValue(
        new Error('provider error')
      );
      const result = await service.generateEmbedding(
        'text',
        'transcript_segment',
        'seg-x',
        'tenant-1',
        'user-1',
        'INSTRUCTOR'
      );
      expect(result).toBe(false);
    });
  });

  // ─── getLearningPath ────────────────────────────────────────────────────────

  describe('getLearningPath()', () => {
    const MOCK_PATH = {
      concepts: [
        { id: 'c-1', name: 'Algebra', type: 'CONCEPT' },
        { id: 'c-2', name: 'Calculus', type: 'CONCEPT' },
      ],
      steps: 1,
    };

    it('returns learning path when cypherService finds a path', async () => {
      mockCypherService.findShortestLearningPath.mockResolvedValue(MOCK_PATH);
      const result = await service.getLearningPath(
        'Algebra',
        'Calculus',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(MOCK_PATH);
    });

    it('returns null when no path exists', async () => {
      mockCypherService.findShortestLearningPath.mockResolvedValue(null);
      const result = await service.getLearningPath(
        'A',
        'B',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toBeNull();
    });

    it('delegates to cypherService.findShortestLearningPath with correct args', async () => {
      mockCypherService.findShortestLearningPath.mockResolvedValue(null);
      await service.getLearningPath(
        'Algebra',
        'Calculus',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(mockCypherService.findShortestLearningPath).toHaveBeenCalledWith(
        'Algebra',
        'Calculus',
        'tenant-1'
      );
    });

    it('wraps call in withTenantContext', async () => {
      mockCypherService.findShortestLearningPath.mockResolvedValue(MOCK_PATH);
      const { withTenantContext } = await import('@edusphere/db');
      await service.getLearningPath('A', 'B', 'tenant-1', 'user-1', 'STUDENT');
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        expect.any(Function)
      );
    });
  });

  // ─── getRelatedConceptsByName ───────────────────────────────────────────────

  describe('getRelatedConceptsByName()', () => {
    const MOCK_RELATED = [
      { id: 'c-2', name: 'Kinematics', type: 'CONCEPT' },
      { id: 'c-3', name: 'Dynamics', type: 'CONCEPT' },
    ];

    it('returns related concepts array', async () => {
      mockCypherService.collectRelatedConcepts.mockResolvedValue(MOCK_RELATED);
      const result = await service.getRelatedConceptsByName(
        'Physics',
        2,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(MOCK_RELATED);
    });

    it('returns empty array when no related concepts found', async () => {
      mockCypherService.collectRelatedConcepts.mockResolvedValue([]);
      const result = await service.getRelatedConceptsByName(
        'Obscure',
        2,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual([]);
    });

    it('delegates to cypherService.collectRelatedConcepts with correct args', async () => {
      mockCypherService.collectRelatedConcepts.mockResolvedValue([]);
      await service.getRelatedConceptsByName(
        'Physics',
        3,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(mockCypherService.collectRelatedConcepts).toHaveBeenCalledWith(
        'Physics',
        3,
        'tenant-1'
      );
    });

    it('wraps call in withTenantContext', async () => {
      mockCypherService.collectRelatedConcepts.mockResolvedValue([]);
      const { withTenantContext } = await import('@edusphere/db');
      await service.getRelatedConceptsByName(
        'Physics',
        2,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Function)
      );
    });
  });

  // ─── getPrerequisiteChain ───────────────────────────────────────────────────

  describe('getPrerequisiteChain()', () => {
    const MOCK_CHAIN = [
      { id: 'c-1', name: 'Arithmetic' },
      { id: 'c-2', name: 'Algebra' },
      { id: 'c-3', name: 'Calculus' },
    ];

    it('returns prerequisite chain array', async () => {
      mockCypherService.findPrerequisiteChain.mockResolvedValue(MOCK_CHAIN);
      const result = await service.getPrerequisiteChain(
        'Calculus',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(MOCK_CHAIN);
    });

    it('returns empty array when no prerequisites found', async () => {
      mockCypherService.findPrerequisiteChain.mockResolvedValue([]);
      const result = await service.getPrerequisiteChain(
        'Intro',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual([]);
    });

    it('delegates to cypherService.findPrerequisiteChain with correct args', async () => {
      mockCypherService.findPrerequisiteChain.mockResolvedValue([]);
      await service.getPrerequisiteChain(
        'Calculus',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(mockCypherService.findPrerequisiteChain).toHaveBeenCalledWith(
        'Calculus',
        'tenant-1'
      );
    });

    it('wraps call in withTenantContext', async () => {
      mockCypherService.findPrerequisiteChain.mockResolvedValue([]);
      const { withTenantContext } = await import('@edusphere/db');
      await service.getPrerequisiteChain(
        'Calculus',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        expect.any(Function)
      );
    });

    it('includes root and target in the returned chain', async () => {
      mockCypherService.findPrerequisiteChain.mockResolvedValue(MOCK_CHAIN);
      const result = (await service.getPrerequisiteChain(
        'Calculus',
        'tenant-1',
        'user-1',
        'STUDENT'
      )) as Array<{ id: string; name: string }>;
      expect(result[0].name).toBe('Arithmetic');
      expect(result[result.length - 1].name).toBe('Calculus');
    });
  });
});
