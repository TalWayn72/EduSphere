import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnnotationService } from './annotation.service';
import type { AuthContext } from '@edusphere/auth';

const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();
const mockTx = { select: () => ({ from: mockFrom }) };

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

import { withTenantContext } from '@edusphere/db';

const studentAuth: AuthContext = {
  userId: 'student-1',
  email: 's@e.com',
  username: 'student',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: [],
  isSuperAdmin: false,
};
const instructorAuth: AuthContext = {
  userId: 'instr-1',
  email: 'i@e.com',
  username: 'instructor',
  tenantId: 'tenant-1',
  roles: ['INSTRUCTOR'],
  scopes: [],
  isSuperAdmin: false,
};
const anonAuth: AuthContext = {
  userId: 'anon-1',
  email: '',
  username: 'anon',
  tenantId: 'tenant-1',
  roles: [],
  scopes: [],
  isSuperAdmin: false,
};

const personalAnnotation = {
  id: 'p-1',
  layer: 'PERSONAL',
  user_id: 'student-1',
  deleted_at: null,
};
const instructorAnnotation = {
  id: 'i-1',
  layer: 'INSTRUCTOR',
  user_id: 'instr-1',
  deleted_at: null,
};
const publicAnnotation = {
  id: 'pub-1',
  layer: 'SHARED',
  user_id: 'instr-1',
  deleted_at: null,
};

describe('AnnotationService — layer visibility rules', () => {
  let service: AnnotationService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockOffset.mockResolvedValue([]);
    mockLimit.mockReturnValue({ offset: mockOffset });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    service = new AnnotationService();
  });

  describe('STUDENT visibility', () => {
    it('findAll with PERSONAL layer passes student userId for owner-only filter', async () => {
      mockOffset.mockResolvedValue([personalAnnotation]);
      await service.findAll(
        { layer: 'PERSONAL', limit: 10, offset: 0 },
        studentAuth
      );
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'student-1', userRole: 'STUDENT' }),
        expect.any(Function)
      );
    });

    it('findAll with SHARED layer returns results for student', async () => {
      mockOffset.mockResolvedValue([publicAnnotation]);
      const result = await service.findAll(
        { layer: 'SHARED', limit: 10, offset: 0 },
        studentAuth
      );
      expect(Array.isArray(result)).toBe(true);
    });

    it('findAll without layer filter uses student-role context', async () => {
      mockOffset.mockResolvedValue([publicAnnotation, personalAnnotation]);
      await service.findAll({ limit: 20, offset: 0 }, studentAuth);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userRole: 'STUDENT' }),
        expect.any(Function)
      );
    });
  });

  describe('INSTRUCTOR visibility', () => {
    it('findAll without layer filter uses INSTRUCTOR role context', async () => {
      mockOffset.mockResolvedValue([
        personalAnnotation,
        instructorAnnotation,
        publicAnnotation,
      ]);
      await service.findAll({ limit: 20, offset: 0 }, instructorAuth);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userRole: 'INSTRUCTOR' }),
        expect.any(Function)
      );
    });

    it('findByAsset without layer filter uses INSTRUCTOR role context', async () => {
      mockOrderBy.mockResolvedValue([
        personalAnnotation,
        instructorAnnotation,
        publicAnnotation,
      ]);
      await service.findByAsset('asset-1', undefined, instructorAuth);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'instr-1', userRole: 'INSTRUCTOR' }),
        expect.any(Function)
      );
    });
  });

  describe('Anonymous / no-role visibility', () => {
    it('findAll without layer filter uses empty-role context (defaults to STUDENT)', async () => {
      mockOffset.mockResolvedValue([publicAnnotation]);
      await service.findAll({ limit: 10, offset: 0 }, anonAuth);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userRole: 'STUDENT' }),
        expect.any(Function)
      );
    });
  });

  describe('Layer parameter filtering', () => {
    it('findByAsset with PERSONAL layer enforces owner-userId filter context', async () => {
      mockOrderBy.mockResolvedValue([personalAnnotation]);
      await service.findByAsset('asset-1', 'PERSONAL', studentAuth);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'student-1' }),
        expect.any(Function)
      );
    });

    it('findByAsset with INSTRUCTOR layer uses correct auth context', async () => {
      mockOrderBy.mockResolvedValue([instructorAnnotation]);
      await service.findByAsset('asset-1', 'INSTRUCTOR', instructorAuth);
      expect(withTenantContext).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'instr-1', userRole: 'INSTRUCTOR' }),
        expect.any(Function)
      );
    });
  });
});
