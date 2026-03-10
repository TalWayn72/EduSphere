import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks (must be declared before vi.mock calls) ────────────────────
const mockReturning = vi.hoisted(() => vi.fn());
const mockTx = vi.hoisted(() => ({
  select: vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn().mockResolvedValue([]),
      })),
    })),
  })),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returning: mockReturning,
    })),
  })),
}));
const mockWithTenantContext = vi.hoisted(() =>
  vi.fn(async (_db: unknown, _ctx: unknown, fn: (tx: typeof mockTx) => unknown) =>
    fn(mockTx)
  )
);

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: mockWithTenantContext,
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  chavrutaPartnerSessions: { tenantId: 'tenant_id' },
  userCourses: { userId: 'user_id', courseId: 'course_id' },
  eq: vi.fn((col: unknown) => col),
  and: vi.fn((...args: unknown[]) => args),
  ne: vi.fn((col: unknown) => col),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

import { ChavrutaPartnerMatchService } from './chavruta-partner.service';

const TENANT = 'tenant-uuid';
const USER_A = 'user-a-uuid';
const USER_B = 'user-b-uuid';
const COURSE = 'course-uuid';

describe('ChavrutaPartnerMatchService', () => {
  let service: ChavrutaPartnerMatchService;

  beforeEach(() => {
    service = new ChavrutaPartnerMatchService();
    vi.clearAllMocks();
    // Reset default implementations after clearAllMocks
    mockTx.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    });
    mockWithTenantContext.mockImplementation(
      async (_db: unknown, _ctx: unknown, fn: (tx: typeof mockTx) => unknown) =>
        fn(mockTx)
    );
  });

  it('onModuleDestroy — calls closeAllPools', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });

  it('findPartnerForDebate — returns empty array when no enrollees found', async () => {
    const result = await service.findPartnerForDebate(USER_A, TENANT, {
      courseId: COURSE,
    });
    expect(result).toEqual([]);
  });

  it('findPartnerForDebate — returns matches for each candidate', async () => {
    const candidates = [
      { candidateId: USER_B, courseId: COURSE },
      { candidateId: 'user-c-uuid', courseId: COURSE },
    ];
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(candidates),
        })),
      })),
    });

    const result = await service.findPartnerForDebate(USER_A, TENANT, {
      courseId: COURSE,
      preferredTopic: 'Philosophy of Mind',
    });

    expect(result).toHaveLength(2);
    expect(result[0].partnerId).toBe(USER_B);
    expect(result[0].topic).toBe('Philosophy of Mind');
    expect(result[0].compatibilityScore).toBeGreaterThanOrEqual(0.7);
    expect(result[1].compatibilityScore).toBeGreaterThan(result[0].compatibilityScore);
  });

  it('findPartnerForDebate — uses default topic when none provided', async () => {
    const candidates = [{ candidateId: USER_B, courseId: COURSE }];
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(candidates),
        })),
      })),
    });

    const result = await service.findPartnerForDebate(USER_A, TENANT, {
      courseId: COURSE,
    });

    expect(result[0].topic).toBe('Key concepts from this course');
  });

  it('createPartnerSession — inserts session and returns structured result', async () => {
    const now = new Date('2026-03-09T10:00:00Z');
    const fakeSession = {
      id: 'session-uuid',
      initiatorId: USER_A,
      partnerId: USER_B,
      courseId: COURSE,
      topic: 'Free Will vs Determinism',
      status: 'PENDING',
      initiatedAt: now,
      tenantId: TENANT,
      matchReason: 'Manual topic selection',
      agentSessionId: null,
      startedAt: null,
      completedAt: null,
    };
    mockReturning.mockResolvedValueOnce([fakeSession]);

    const result = await service.createPartnerSession(
      USER_A,
      TENANT,
      USER_B,
      COURSE,
      'Free Will vs Determinism'
    );

    expect(mockTx.insert).toHaveBeenCalled();
    expect(result.id).toBe('session-uuid');
    expect(result.status).toBe('PENDING');
    expect(result.initiatedAt).toBe(now.toISOString());
  });

  it('createPartnerSession — throws when insert returns no rows', async () => {
    mockReturning.mockResolvedValueOnce([]);

    await expect(
      service.createPartnerSession(USER_A, TENANT, USER_B, COURSE, 'Ethics')
    ).rejects.toThrow('Insert returned no rows');
  });

  it('getMyPartnerSessions — returns mapped sessions list', async () => {
    const now = new Date('2026-03-09T10:00:00Z');
    const rows = [
      {
        id: 'session-1',
        initiatorId: USER_A,
        partnerId: USER_B,
        courseId: COURSE,
        topic: 'Ethics',
        status: 'ACTIVE',
        initiatedAt: now,
        tenantId: TENANT,
        matchReason: null,
        agentSessionId: null,
        startedAt: null,
        completedAt: null,
      },
    ];
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(rows),
      })),
    });

    const result = await service.getMyPartnerSessions(USER_A, TENANT);

    expect(result).toHaveLength(1);
    expect(result[0].topic).toBe('Ethics');
    expect(result[0].initiatedAt).toBe(now.toISOString());
  });
});
