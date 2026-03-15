import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
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

const MOCK_AUTH_USER1: AuthContext = {
  userId: 'user-1',
  email: 'student1@example.com',
  username: 'student1',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

const MOCK_AUTH_USER2: AuthContext = {
  ...MOCK_AUTH_USER1,
  userId: 'user-2',
  email: 'student2@example.com',
  username: 'student2',
};

const MOCK_AUTH_USER3: AuthContext = {
  ...MOCK_AUTH_USER1,
  userId: 'user-3',
  email: 'student3@example.com',
  username: 'student3',
};

const MOCK_DISCUSSION = {
  id: 'disc-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'WebSocket Session',
  creator_id: 'creator-99',
  discussion_type: 'FORUM',
  created_at: new Date(),
};

const MOCK_PARTICIPANT = {
  discussion_id: 'disc-1',
  user_id: 'user-1',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupSelectChainMulti(results: unknown[][]) {
  let callCount = 0;
  mockFrom.mockImplementation(() => {
    const result = results[callCount] ?? results[results.length - 1];
    callCount++;
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
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WebSocket Lifecycle — participant join/leave/reconnect', () => {
  let service: DiscussionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiscussionService();
  });

  it('joining a session creates a participant record', async () => {
    // findDiscussionById returns discussion; participant check returns empty
    setupSelectChainMulti([[MOCK_DISCUSSION], []]);
    const mockParticipantValues = vi.fn().mockResolvedValue([MOCK_PARTICIPANT]);
    mockInsert.mockReturnValue({ values: mockParticipantValues });

    const result = await service.joinDiscussion('disc-1', MOCK_AUTH_USER1);
    expect(result).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('leaving a session removes the participant (non-creator)', async () => {
    setupSelectChainMulti([[MOCK_DISCUSSION]]);
    const deleteWhere = vi.fn(() => Promise.resolve({ rowCount: 1 }));
    mockDelete.mockReturnValue({ where: deleteWhere });

    const result = await service.leaveDiscussion('disc-1', MOCK_AUTH_USER2);
    expect(result).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('multiple participants are tracked independently', async () => {
    // Both users join — each call: findDiscussion + check existing
    setupSelectChainMulti([[MOCK_DISCUSSION], []]);
    const mockPV1 = vi.fn().mockResolvedValue([{ discussion_id: 'disc-1', user_id: 'user-2' }]);
    mockInsert.mockReturnValue({ values: mockPV1 });

    const r1 = await service.joinDiscussion('disc-1', MOCK_AUTH_USER2);
    expect(r1).toBe(true);

    vi.clearAllMocks();
    setupSelectChainMulti([[MOCK_DISCUSSION], []]);
    const mockPV2 = vi.fn().mockResolvedValue([{ discussion_id: 'disc-1', user_id: 'user-3' }]);
    mockInsert.mockReturnValue({ values: mockPV2 });

    const r2 = await service.joinDiscussion('disc-1', MOCK_AUTH_USER3);
    expect(r2).toBe(true);
  });

  it('creator cannot leave their own session', async () => {
    const creatorAuth: AuthContext = {
      ...MOCK_AUTH_USER1,
      userId: 'creator-99',
    };
    setupSelectChainMulti([[MOCK_DISCUSSION]]);

    await expect(
      service.leaveDiscussion('disc-1', creatorAuth)
    ).rejects.toThrow(ForbiddenException);
    await expect(
      service.leaveDiscussion('disc-1', creatorAuth)
    ).rejects.toThrow('Discussion creator cannot leave');
  });

  it('reconnect after disconnect — re-join returns true without duplicate', async () => {
    // Already a participant → returns true without inserting
    setupSelectChainMulti([[MOCK_DISCUSSION], [MOCK_PARTICIPANT]]);

    const result = await service.joinDiscussion('disc-1', MOCK_AUTH_USER1);
    expect(result).toBe(true);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
