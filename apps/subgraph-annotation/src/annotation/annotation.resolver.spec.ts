import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationResolver } from './annotation.resolver';
import { AnnotationService } from './annotation.service';
import type { AuthContext } from '@edusphere/auth';

const mockAnnotationService = {
  findById: vi.fn(),
  findAll: vi.fn(),
  findByAsset: vi.fn(),
  findByUser: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  resolve: vi.fn(),
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
  withTenantContext: vi.fn(async (_db, _ctx, cb) => cb({})),
}));

const MOCK_AUTH: AuthContext = {
  userId: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
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
};

const ctxWith = (auth: AuthContext | undefined) => ({
  req: {},
  authContext: auth,
});

describe('AnnotationResolver', () => {
  let resolver: AnnotationResolver;
  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new AnnotationResolver(mockAnnotationService as unknown as AnnotationService);
  });

  describe('health()', () => {
    it('returns ok string', () => {
      expect(resolver.health()).toBe('ok');
    });
  });

  describe('getAnnotation()', () => {
    it('delegates to service.findById with id and authContext', async () => {
      mockAnnotationService.findById.mockResolvedValue(MOCK_ANNOTATION);
      const result = await resolver.getAnnotation('ann-1', ctxWith(MOCK_AUTH));
      expect(mockAnnotationService.findById).toHaveBeenCalledOnce();
      expect(mockAnnotationService.findById).toHaveBeenCalledWith(
        'ann-1',
        MOCK_AUTH
      );
      expect(result).toEqual(MOCK_ANNOTATION);
    });
    it('passes undefined authContext when context has no authContext', async () => {
      mockAnnotationService.findById.mockResolvedValue(null);
      await resolver.getAnnotation('ann-1', { req: {} });
      expect(mockAnnotationService.findById).toHaveBeenCalledWith(
        'ann-1',
        undefined
      );
    });
  });

  describe('getAnnotations()', () => {
    it('delegates to service.findAll with filters object', async () => {
      mockAnnotationService.findAll.mockResolvedValue([MOCK_ANNOTATION]);
      const result = await resolver.getAnnotations(
        'asset-1',
        'user-1',
        'SHARED',
        10,
        5,
        ctxWith(MOCK_AUTH)
      );
      expect(mockAnnotationService.findAll).toHaveBeenCalledOnce();
      expect(mockAnnotationService.findAll).toHaveBeenCalledWith(
        {
          assetId: 'asset-1',
          userId: 'user-1',
          layer: 'SHARED',
          limit: 10,
          offset: 5,
        },
        MOCK_AUTH
      );
      expect(result).toEqual([MOCK_ANNOTATION]);
    });
    it('delegates with undefined filters when not provided', async () => {
      mockAnnotationService.findAll.mockResolvedValue([]);
      await resolver.getAnnotations(
        undefined,
        undefined,
        undefined,
        20,
        0,
        ctxWith(MOCK_AUTH)
      );
      expect(mockAnnotationService.findAll).toHaveBeenCalledWith(
        {
          assetId: undefined,
          userId: undefined,
          layer: undefined,
          limit: 20,
          offset: 0,
        },
        MOCK_AUTH
      );
    });
    it('passes undefined authContext when not in context', async () => {
      mockAnnotationService.findAll.mockResolvedValue([]);
      await resolver.getAnnotations('a', undefined, undefined, 20, 0, {
        req: {},
      });
      expect(mockAnnotationService.findAll).toHaveBeenCalledWith(
        expect.any(Object),
        undefined
      );
    });
  });

  describe('getAnnotationsByAsset()', () => {
    it('delegates to service.findByAsset with assetId, layer, authContext', async () => {
      mockAnnotationService.findByAsset.mockResolvedValue([MOCK_ANNOTATION]);
      const result = await resolver.getAnnotationsByAsset(
        'asset-1',
        'INSTRUCTOR',
        ctxWith(MOCK_AUTH)
      );
      expect(mockAnnotationService.findByAsset).toHaveBeenCalledOnce();
      expect(mockAnnotationService.findByAsset).toHaveBeenCalledWith(
        'asset-1',
        'INSTRUCTOR',
        MOCK_AUTH
      );
      expect(result).toEqual([MOCK_ANNOTATION]);
    });
    it('passes undefined layer when not provided', async () => {
      mockAnnotationService.findByAsset.mockResolvedValue([]);
      await resolver.getAnnotationsByAsset(
        'asset-1',
        undefined,
        ctxWith(MOCK_AUTH)
      );
      expect(mockAnnotationService.findByAsset).toHaveBeenCalledWith(
        'asset-1',
        undefined,
        MOCK_AUTH
      );
    });
  });

  describe('getAnnotationsByUser()', () => {
    it('delegates to service.findByUser with userId, limit, offset, authContext', async () => {
      mockAnnotationService.findByUser.mockResolvedValue([MOCK_ANNOTATION]);
      const result = await resolver.getAnnotationsByUser(
        'user-1',
        15,
        5,
        ctxWith(MOCK_AUTH)
      );
      expect(mockAnnotationService.findByUser).toHaveBeenCalledOnce();
      expect(mockAnnotationService.findByUser).toHaveBeenCalledWith(
        'user-1',
        15,
        5,
        MOCK_AUTH
      );
      expect(result).toEqual([MOCK_ANNOTATION]);
    });
    it('uses default limit and offset values', async () => {
      mockAnnotationService.findByUser.mockResolvedValue([]);
      await resolver.getAnnotationsByUser('user-1', 20, 0, ctxWith(MOCK_AUTH));
      expect(mockAnnotationService.findByUser).toHaveBeenCalledWith(
        'user-1',
        20,
        0,
        MOCK_AUTH
      );
    });
  });

  describe('createAnnotation()', () => {
    const validInput = {
      assetId: '11111111-1111-4111-a111-111111111111',
      annotationType: 'TEXT',
      layer: 'PERSONAL',
      content: { text: 'New annotation' },
    };
    it('delegates to service.create after Zod validation', async () => {
      mockAnnotationService.create.mockResolvedValue(MOCK_ANNOTATION);
      const result = await resolver.createAnnotation(
        validInput,
        ctxWith(MOCK_AUTH)
      );
      expect(mockAnnotationService.create).toHaveBeenCalledOnce();
      expect(result).toEqual(MOCK_ANNOTATION);
    });
    it('passes validated input and authContext to service', async () => {
      mockAnnotationService.create.mockResolvedValue(MOCK_ANNOTATION);
      await resolver.createAnnotation(validInput, ctxWith(MOCK_AUTH));
      expect(mockAnnotationService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          assetId: validInput.assetId,
          annotationType: 'TEXT',
          layer: 'PERSONAL',
          content: { text: 'New annotation' },
        }),
        MOCK_AUTH
      );
    });
    it('throws Unauthenticated when no authContext', async () => {
      await expect(
        resolver.createAnnotation(validInput, { req: {} })
      ).rejects.toThrow('Unauthenticated');
      expect(mockAnnotationService.create).not.toHaveBeenCalled();
    });
  });

  describe('updateAnnotation()', () => {
    const updateInput = { content: { text: 'Updated' } };
    it('delegates to service.update after Zod validation', async () => {
      const updated = { ...MOCK_ANNOTATION, content: { text: 'Updated' } };
      mockAnnotationService.update.mockResolvedValue(updated);
      const result = await resolver.updateAnnotation(
        'ann-1',
        updateInput,
        ctxWith(MOCK_AUTH)
      );
      expect(mockAnnotationService.update).toHaveBeenCalledOnce();
      expect(mockAnnotationService.update).toHaveBeenCalledWith(
        'ann-1',
        expect.objectContaining({ content: { text: 'Updated' } }),
        MOCK_AUTH
      );
      expect(result).toEqual(updated);
    });
    it('throws Unauthenticated when no authContext', async () => {
      await expect(
        resolver.updateAnnotation('ann-1', updateInput, { req: {} })
      ).rejects.toThrow('Unauthenticated');
      expect(mockAnnotationService.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteAnnotation()', () => {
    it('delegates to service.delete with id and authContext', async () => {
      mockAnnotationService.delete.mockResolvedValue(true);
      const result = await resolver.deleteAnnotation(
        'ann-1',
        ctxWith(MOCK_AUTH)
      );
      expect(mockAnnotationService.delete).toHaveBeenCalledOnce();
      expect(mockAnnotationService.delete).toHaveBeenCalledWith(
        'ann-1',
        MOCK_AUTH
      );
      expect(result).toBe(true);
    });
    it('throws Unauthenticated when no authContext', async () => {
      await expect(
        resolver.deleteAnnotation('ann-1', { req: {} })
      ).rejects.toThrow('Unauthenticated');
      expect(mockAnnotationService.delete).not.toHaveBeenCalled();
    });
  });

  describe('resolveAnnotation()', () => {
    it('delegates to service.resolve with id and authContext', async () => {
      const resolved = { ...MOCK_ANNOTATION, is_resolved: true };
      mockAnnotationService.resolve.mockResolvedValue(resolved);
      const result = await resolver.resolveAnnotation(
        'ann-1',
        ctxWith(MOCK_AUTH)
      );
      expect(mockAnnotationService.resolve).toHaveBeenCalledOnce();
      expect(mockAnnotationService.resolve).toHaveBeenCalledWith(
        'ann-1',
        MOCK_AUTH
      );
      expect(result).toEqual(resolved);
    });
    it('throws Unauthenticated when no authContext', async () => {
      await expect(
        resolver.resolveAnnotation('ann-1', { req: {} })
      ).rejects.toThrow('Unauthenticated');
      expect(mockAnnotationService.resolve).not.toHaveBeenCalled();
    });
  });

  describe('resolveReference()', () => {
    it('delegates to service.findById with reference.id and authContext', async () => {
      mockAnnotationService.findById.mockResolvedValue(MOCK_ANNOTATION);
      const ref = { __typename: 'Annotation', id: 'ann-1' };
      const result = await resolver.resolveReference(ref, ctxWith(MOCK_AUTH));
      expect(mockAnnotationService.findById).toHaveBeenCalledWith(
        'ann-1',
        MOCK_AUTH
      );
      expect(result).toEqual(MOCK_ANNOTATION);
    });
  });
});
