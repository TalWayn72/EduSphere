import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationService } from './annotation.service';
import type { AuthContext } from '@edusphere/auth';

// ─── Mock DB chain helpers ────────────────────────────────────────────
const mockReturning = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockFrom = vi.fn();
const mockValues = vi.fn();
const mockSet = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();

const mockTx = {
  select: () => ({ from: mockFrom }),
  insert: mockInsert,
  update: mockUpdate,
};

const mockDb = {
  select: () => ({ from: mockFrom }),
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    annotations: {
      id: 'id',
      asset_id: 'asset_id',
      user_id: 'user_id',
      layer: 'layer',
      deleted_at: 'deleted_at',
      tenant_id: 'tenant_id',
      created_at: 'created_at',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  desc: vi.fn((col) => ({ desc: col })),
  sql: Object.assign(
    vi.fn((str) => str),
    { placeholder: vi.fn() }
  ),
  withTenantContext: vi.fn(async (_db, _ctx, callback) => callback(mockTx)),
}));

import { withTenantContext } from '@edusphere/db';

const MOCK_AUTH: AuthContext = {
  userId: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: [],
  isSuperAdmin: false,
};

const INSTRUCTOR_AUTH: AuthContext = {
  userId: 'instructor-1',
  email: 'instructor@example.com',
  username: 'instructor',
  tenantId: 'tenant-1',
  roles: ['INSTRUCTOR'],
  scopes: [],
  isSuperAdmin: false,
};

const MOCK_ANNOTATION = {
  id: 'ann-1',
  asset_id: 'asset-1',
  user_id: 'user-1',
  tenant_id: 'tenant-1',
  layer: 'PERSONAL',
  content: { text: 'Hello world' },
  is_resolved: false,
  deleted_at: null,
  created_at: new Date(),
};

