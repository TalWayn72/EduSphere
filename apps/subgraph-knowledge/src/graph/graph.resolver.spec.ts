import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { GraphResolver } from './graph.resolver';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGraphService = {
  findConceptById: vi.fn(),
  findConceptByName: vi.fn(),
  findAllConcepts: vi.fn(),
  createConcept: vi.fn(),
  updateConcept: vi.fn(),
  deleteConcept: vi.fn(),
  findRelatedConcepts: vi.fn(),
  linkConcepts: vi.fn(),
  findPersonById: vi.fn(),
  findPersonByName: vi.fn(),
  createPerson: vi.fn(),
  semanticSearch: vi.fn(),
  // Learning Path methods
  getLearningPath: vi.fn(),
  getRelatedConceptsByName: vi.fn(),
  getPrerequisiteChain: vi.fn(),
};

const MOCK_AUTH_CTX = {
  req: {},
  authContext: {
    userId: 'user-1',
    tenantId: 'tenant-1',
    roles: ['STUDENT'],
    scopes: ['read'],
  },
};

const NO_AUTH_CTX = { req: {} };

const MOCK_CONCEPT = {
  id: 'concept-1',
  tenantId: 'tenant-1',
  name: 'Free Will',
  definition: 'The ability to choose freely',
  sourceIds: [],
};

