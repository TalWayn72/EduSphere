import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@edusphere/auth';

// ── DB mock setup ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();

const mockTx = {
  select: mockSelect,
  insert: mockInsert,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  schema: {
    discussions: {
      id: 'id',
      tenant_id: 'tenant_id',
      course_id: 'course_id',
      title: 'title',
      creator_id: 'creator_id',
      discussion_type: 'discussion_type',
      created_at: 'created_at',
    },
    discussion_messages: {
      id: 'id',
      discussion_id: 'discussion_id',
      user_id: 'user_id',
      content: 'content',
      message_type: 'message_type',
      parent_message_id: 'parent_message_id',
      created_at: 'created_at',
    },
    discussion_participants: {
      discussion_id: 'discussion_id',
      user_id: 'user_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val, op: 'eq' })),
  and: vi.fn((...conditions: unknown[]) => ({ conditions, op: 'and' })),
  desc: vi.fn((col: string) => ({ col, order: 'desc' })),
  inArray: vi.fn((col: string, vals: string[]) => ({ col, vals, op: 'inArray' })),
  sql: vi.fn(() => ({ raw: true })),
  withTenantContext: vi.fn(async (_db: unknown, _ctx: unknown, callback: (tx: typeof mockTx) => unknown) => callback(mockTx)),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { DiscussionService } from '../discussion/discussion.service';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_AUTH: AuthContext = {
  userId: 'user-1',
  email: 'student@example.com',
  username: 'student',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

const MOCK_DISCUSSION = {
  id: 'disc-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'Concurrent Test Session',
  creator_id: 'creator-99',
  discussion_type: 'FORUM',
  created_at: new Date(),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupSelectChain(result: unknown[]) {
  const limitFn = vi.fn(() => {
    const p = Promise.resolve(result) as Promise<unknown[]> & { offset: ReturnType<typeof vi.fn> };
    p.offset = vi.fn(() => Promise.resolve(result));
    return p;
  });
  const whereResult = Object.assign(Promise.resolve(result), {
    limit: limitFn,
    orderBy: vi.fn(() => ({ limit: limitFn })),
  });
  const fromObj = {
    where: vi.fn(() => whereResult),
    orderBy: vi.fn(() => ({ limit: limitFn })),
    limit: limitFn,
  };
  mockFrom.mockReturnValue(fromObj);
  mockSelect.mockReturnValue({ from: mockFrom });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Concurrent Limits — participant count tracking', () => {
  let service: DiscussionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiscussionService();
  });

  it('countParticipants returns correct count for a session', async () => {
    setupSelectChain([{ count: 25 }]);
    const count = await service.countParticipants('disc-1', MOCK_AUTH);
    expect(count).toBe(25);
  });

  it('countParticipants returns 0 when session has no participants', async () => {
    setupSelectChain([{ count: 0 }]);
    const count = await service.countParticipants('disc-1', MOCK_AUTH);
    expect(count).toBe(0);
  });

  it('participant count updates after a new join', async () => {
    // Initial count: 10
    setupSelectChain([{ count: 10 }]);
    const countBefore = await service.countParticipants('disc-1', MOCK_AUTH);
    expect(countBefore).toBe(10);

    // User joins — setup for join flow
    vi.clearAllMocks();
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const result = callCount === 1 ? [MOCK_DISCUSSION] : [];
      const limitFn = vi.fn(() => Promise.resolve(result));
      const whereResult = Object.assign(Promise.resolve(result), {
        limit: limitFn,
        orderBy: vi.fn(() => ({ limit: limitFn })),
      });
      return {
        where: vi.fn(() => whereResult),
        limit: limitFn,
      };
    });
    mockSelect.mockReturnValue({ from: mockFrom });
    const mockPV = vi.fn().mockResolvedValue([]);
    mockInsert.mockReturnValue({ values: mockPV });

    const joinResult = await service.joinDiscussion('disc-1', MOCK_AUTH);
    expect(joinResult).toBe(true);

    // New count: 11
    vi.clearAllMocks();
    setupSelectChain([{ count: 11 }]);
    const countAfter = await service.countParticipants('disc-1', MOCK_AUTH);
    expect(countAfter).toBe(11);
  });
});
