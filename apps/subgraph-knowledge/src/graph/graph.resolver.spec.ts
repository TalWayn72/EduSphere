/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * GraphResolver spec — mutation-only tests.
 * Query tests are in graph-query.resolver.spec.ts (queries split to GraphQueryResolver).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { GraphResolver } from './graph.resolver';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockGraphService = {
  createConcept: vi.fn(),
  updateConcept: vi.fn(),
  deleteConcept: vi.fn(),
  linkConcepts: vi.fn(),
  createPerson: vi.fn(),
};

const mockKMeansService = {
  clusterConceptsByCourse: vi.fn(),
};

const mockMergeConceptsService = {
  merge: vi.fn(),
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
    resolver = new GraphResolver(
      mockGraphService as any,
      mockKMeansService as any,
      mockMergeConceptsService as any
    );
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
});
