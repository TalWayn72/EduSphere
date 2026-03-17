/**
 * Unit tests for LessonPipelineTemplateService.
 * Covers: findAll, create (Zod validation), update (system template blocking),
 * delete (system template blocking), findById.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

/* ── hoisted mocks ────────────────────────────────────────────────────────── */

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    lesson_pipeline_templates: {
      id: 'id',
      tenant_id: 'tenant_id',
      name: 'name',
      is_system: 'is_system',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
  or: vi.fn(),
}));

import { LessonPipelineTemplateService } from './lesson-pipeline-template.service';

/* ── test data ────────────────────────────────────────────────────────────── */

const SYSTEM_TEMPLATE_ROW = {
  id: 'tpl-system',
  tenant_id: 'global',
  name: 'Default Pipeline',
  description: 'System-provided template',
  nodes: [{ moduleType: 'INGESTION' }, { moduleType: 'ASR' }],
  config: {},
  is_system: true,
  created_by: 'system',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const TENANT_TEMPLATE_ROW = {
  id: 'tpl-tenant',
  tenant_id: 'tenant-1',
  name: 'My Pipeline',
  description: 'Custom template',
  nodes: [{ moduleType: 'INGESTION' }],
  config: { quality: 'high' },
  is_system: false,
  created_by: 'user-1',
  created_at: new Date('2026-01-15'),
  updated_at: new Date('2026-01-15'),
};

/* ── helpers ──────────────────────────────────────────────────────────────── */

function setupSelectChain(rows: unknown[]) {
  mockWhere.mockResolvedValue(rows);
  mockFrom.mockReturnValue({ where: mockWhere });
  mockSelect.mockReturnValue({ from: mockFrom });
}

function setupSelectSingleChain(rows: unknown[]) {
  mockLimit.mockResolvedValue(rows);
  mockWhere.mockReturnValue({ limit: mockLimit });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockSelect.mockReturnValue({ from: mockFrom });
}

function setupInsertChain(row: unknown) {
  mockReturning.mockResolvedValue([row]);
  mockValues.mockReturnValue({ returning: mockReturning });
  mockInsert.mockReturnValue({ values: mockValues });
}

function setupUpdateChain(row: unknown) {
  mockReturning.mockResolvedValue([row]);
  mockWhere.mockReturnValue({ returning: mockReturning });
  mockSet.mockReturnValue({ where: mockWhere });
  mockUpdate.mockReturnValue({ set: mockSet });
}

function setupDeleteChain(rows: unknown[]) {
  mockReturning.mockResolvedValue(rows);
  mockWhere.mockReturnValue({ returning: mockReturning });
  mockDelete.mockReturnValue({ where: mockWhere });
}

/* ── tests ────────────────────────────────────────────────────────────────── */

describe('LessonPipelineTemplateService', () => {
  let service: LessonPipelineTemplateService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LessonPipelineTemplateService();
  });

  describe('findAll()', () => {
    it('returns both tenant and system templates', async () => {
      setupSelectChain([SYSTEM_TEMPLATE_ROW, TENANT_TEMPLATE_ROW]);

      const result = await service.findAll('tenant-1');

      expect(result).toHaveLength(2);
      expect(result[0].isSystem).toBe(true);
      expect(result[1].isSystem).toBe(false);
    });

    it('maps row fields to camelCase', async () => {
      setupSelectChain([TENANT_TEMPLATE_ROW]);

      const result = await service.findAll('tenant-1');

      expect(result[0]).toEqual(
        expect.objectContaining({
          id: 'tpl-tenant',
          tenantId: 'tenant-1',
          name: 'My Pipeline',
          isSystem: false,
          createdBy: 'user-1',
        })
      );
    });

    it('returns empty array when no templates exist', async () => {
      setupSelectChain([]);

      const result = await service.findAll('tenant-1');

      expect(result).toEqual([]);
    });
  });

  describe('findById()', () => {
    it('returns mapped template when found', async () => {
      setupSelectSingleChain([TENANT_TEMPLATE_ROW]);

      const result = await service.findById('tpl-tenant');

      expect(result).toEqual(
        expect.objectContaining({ id: 'tpl-tenant', name: 'My Pipeline' })
      );
    });

    it('returns null when not found', async () => {
      setupSelectSingleChain([]);

      const result = await service.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create()', () => {
    it('creates a template with valid input', async () => {
      setupInsertChain(TENANT_TEMPLATE_ROW);

      const result = await service.create(
        {
          name: 'My Pipeline',
          nodes: [{ moduleType: 'INGESTION' }],
        },
        'tenant-1',
        'user-1'
      );

      expect(result.name).toBe('My Pipeline');
      expect(mockInsert).toHaveBeenCalled();
    });

    it('rejects invalid module types via Zod', async () => {
      await expect(
        service.create(
          {
            name: 'Bad Template',
            nodes: [{ moduleType: 'INVALID_TYPE' as never }],
          },
          'tenant-1',
          'user-1'
        )
      ).rejects.toThrow();
    });

    it('rejects names exceeding 100 characters', async () => {
      const longName = 'A'.repeat(101);

      await expect(
        service.create(
          {
            name: longName,
            nodes: [{ moduleType: 'INGESTION' }],
          },
          'tenant-1',
          'user-1'
        )
      ).rejects.toThrow();
    });

    it('rejects empty name', async () => {
      await expect(
        service.create(
          {
            name: '',
            nodes: [{ moduleType: 'INGESTION' }],
          },
          'tenant-1',
          'user-1'
        )
      ).rejects.toThrow();
    });

    it('rejects empty nodes array', async () => {
      await expect(
        service.create(
          {
            name: 'Empty Nodes',
            nodes: [],
          },
          'tenant-1',
          'user-1'
        )
      ).rejects.toThrow();
    });

    it('accepts description up to 500 characters', async () => {
      setupInsertChain({ ...TENANT_TEMPLATE_ROW, description: 'A'.repeat(500) });

      const result = await service.create(
        {
          name: 'Good Template',
          description: 'A'.repeat(500),
          nodes: [{ moduleType: 'INGESTION' }],
        },
        'tenant-1',
        'user-1'
      );

      expect(result).toBeDefined();
    });

    it('rejects description exceeding 500 characters', async () => {
      await expect(
        service.create(
          {
            name: 'Bad Desc',
            description: 'A'.repeat(501),
            nodes: [{ moduleType: 'INGESTION' }],
          },
          'tenant-1',
          'user-1'
        )
      ).rejects.toThrow();
    });

    it('sets is_system to false for user-created templates', async () => {
      let capturedValues: Record<string, unknown> = {};
      mockValues.mockImplementation((v: Record<string, unknown>) => {
        capturedValues = v;
        return { returning: mockReturning };
      });
      mockReturning.mockResolvedValue([TENANT_TEMPLATE_ROW]);
      mockInsert.mockReturnValue({ values: mockValues });

      await service.create(
        { name: 'Test', nodes: [{ moduleType: 'INGESTION' }] },
        'tenant-1',
        'user-1'
      );

      expect(capturedValues['is_system']).toBe(false);
    });

    it('accepts all valid module types', async () => {
      const allTypes = [
        'INGESTION', 'ASR', 'NER_SOURCE_LINKING', 'CONTENT_CLEANING',
        'SUMMARIZATION', 'STRUCTURED_NOTES', 'DIAGRAM_GENERATOR',
        'CITATION_VERIFIER', 'QA_GATE', 'PUBLISH_SHARE',
      ];

      setupInsertChain({
        ...TENANT_TEMPLATE_ROW,
        nodes: allTypes.map((t) => ({ moduleType: t })),
      });

      const result = await service.create(
        {
          name: 'All Modules',
          nodes: allTypes.map((moduleType) => ({ moduleType: moduleType as never })),
        },
        'tenant-1',
        'user-1'
      );

      expect(result).toBeDefined();
    });
  });

  describe('update()', () => {
    it('updates a tenant template successfully', async () => {
      // findById needs its own isolated chain
      const findByIdLimit = vi.fn().mockResolvedValue([TENANT_TEMPLATE_ROW]);
      const findByIdWhere = vi.fn().mockReturnValue({ limit: findByIdLimit });
      const findByIdFrom = vi.fn().mockReturnValue({ where: findByIdWhere });
      mockSelect.mockReturnValue({ from: findByIdFrom });

      // update chain
      const updReturning = vi.fn().mockResolvedValue([{ ...TENANT_TEMPLATE_ROW, name: 'Updated Pipeline' }]);
      const updWhere = vi.fn().mockReturnValue({ returning: updReturning });
      const updSet = vi.fn().mockReturnValue({ where: updWhere });
      mockUpdate.mockReturnValue({ set: updSet });

      const result = await service.update(
        'tpl-tenant',
        { name: 'Updated Pipeline' },
        'tenant-1'
      );

      expect(result.name).toBe('Updated Pipeline');
    });

    it('blocks modification of system templates', async () => {
      setupSelectSingleChain([SYSTEM_TEMPLATE_ROW]);

      await expect(
        service.update('tpl-system', { name: 'Hacked' }, 'tenant-1')
      ).rejects.toThrow('Cannot modify system templates');
    });

    it('throws NotFoundException when template not found', async () => {
      setupSelectSingleChain([]);

      await expect(
        service.update('nonexistent', { name: 'Test' }, 'tenant-1')
      ).rejects.toThrow('not found');
    });

    it('validates update input via Zod', async () => {
      setupSelectSingleChain([TENANT_TEMPLATE_ROW]);

      await expect(
        service.update(
          'tpl-tenant',
          { name: '' }, // empty name is invalid
          'tenant-1'
        )
      ).rejects.toThrow();
    });
  });

  describe('delete()', () => {
    it('deletes a tenant template successfully', async () => {
      // findById (select chain) must remain intact for the internal call
      const findByIdLimit = vi.fn().mockResolvedValue([TENANT_TEMPLATE_ROW]);
      const findByIdWhere = vi.fn().mockReturnValue({ limit: findByIdLimit });
      const findByIdFrom = vi.fn().mockReturnValue({ where: findByIdWhere });
      mockSelect.mockReturnValue({ from: findByIdFrom });

      // delete chain
      const delReturning = vi.fn().mockResolvedValue([TENANT_TEMPLATE_ROW]);
      const delWhere = vi.fn().mockReturnValue({ returning: delReturning });
      mockDelete.mockReturnValue({ where: delWhere });

      const result = await service.delete('tpl-tenant', 'tenant-1');

      expect(result).toBe(true);
    });

    it('blocks deletion of system templates', async () => {
      setupSelectSingleChain([SYSTEM_TEMPLATE_ROW]);

      await expect(
        service.delete('tpl-system', 'tenant-1')
      ).rejects.toThrow('Cannot delete system templates');
    });

    it('throws NotFoundException when template not found', async () => {
      setupSelectSingleChain([]);

      await expect(
        service.delete('nonexistent', 'tenant-1')
      ).rejects.toThrow('not found');
    });

    it('throws NotFoundException when delete returns empty', async () => {
      const findByIdLimit = vi.fn().mockResolvedValue([TENANT_TEMPLATE_ROW]);
      const findByIdWhere = vi.fn().mockReturnValue({ limit: findByIdLimit });
      const findByIdFrom = vi.fn().mockReturnValue({ where: findByIdWhere });
      mockSelect.mockReturnValue({ from: findByIdFrom });

      const delReturning = vi.fn().mockResolvedValue([]);
      const delWhere = vi.fn().mockReturnValue({ returning: delReturning });
      mockDelete.mockReturnValue({ where: delWhere });

      await expect(
        service.delete('tpl-tenant', 'tenant-1')
      ).rejects.toThrow('not found');
    });
  });
});
