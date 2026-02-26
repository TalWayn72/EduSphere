import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted() so these variables are available when vi.mock factories are hoisted
const {
  mockExecute,
  mockSelect,
  mockInsert,
  mockTx,
  mockNatsConn,
  _mockNatsSubscription,
} = vi.hoisted(() => {
  const mockExecute = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockTx = {
    execute: mockExecute,
    select: mockSelect,
    insert: mockInsert,
  };
  const _mockNatsSubscription = {
    [Symbol.asyncIterator]: () => ({
      next: async () => ({ done: true, value: undefined }),
    }),
    unsubscribe: vi.fn(),
  };
  const mockNatsConn = {
    subscribe: vi.fn(() => _mockNatsSubscription),
    drain: vi.fn().mockResolvedValue(undefined),
  };
  return {
    mockExecute,
    mockSelect,
    mockInsert,
    mockTx,
    mockNatsConn,
    _mockNatsSubscription,
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  schema: {
    badges: { id: 'id', conditionType: 'ct', conditionValue: 'cv' },
    userBadges: {
      id: 'id',
      userId: 'user_id',
      badgeId: 'badge_id',
      earnedAt: 'earned_at',
    },
    userPoints: { userId: 'user_id', totalPoints: 'total_points' },
    pointEvents: { userId: 'user_id', tenantId: 'tenant_id' },
    annotations: { user_id: 'user_id', tenant_id: 'tenant_id' },
  },
  withTenantContext: vi.fn(
    async (_d: unknown, _c: unknown, fn: (t: unknown) => unknown) => fn(mockTx)
  ),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  and: vi.fn((...a: unknown[]) => ({ and: a })),
  sql: vi.fn(() => ({ raw: 'COUNT(*)' })),
}));

vi.mock('nats', () => ({ connect: vi.fn().mockResolvedValue(mockNatsConn) }));
vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));
vi.mock('./badge-definitions.js', () => ({
  PLATFORM_BADGES: [
    {
      name: 'First Step',
      description: 'd',
      icon: '🎓',
      category: 'COMPLETION',
      pointsReward: 100,
      conditionType: 'courses_completed',
      conditionValue: 1,
    },
  ],
  POINT_AWARDS: { 'course.completed': 100, 'annotation.created': 10 },
}));

import { BadgeService } from './badge.service.js';

describe('BadgeService', () => {
  let service: BadgeService;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue({ rows: [] });
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
        innerJoin: vi
          .fn()
          .mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      }),
    });
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    service = new BadgeService();
  });
  it('connects to NATS on init', async () => {
    await service.onModuleInit();
    const { connect } = await import('nats');
    expect(connect).toHaveBeenCalled();
  });

  it('awardPoints inserts point event and updates total', async () => {
    await service.awardPoints('u1', 't1', 'ev', 50, 'test award');
    expect(mockInsert).toHaveBeenCalled();
    expect(mockExecute).toHaveBeenCalled();
  });

  it('awardPoints skips when points is 0', async () => {
    await service.awardPoints('u1', 't1', 'ev', 0, 'noop');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('checkAndAwardBadges awards badge when condition met', async () => {
    const badge = { id: 'b1', name: 'First Step', pointsReward: 100 };
    mockSelect
      .mockReturnValueOnce({
        from: vi
          .fn()
          .mockReturnValue({ where: vi.fn().mockResolvedValue([badge]) }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });
    await service.checkAndAwardBadges('u1', 't1', 'courses_completed', 1);
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });

  it('checkAndAwardBadges is idempotent — does not award badge twice', async () => {
    const badge = { id: 'b1', name: 'First Step', pointsReward: 100 };
    mockSelect
      .mockReturnValueOnce({
        from: vi
          .fn()
          .mockReturnValue({ where: vi.fn().mockResolvedValue([badge]) }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: 'ub1' }]),
        }),
      });
    await service.checkAndAwardBadges('u1', 't1', 'courses_completed', 1);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('leaderboard returns entries with correct rank', async () => {
    const rows = [
      {
        user_id: 'u1',
        first_name: 'Alice',
        last_name: 'A',
        total_points: 500,
        badge_count: '3',
      },
      {
        user_id: 'u2',
        first_name: 'Bob',
        last_name: 'B',
        total_points: 200,
        badge_count: '1',
      },
    ];
    mockExecute.mockResolvedValueOnce({ rows });
    const result = await service.leaderboard('t1', 5);
    expect(result[0].rank).toBe(1);
    expect(result[0].displayName).toBe('Alice A');
    expect(result[0].totalPoints).toBe(500);
    expect(result[1].rank).toBe(2);
  });

  it('myRank returns correct rank number', async () => {
    mockExecute.mockResolvedValueOnce({ rows: [{ rank: '3' }] });
    const rank = await service.myRank('u1', 't1');
    expect(rank).toBe(3);
  });
});
