import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock @edusphere/db before importing the service ──────────────────────────
const mockTx = {
  select: vi.fn(),
  delete: vi.fn(),
  insert: vi.fn(),
};

// Chainable select mock: tx.select().from().where() → resolves to []
mockTx.select.mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockResolvedValue([{ id: 'session-1' }]),
  }),
});

// Chainable delete mock: tx.delete().where().returning() → resolves to [{ id: 'x' }]
mockTx.delete.mockReturnValue({
  where: vi.fn().mockReturnValue({
    returning: vi.fn().mockResolvedValue([{ id: 'item-1' }]),
  }),
});

// insert mock for audit log
mockTx.insert.mockReturnValue({
  values: vi.fn().mockResolvedValue(undefined),
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) =>
      fn(mockTx)
    ),
    insert: vi
      .fn()
      .mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  })),
  schema: {
    agentSessions: { id: 'id', userId: 'userId' },
    agentMessages: { sessionId: 'sessionId' },
    annotations: { userId: 'userId' },
    userProgress: { userId: 'userId' },
    userCourses: { userId: 'userId' },
    users: { id: 'id' },
    auditLog: {},
  },
  withTenantContext: vi.fn(
    async (
      _db: unknown,
      _ctx: unknown,
      fn: (tx: typeof mockTx) => Promise<unknown>
    ) => fn(mockTx)
  ),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  eq: vi.fn((col, val) => ({ col, val })),
  inArray: vi.fn((col, vals) => ({ col, vals })),
}));

import { UserErasureService } from './user-erasure.service.js';

describe('UserErasureService — GDPR Art.17 Right to Erasure', () => {
  let service: UserErasureService;

  beforeEach(() => {
    service = new UserErasureService();
    vi.clearAllMocks();
  });

  it('returns a COMPLETED report on success', async () => {
    const report = await service.eraseUserData('user-1', 'tenant-1', 'admin-1');

    expect(report.status).toBe('COMPLETED');
    expect(report.completedAt).toBeDefined();
    expect(report.error).toBeUndefined();
  });

  it('report contains userId and tenantId', async () => {
    const report = await service.eraseUserData(
      'user-42',
      'tenant-7',
      'admin-1'
    );

    expect(report.userId).toBe('user-42');
    expect(report.tenantId).toBe('tenant-7');
  });

  it('report includes deleted entity counts for all entity types', async () => {
    const report = await service.eraseUserData('user-1', 'tenant-1', 'admin-1');

    const types = report.deletedEntities.map((e) => e.type);
    expect(types).toContain('AGENT_MESSAGES');
    expect(types).toContain('AGENT_SESSIONS');
    expect(types).toContain('ANNOTATIONS');
    expect(types).toContain('USER_PROGRESS');
    expect(types).toContain('ENROLLMENTS');
    expect(types).toContain('USER_RECORD');
  });

  it('USER_RECORD count is always 1', async () => {
    const report = await service.eraseUserData('user-1', 'tenant-1', 'admin-1');

    const userRecord = report.deletedEntities.find(
      (e) => e.type === 'USER_RECORD'
    );
    expect(userRecord?.count).toBe(1);
  });

  it('records startedAt timestamp', async () => {
    const before = new Date();
    const report = await service.eraseUserData('user-1', 'tenant-1', 'admin-1');
    const after = new Date();

    expect(report.startedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(report.startedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('marks report as FAILED when withTenantContext throws', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockRejectedValueOnce(
      new Error('DB connection lost')
    );

    const report = await service.eraseUserData('user-1', 'tenant-1', 'admin-1');

    expect(report.status).toBe('FAILED');
    expect(report.error).toBe('DB connection lost');
  });

  it('does not throw even when erasure fails (returns report)', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockRejectedValueOnce(new Error('Unexpected'));

    await expect(
      service.eraseUserData('user-1', 'tenant-1', 'admin-1')
    ).resolves.not.toThrow();
  });
});
