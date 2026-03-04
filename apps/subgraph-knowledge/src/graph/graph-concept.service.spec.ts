import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';

// ─── DB mock ──────────────────────────────────────────────────────────────────
const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: () => Promise<unknown>) => fn()
);

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
}));

// ─── CypherConceptService mock ────────────────────────────────────────────────
const mockFindConceptById = vi.fn();
const mockFindConceptByName = vi.fn();
const mockFindAllConcepts = vi.fn();
const mockCreateConcept = vi.fn();
const mockUpdateConcept = vi.fn();
const mockDeleteConcept = vi.fn();
vi.mock('./cypher-concept.service', () => ({
  CypherConceptService: class {
    findConceptById = mockFindConceptById;
    findConceptByName = mockFindConceptByName;
    findAllConcepts = mockFindAllConcepts;
    createConcept = mockCreateConcept;
    updateConcept = mockUpdateConcept;
    deleteConcept = mockDeleteConcept;
  },
}));

import { GraphConceptService } from './graph-concept.service.js';
import { CypherConceptService } from './cypher-concept.service.js';

const sampleNode = {
  id: 'concept-1',
  tenant_id: 'tenant-1',
  name: 'React',
  definition: 'A JS library',
  source_ids: '["src-1"]',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-02T00:00:00.000Z',
};

describe('GraphConceptService', () => {
  let service: GraphConceptService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GraphConceptService(new CypherConceptService({} as never));
  });

  describe('findConceptById()', () => {
    it('returns mapped concept when found', async () => {
      mockFindConceptById.mockResolvedValue(sampleNode);
      const result = await service.findConceptById(
        'concept-1',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result.id).toBe('concept-1');
      expect(result.name).toBe('React');
      expect(result.sourceIds).toEqual(['src-1']);
    });

    it('throws NotFoundException when concept not found', async () => {
      mockFindConceptById.mockResolvedValue(null);
      await expect(
        service.findConceptById('missing', 'tenant-1', 'user-1', 'STUDENT')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findConceptByName()', () => {
    it('returns mapped concept when found by name', async () => {
      mockFindConceptByName.mockResolvedValue(sampleNode);
      const result = await service.findConceptByName(
        'React',
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(result.name).toBe('React');
    });

    it('throws NotFoundException when name not found', async () => {
      mockFindConceptByName.mockResolvedValue(null);
      await expect(
        service.findConceptByName('Unknown', 'tenant-1', 'user-1', 'STUDENT')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllConcepts()', () => {
    it('returns mapped array of concepts', async () => {
      mockFindAllConcepts.mockResolvedValue([sampleNode]);
      const results = await service.findAllConcepts(
        'tenant-1',
        'user-1',
        'STUDENT'
      );
      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe('React');
    });

    it('passes default limit when not provided', async () => {
      mockFindAllConcepts.mockResolvedValue([]);
      await service.findAllConcepts('tenant-1', 'user-1', 'STUDENT');
      expect(mockFindAllConcepts).toHaveBeenCalledWith('tenant-1', 20);
    });
  });

  describe('deleteConcept()', () => {
    it('delegates to cypher.deleteConcept and returns result', async () => {
      mockDeleteConcept.mockResolvedValue(true);
      const result = await service.deleteConcept(
        'concept-1',
        'tenant-1',
        'user-1',
        'ORG_ADMIN'
      );
      expect(result).toBe(true);
    });
  });

  // linkConcepts and findRelatedConcepts live in GraphConceptLinkService.
  // See graph-concept-link.service.spec.ts for those tests.
});
