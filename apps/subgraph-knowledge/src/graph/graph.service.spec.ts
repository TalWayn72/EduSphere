import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { GraphService } from './graph.service';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, callback: () => unknown) =>
    callback()
  ),
}));

const mockCypherService = {
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
  findTermById: vi.fn(),
  findTermByName: vi.fn(),
  createTerm: vi.fn(),
  findSourceById: vi.fn(),
  createSource: vi.fn(),
  findTopicClusterById: vi.fn(),
  findTopicClustersByCourse: vi.fn(),
  createTopicCluster: vi.fn(),
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
    service = new GraphService(mockCypherService as any);
  });

  // ─── findConceptById ───────────────────────────────────────────────────────

  describe('findConceptById()', () => {
    it('returns mapped concept when found', async () => {
      mockCypherService.findConceptById.mockResolvedValue(RAW_CONCEPT);
      const result = await service.findConceptById('concept-1', 'tenant-1', 'user-1', 'STUDENT');
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
      await service.findConceptById('concept-1', 'tenant-1', 'user-1', 'STUDENT');
      expect(mockCypherService.findConceptById).toHaveBeenCalledWith('concept-1', 'tenant-1');
    });
  });

  // ─── findConceptByName ─────────────────────────────────────────────────────

  describe('findConceptByName()', () => {
    it('returns mapped concept when found', async () => {
      mockCypherService.findConceptByName.mockResolvedValue(RAW_CONCEPT);
      const result = await service.findConceptByName('Free Will', 'tenant-1', 'user-1', 'STUDENT');
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
      const result = await service.findAllConcepts('tenant-1', 'user-1', 'STUDENT', 10);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ name: 'Free Will' });
    });

    it('returns empty array when no concepts', async () => {
      mockCypherService.findAllConcepts.mockResolvedValue([]);
      const result = await service.findAllConcepts('tenant-1', 'user-1', 'STUDENT');
      expect(result).toEqual([]);
    });

    it('delegates limit param to cypherService', async () => {
      mockCypherService.findAllConcepts.mockResolvedValue([]);
      await service.findAllConcepts('tenant-1', 'user-1', 'STUDENT', 50);
      expect(mockCypherService.findAllConcepts).toHaveBeenCalledWith('tenant-1', 50);
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
        'New Concept', 'A new concept', [], 'tenant-1', 'user-1', 'INSTRUCTOR'
      );
      expect(result).toMatchObject({ name: 'New Concept' });
    });

    it('passes correct props to cypherService.createConcept', async () => {
      mockCypherService.createConcept.mockResolvedValue('concept-1');
      mockCypherService.findConceptById.mockResolvedValue(RAW_CONCEPT);
      await service.createConcept('Free Will', 'Definition', ['src-1'], 'tenant-1', 'user-1', 'INSTRUCTOR');
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
      const result = await service.deleteConcept('concept-1', 'tenant-1', 'user-1', 'ORG_ADMIN');
      expect(result).toBe(true);
    });

    it('delegates to cypherService.deleteConcept with id and tenantId', async () => {
      mockCypherService.deleteConcept.mockResolvedValue(true);
      await service.deleteConcept('concept-1', 'tenant-1', 'user-1', 'ORG_ADMIN');
      expect(mockCypherService.deleteConcept).toHaveBeenCalledWith('concept-1', 'tenant-1');
    });
  });

  // ─── semanticSearch ────────────────────────────────────────────────────────

  describe('semanticSearch()', () => {
    it('returns empty array (not yet implemented)', async () => {
      const result = await service.semanticSearch('test', 10, 'tenant-1', 'user-1', 'STUDENT');
      expect(result).toEqual([]);
    });
  });
});
