import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@edusphere/auth';

// ─── Mock DB chain helpers ────────────────────────────────────────────
const mockOrderBy = vi.fn();
const mockLimit = vi.fn();
const mockOffset = vi.fn();
const mockWhere = vi.fn();
const mockFrom = vi.fn();

const capturedConditions: unknown[][] = [];

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
  eq: vi.fn((col, val) => ({ _eq: true, col, val })),
  and: vi.fn((...args: unknown[]) => {
    capturedConditions.push(args);
    return args;
  }),
  desc: vi.fn((col) => ({ desc: col })),
  sql: Object.assign(
    vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
      _sql: true,
      strings: Array.from(strings),
      values,
    })),
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
const otherStudentAuth: AuthContext = {
  userId: 'student-2',
  email: 's2@e.com',
  username: 'student2',
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
const orgAdminAuth: AuthContext = {
  userId: 'admin-1',
  email: 'a@e.com',
  username: 'admin',
  tenantId: 'tenant-1',
  roles: ['ORG_ADMIN'],
  scopes: [],
  isSuperAdmin: false,
};

// ─── Annotation fixtures ──────────────────────────────────────────────
const personalAnnotation = {
  id: 'p-1', layer: 'PERSONAL', user_id: 'student-1',
  asset_id: 'asset-1', tenant_id: 'tenant-1', deleted_at: null,
};
const sharedAnnotation = {
  id: 's-1', layer: 'SHARED', user_id: 'student-1',
  asset_id: 'asset-1', tenant_id: 'tenant-1', deleted_at: null,
};
const instructorAnnotation = {
  id: 'i-1', layer: 'INSTRUCTOR', user_id: 'instr-1',
  asset_id: 'asset-1', tenant_id: 'tenant-1', deleted_at: null,
};
const aiAnnotation = {
  id: 'ai-1', layer: 'AI_GENERATED', user_id: 'system',
  asset_id: 'asset-1', tenant_id: 'tenant-1', deleted_at: null,
};
const otherPersonal = {
  id: 'p-2', layer: 'PERSONAL', user_id: 'student-2',
  asset_id: 'asset-1', tenant_id: 'tenant-1', deleted_at: null,
};

describe('Layer Filtering — annotation visibility rules', () => {
  let service: AnnotationService;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedConditions.length = 0;
    mockOffset.mockResolvedValue([]);
    mockLimit.mockReturnValue({ offset: mockOffset });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });
    service = new AnnotationService();
  });

  it('personal annotations are visible only to owner (student sees own)', async () => {
    mockOffset.mockResolvedValue([personalAnnotation]);
    const result = await service.findAll(
      { layer: 'PERSONAL', limit: 10, offset: 0 },
      studentAuth
    );
    expect(result).toEqual([personalAnnotation]);
    // The PERSONAL filter adds an eq condition matching user_id to auth userId
    const { eq } = await import('@edusphere/db');
    expect(eq).toHaveBeenCalledWith('user_id', 'student-1');
  });

  it('personal annotations of other users are NOT returned to requesting student', async () => {
    // When student-2 queries PERSONAL layer, the eq(user_id, student-2) filter is applied
    mockOffset.mockResolvedValue([]);
    const result = await service.findAll(
      { layer: 'PERSONAL', limit: 10, offset: 0 },
      otherStudentAuth
    );
    expect(result).toEqual([]);
    const { eq } = await import('@edusphere/db');
    expect(eq).toHaveBeenCalledWith('user_id', 'student-2');
  });

  it('shared annotations are visible to all course members', async () => {
    mockOffset.mockResolvedValue([sharedAnnotation]);
    const result = await service.findAll(
      { layer: 'SHARED', limit: 10, offset: 0 },
      studentAuth
    );
    expect(result).toEqual([sharedAnnotation]);
    // SHARED layer does NOT add user_id equality check
    const { eq } = await import('@edusphere/db');
    const eqCalls = vi.mocked(eq).mock.calls;
    const userIdEqCalls = eqCalls.filter(([col]) => col === 'user_id');
    // No user_id filter should be applied for SHARED layer
    expect(userIdEqCalls.length).toBe(0);
  });

  it('instructor annotations are visible to all users (students + instructors)', async () => {
    mockOffset.mockResolvedValue([instructorAnnotation]);
    const studentResult = await service.findAll(
      { layer: 'INSTRUCTOR', limit: 10, offset: 0 },
      studentAuth
    );
    expect(studentResult).toEqual([instructorAnnotation]);

    vi.clearAllMocks();
    mockOffset.mockResolvedValue([instructorAnnotation]);
    mockLimit.mockReturnValue({ offset: mockOffset });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy, limit: mockLimit });
    mockFrom.mockReturnValue({ where: mockWhere, orderBy: mockOrderBy });

    const instrResult = await service.findAll(
      { layer: 'INSTRUCTOR', limit: 10, offset: 0 },
      instructorAuth
    );
    expect(instrResult).toEqual([instructorAnnotation]);
  });

  it('layer filter query parameter restricts to specified layer only', async () => {
    // When layer=SHARED is specified, only SHARED annotations are returned
    mockOffset.mockResolvedValue([sharedAnnotation]);
    const result = await service.findAll(
      { layer: 'SHARED', limit: 10, offset: 0 },
      studentAuth
    );
    expect(result).toEqual([sharedAnnotation]);
    // The sql tagged template is called with the layer value as an interpolated value
    const { sql } = await import('@edusphere/db');
    const sqlCalls = vi.mocked(sql).mock.calls;
    // At least one sql call should include the SHARED layer value
    const layerFilterCalls = sqlCalls.filter(
      (call) => call.length > 1 && call.slice(1).some((v) => v === 'SHARED')
    );
    expect(layerFilterCalls.length).toBeGreaterThan(0);
  });

  it('cross-layer aggregation: no layer filter returns annotations from all visible layers', async () => {
    const allAnnotations = [
      personalAnnotation,
      sharedAnnotation,
      instructorAnnotation,
      aiAnnotation,
    ];
    mockOffset.mockResolvedValue(allAnnotations);
    const result = await service.findAll(
      { limit: 20, offset: 0 },
      instructorAuth
    );
    // Instructor sees all layers (including own PERSONAL, all SHARED, INSTRUCTOR, AI_GENERATED)
    expect(result).toHaveLength(4);
    const layers = result.map((a: { layer: string }) => a.layer);
    expect(layers).toContain('PERSONAL');
    expect(layers).toContain('SHARED');
    expect(layers).toContain('INSTRUCTOR');
    expect(layers).toContain('AI_GENERATED');
  });
});
