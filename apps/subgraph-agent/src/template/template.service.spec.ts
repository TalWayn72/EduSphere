import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemplateService } from './template.service';

// ── DB mock helpers ──────────────────────────────────────────────────────────
const mockReturning = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockOrderBy = vi.fn();
const mockSet = vi.fn();
const mockValues = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    agent_definitions: {
      id: 'id',
      template: 'template',
      is_active: 'is_active',
      deleted_at: 'deleted_at',
      created_at: 'created_at',
      tenant_id: 'tenant_id',
      creator_id: 'creator_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  desc: vi.fn((col) => ({ col, dir: 'desc' })),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────
const MOCK_TEMPLATE = {
  id: 'tmpl-1',
  tenant_id: 'tenant-1',
  creator_id: 'user-1',
  name: 'Quiz Agent',
  template: 'QUIZ_ASSESS',
  config: { temperature: 0.5 },
  is_active: true,
  deleted_at: null,
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
};

describe('TemplateService', () => {
  let service: TemplateService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default chain for select queries
    mockLimit.mockResolvedValue([MOCK_TEMPLATE]);
    mockOffset.mockResolvedValue([MOCK_TEMPLATE]);
    mockWhere.mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockSelect.mockReturnValue({ from: mockFrom });

    // Default chain for insert/update
    mockReturning.mockResolvedValue([MOCK_TEMPLATE]);
    mockWhere.mockReturnValue({
      limit: mockLimit,
      orderBy: mockOrderBy,
      returning: mockReturning,
    });
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    service = new TemplateService();
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById()', () => {
    it('returns template when found', async () => {
      mockLimit.mockResolvedValue([MOCK_TEMPLATE]);
      const result = await service.findById('tmpl-1');
      expect(result).toEqual(MOCK_TEMPLATE);
    });

    it('returns null when no template matches the id', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });

    it('queries agent_definitions table', async () => {
      mockLimit.mockResolvedValue([MOCK_TEMPLATE]);
      await service.findById('tmpl-1');
      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalled();
    });
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns array of templates with limit and offset', async () => {
      mockOffset.mockResolvedValue([MOCK_TEMPLATE]);
      mockOrderBy.mockReturnValue({
        limit: vi.fn().mockReturnValue({ offset: mockOffset }),
      });
      const result = await service.findAll(10, 0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('applies limit correctly', async () => {
      const limitFn = vi.fn().mockReturnValue({ offset: mockOffset });
      mockOrderBy.mockReturnValue({ limit: limitFn });
      await service.findAll(5, 0);
      expect(limitFn).toHaveBeenCalledWith(5);
    });

    it('applies offset correctly', async () => {
      mockOffset.mockResolvedValue([]);
      const limitFn = vi.fn().mockReturnValue({ offset: mockOffset });
      mockOrderBy.mockReturnValue({ limit: limitFn });
      await service.findAll(10, 20);
      expect(mockOffset).toHaveBeenCalledWith(20);
    });

    it('orders by created_at descending', async () => {
      mockOffset.mockResolvedValue([]);
      const limitFn = vi.fn().mockReturnValue({ offset: mockOffset });
      mockOrderBy.mockReturnValue({ limit: limitFn });
      await service.findAll(10, 0);
      expect(mockOrderBy).toHaveBeenCalled();
    });
  });

  // ── findByType ────────────────────────────────────────────────────────────

  describe('findByType()', () => {
    it('returns templates matching the given type', async () => {
      mockOrderBy.mockResolvedValue([MOCK_TEMPLATE]);
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      const result = await service.findByType('QUIZ_ASSESS');
      expect(Array.isArray(result)).toBe(true);
    });

    it('filters by the template field', async () => {
      mockOrderBy.mockResolvedValue([]);
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      await service.findByType('CHAVRUTA_DEBATE');
      expect(mockWhere).toHaveBeenCalled();
    });

    it('returns empty array when no templates of that type', async () => {
      mockOrderBy.mockResolvedValue([]);
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      const result = await service.findByType('CUSTOM');
      expect(result).toEqual([]);
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a template and returns it', async () => {
      mockReturning.mockResolvedValue([MOCK_TEMPLATE]);
      const input = {
        tenantId: 'tenant-1',
        creatorId: 'user-1',
        name: 'Quiz Agent',
        template: 'QUIZ_ASSESS',
        config: { temperature: 0.5 },
      };
      const result = await service.create(input);
      expect(result).toEqual(MOCK_TEMPLATE);
    });

    it('maps tenantId to tenant_id in insert values', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedValues: any;
      mockValues.mockImplementation((v) => {
        capturedValues = v;
        return { returning: mockReturning };
      });
      mockReturning.mockResolvedValue([MOCK_TEMPLATE]);

      await service.create({
        tenantId: 'tenant-99',
        creatorId: 'u',
        name: 'T',
        template: 'TUTOR',
      });
      expect(capturedValues.tenant_id).toBe('tenant-99');
    });

    it('sets is_active to true by default on creation', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedValues: any;
      mockValues.mockImplementation((v) => {
        capturedValues = v;
        return { returning: mockReturning };
      });
      mockReturning.mockResolvedValue([MOCK_TEMPLATE]);

      await service.create({
        tenantId: 't',
        creatorId: 'u',
        name: 'T',
        template: 'TUTOR',
      });
      expect(capturedValues.is_active).toBe(true);
    });

    it('defaults config to empty object when not provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedValues: any;
      mockValues.mockImplementation((v) => {
        capturedValues = v;
        return { returning: mockReturning };
      });
      mockReturning.mockResolvedValue([MOCK_TEMPLATE]);

      await service.create({
        tenantId: 't',
        creatorId: 'u',
        name: 'T',
        template: 'TUTOR',
      });
      expect(capturedValues.config).toEqual({});
    });

    it('uses provided config when supplied', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedValues: any;
      mockValues.mockImplementation((v) => {
        capturedValues = v;
        return { returning: mockReturning };
      });
      mockReturning.mockResolvedValue([MOCK_TEMPLATE]);

      const config = { temperature: 0.9, maxTokens: 500 };
      await service.create({
        tenantId: 't',
        creatorId: 'u',
        name: 'T',
        template: 'TUTOR',
        config,
      });
      expect(capturedValues.config).toEqual(config);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('returns updated template', async () => {
      const updated = { ...MOCK_TEMPLATE, name: 'New Name' };
      mockReturning.mockResolvedValue([updated]);
      const result = await service.update('tmpl-1', { name: 'New Name' });
      expect(result).toEqual(updated);
    });

    it('includes updated_at timestamp in the update set', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedSet: any;
      mockSet.mockImplementation((data) => {
        capturedSet = data;
        return { where: vi.fn().mockReturnValue({ returning: mockReturning }) };
      });
      mockUpdate.mockReturnValue({ set: mockSet });
      mockReturning.mockResolvedValue([MOCK_TEMPLATE]);

      await service.update('tmpl-1', {});
      expect(capturedSet.updated_at).toBeInstanceOf(Date);
    });

    it('updates name when provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedSet: any;
      mockSet.mockImplementation((data) => {
        capturedSet = data;
        return { where: vi.fn().mockReturnValue({ returning: mockReturning }) };
      });
      mockUpdate.mockReturnValue({ set: mockSet });
      mockReturning.mockResolvedValue([MOCK_TEMPLATE]);

      await service.update('tmpl-1', { name: 'Updated Name' });
      expect(capturedSet.name).toBe('Updated Name');
    });

    it('updates isActive when provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedSet: any;
      mockSet.mockImplementation((data) => {
        capturedSet = data;
        return { where: vi.fn().mockReturnValue({ returning: mockReturning }) };
      });
      mockUpdate.mockReturnValue({ set: mockSet });
      mockReturning.mockResolvedValue([MOCK_TEMPLATE]);

      await service.update('tmpl-1', { isActive: false });
      expect(capturedSet.is_active).toBe(false);
    });

    it('does not set name when name is undefined in input', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedSet: any;
      mockSet.mockImplementation((data) => {
        capturedSet = data;
        return { where: vi.fn().mockReturnValue({ returning: mockReturning }) };
      });
      mockUpdate.mockReturnValue({ set: mockSet });
      mockReturning.mockResolvedValue([MOCK_TEMPLATE]);

      await service.update('tmpl-1', {});
      expect(capturedSet.name).toBeUndefined();
    });
  });

  // ── delete (soft delete) ──────────────────────────────────────────────────

  describe('delete()', () => {
    it('sets deleted_at to soft-delete the template', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedSet: any;
      mockSet.mockImplementation((data) => {
        capturedSet = data;
        return { where: vi.fn().mockResolvedValue([]) };
      });
      mockUpdate.mockReturnValue({ set: mockSet });

      await service.delete('tmpl-1');
      expect(capturedSet.deleted_at).toBeInstanceOf(Date);
    });

    it('returns true after successful soft-delete', async () => {
      mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
      mockUpdate.mockReturnValue({ set: mockSet });
      const result = await service.delete('tmpl-1');
      expect(result).toBe(true);
    });

    it('does not perform a hard delete from the table', async () => {
      const mockDelete = vi.fn();
      mockUpdate.mockReturnValue({ set: mockSet });
      mockSet.mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

      await service.delete('tmpl-1');
      // update was called (soft delete), not delete
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  // ── activate ──────────────────────────────────────────────────────────────

  describe('activate()', () => {
    it('sets is_active to true', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedSet: any;
      mockSet.mockImplementation((data) => {
        capturedSet = data;
        return { where: vi.fn().mockReturnValue({ returning: mockReturning }) };
      });
      mockUpdate.mockReturnValue({ set: mockSet });
      mockReturning.mockResolvedValue([{ ...MOCK_TEMPLATE, is_active: true }]);

      await service.activate('tmpl-1');
      expect(capturedSet.is_active).toBe(true);
    });

    it('returns the activated template', async () => {
      const activated = { ...MOCK_TEMPLATE, is_active: true };
      mockReturning.mockResolvedValue([activated]);
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });
      const result = await service.activate('tmpl-1');
      expect(result).toEqual(activated);
    });
  });

  // ── deactivate ────────────────────────────────────────────────────────────

  describe('deactivate()', () => {
    it('sets is_active to false', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let capturedSet: any;
      mockSet.mockImplementation((data) => {
        capturedSet = data;
        return { where: vi.fn().mockReturnValue({ returning: mockReturning }) };
      });
      mockUpdate.mockReturnValue({ set: mockSet });
      mockReturning.mockResolvedValue([{ ...MOCK_TEMPLATE, is_active: false }]);

      await service.deactivate('tmpl-1');
      expect(capturedSet.is_active).toBe(false);
    });

    it('returns the deactivated template', async () => {
      const deactivated = { ...MOCK_TEMPLATE, is_active: false };
      mockReturning.mockResolvedValue([deactivated]);
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });
      const result = await service.deactivate('tmpl-1');
      expect(result).toEqual(deactivated);
    });
  });
});
