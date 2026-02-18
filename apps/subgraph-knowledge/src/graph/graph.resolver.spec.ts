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
        'concept-1', 'tenant-1', 'user-1', 'STUDENT'
      );
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.concept('concept-1', NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('does not call service when unauthenticated', async () => {
      try { await resolver.concept('x', NO_AUTH_CTX as any); } catch (_) { /* expected */ }
      expect(mockGraphService.findConceptById).not.toHaveBeenCalled();
    });
  });

  // ─── conceptByName ────────────────────────────────────────────────────────

  describe('conceptByName()', () => {
    it('delegates to graphService.findConceptByName', async () => {
      mockGraphService.findConceptByName.mockResolvedValue(MOCK_CONCEPT);
      await resolver.conceptByName('Free Will', MOCK_AUTH_CTX as any);
      expect(mockGraphService.findConceptByName).toHaveBeenCalledWith(
        'Free Will', 'tenant-1', 'user-1', 'STUDENT'
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
        'tenant-1', 'user-1', 'STUDENT', 10
      );
      expect(result).toHaveLength(1);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.concepts(10, NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── relatedConcepts ──────────────────────────────────────────────────────

  describe('relatedConcepts()', () => {
    it('delegates to graphService.findRelatedConcepts', async () => {
      mockGraphService.findRelatedConcepts.mockResolvedValue([]);
      await resolver.relatedConcepts('concept-1', 2, 10, MOCK_AUTH_CTX as any);
      expect(mockGraphService.findRelatedConcepts).toHaveBeenCalledWith(
        'concept-1', 2, 10, 'tenant-1', 'user-1', 'STUDENT'
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
        'Free Will', 'Definition', [], 'tenant-1', 'user-1', 'STUDENT'
      );
      expect(result).toEqual(MOCK_CONCEPT);
    });

    it('throws UnauthorizedException when not authenticated', async () => {
      await expect(
        resolver.createConcept({ name: 'X', definition: 'Y', sourceIds: [] }, NO_AUTH_CTX as any)
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