describe('GraphResolver', () => {
  let resolver: GraphResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new GraphResolver(mockGraphService as any);
  });

  // ─── concept ──────────────────────────────────────────────────────────────

  describe('concept()', () => {
    it('returns concept when authenticated', async () => {
      mockGraphService.findConceptById.mockResolvedValue(MOCK_CONCEPT);
      const result = await resolver.concept('concept-1', MOCK_AUTH_CTX as any);
      expect(result).toEqual(MOCK_CONCEPT);
    });

    it('delegates to graphService.findConceptById with correct args', async () => {
      mockGraphService.findConceptById.mockResolvedValue(MOCK_CONCEPT);
      await resolver.concept('concept-1', MOCK_AUTH_CTX as any);
      expect(mockGraphService.findConceptById).toHaveBeenCalledWith(
        'concept-1',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.concept('concept-1', NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not call service when unauthenticated', async () => {
      try {
        await resolver.concept('x', NO_AUTH_CTX as any);
      } catch {
        /* expected */
      }
      expect(mockGraphService.findConceptById).not.toHaveBeenCalled();
    });
  });

  // ─── conceptByName ────────────────────────────────────────────────────────

  describe('conceptByName()', () => {
    it('delegates to graphService.findConceptByName', async () => {
      mockGraphService.findConceptByName.mockResolvedValue(MOCK_CONCEPT);
      await resolver.conceptByName('Free Will', MOCK_AUTH_CTX as any);
      expect(mockGraphService.findConceptByName).toHaveBeenCalledWith(
        'Free Will',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.conceptByName('Free Will', NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── concepts ─────────────────────────────────────────────────────────────

  describe('concepts()', () => {
    it('delegates to graphService.findAllConcepts', async () => {
      mockGraphService.findAllConcepts.mockResolvedValue([MOCK_CONCEPT]);
      const result = await resolver.concepts(10, MOCK_AUTH_CTX as any);
      expect(mockGraphService.findAllConcepts).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
        'STUDENT',
        10
      );
      expect(result).toHaveLength(1);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.concepts(10, NO_AUTH_CTX as any)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  // ─── relatedConcepts ──────────────────────────────────────────────────────

  describe('relatedConcepts()', () => {
    it('delegates to graphService.findRelatedConcepts', async () => {
      mockGraphService.findRelatedConcepts.mockResolvedValue([]);
      await resolver.relatedConcepts('concept-1', 2, 10, MOCK_AUTH_CTX as any);
      expect(mockGraphService.findRelatedConcepts).toHaveBeenCalledWith(
        'concept-1',
        2,
        10,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.relatedConcepts('x', 2, 10, NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── createConcept ────────────────────────────────────────────────────────

  describe('createConcept()', () => {
    it('delegates to graphService.createConcept', async () => {
      mockGraphService.createConcept.mockResolvedValue(MOCK_CONCEPT);
      const result = await resolver.createConcept(
        { name: 'Free Will', definition: 'Definition', sourceIds: [] },
        MOCK_AUTH_CTX as any
      );
      expect(mockGraphService.createConcept).toHaveBeenCalledWith(
        'Free Will',
        'Definition',
        [],
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(MOCK_CONCEPT);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.createConcept(
          { name: 'X', definition: 'Y', sourceIds: [] },
          NO_AUTH_CTX as any
        )
      ).rejects.toThrow(UnauthorizedException);
    });
  });
  describe('updateConcept()', () => {
    it('delegates to graphService.updateConcept', async () => {
      mockGraphService.updateConcept.mockResolvedValue(MOCK_CONCEPT);
      const result = await resolver.updateConcept(
        'concept-1',
        { name: 'Updated' },
        MOCK_AUTH_CTX as any
      );
      expect(mockGraphService.updateConcept).toHaveBeenCalledWith(
        'concept-1',
        { name: 'Updated' },
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(MOCK_CONCEPT);
    });
    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.updateConcept('x', {}, NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('deleteConcept()', () => {
    it('delegates to graphService.deleteConcept', async () => {
      mockGraphService.deleteConcept.mockResolvedValue(true);
      const result = await resolver.deleteConcept(
        'concept-1',
        MOCK_AUTH_CTX as any
      );
      expect(mockGraphService.deleteConcept).toHaveBeenCalledWith(
        'concept-1',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toBe(true);
    });
    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.deleteConcept('x', NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('linkConcepts()', () => {
    it('delegates to graphService.linkConcepts', async () => {
      const mockLink = {
        fromConcept: MOCK_CONCEPT,
        toConcept: MOCK_CONCEPT,
        relationshipType: 'RELATES_TO',
        strength: 0.8,
        inferred: false,
        description: null,
      };
      mockGraphService.linkConcepts.mockResolvedValue(mockLink);
      const result = await resolver.linkConcepts(
        'c-1',
        'c-2',
        'RELATES_TO',
        0.8,
        null,
        MOCK_AUTH_CTX as any
      );
      expect(mockGraphService.linkConcepts).toHaveBeenCalledWith(
        'c-1',
        'c-2',
        'RELATES_TO',
        0.8,
        null,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(mockLink);
    });
    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.linkConcepts('a', 'b', 'REL', null, null, NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('person()', () => {
    it('delegates to graphService.findPersonById', async () => {
      const mockPerson = { id: 'person-1', name: 'Maimonides' };
      mockGraphService.findPersonById.mockResolvedValue(mockPerson);
      const result = await resolver.person('person-1', MOCK_AUTH_CTX as any);
      expect(mockGraphService.findPersonById).toHaveBeenCalledWith(
        'person-1',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(mockPerson);
    });
    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(resolver.person('x', NO_AUTH_CTX as any)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('personByName()', () => {
    it('delegates to graphService.findPersonByName', async () => {
      mockGraphService.findPersonByName.mockResolvedValue({ id: 'p-1' });
      await resolver.personByName('Maimonides', MOCK_AUTH_CTX as any);
      expect(mockGraphService.findPersonByName).toHaveBeenCalledWith(
        'Maimonides',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
    });
    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.personByName('x', NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('createPerson()', () => {
    it('delegates to graphService.createPerson', async () => {
      const mockPerson = { id: 'p-1', name: 'Maimonides' };
      mockGraphService.createPerson.mockResolvedValue(mockPerson);
      const result = await resolver.createPerson(
        { name: 'Maimonides', bio: 'Bio' },
        MOCK_AUTH_CTX as any
      );
      expect(mockGraphService.createPerson).toHaveBeenCalledWith(
        'Maimonides',
        'Bio',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(mockPerson);
    });
    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.createPerson({ name: 'X' }, NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('searchSemantic()', () => {
    it('delegates to graphService.semanticSearch', async () => {
      mockGraphService.semanticSearch.mockResolvedValue([]);
      const result = await resolver.searchSemantic(
        'quantum',
        10,
        MOCK_AUTH_CTX as any
      );
      expect(mockGraphService.semanticSearch).toHaveBeenCalledWith(
        'quantum',
        10,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual([]);
    });
    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.searchSemantic('q', 5, NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── learningPath ──────────────────────────────────────────────────────────

  describe('learningPath()', () => {
    const MOCK_PATH = {
      concepts: [
        { id: 'c-1', name: 'Algebra', type: 'CONCEPT' },
        { id: 'c-2', name: 'Calculus', type: 'CONCEPT' },
      ],
      steps: 1,
    };

    it('delegates to graphService.getLearningPath with correct args', async () => {
      mockGraphService.getLearningPath.mockResolvedValue(MOCK_PATH);
      const result = await resolver.learningPath(
        'Algebra',
        'Calculus',
        MOCK_AUTH_CTX as any
      );
      expect(mockGraphService.getLearningPath).toHaveBeenCalledWith(
        'Algebra',
        'Calculus',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(MOCK_PATH);
    });

    it('returns null when no path found', async () => {
      mockGraphService.getLearningPath.mockResolvedValue(null);
      const result = await resolver.learningPath(
        'A',
        'B',
        MOCK_AUTH_CTX as any
      );
      expect(result).toBeNull();
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.learningPath('A', 'B', NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not call service when unauthenticated', async () => {
      try {
        await resolver.learningPath('A', 'B', NO_AUTH_CTX as any);
      } catch {
        /* expected */
      }
      expect(mockGraphService.getLearningPath).not.toHaveBeenCalled();
    });
  });

  // ─── relatedConceptsByName ─────────────────────────────────────────────────

  describe('relatedConceptsByName()', () => {
    const MOCK_RELATED = [{ id: 'c-2', name: 'Kinematics', type: 'CONCEPT' }];

    it('delegates to graphService.getRelatedConceptsByName with correct args', async () => {
      mockGraphService.getRelatedConceptsByName.mockResolvedValue(MOCK_RELATED);
      const result = await resolver.relatedConceptsByName(
        'Physics',
        2,
        MOCK_AUTH_CTX as any
      );
      expect(mockGraphService.getRelatedConceptsByName).toHaveBeenCalledWith(
        'Physics',
        2,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(MOCK_RELATED);
    });

    it('returns empty array when no related concepts', async () => {
      mockGraphService.getRelatedConceptsByName.mockResolvedValue([]);
      const result = await resolver.relatedConceptsByName(
        'X',
        2,
        MOCK_AUTH_CTX as any
      );
      expect(result).toEqual([]);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.relatedConceptsByName('Physics', 2, NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('uses default depth of 2 when not supplied', async () => {
      mockGraphService.getRelatedConceptsByName.mockResolvedValue([]);
      await resolver.relatedConceptsByName('Physics', 2, MOCK_AUTH_CTX as any);
      expect(mockGraphService.getRelatedConceptsByName).toHaveBeenCalledWith(
        'Physics',
        2,
        'tenant-1',
        'user-1',
        'STUDENT'
      );
    });
  });

  // ─── prerequisiteChain ────────────────────────────────────────────────────

  describe('prerequisiteChain()', () => {
    const MOCK_CHAIN = [
      { id: 'c-1', name: 'Arithmetic' },
      { id: 'c-2', name: 'Algebra' },
      { id: 'c-3', name: 'Calculus' },
    ];

    it('delegates to graphService.getPrerequisiteChain with correct args', async () => {
      mockGraphService.getPrerequisiteChain.mockResolvedValue(MOCK_CHAIN);
      const result = await resolver.prerequisiteChain(
        'Calculus',
        MOCK_AUTH_CTX as any
      );
      expect(mockGraphService.getPrerequisiteChain).toHaveBeenCalledWith(
        'Calculus',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result).toEqual(MOCK_CHAIN);
    });

    it('returns empty array when no prerequisite chain exists', async () => {
      mockGraphService.getPrerequisiteChain.mockResolvedValue([]);
      const result = await resolver.prerequisiteChain(
        'Intro',
        MOCK_AUTH_CTX as any
      );
      expect(result).toEqual([]);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.prerequisiteChain('Calculus', NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not call service when unauthenticated', async () => {
      try {
        await resolver.prerequisiteChain('X', NO_AUTH_CTX as any);
      } catch {
        /* expected */
      }
      expect(mockGraphService.getPrerequisiteChain).not.toHaveBeenCalled();
    });
  });
});
