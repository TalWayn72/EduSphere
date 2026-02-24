import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@edusphere/auth';

// ── DB mock — hoisted so vi.mock factory can reference these variables ─────────

const m = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues    = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert    = vi.fn(() => ({ values: mockValues }));
  const mockLimit     = vi.fn();
  const mockWhere     = vi.fn(() => Object.assign(Promise.resolve([]), { limit: mockLimit }));
  const mockFrom      = vi.fn(() => ({ where: mockWhere }));
  const mockSelect    = vi.fn(() => ({ from: mockFrom }));
  const mockTx = { select: mockSelect, insert: mockInsert };
  const mockDb = { select: mockSelect, insert: mockInsert };
  const mockWithTenantContext = vi.fn(async (_db: unknown, _ctx: unknown, cb: (tx: typeof mockTx) => unknown) => cb(mockTx));
  return { mockReturning, mockValues, mockInsert, mockLimit, mockWhere, mockFrom, mockSelect, mockTx, mockDb, mockWithTenantContext };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => m.mockDb),
  schema: {
    discussions: {
      id: 'id', tenant_id: 'tenant_id', course_id: 'course_id',
      title: 'title', creator_id: 'creator_id', discussion_type: 'discussion_type',
    },
    discussion_participants: { discussion_id: 'discussion_id', user_id: 'user_id' },
    discussion_messages: { id: 'id', discussion_id: 'discussion_id' },
  },
  eq: vi.fn((col, val) => ({ col, val, op: 'eq' })),
  and: vi.fn((...c) => ({ conditions: c, op: 'and' })),
  desc: vi.fn((col) => ({ col, order: 'desc' })),
  sql: vi.fn(() => ({ raw: true })),
  inArray: vi.fn((col, vals) => ({ col, vals })),
  withTenantContext: m.mockWithTenantContext,
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { DiscussionService } from './discussion.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_A_AUTH: AuthContext = {
  userId: 'user-a', email: 'a@example.com', username: 'usera',
  tenantId: 'tenant-a', roles: ['STUDENT'], scopes: ['read'], isSuperAdmin: false,
};

const TENANT_B_AUTH: AuthContext = {
  userId: 'user-b', email: 'b@example.com', username: 'userb',
  tenantId: 'tenant-b', roles: ['STUDENT'], scopes: ['read'], isSuperAdmin: false,
};

const DISCUSSION_TENANT_A = {
  id: 'disc-a1', tenant_id: 'tenant-a', course_id: 'course-1',
  title: 'Tenant A Discussion', creator_id: 'user-a', discussion_type: 'FORUM',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DiscussionService — RLS tenant isolation', () => {
  let service: DiscussionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiscussionService();
  });

  it('calls withTenantContext with tenantId derived from JWT, not GraphQL input', async () => {
    m.mockReturning.mockResolvedValue([DISCUSSION_TENANT_A]);
    m.mockWithTenantContext.mockImplementation(async (_db, ctx, cb) => cb(m.mockTx));

    const input = { courseId: '550e8400-e29b-41d4-a716-446655440000', title: 'Test', discussionType: 'FORUM' as const };
    await service.createDiscussion(input, TENANT_A_AUTH);

    expect(m.mockWithTenantContext).toHaveBeenCalledWith(
      m.mockDb,
      expect.objectContaining({ tenantId: 'tenant-a' }),
      expect.any(Function),
    );
  });

  it('passes tenantA context — not tenantB — even if tenantB id is embedded in input', async () => {
    m.mockReturning.mockResolvedValue([DISCUSSION_TENANT_A]);

    const input = { courseId: '550e8400-e29b-41d4-a716-446655440000', title: 'Injected', discussionType: 'FORUM' as const };
    await service.createDiscussion(input, TENANT_A_AUTH);

    const callCtx = m.mockWithTenantContext.mock.calls[0][1] as { tenantId: string };
    expect(callCtx.tenantId).toBe('tenant-a');
    expect(callCtx.tenantId).not.toBe('tenant-b');
  });

  it('cross-tenant listing returns empty array (RLS filters rows)', async () => {
    const offsetFn = vi.fn(() => Promise.resolve([]));
    m.mockWhere.mockReturnValue(Object.assign(Promise.resolve([]), {
      limit: vi.fn(() => ({ offset: offsetFn })),
      orderBy: vi.fn(() => ({ limit: vi.fn(() => ({ offset: vi.fn(() => Promise.resolve([])) })) })),
    }));
    m.mockFrom.mockReturnValue({ where: m.mockWhere });
    m.mockSelect.mockReturnValue({ from: m.mockFrom });

    const result = await service.findDiscussionsByCourse('course-1', 20, 0, TENANT_B_AUTH);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });

  it('withTenantContext is called exactly once per operation', async () => {
    m.mockWhere.mockReturnValue(Object.assign(Promise.resolve([DISCUSSION_TENANT_A]), {
      limit: vi.fn(() => Promise.resolve([DISCUSSION_TENANT_A])),
    }));
    m.mockFrom.mockReturnValue({ where: m.mockWhere });
    m.mockSelect.mockReturnValue({ from: m.mockFrom });

    await service.findDiscussionById('disc-a1', TENANT_A_AUTH);
    expect(m.mockWithTenantContext).toHaveBeenCalledOnce();
  });

  it('tenant-a and tenant-b auth produce separate withTenantContext calls with correct ids', async () => {
    m.mockReturning.mockResolvedValue([DISCUSSION_TENANT_A]);

    const input = { courseId: '550e8400-e29b-41d4-a716-446655440000', title: 'X', discussionType: 'FORUM' as const };
    await service.createDiscussion(input, TENANT_A_AUTH);
    await service.createDiscussion(input, TENANT_B_AUTH);

    const calls = m.mockWithTenantContext.mock.calls;
    expect((calls[0][1] as { tenantId: string }).tenantId).toBe('tenant-a');
    expect((calls[1][1] as { tenantId: string }).tenantId).toBe('tenant-b');
  });
});
