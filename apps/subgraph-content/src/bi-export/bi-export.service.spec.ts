/**
 * BiExportService unit tests — F-029 BI Tool Export
 * Verifies OData v4 format, pagination parameters, and tenant isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockRows = [
  { id: 'r1', userId: 'u1', courseId: 'c1', status: 'ACTIVE', enrolledAt: new Date('2025-01-01'), completedAt: null },
  { id: 'r2', userId: 'u2', courseId: 'c1', status: 'COMPLETED', enrolledAt: new Date('2025-01-02'), completedAt: new Date('2025-02-01') },
];

const buildDbChain = (resolveWith: unknown[]) => {
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    // Make chain thenable: `await chain.select(...).from(...).limit(...).offset(...)` resolves to resolveWith
    then: vi.fn((resolve: (v: unknown) => void) => Promise.resolve(resolveWith).then(resolve)),
  };
  // All methods return `chain` so await on chain calls chain.then()
  for (const key of ['select', 'from', 'where', 'limit', 'offset', 'orderBy', 'insert', 'values']) {
    (chain[key] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  }
  return chain;
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => buildDbChain(mockRows)),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn((_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) =>
    fn(buildDbChain(mockRows)),
  ),
  schema: {
    userCourses: { id: 'id', userId: 'userId', courseId: 'courseId', status: 'status', enrolledAt: 'enrolledAt', completedAt: 'completedAt' },
    userProgress: { id: 'id', userId: 'userId', contentItemId: 'contentItemId', completedAt: 'completedAt', timeSpent: 'timeSpent', progress: 'progress', lastAccessedAt: 'lastAccessedAt' },
    quizResults: { id: 'id', userId: 'userId', contentItemId: 'contentItemId', tenantId: 'tenantId', score: 'score', passed: 'passed', submittedAt: 'submittedAt' },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ field: a, value: b })),
  and: vi.fn((...args: unknown[]) => args),
  isNotNull: vi.fn((col: unknown) => ({ notNull: col })),
  desc: vi.fn((col: unknown) => ({ desc: col })),
  asc: vi.fn((col: unknown) => ({ asc: col })),
}));

import { BiExportService } from './bi-export.service';

const TENANT_ID = 'tenant-abc-123';

describe('BiExportService', () => {
  let service: BiExportService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BiExportService();
  });

  it('getEnrollments returns OData format with @odata.context, @odata.count, and value', async () => {
    const result = await service.getEnrollments(TENANT_ID, {});
    expect(result).toHaveProperty('@odata.context');
    expect(result['@odata.context']).toContain('Enrollments');
    expect(result).toHaveProperty('@odata.count');
    expect(result).toHaveProperty('value');
    expect(Array.isArray(result.value)).toBe(true);
  });

  it('getEnrollments respects $top parameter', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    let capturedChain: { limit: ReturnType<typeof vi.fn> } | null = null;
    vi.mocked(withTenantContext).mockImplementationOnce((_db, _ctx, fn) => {
      const chain = buildDbChain(mockRows.slice(0, 1));
      capturedChain = chain;
      return fn(chain);
    });

    await service.getEnrollments(TENANT_ID, { top: 1 });
    expect(capturedChain?.limit).toHaveBeenCalledWith(1);
  });

  it('getEnrollments respects $skip parameter', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    let capturedChain: { offset: ReturnType<typeof vi.fn> } | null = null;
    vi.mocked(withTenantContext).mockImplementationOnce((_db, _ctx, fn) => {
      const chain = buildDbChain(mockRows.slice(1));
      capturedChain = chain;
      return fn(chain);
    });

    await service.getEnrollments(TENANT_ID, { skip: 10 });
    expect(capturedChain?.offset).toHaveBeenCalledWith(10);
  });

  it('getCompletions filters by tenant (uses withTenantContext)', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    await service.getCompletions(TENANT_ID, {});
    expect(withTenantContext).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tenantId: TENANT_ID }),
      expect.any(Function),
    );
  });

  it('getQuizResults returns score data with OData format', async () => {
    const quizRows = [{ id: 'q1', userId: 'u1', contentItemId: 'ci1', score: 85.5, passed: true, submittedAt: new Date() }];
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockResolvedValueOnce(quizRows);

    const result = await service.getQuizResults(TENANT_ID, {});
    expect(result['@odata.context']).toContain('QuizResults');
    expect(result['@odata.count']).toBe(quizRows.length);
    expect(result.value).toEqual(quizRows);
  });

  it('getActivityLog returns daily stats with OData format', async () => {
    const result = await service.getActivityLog(TENANT_ID, {});
    expect(result['@odata.context']).toContain('ActivityLog');
    expect(result).toHaveProperty('@odata.count');
    expect(Array.isArray(result.value)).toBe(true);
  });

  it('returns empty value array for tenant with no data', async () => {
    const { withTenantContext } = await import('@edusphere/db');
    vi.mocked(withTenantContext).mockResolvedValueOnce([]);

    const result = await service.getEnrollments('empty-tenant', {});
    expect(result.value).toHaveLength(0);
    expect(result['@odata.count']).toBe(0);
  });

  it('OData count matches value array length', async () => {
    const result = await service.getEnrollments(TENANT_ID, {});
    expect(result['@odata.count']).toBe(result.value.length);
  });
});
