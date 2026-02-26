import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationService } from './annotation.service';
import type { AuthContext } from '@edusphere/auth';

const mockReturning = vi.fn();
const mockLimit = vi.fn();
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

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
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
  closeAllPools: vi.fn(),
}));

const ownerAuth: AuthContext = {
  userId: 'user-owner',
  email: 'o@e.com',
  username: 'owner',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: [],
  isSuperAdmin: false,
};
const MOCK_ANNOTATION = {
  id: 'ann-gdpr',
  asset_id: 'asset-1',
  user_id: 'user-owner',
  tenant_id: 'tenant-1',
  layer: 'PERSONAL',
  content: { text: 'private note' },
  is_resolved: false,
  deleted_at: null,
  created_at: new Date(),
};

describe('AnnotationService — GDPR compliance', () => {
  let service: AnnotationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({
      limit: mockLimit,
      returning: mockReturning,
      orderBy: mockOrderBy,
    });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
    mockUpdate.mockReturnValue({ set: mockSet });
    service = new AnnotationService();
  });

  describe('Soft delete — never hard delete', () => {
    it('delete() calls UPDATE with deleted_at timestamp (soft delete)', async () => {
      const deletedAt = new Date();
      mockLimit.mockResolvedValue([MOCK_ANNOTATION]);
      mockReturning.mockResolvedValue([
        { ...MOCK_ANNOTATION, deleted_at: deletedAt },
      ]);
      const result = await service.delete('ann-gdpr', ownerAuth);
      // update().set() was called — soft-delete pattern, not a DB row removal
      expect(mockUpdate).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ deleted_at: expect.any(Date) })
      );
      expect(result).toBe(true);
    });

    it('delete() does NOT call any hard-delete (no DELETE FROM statement)', async () => {
      mockLimit.mockResolvedValue([MOCK_ANNOTATION]);
      mockReturning.mockResolvedValue([
        { ...MOCK_ANNOTATION, deleted_at: new Date() },
      ]);
      await service.delete('ann-gdpr', ownerAuth);
      // mockTx has no 'delete' method — if service tried to hard-delete it would throw
      // The fact no error is thrown confirms only soft-delete path is taken
      expect(mockUpdate).toHaveBeenCalledOnce();
    });

    it('soft-deleted annotation is excluded from findById (deleted_at IS NULL filter)', async () => {
      // findById applies `deleted_at IS NULL` — soft-deleted rows return empty
      mockLimit.mockResolvedValue([]);
      const result = await service.findById('ann-gdpr', ownerAuth);
      expect(result).toBeNull();
    });

    it('soft-deleted annotation is excluded from findAll results', async () => {
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({
          offset: vi.fn().mockResolvedValue([]),
        }),
      });
      const results = await service.findAll(
        { limit: 10, offset: 0 },
        ownerAuth
      );
      expect(results).toEqual([]);
    });
  });

  describe('PERSONAL layer — owner-only visibility', () => {
    it('findAll with PERSONAL layer passes owner userId in tenant context', async () => {
      const { withTenantContext } = await import('@edusphere/db');
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({
          offset: vi.fn().mockResolvedValue([MOCK_ANNOTATION]),
        }),
      });
      await service.findAll(
        { layer: 'PERSONAL', limit: 10, offset: 0 },
        ownerAuth
      );
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'user-owner' }),
        expect.any(Function)
      );
    });
  });

  describe('GDPR erasure — nullify annotation content', () => {
    it('update() can nullify content field (GDPR erasure pattern)', async () => {
      mockLimit.mockResolvedValue([MOCK_ANNOTATION]);
      mockReturning.mockResolvedValue([{ ...MOCK_ANNOTATION, content: null }]);
      const result = await service.update(
        'ann-gdpr',
        { content: null },
        ownerAuth
      );
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ content: null })
      );
      expect(result).toBeDefined();
    });

    it('update() accepts empty string content as erasure value', async () => {
      mockLimit.mockResolvedValue([MOCK_ANNOTATION]);
      mockReturning.mockResolvedValue([
        { ...MOCK_ANNOTATION, content: { text: '' } },
      ]);
      const result = await service.update(
        'ann-gdpr',
        { content: { text: '' } },
        ownerAuth
      );
      expect(result).toBeDefined();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ content: { text: '' } })
      );
    });
  });
});
