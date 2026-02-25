import { vi, describe, it, expect, beforeEach } from 'vitest';
/**
 * Unit tests for UserExportService (GDPR Art.20 — Right to Data Portability).
 *
 * Covers:
 *  1. exportUserData() returns a well-formed UserDataExport structure.
 *  2. exportUserData() includes profile, annotations, agentSessions, learningProgress, enrollments.
 *  3. exportUserData() writes an audit log entry after successful export.
 *  4. exportUserData() still succeeds (non-fatal) when the audit log insert fails.
 *  5. exportUserData() returns null for profile when the user is not found.
 *  6. onModuleDestroy() calls closeAllPools().
 *  7. exportedAt is a valid ISO-8601 timestamp.
 *  8. gdprArticle field is always '20'.
 */

import { UserExportService } from './user-export.service';

// ── DB mocks ─────────────────────────────────────────────────────────────────

const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

const mockAuditLogInsert = {
  values: vi.fn().mockResolvedValue(undefined),
};

// withTenantContext executes the callback directly in tests
const mockWithTenantContext = vi.fn(
  (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) => fn(_db),
);

// Default data returned by each table select
const defaultUser = { id: 'user-1', email: 'alice@example.com', name: 'Alice' };
const defaultAnnotations = [{ id: 'ann-1', body: 'Note A' }, { id: 'ann-2', body: 'Note B' }];
const defaultAgentSessions = [{ id: 'sess-1', agentId: 'ag-1' }];
const defaultProgress = [{ id: 'prog-1', completedAt: '2026-01-01' }];
const defaultEnrollments = [{ id: 'enr-1', courseId: 'course-1' }, { id: 'enr-2', courseId: 'course-2' }];

// Factory: each call to select().from().where() returns canned data for that table
function makeSelectMock(
  users: unknown[],
  annotations: unknown[],
  agentSessions: unknown[],
  userProgress: unknown[],
  userCourses: unknown[],
) {
  let callIndex = 0;
  const datasets = [users, annotations, agentSessions, userProgress, userCourses];

  return vi.fn().mockImplementation(() => ({
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockImplementation(() => {
      const data = datasets[callIndex % datasets.length] ?? [];
      callIndex++;
      return Promise.resolve(data);
    }),
  }));
}

const mockInsert = vi.fn().mockReturnValue(mockAuditLogInsert);

const mockDb = {
  select: makeSelectMock(
    [defaultUser],
    defaultAnnotations,
    defaultAgentSessions,
    defaultProgress,
    defaultEnrollments,
  ),
  insert: mockInsert,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...(args as Parameters<typeof mockWithTenantContext>)),
  schema: {
    users: { id: 'id' },
    annotations: { user_id: 'user_id' },
    agentSessions: { userId: 'userId' },
    userProgress: { userId: 'userId' },
    userCourses: { userId: 'userId' },
    auditLog: {},
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
}));

// ─────────────────────────────────────────────────────────────────────────────

describe('UserExportService — GDPR Art.20', () => {
  let service: UserExportService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset the mockDb.select to default data each test
    mockDb.select = makeSelectMock(
      [defaultUser],
      defaultAnnotations,
      defaultAgentSessions,
      defaultProgress,
      defaultEnrollments,
    );
    mockDb.insert = mockInsert;

    service = new UserExportService();
  });

  // ── Test 1 ──────────────────────────────────────────────────────────────────
  it('should return a well-formed UserDataExport object', async () => {
    const result = await service.exportUserData('user-1', 'tenant-1');

    expect(result).toMatchObject({
      gdprArticle: '20',
      format: 'EduSphere-UserExport/1.0',
      userId: 'user-1',
    });
    expect(typeof result.exportedAt).toBe('string');
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  it('should include all five entity collections in the export', async () => {
    const result = await service.exportUserData('user-1', 'tenant-1');

    expect(result.profile).toBeDefined();
    expect(Array.isArray(result.annotations)).toBe(true);
    expect(Array.isArray(result.agentSessions)).toBe(true);
    expect(Array.isArray(result.learningProgress)).toBe(true);
    expect(Array.isArray(result.enrollments)).toBe(true);
    expect(result.annotations).toHaveLength(2);
    expect(result.agentSessions).toHaveLength(1);
    expect(result.enrollments).toHaveLength(2);
  });

  // ── Test 3 ──────────────────────────────────────────────────────────────────
  it('should write an audit log entry after a successful export', async () => {
    await service.exportUserData('user-1', 'tenant-1');

    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockAuditLogInsert.values).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'EXPORT',
        resourceType: 'USER',
        resourceId: 'user-1',
        status: 'SUCCESS',
      }),
    );
  });

  // ── Test 4 ──────────────────────────────────────────────────────────────────
  it('should still return export data even when audit log insert fails', async () => {
    mockAuditLogInsert.values.mockRejectedValueOnce(new Error('Audit DB unavailable'));

    // Must resolve (not throw) and return the export data
    const result = await service.exportUserData('user-1', 'tenant-1');

    expect(result.userId).toBe('user-1');
    expect(result.gdprArticle).toBe('20');
  });

  // ── Test 5 ──────────────────────────────────────────────────────────────────
  it('should return null for profile when user is not found', async () => {
    // Simulate user not found — first select resolves to empty array
    mockDb.select = makeSelectMock(
      [],                 // no profile row
      defaultAnnotations,
      defaultAgentSessions,
      defaultProgress,
      defaultEnrollments,
    );

    const result = await service.exportUserData('unknown-user', 'tenant-1');

    expect(result.profile).toBeNull();
  });

  // ── Test 6 ──────────────────────────────────────────────────────────────────
  it('should call closeAllPools on onModuleDestroy()', async () => {
    await service.onModuleDestroy();

    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });

  // ── Test 7 ──────────────────────────────────────────────────────────────────
  it('should set exportedAt to a valid ISO-8601 timestamp', async () => {
    const before = Date.now();
    const result = await service.exportUserData('user-1', 'tenant-1');
    const after = Date.now();

    const exportTime = new Date(result.exportedAt).getTime();
    expect(exportTime).toBeGreaterThanOrEqual(before);
    expect(exportTime).toBeLessThanOrEqual(after);
  });

  // ── Test 8 ──────────────────────────────────────────────────────────────────
  it('should always set gdprArticle to "20"', async () => {
    const result = await service.exportUserData('user-1', 'tenant-1');

    expect(result.gdprArticle).toBe('20');
  });
});