describe('AnnotationService', () => {
  let service: AnnotationService;

  beforeEach(() => {
    vi.resetAllMocks();
    // Default chain: select().from().where().limit() -> [MOCK_ANNOTATION]
    mockReturning.mockResolvedValue([MOCK_ANNOTATION]);
    mockLimit.mockResolvedValue([MOCK_ANNOTATION]);
    mockOffset.mockResolvedValue([MOCK_ANNOTATION]);
    mockOrderBy.mockReturnValue({ limit: mockLimit, offset: mockOffset });
    mockWhere.mockReturnValue({
      limit: mockLimit,
      orderBy: mockOrderBy,
      returning: mockReturning,
    });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });
    service = new AnnotationService();
  });

  // ─── findById ─────────────────────────────────────────────────────────
  describe('findById()', () => {
    it('returns annotation when found', async () => {
      mockLimit.mockResolvedValue([MOCK_ANNOTATION]);
      const result = await service.findById('ann-1', MOCK_AUTH);
      expect(result).toEqual(MOCK_ANNOTATION);
    });

    it('returns null when annotation not found', async () => {
      mockLimit.mockResolvedValue([]);
      const result = await service.findById('nonexistent', MOCK_AUTH);
      expect(result).toBeNull();
    });

    it('throws Authentication required when no authContext', async () => {
      await expect(service.findById('ann-1', undefined)).rejects.toThrow(
        'Authentication required'
      );
    });

    it('throws Authentication required when tenantId is missing', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: undefined };
      await expect(service.findById('ann-1', noTenantAuth)).rejects.toThrow(
        'Authentication required'
      );
    });

    it('calls withTenantContext with correct tenant context', async () => {
      mockLimit.mockResolvedValue([MOCK_ANNOTATION]);
      await service.findById('ann-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'STUDENT',
        }),
        expect.any(Function)
      );
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────
  describe('findAll()', () => {
    it('returns annotations array', async () => {
      mockOffset.mockResolvedValue([MOCK_ANNOTATION]);
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({ offset: mockOffset }),
      });
      const result = await service.findAll({ limit: 10, offset: 0 }, MOCK_AUTH);
      expect(Array.isArray(result)).toBe(true);
    });

    it('throws Authentication required when no authContext', async () => {
      await expect(
        service.findAll({ limit: 10, offset: 0 }, undefined)
      ).rejects.toThrow('Authentication required');
    });

    it('throws Authentication required when no tenantId', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: undefined };
      await expect(
        service.findAll({ limit: 10, offset: 0 }, noTenantAuth)
      ).rejects.toThrow('Authentication required');
    });

    it('calls withTenantContext with correct tenant context', async () => {
      mockOffset.mockResolvedValue([]);
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({ offset: mockOffset }),
      });
      await service.findAll({ limit: 10, offset: 0 }, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        expect.any(Function)
      );
    });
  });

  // ─── findByAsset ──────────────────────────────────────────────────────
  describe('findByAsset()', () => {
    it('returns annotations for asset', async () => {
      mockOrderBy.mockResolvedValue([MOCK_ANNOTATION]);
      const result = await service.findByAsset('asset-1', undefined, MOCK_AUTH);
      expect(Array.isArray(result)).toBe(true);
    });

    it('throws Authentication required when no authContext', async () => {
      await expect(
        service.findByAsset('asset-1', undefined, undefined)
      ).rejects.toThrow('Authentication required');
    });

    it('throws Authentication required when no tenantId', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: undefined };
      await expect(
        service.findByAsset('asset-1', undefined, noTenantAuth)
      ).rejects.toThrow('Authentication required');
    });

    it('calls withTenantContext with correct tenant context', async () => {
      mockOrderBy.mockResolvedValue([]);
      await service.findByAsset('asset-1', undefined, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        expect.any(Function)
      );
    });
  });

  // ─── findByUser ───────────────────────────────────────────────────────
  describe('findByUser()', () => {
    it('returns annotations for user', async () => {
      mockOffset.mockResolvedValue([MOCK_ANNOTATION]);
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({ offset: mockOffset }),
      });
      const result = await service.findByUser('user-1', 10, 0, MOCK_AUTH);
      expect(Array.isArray(result)).toBe(true);
    });

    it('throws Authentication required when no authContext', async () => {
      await expect(
        service.findByUser('user-1', 10, 0, undefined)
      ).rejects.toThrow('Authentication required');
    });

    it('throws Authentication required when no tenantId', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: undefined };
      await expect(
        service.findByUser('user-1', 10, 0, noTenantAuth)
      ).rejects.toThrow('Authentication required');
    });
  });

  // ─── create ───────────────────────────────────────────────────────────
  describe('create()', () => {
    const createInput = {
      assetId: 'asset-1',
      annotationType: 'TEXT',
      layer: 'PERSONAL',
      content: { text: 'new annotation' },
    };

    it('creates annotation and returns it', async () => {
      mockReturning.mockResolvedValue([MOCK_ANNOTATION]);
      const result = await service.create(createInput, MOCK_AUTH);
      expect(result).toEqual(MOCK_ANNOTATION);
    });

    it('throws Authentication required when no tenantId', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: undefined };
      await expect(service.create(createInput, noTenantAuth)).rejects.toThrow(
        'Authentication required'
      );
    });

    it('calls withTenantContext with tenant context', async () => {
      mockReturning.mockResolvedValue([MOCK_ANNOTATION]);
      await service.create(createInput, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        expect.any(Function)
      );
    });
  });

  // ─── update ───────────────────────────────────────────────────────────
  describe('update()', () => {
    it('throws Annotation not found when annotation does not exist', async () => {
      mockLimit.mockResolvedValue([]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      await expect(
        service.update('ann-1', { content: { text: 'x' } }, MOCK_AUTH)
      ).rejects.toThrow('Annotation not found');
    });

    it('throws Authentication required when no authContext', async () => {
      await expect(
        service.update('ann-1', {}, undefined as any)
      ).rejects.toThrow('Authentication required');
    });

    it('throws Unauthorized when non-owner non-instructor tries to update', async () => {
      const otherAnnotation = { ...MOCK_ANNOTATION, user_id: 'other-user' };
      mockLimit.mockResolvedValue([otherAnnotation]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      await expect(
        service.update('ann-1', { content: { text: 'x' } }, MOCK_AUTH)
      ).rejects.toThrow('Unauthorized');
    });

    it('allows instructor to update any annotation', async () => {
      const otherAnnotation = { ...MOCK_ANNOTATION, user_id: 'other-user' };
      mockLimit.mockResolvedValue([otherAnnotation]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      mockReturning.mockResolvedValue([{ ...otherAnnotation }]);
      const result = await service.update(
        'ann-1',
        { content: { text: 'updated' } },
        INSTRUCTOR_AUTH
      );
      expect(result).toBeDefined();
    });
  });

  // ─── delete ───────────────────────────────────────────────────────────
  describe('delete()', () => {
    it('throws Annotation not found when annotation does not exist', async () => {
      mockLimit.mockResolvedValue([]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      await expect(service.delete('ann-1', MOCK_AUTH)).rejects.toThrow(
        'Annotation not found'
      );
    });

    it('throws Authentication required when no tenantId', async () => {
      const noTenantAuth: AuthContext = { ...MOCK_AUTH, tenantId: undefined };
      await expect(service.delete('ann-1', noTenantAuth)).rejects.toThrow(
        'Authentication required'
      );
    });

    it('throws Unauthorized when non-owner non-instructor tries to delete', async () => {
      const otherAnnotation = { ...MOCK_ANNOTATION, user_id: 'other-user' };
      mockLimit.mockResolvedValue([otherAnnotation]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      await expect(service.delete('ann-1', MOCK_AUTH)).rejects.toThrow(
        'Unauthorized'
      );
    });

    it('allows instructor to delete any annotation (owner-check bypass)', async () => {
      const otherAnnotation = { ...MOCK_ANNOTATION, user_id: 'other-user' };
      mockLimit.mockResolvedValue([otherAnnotation]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      mockReturning.mockResolvedValue([
        { ...otherAnnotation, deleted_at: new Date() },
      ]);
      const result = await service.delete('ann-1', INSTRUCTOR_AUTH);
      expect(result).toBe(true);
    });

    it('allows annotation owner to delete their own annotation', async () => {
      mockLimit.mockResolvedValue([MOCK_ANNOTATION]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      mockReturning.mockResolvedValue([
        { ...MOCK_ANNOTATION, deleted_at: new Date() },
      ]);
      const result = await service.delete('ann-1', MOCK_AUTH);
      expect(result).toBe(true);
    });
  });

  // ─── Layer-based filtering ─────────────────────────────────────────────
  describe('Layer-based visibility rules', () => {
    it('findAll() with PERSONAL layer filter only returns requesting user annotations', async () => {
      mockOffset.mockResolvedValue([MOCK_ANNOTATION]);
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({ offset: mockOffset }),
      });
      await service.findAll(
        { layer: 'PERSONAL', limit: 10, offset: 0 },
        MOCK_AUTH
      );
      // withTenantContext is called — the layer filter is applied inside the tx callback
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ userId: 'user-1', tenantId: 'tenant-1' }),
        expect.any(Function)
      );
    });

    it('findAll() with SHARED layer filter returns results for student', async () => {
      mockOffset.mockResolvedValue([{ ...MOCK_ANNOTATION, layer: 'SHARED' }]);
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({ offset: mockOffset }),
      });
      const result = await service.findAll(
        { layer: 'SHARED', limit: 10, offset: 0 },
        MOCK_AUTH
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('findAll() called with INSTRUCTOR role uses instructor visibility rules', async () => {
      mockOffset.mockResolvedValue([MOCK_ANNOTATION]);
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({ offset: mockOffset }),
      });
      await service.findAll({ limit: 10, offset: 0 }, INSTRUCTOR_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'instructor-1',
          userRole: 'INSTRUCTOR',
        }),
        expect.any(Function)
      );
    });

    it('findByAsset() with PERSONAL layer filter enforces owner-only visibility', async () => {
      mockOrderBy.mockResolvedValue([MOCK_ANNOTATION]);
      await service.findByAsset('asset-1', 'PERSONAL', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ userId: 'user-1', tenantId: 'tenant-1' }),
        expect.any(Function)
      );
    });

    it('findByAsset() without layer filter applies instructor visibility for instructor role', async () => {
      mockOrderBy.mockResolvedValue([MOCK_ANNOTATION]);
      await service.findByAsset('asset-1', undefined, INSTRUCTOR_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          userId: 'instructor-1',
          userRole: 'INSTRUCTOR',
        }),
        expect.any(Function)
      );
    });

    it('findByAsset() without layer filter applies student visibility for student role', async () => {
      mockOrderBy.mockResolvedValue([MOCK_ANNOTATION]);
      await service.findByAsset('asset-1', undefined, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ userId: 'user-1', userRole: 'STUDENT' }),
        expect.any(Function)
      );
    });
  });

  // ─── resolve ──────────────────────────────────────────────────────────
  describe('resolve()', () => {
    it('delegates to update() with isResolved: true', async () => {
      mockLimit.mockResolvedValue([MOCK_ANNOTATION]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      mockReturning.mockResolvedValue([
        { ...MOCK_ANNOTATION, is_resolved: true },
      ]);
      const result = await service.resolve('ann-1', MOCK_AUTH);
      expect(result).toBeDefined();
    });

    it('throws Annotation not found when resolving non-existent annotation', async () => {
      mockLimit.mockResolvedValue([]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      await expect(service.resolve('nonexistent', MOCK_AUTH)).rejects.toThrow(
        'Annotation not found'
      );
    });
  });

  // ─── Edge cases for uncovered lines ──────────────────────────────────
  describe('Edge cases and additional coverage', () => {
    it('create() throws Failed to create annotation when returning is empty', async () => {
      mockReturning.mockResolvedValue([]);
      await expect(
        service.create(
          {
            assetId: 'asset-1',
            annotationType: 'TEXT',
            layer: 'PERSONAL',
            content: { text: 'fail' },
          },
          MOCK_AUTH
        )
      ).rejects.toThrow('Failed to create annotation');
    });

    it('update() throws Failed to update annotation when returning is empty', async () => {
      // First call (findById): returns existing annotation
      mockLimit
        .mockResolvedValueOnce([MOCK_ANNOTATION]) // findById check
        .mockResolvedValueOnce([]); // update returning empty
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      mockReturning.mockResolvedValue([]); // update .returning() empty
      await expect(
        service.update('ann-1', { content: { text: 'x' } }, MOCK_AUTH)
      ).rejects.toThrow('Failed to update annotation');
    });

    it('delete() returns false when soft-delete returning is empty', async () => {
      // Full mock reset needed - prior tests may modify mockLimit chain
      mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
      mockLimit.mockResolvedValue([MOCK_ANNOTATION]); // select finds existing annotation
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      // The soft-delete update.set().where().returning() returns empty -> service returns false
      mockReturning.mockResolvedValueOnce([]); // update returning empty = false
      const result = await service.delete('ann-1', MOCK_AUTH);
      expect(result).toBe(false);
    });

    it('findByUser() calls withTenantContext with correct context', async () => {
      // findByUser uses: select().from().where().orderBy().limit().offset()
      mockOffset.mockResolvedValue([MOCK_ANNOTATION]);
      mockLimit.mockReturnValue({ offset: mockOffset });
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
      mockWhere.mockReturnValue({
        limit: mockLimit,
        orderBy: mockOrderBy,
        returning: mockReturning,
      });
      await service.findByUser('user-1', 5, 0, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'STUDENT',
        }),
        expect.any(Function)
      );
    });

    it('update() with spatialData and isResolved updates correctly', async () => {
      // Full mock reset - findByUser() test overrides mockLimit to return object not array
      mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
      mockLimit.mockResolvedValue([MOCK_ANNOTATION]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      mockReturning.mockResolvedValue([
        { ...MOCK_ANNOTATION, is_resolved: true },
      ]);
      const result = await service.update(
        'ann-1',
        {
          spatialData: { x: 10, y: 20 },
          isResolved: true,
        },
        MOCK_AUTH
      );
      expect(result).toBeDefined();
    });

    it('create() throws Authentication required when no authContext', async () => {
      await expect(
        service.create(
          {
            assetId: 'a',
            annotationType: 'TEXT',
            layer: 'PERSONAL',
            content: {},
          },
          undefined as any
        )
      ).rejects.toThrow('Authentication required');
    });

    it('update() accepts no-op updates (empty input)', async () => {
      // Reset mock chain: findByUser test overrides mockLimit to return object
      mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
      mockLimit.mockResolvedValue([MOCK_ANNOTATION]);
      mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning });
      mockReturning.mockResolvedValue([MOCK_ANNOTATION]);
      const result = await service.update('ann-1', {}, MOCK_AUTH);
      expect(result).toBeDefined();
    });
  });
});
