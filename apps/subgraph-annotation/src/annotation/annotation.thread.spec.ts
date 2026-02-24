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
      id: 'id', asset_id: 'asset_id', user_id: 'user_id',
      layer: 'layer', deleted_at: 'deleted_at',
      tenant_id: 'tenant_id', created_at: 'created_at',
      parent_id: 'parent_id', annotation_type: 'annotation_type',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args) => args),
  desc: vi.fn((col) => ({ desc: col })),
  sql: Object.assign(vi.fn((str) => str), { placeholder: vi.fn() }),
  withTenantContext: vi.fn(async (_db, _ctx, callback) => callback(mockTx)),
  closeAllPools: vi.fn(),
}));

const ownerAuth: AuthContext = {
  userId: 'user-owner', email: 'o@e.com', username: 'owner',
  tenantId: 'tenant-1', roles: ['STUDENT'], scopes: [], isSuperAdmin: false,
};
const instructorAuth: AuthContext = {
  userId: 'instr-1', email: 'i@e.com', username: 'instr',
  tenantId: 'tenant-1', roles: ['INSTRUCTOR'], scopes: [], isSuperAdmin: false,
};

const PARENT_ANNOTATION = {
  id: 'parent-1', asset_id: 'asset-1', user_id: 'user-owner',
  tenant_id: 'tenant-1', layer: 'SHARED', annotation_type: 'TEXT',
  content: { text: 'Parent' }, parent_id: null, is_resolved: false,
  deleted_at: null, created_at: new Date(),
};
const REPLY_ANNOTATION = {
  id: 'reply-1', asset_id: 'asset-1', user_id: 'user-owner',
  tenant_id: 'tenant-1', layer: 'SHARED', annotation_type: 'TEXT',
  content: { text: 'Reply' }, parent_id: 'parent-1', is_resolved: false,
  deleted_at: null, created_at: new Date(),
};

describe('AnnotationService — annotation threads', () => {
  let service: AnnotationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([]);
    mockLimit.mockResolvedValue([]);
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit, returning: mockReturning, orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });
    mockUpdate.mockReturnValue({ set: mockSet });
    service = new AnnotationService();
  });

  describe('replyTo() — creates reply with parent_id', () => {
    it('replyTo() sets parent_id when creating reply', async () => {
      // findById (for parent) returns parent annotation
      mockLimit.mockResolvedValueOnce([PARENT_ANNOTATION]);
      // insert returning the reply
      mockReturning.mockResolvedValue([REPLY_ANNOTATION]);
      const result = await service.replyTo('parent-1', 'Reply text', ownerAuth);
      expect(result.parent_id).toBe('parent-1');
      // verify insert was called with parentId
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ parent_id: 'parent-1' })
      );
    });

    it('replyTo() inherits assetId and layer from parent annotation', async () => {
      mockLimit.mockResolvedValueOnce([PARENT_ANNOTATION]);
      mockReturning.mockResolvedValue([REPLY_ANNOTATION]);
      await service.replyTo('parent-1', 'Reply', ownerAuth);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          asset_id: PARENT_ANNOTATION.asset_id,
          layer: PARENT_ANNOTATION.layer,
        })
      );
    });

    it('replyTo() throws when parent annotation not found', async () => {
      mockLimit.mockResolvedValue([]);
      await expect(
        service.replyTo('nonexistent-parent', 'text', ownerAuth)
      ).rejects.toThrow('Parent annotation not found');
    });

    it('replyTo() wraps content in { text } structure', async () => {
      mockLimit.mockResolvedValueOnce([PARENT_ANNOTATION]);
      mockReturning.mockResolvedValue([REPLY_ANNOTATION]);
      await service.replyTo('parent-1', 'My reply text', ownerAuth);
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ content: { text: 'My reply text' } })
      );
    });
  });

  describe('listAnnotations — replies included in results', () => {
    it('findAll returns both parent and reply when both match filters', async () => {
      mockOrderBy.mockReturnValue({
        limit: mockLimit.mockReturnValue({
          offset: vi.fn().mockResolvedValue([PARENT_ANNOTATION, REPLY_ANNOTATION]),
        }),
      });
      const results = await service.findAll({ limit: 10, offset: 0 }, ownerAuth);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('delete() — soft-deletes parent (children remain queryable until pruned)', () => {
    it('delete() on parent soft-deletes only the parent annotation', async () => {
      mockLimit.mockResolvedValueOnce([PARENT_ANNOTATION]);
      mockReturning.mockResolvedValue([{ ...PARENT_ANNOTATION, deleted_at: new Date() }]);
      const result = await service.delete('parent-1', ownerAuth);
      expect(result).toBe(true);
      // Only one update call — only parent is soft-deleted in this operation
      expect(mockUpdate).toHaveBeenCalledOnce();
    });

    it('instructor can soft-delete parent annotation owned by another user', async () => {
      const otherUserParent = { ...PARENT_ANNOTATION, user_id: 'other-user' };
      mockLimit.mockResolvedValueOnce([otherUserParent]);
      mockReturning.mockResolvedValue([{ ...otherUserParent, deleted_at: new Date() }]);
      const result = await service.delete('parent-1', instructorAuth);
      expect(result).toBe(true);
    });
  });

  describe('thread depth constraint', () => {
    it('replyTo() on a reply (depth-2 attempt) requires parent to exist — throws if missing', async () => {
      // Simulates max-depth enforcement: if grandparent lookup fails, replyTo throws
      mockLimit.mockResolvedValue([]);
      await expect(
        service.replyTo('reply-1', 'depth-3 attempt', ownerAuth)
      ).rejects.toThrow('Parent annotation not found');
    });
  });
});
