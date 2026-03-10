import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ────────────────────────────────────────────────────────────
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
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: mockReturning,
      })),
    })),
  })),
  execute: vi.fn(),
}));
const mockWithTenantContext = vi.hoisted(() =>
  vi.fn(async (_db: unknown, _ctx: unknown, fn: (tx: typeof mockTx) => unknown) =>
    fn(mockTx)
  )
);
const mockExecuteCypher = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockGetOrCreatePool = vi.hoisted(() => vi.fn().mockReturnValue({}));

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: mockWithTenantContext,
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  executeCypher: mockExecuteCypher,
  getOrCreatePool: mockGetOrCreatePool,
  peerMatchRequests: {
    id: 'id',
    tenantId: 'tenant_id',
    requesterId: 'requester_id',
    matchedUserId: 'matched_user_id',
    status: 'status',
  },
  userCourses: { userId: 'user_id', courseId: 'course_id' },
  eq: vi.fn((col: unknown) => col),
  and: vi.fn((...args: unknown[]) => args),
  ne: vi.fn((col: unknown) => col),
  sql: Object.assign(vi.fn(), { raw: vi.fn() }),
}));

vi.mock('@edusphere/config', () => ({
  graphConfig: { graphName: 'edusphere_graph' },
}));

import { PeerMatchingService } from './peer-matching.service';

const TENANT = 'tenant-uuid';
const USER = 'user-uuid';
const MENTOR = 'mentor-uuid';
const COURSE = 'course-uuid';

describe('PeerMatchingService — findMentorsByPathTopology', () => {
  let service: PeerMatchingService;

  beforeEach(() => {
    service = new PeerMatchingService();
    vi.clearAllMocks();
    mockExecuteCypher.mockResolvedValue([]);
    mockWithTenantContext.mockImplementation(
      async (_db: unknown, _ctx: unknown, fn: (tx: typeof mockTx) => unknown) =>
        fn(mockTx)
    );
    mockTx.select.mockReturnValue({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    });
  });

  it('uses SQL fallback when AGE executeCypher returns empty', async () => {
    mockExecuteCypher.mockResolvedValueOnce([]);
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ mentorId: MENTOR }]),
        })),
      })),
    });

    const result = await service.findMentorsByPathTopology(USER, TENANT, COURSE);

    expect(result).toHaveLength(1);
    expect(result[0].mentorId).toBe(MENTOR);
    expect(result[0].pathOverlapScore).toBe(0.5);
    expect(result[0].sharedConcepts).toEqual([]);
  });

  it('uses SQL fallback when AGE executeCypher throws', async () => {
    mockExecuteCypher.mockRejectedValueOnce(new Error('AGE not available'));
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    });

    const result = await service.findMentorsByPathTopology(USER, TENANT, COURSE);

    expect(Array.isArray(result)).toBe(true);
  });

  it('returns AGE results when executeCypher succeeds with rows', async () => {
    const ageRows = [
      {
        mentorId: '"mentor-a-uuid"',
        sharedCount: 5,
        sharedConcepts: ['A', 'B', 'C', 'D', 'E'],
      },
      {
        mentorId: '"mentor-b-uuid"',
        sharedCount: 3,
        sharedConcepts: ['A', 'B', 'C'],
      },
    ];
    mockExecuteCypher.mockResolvedValueOnce(ageRows);

    const result = await service.findMentorsByPathTopology(USER, TENANT, COURSE);

    expect(result).toHaveLength(2);
    expect(result[0].mentorId).toBe('mentor-a-uuid');
    expect(result[0].pathOverlapScore).toBeCloseTo(0.5);
    expect(result[0].sharedConcepts).toHaveLength(5);
  });

  it('caps pathOverlapScore at 1.0 for high sharedCount', async () => {
    const ageRows = [
      {
        mentorId: '"mentor-top"',
        sharedCount: 20,
        sharedConcepts: Array(20).fill('X') as string[],
      },
    ];
    mockExecuteCypher.mockResolvedValueOnce(ageRows);

    const result = await service.findMentorsByPathTopology(USER, TENANT, COURSE);

    expect(result[0].pathOverlapScore).toBe(1);
  });

  it('SQL fallback returns empty array when no enrollees found', async () => {
    mockExecuteCypher.mockRejectedValueOnce(new Error('AGE unavailable'));
    mockTx.select.mockReturnValueOnce({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([]),
        })),
      })),
    });

    const result = await service.findMentorsByPathTopology(USER, TENANT, COURSE);

    expect(result).toEqual([]);
  });
});
