import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@edusphere/auth';

// ── DB mock setup ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockDelete = vi.fn();

const mockTx = {
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
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

const INSTRUCTOR_AUTH: AuthContext = {
  userId: 'instr-1',
  email: 'instructor@example.com',
  username: 'instructor',
  tenantId: 'tenant-1',
  roles: ['INSTRUCTOR'],
  scopes: ['read', 'write'],
  isSuperAdmin: false,
};

const STUDENT_AUTH: AuthContext = {
  userId: 'student-1',
  email: 'student@example.com',
  username: 'student',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

const MAIN_SESSION = {
  id: 'main-session',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'Main Session',
  creator_id: 'instr-1',
  discussion_type: 'CHAVRUTA',
  created_at: new Date(),
};

const BREAKOUT_ROOM_1 = {
  id: 'breakout-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'Breakout Room 1',
  creator_id: 'instr-1',
  discussion_type: 'CHAVRUTA',
  created_at: new Date(),
};

const BREAKOUT_ROOM_2 = {
  ...BREAKOUT_ROOM_1,
  id: 'breakout-2',
  title: 'Breakout Room 2',
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

function setupInsertChain(result: unknown[]) {
  mockReturning.mockResolvedValue(result);
  mockValues.mockReturnValue({ returning: mockReturning });
  mockInsert.mockReturnValue({ values: mockValues });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Breakout Rooms — sub-sessions from main discussion', () => {
  let service: DiscussionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiscussionService();
  });

  it('creates a breakout room as a new discussion under same course', async () => {
    const mockParticipantValues = vi.fn().mockResolvedValue([]);
    mockInsert
      .mockReturnValueOnce({ values: mockValues })
      .mockReturnValueOnce({ values: mockParticipantValues });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([BREAKOUT_ROOM_1]);

    const input = {
      courseId: 'course-1',
      title: 'Breakout Room 1',
      discussionType: 'CHAVRUTA' as const,
    };
    const result = await service.createDiscussion(input, INSTRUCTOR_AUTH);
    expect(result.title).toBe('Breakout Room 1');
    expect(result.course_id).toBe('course-1');
    expect(mockInsert).toHaveBeenCalledTimes(2); // discussion + auto-join
  });

  it('assigns a participant to a breakout room via joinDiscussion', async () => {
    // findDiscussion returns breakout room; participant check returns empty
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const result = callCount === 1 ? [BREAKOUT_ROOM_1] : [];
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

    const mockPV = vi.fn().mockResolvedValue([{ discussion_id: 'breakout-1', user_id: 'student-1' }]);
    mockInsert.mockReturnValue({ values: mockPV });

    const result = await service.joinDiscussion('breakout-1', STUDENT_AUTH);
    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('moves participant between rooms (leave old, join new)', async () => {
    // Leave breakout-1
    setupSelectChain([BREAKOUT_ROOM_1]);
    const deleteWhere = vi.fn(() => Promise.resolve({ rowCount: 1 }));
    mockDelete.mockReturnValue({ where: deleteWhere });

    const leaveResult = await service.leaveDiscussion('breakout-1', STUDENT_AUTH);
    expect(leaveResult).toBe(true);

    // Join breakout-2
    vi.clearAllMocks();
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const result = callCount === 1 ? [BREAKOUT_ROOM_2] : [];
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

    const joinResult = await service.joinDiscussion('breakout-2', STUDENT_AUTH);
    expect(joinResult).toBe(true);
  });

  it('lists all breakout rooms for a course (same as listing discussions)', async () => {
    setupSelectChain([BREAKOUT_ROOM_1, BREAKOUT_ROOM_2]);
    const result = await service.findDiscussionsByCourse(
      'course-1', 20, 0, INSTRUCTOR_AUTH
    );
    expect(Array.isArray(result)).toBe(true);
  });
});
