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
import { BadRequestException } from '@nestjs/common';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_A: AuthContext = {
  userId: 'user-a',
  email: 'a@example.com',
  username: 'userA',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

const USER_B: AuthContext = {
  ...USER_A,
  userId: 'user-b',
  email: 'b@example.com',
  username: 'userB',
};

const MOCK_DISCUSSION = {
  id: 'disc-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'Conflict Test Discussion',
  creator_id: 'user-a',
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

function setupInsertChain(result: unknown[]) {
  mockReturning.mockResolvedValue(result);
  mockValues.mockReturnValue({ returning: mockReturning });
  mockInsert.mockReturnValue({ values: mockValues });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Conflict Resolution — concurrent message edits', () => {
  let service: DiscussionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiscussionService();
  });

  it('concurrent messages from different users are both persisted (last-write-wins at DB level)', async () => {
    const msgA = {
      id: 'msg-a',
      discussion_id: 'disc-1',
      user_id: 'user-a',
      content: 'Edit from user A',
      message_type: 'TEXT',
      parent_message_id: null,
      created_at: new Date(),
    };
    const msgB = {
      ...msgA,
      id: 'msg-b',
      user_id: 'user-b',
      content: 'Edit from user B',
    };

    // User A adds message
    setupSelectChain([MOCK_DISCUSSION]);
    setupInsertChain([msgA]);
    const resultA = await service.addMessage(
      'disc-1',
      { content: 'Edit from user A', messageType: 'TEXT' as const },
      USER_A
    );
    expect(resultA.content).toBe('Edit from user A');
    expect(resultA.user_id).toBe('user-a');

    // User B adds message concurrently
    vi.clearAllMocks();
    setupSelectChain([MOCK_DISCUSSION]);
    setupInsertChain([msgB]);
    const resultB = await service.addMessage(
      'disc-1',
      { content: 'Edit from user B', messageType: 'TEXT' as const },
      USER_B
    );
    expect(resultB.content).toBe('Edit from user B');
    expect(resultB.user_id).toBe('user-b');
  });

  it('message content is sanitized to prevent XSS in concurrent edits', async () => {
    setupSelectChain([MOCK_DISCUSSION]);
    const sanitizedMsg = {
      id: 'msg-xss',
      discussion_id: 'disc-1',
      user_id: 'user-a',
      content: 'alert("xss")',
      message_type: 'TEXT',
      parent_message_id: null,
      created_at: new Date(),
    };
    setupInsertChain([sanitizedMsg]);

    const result = await service.addMessage(
      'disc-1',
      { content: '<script>alert("xss")</script>', messageType: 'TEXT' as const },
      USER_A
    );
    // The service strips HTML tags
    expect(result).toBeDefined();
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.not.stringContaining('<script>'),
      })
    );
  });

  it('message exceeding 2000 chars is rejected (BadRequestException)', async () => {
    const longContent = 'X'.repeat(2001);
    await expect(
      service.addMessage(
        'disc-1',
        { content: longContent, messageType: 'TEXT' as const },
        USER_A
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('both users can reply to the same parent message without conflict', async () => {
    const parentMsg = {
      id: 'parent-1',
      discussion_id: 'disc-1',
      user_id: 'user-a',
      content: 'Original message',
      message_type: 'TEXT',
      parent_message_id: null,
      created_at: new Date(),
    };

    // User A reply — findDiscussion, then findMessageById for parent
    let callCountA = 0;
    mockFrom.mockImplementation(() => {
      callCountA++;
      const result = callCountA === 1 ? [MOCK_DISCUSSION] : [parentMsg];
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
    setupInsertChain([{
      ...parentMsg,
      id: 'reply-a',
      user_id: 'user-a',
      content: 'Reply from A',
      parent_message_id: 'parent-1',
    }]);

    const replyA = await service.addMessage(
      'disc-1',
      {
        content: 'Reply from A',
        messageType: 'TEXT' as const,
        parentMessageId: '550e8400-e29b-41d4-a716-446655440001',
      },
      USER_A
    );
    expect(replyA.parent_message_id).toBe('parent-1');

    // User B reply
    vi.clearAllMocks();
    let callCountB = 0;
    mockFrom.mockImplementation(() => {
      callCountB++;
      const result = callCountB === 1 ? [MOCK_DISCUSSION] : [parentMsg];
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
    setupInsertChain([{
      ...parentMsg,
      id: 'reply-b',
      user_id: 'user-b',
      content: 'Reply from B',
      parent_message_id: 'parent-1',
    }]);

    const replyB = await service.addMessage(
      'disc-1',
      {
        content: 'Reply from B',
        messageType: 'TEXT' as const,
        parentMessageId: '550e8400-e29b-41d4-a716-446655440001',
      },
      USER_B
    );
    expect(replyB.parent_message_id).toBe('parent-1');
  });
});
