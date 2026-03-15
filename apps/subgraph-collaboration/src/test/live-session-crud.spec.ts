import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';

// ── DB mock setup ────────────────────────────────────────────────────────────

const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockReturning = vi.fn();
const mockUpdate = vi.fn();
const mockSet = vi.fn();
const mockDelete = vi.fn();

const mockTx = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
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
      deleted_at: 'deleted_at',
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
  email: 'instructor@example.com',
  username: 'instructor',
  tenantId: 'tenant-1',
  roles: ['INSTRUCTOR'],
  scopes: ['read', 'write'],
  isSuperAdmin: false,
};

const NOW = new Date();

const MOCK_DISCUSSION = {
  id: 'disc-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'Live Session: Intro to Calculus',
  description: 'Weekly study session',
  creator_id: 'user-1',
  discussion_type: 'CHAVRUTA',
  created_at: NOW,
  updated_at: NOW,
};

const MOCK_DISCUSSION_2 = {
  ...MOCK_DISCUSSION,
  id: 'disc-2',
  title: 'Live Session: Linear Algebra',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupSelectChain(result: unknown[]) {
  const limitFn = vi.fn(() => {
    const p = Promise.resolve(result) as Promise<unknown[]> & { offset: ReturnType<typeof vi.fn> };
    p.offset = vi.fn(() => Promise.resolve(result));
    return p;
  });
  const orderByObj = { limit: limitFn };
  const whereResult = Object.assign(Promise.resolve(result), {
    limit: limitFn,
    orderBy: vi.fn(() => orderByObj),
  });
  const fromObj = {
    where: vi.fn(() => whereResult),
    orderBy: vi.fn(() => orderByObj),
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

describe('Live Session CRUD — discussion-based sessions', () => {
  let service: DiscussionService;

  beforeEach(() => {
    vi.clearAllMocks();
    setupSelectChain([MOCK_DISCUSSION]);
    setupInsertChain([MOCK_DISCUSSION]);
    service = new DiscussionService();
  });

  it('creates a live session (discussion) with title, type, and course', async () => {
    const mockParticipantValues = vi.fn().mockResolvedValue([]);
    mockInsert
      .mockReturnValueOnce({ values: mockValues })
      .mockReturnValueOnce({ values: mockParticipantValues });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([MOCK_DISCUSSION]);

    const input = {
      courseId: 'course-1',
      title: 'Live Session: Intro to Calculus',
      description: 'Weekly study session',
      discussionType: 'CHAVRUTA' as const,
    };
    const result = await service.createDiscussion(input, MOCK_AUTH);
    expect(result.title).toBe('Live Session: Intro to Calculus');
    expect(result.discussion_type).toBe('CHAVRUTA');
    expect(result.course_id).toBe('course-1');
  });

  it('retrieves a session by ID', async () => {
    setupSelectChain([MOCK_DISCUSSION]);
    const result = await service.findDiscussionById('disc-1', MOCK_AUTH);
    expect(result).toEqual(MOCK_DISCUSSION);
    expect(result.id).toBe('disc-1');
  });

  it('throws NotFoundException for non-existent session', async () => {
    setupSelectChain([]);
    await expect(
      service.findDiscussionById('nonexistent', MOCK_AUTH)
    ).rejects.toThrow(NotFoundException);
  });

  it('lists sessions for a course', async () => {
    setupSelectChain([MOCK_DISCUSSION, MOCK_DISCUSSION_2]);
    const result = await service.findDiscussionsByCourse(
      'course-1', 20, 0, MOCK_AUTH
    );
    expect(Array.isArray(result)).toBe(true);
  });

  it('lists sessions the current user participates in', async () => {
    // First call: find participations; second call: find discussions by IDs
    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      const result = callCount === 1
        ? [{ discussion_id: 'disc-1' }, { discussion_id: 'disc-2' }]
        : [MOCK_DISCUSSION, MOCK_DISCUSSION_2];
      const limitFn = vi.fn(() => {
        const p = Promise.resolve(result) as Promise<unknown[]> & { offset: ReturnType<typeof vi.fn> };
        p.offset = vi.fn(() => Promise.resolve(result));
        return p;
      });
      const whereResult = Object.assign(Promise.resolve(result), {
        limit: limitFn,
        orderBy: vi.fn(() => ({ limit: limitFn })),
      });
      return {
        where: vi.fn(() => whereResult),
        orderBy: vi.fn(() => ({ limit: limitFn })),
        limit: limitFn,
      };
    });
    mockSelect.mockReturnValue({ from: mockFrom });

    const result = await service.findDiscussionsByUser(20, 0, MOCK_AUTH);
    expect(Array.isArray(result)).toBe(true);
  });
});
