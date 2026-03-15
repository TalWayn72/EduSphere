import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@edusphere/auth';

// ─── Mock DB chain helpers ────────────────────────────────────────────
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
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col: string) => ({ desc: col })),
  sql: Object.assign(
    vi.fn((str: TemplateStringsArray) => str),
    { placeholder: vi.fn() }
  ),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, cb: (tx: typeof mockTx) => unknown) => cb(mockTx)),
  closeAllPools: vi.fn(),
}));

import { AnnotationService } from '../annotation/annotation.service';

// ─── Auth contexts ────────────────────────────────────────────────────
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
const otherStudentAuth: AuthContext = {
  userId: 'student-2',
  email: 's2@e.com',
  username: 'student2',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: [],
  isSuperAdmin: false,
};

const PERSONAL_ANNOTATION = {
  id: 'ann-merge-1',
  asset_id: 'asset-1',
  user_id: 'student-1',
  tenant_id: 'tenant-1',
  layer: 'PERSONAL',
  annotation_type: 'TEXT',
  content: { text: 'My personal note' },
  is_resolved: false,
  deleted_at: null,
  created_at: new Date(),
};

describe('Annotation Merge — promote workflow', () => {
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

  it('instructor can promote a PERSONAL annotation to INSTRUCTOR layer (merge request equivalent)', async () => {
    mockLimit.mockResolvedValue([PERSONAL_ANNOTATION]);
    const promoted = { ...PERSONAL_ANNOTATION, layer: 'INSTRUCTOR' };
    mockReturning.mockResolvedValue([promoted]);

    const result = await service.promote('ann-merge-1', instructorAuth);
    expect(result.layer).toBe('INSTRUCTOR');
    expect(mockSet).toHaveBeenCalledWith({ layer: 'INSTRUCTOR' });
  });

  it('promote succeeds for ORG_ADMIN role (approve merge)', async () => {
    const orgAdminAuth: AuthContext = {
      userId: 'admin-1',
      email: 'a@e.com',
      username: 'admin',
      tenantId: 'tenant-1',
      roles: ['ORG_ADMIN'],
      scopes: [],
      isSuperAdmin: false,
    };
    mockLimit.mockResolvedValue([PERSONAL_ANNOTATION]);
    const promoted = { ...PERSONAL_ANNOTATION, layer: 'INSTRUCTOR' };
    mockReturning.mockResolvedValue([promoted]);

    const result = await service.promote('ann-merge-1', orgAdminAuth);
    expect(result.layer).toBe('INSTRUCTOR');
  });

  it('student cannot promote (reject — unauthorized to merge own annotation)', async () => {
    await expect(
      service.promote('ann-merge-1', studentAuth)
    ).rejects.toThrow('Unauthorized: only instructors can promote annotations');
  });

  it('promote throws when annotation not found (merge request for nonexistent)', async () => {
    mockLimit.mockResolvedValue([]);
    await expect(
      service.promote('nonexistent', instructorAuth)
    ).rejects.toThrow('Annotation not found');
  });

  it('promote fails when returning is empty (DB failure during merge)', async () => {
    mockLimit.mockResolvedValue([PERSONAL_ANNOTATION]);
    mockReturning.mockResolvedValue([]);
    await expect(
      service.promote('ann-merge-1', instructorAuth)
    ).rejects.toThrow('Failed to promote annotation');
  });
});
