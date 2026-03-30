import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ─── DB mock ──────────────────────────────────────────────────────────────────
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();

const chainMock = {
  select: mockSelect,
  from: mockFrom,
  where: mockWhere,
  orderBy: mockOrderBy,
  limit: mockLimit,
  offset: mockOffset,
};

// Chain all query builder methods
mockSelect.mockReturnValue(chainMock);
mockFrom.mockReturnValue(chainMock);
mockWhere.mockReturnValue(chainMock);
mockOrderBy.mockReturnValue(chainMock);
mockLimit.mockReturnValue(chainMock);
mockOffset.mockReturnValue([]);

const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn(chainMock)
);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: {
    annotations: {
      deleted_at: 'deleted_at',
      asset_id: 'asset_id',
      user_id: 'user_id',
      created_at: 'created_at',
      layer: 'layer',
    },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ op: 'and', args })),
  desc: vi.fn((col: unknown) => ({ op: 'desc', col })),
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    _tag: 'sql',
    strings: [...strings],
    values,
  }),
}));

// ─── annotation-access mock ──────────────────────────────────────────────────
const mockBuildLayerVisibility = vi.fn(() => []);
vi.mock('./annotation-access', () => ({
  buildLayerVisibilityConditions: (...args: unknown[]) =>
    mockBuildLayerVisibility(...args),
}));

import { AnnotationQueriesService } from './annotation-queries.service';
import type { AuthContext } from '@edusphere/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeAuth(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: 'user-1',
    tenantId: 'tenant-1',
    roles: ['STUDENT'],
    scopes: [],
    ...overrides,
  } as AuthContext;
}

describe('AnnotationQueriesService', () => {
  let service: AnnotationQueriesService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainMock);
    mockFrom.mockReturnValue(chainMock);
    mockWhere.mockReturnValue(chainMock);
    mockOrderBy.mockReturnValue(chainMock);
    mockLimit.mockReturnValue(chainMock);
    mockOffset.mockReturnValue([]);
    service = new AnnotationQueriesService();
  });

  describe('findAll', () => {
    it('throws UnauthorizedException without authContext', async () => {
      await expect(
        service.findAll({ limit: 10, offset: 0 }, undefined)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException without tenantId', async () => {
      const auth = makeAuth({ tenantId: '' });
      await expect(
        service.findAll({ limit: 10, offset: 0 }, auth)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('calls withTenantContext with correct tenant context', async () => {
      const auth = makeAuth();
      await service.findAll({ limit: 10, offset: 0 }, auth);
      expect(mockWithTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        { tenantId: 'tenant-1', userId: 'user-1', userRole: 'STUDENT' },
        expect.any(Function)
      );
    });

    it('applies assetId filter when provided', async () => {
      const auth = makeAuth();
      await service.findAll({ assetId: 'a1', limit: 10, offset: 0 }, auth);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalled();
    });

    it('applies userId filter when provided', async () => {
      const auth = makeAuth();
      await service.findAll({ userId: 'u1', limit: 10, offset: 0 }, auth);
      expect(mockSelect).toHaveBeenCalled();
    });

    it('calls buildLayerVisibilityConditions', async () => {
      const auth = makeAuth();
      await service.findAll({ layer: 'SHARED', limit: 10, offset: 0 }, auth);
      expect(mockBuildLayerVisibility).toHaveBeenCalledWith(
        expect.anything(),
        auth,
        'SHARED'
      );
    });

    it('applies limit and offset', async () => {
      const auth = makeAuth();
      await service.findAll({ limit: 25, offset: 50 }, auth);
      expect(mockLimit).toHaveBeenCalledWith(25);
      expect(mockOffset).toHaveBeenCalledWith(50);
    });
  });

  describe('findByAsset', () => {
    it('throws UnauthorizedException without authContext', async () => {
      await expect(service.findByAsset('a1', undefined, undefined)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('throws when tenantId is missing', async () => {
      const auth = makeAuth({ tenantId: '' });
      await expect(service.findByAsset('a1', undefined, auth)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('queries with assetId condition', async () => {
      const auth = makeAuth();
      await service.findByAsset('asset-99', undefined, auth);
      expect(mockWithTenantContext).toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalled();
    });

    it('passes layer to buildLayerVisibilityConditions', async () => {
      const auth = makeAuth();
      await service.findByAsset('a1', 'PERSONAL', auth);
      expect(mockBuildLayerVisibility).toHaveBeenCalledWith(
        expect.anything(),
        auth,
        'PERSONAL'
      );
    });
  });

  describe('findByUser', () => {
    it('throws UnauthorizedException without authContext', async () => {
      await expect(
        service.findByUser('u1', 10, 0, undefined)
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when tenantId is missing', async () => {
      const auth = makeAuth({ tenantId: '' });
      await expect(service.findByUser('u1', 10, 0, auth)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('applies userId condition', async () => {
      const auth = makeAuth();
      await service.findByUser('user-42', 10, 0, auth);
      expect(mockWithTenantContext).toHaveBeenCalled();
      expect(mockSelect).toHaveBeenCalled();
    });

    it('applies limit and offset', async () => {
      const auth = makeAuth();
      await service.findByUser('u1', 15, 30, auth);
      expect(mockLimit).toHaveBeenCalledWith(15);
      expect(mockOffset).toHaveBeenCalledWith(30);
    });
  });

  describe('toTenantContext (via findAll)', () => {
    it('maps first role to userRole', async () => {
      const auth = makeAuth({ roles: ['INSTRUCTOR', 'STUDENT'] });
      await service.findAll({ limit: 10, offset: 0 }, auth);
      expect(mockWithTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userRole: 'INSTRUCTOR' }),
        expect.any(Function)
      );
    });

    it('defaults userRole to STUDENT when roles empty', async () => {
      const auth = makeAuth({ roles: [] });
      await service.findAll({ limit: 10, offset: 0 }, auth);
      expect(mockWithTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userRole: 'STUDENT' }),
        expect.any(Function)
      );
    });
  });
});
