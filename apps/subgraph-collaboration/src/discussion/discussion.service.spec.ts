import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DiscussionService } from './discussion.service';
import type { AuthContext } from '@edusphere/auth';

// ── DB mock setup ────────────────────────────────────────────────────────────
//
// Drizzle ORM query chains used in the service:
//   findById:          select().from().where().limit(1)          → promise
//   findByCourse:      select().from().where().orderBy().limit().offset() → promise
//   countXxx:          select().from().where()                   → promise
//   findParticipants:  select().from().where()                   → promise
//
// To support all chains we build a single "chainable" mock object that
// any chained call returns, and only the terminal call resolves.

let _mockResolveValue: unknown[] = [];

const chain: Record<string, (...args: unknown[]) => unknown> = {};
const _makeChain = (): typeof chain => {
  // Each method returns the same chain object, except terminal methods
  // that resolve based on _mockResolveValue.
  // We keep a "callCount" per chain so sequential calls can have different results.
  return chain;
};

// Terminal resolvers — called without arguments, resolve to array
const terminalOffset = vi.fn(async () => _mockResolveValue);
const terminalLimit  = vi.fn(async () => _mockResolveValue);
// .where() for count queries resolves directly
const _terminalWhere  = vi.fn(async () => _mockResolveValue);

// Non-terminal mocks
const mockOffset  = vi.fn(() => terminalOffset());
const mockLimit   = vi.fn(() => ({ offset: mockOffset, then: terminalLimit.bind(terminalLimit) }));
const _mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
const mockSelect  = vi.fn();
const mockFrom    = vi.fn();
const _mockWhere   = vi.fn();
const mockInsert  = vi.fn();
const mockValues  = vi.fn();
const mockReturning = vi.fn();
const mockDelete  = vi.fn();

// We override mockLimit & mockOffset to resolve promises correctly
// Vitest mocks: each call returns a thenable chain.

const mockTx = {
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
};

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  delete: mockDelete,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
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
  and: vi.fn((...conditions) => ({ conditions, op: 'and' })),
  desc: vi.fn((col) => ({ col, order: 'desc' })),
  sql: vi.fn(() => ({ raw: true })),
  withTenantContext: vi.fn(async (_db, _ctx, callback) => callback(mockTx)),
}));

import { withTenantContext } from '@edusphere/db';

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

const ADMIN_AUTH: AuthContext = {
  userId: 'admin-1',
  email: 'admin@example.com',
  username: 'admin',
  tenantId: 'tenant-1',
  roles: ['ORG_ADMIN'],
  scopes: ['read', 'write'],
  isSuperAdmin: false,
};

const MOCK_DISCUSSION = {
  id: 'disc-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'Test Discussion',
  creator_id: 'user-1',
  discussion_type: 'FORUM',
  created_at: new Date(),
};

const MOCK_MESSAGE = {
  id: 'msg-1',
  discussion_id: 'disc-1',
  user_id: 'user-1',
  content: 'Hello world',
  message_type: 'TEXT',
  parent_message_id: null,
  created_at: new Date(),
};

const MOCK_PARTICIPANT = {
  discussion_id: 'disc-1',
  user_id: 'user-1',
};

// ── Helper: configure the query chain to resolve with `result` ────────────────

function setupSelectChain(result: unknown[]) {
  // Supports all Drizzle patterns used in the service:
  //   .select().from().where().limit(n)                 → result
  //   .select().from().where().orderBy().limit().offset() → result
  //   .select().from().where()                           → result (for count / participants)

  const offsetPromise = Promise.resolve(result);
  const limitObj = {
    offset: vi.fn(() => offsetPromise),
  };
  // limit itself should be a thenable (for .limit(1) direct awaiting)
  const limitFn = vi.fn(() => {
    const p = Promise.resolve(result) as Promise<unknown[]> & { offset: typeof limitObj.offset };
    (p as unknown as { offset: typeof limitObj.offset }).offset = limitObj.offset;
    return p;
  });
  const orderByObj = { limit: limitFn };

  // .where() must support: .limit() chain AND resolve itself (for count queries)
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

function setupDeleteChain() {
  const whereResult = Promise.resolve({ rowCount: 1 });
  mockDelete.mockReturnValue({ where: vi.fn(() => whereResult) });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DiscussionService', () => {
  let service: DiscussionService;

  beforeEach(() => {
    vi.clearAllMocks();
    setupSelectChain([MOCK_DISCUSSION]);
    setupInsertChain([MOCK_DISCUSSION]);
    service = new DiscussionService();
  });

  // ─── toTenantContext ──────────────────────────────────────────────────────

  describe('toTenantContext() (internal)', () => {
    it('uses first role from roles array', async () => {
      await service.findDiscussionById('disc-1', ADMIN_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ userRole: 'ORG_ADMIN' }),
        expect.any(Function)
      );
    });

    it('falls back to STUDENT when roles array is empty', async () => {
      const noRolesAuth: AuthContext = { ...MOCK_AUTH, roles: [] };
      await service.findDiscussionById('disc-1', noRolesAuth);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ userRole: 'STUDENT' }),
        expect.any(Function)
      );
    });

    it('maps tenantId and userId from authContext', async () => {
      await service.findDiscussionById('disc-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        expect.any(Function)
      );
    });
  });

  // ─── findDiscussionById ───────────────────────────────────────────────────

  describe('findDiscussionById()', () => {
    it('returns discussion when found', async () => {
      const result = await service.findDiscussionById('disc-1', MOCK_AUTH);
      expect(result).toEqual(MOCK_DISCUSSION);
    });

    it('throws NotFoundException when discussion does not exist', async () => {
      setupSelectChain([]);
      await expect(
        service.findDiscussionById('nonexistent', MOCK_AUTH)
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException with id in message', async () => {
      setupSelectChain([]);
      await expect(
        service.findDiscussionById('missing-id', MOCK_AUTH)
      ).rejects.toThrow('Discussion missing-id not found');
    });

    it('calls withTenantContext', async () => {
      await service.findDiscussionById('disc-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledOnce();
    });
  });

  // ─── findDiscussionsByCourse ──────────────────────────────────────────────

  describe('findDiscussionsByCourse()', () => {
    it('returns list of discussions', async () => {
      setupSelectChain([MOCK_DISCUSSION]);
      const result = await service.findDiscussionsByCourse('course-1', 20, 0, MOCK_AUTH);
      expect(Array.isArray(result)).toBe(true);
    });

    it('calls withTenantContext for tenant isolation', async () => {
      setupSelectChain([MOCK_DISCUSSION]);
      await service.findDiscussionsByCourse('course-1', 20, 0, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Function)
      );
    });

    it('resolves without error when given valid pagination', async () => {
      setupSelectChain([]);
      await expect(
        service.findDiscussionsByCourse('course-1', 5, 10, MOCK_AUTH)
      ).resolves.toBeDefined();
    });
  });

  // ─── createDiscussion ─────────────────────────────────────────────────────

  describe('createDiscussion()', () => {
    it('creates a discussion and returns it', async () => {
      const mockParticipantValues = vi.fn().mockResolvedValue([MOCK_PARTICIPANT]);
      mockInsert.mockReturnValueOnce({ values: mockValues })
                .mockReturnValueOnce({ values: mockParticipantValues });
      mockReturning.mockResolvedValue([MOCK_DISCUSSION]);
      mockValues.mockReturnValue({ returning: mockReturning });

      const input = {
        courseId: 'course-1',
        title: 'New Discussion',
        discussionType: 'FORUM' as const,
      };
      const result = await service.createDiscussion(input, MOCK_AUTH);
      expect(result).toEqual(MOCK_DISCUSSION);
    });

    it('calls withTenantContext for RLS', async () => {
      mockInsert.mockReturnValue({ values: mockValues });
      mockValues.mockReturnValue({ returning: mockReturning });
      mockReturning.mockResolvedValue([MOCK_DISCUSSION]);

      const input = {
        courseId: 'course-1',
        title: 'Test',
        discussionType: 'CHAVRUTA' as const,
      };
      await service.createDiscussion(input, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledWith(
        mockDb,
        expect.objectContaining({ tenantId: 'tenant-1', userId: 'user-1' }),
        expect.any(Function)
      );
    });

    it('auto-joins creator as participant (two inserts)', async () => {
      const mockParticipantValues = vi.fn().mockResolvedValue([MOCK_PARTICIPANT]);
      mockInsert.mockReturnValueOnce({ values: mockValues })
                .mockReturnValueOnce({ values: mockParticipantValues });
      mockValues.mockReturnValue({ returning: mockReturning });
      mockReturning.mockResolvedValue([MOCK_DISCUSSION]);

      const input = {
        courseId: 'course-1',
        title: 'Test',
        discussionType: 'DEBATE' as const,
      };
      await service.createDiscussion(input, MOCK_AUTH);
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });
  });

  // ─── findMessagesByDiscussion ─────────────────────────────────────────────

  describe('findMessagesByDiscussion()', () => {
    it('returns messages when discussion exists', async () => {
      // First chain call resolves discussion; subsequent resolves messages
      setupSelectChain([MOCK_DISCUSSION]);
      const result = await service.findMessagesByDiscussion('disc-1', 50, 0, MOCK_AUTH);
      expect(result).toBeDefined();
    });

    it('calls withTenantContext for RLS enforcement', async () => {
      setupSelectChain([MOCK_DISCUSSION]);
      await service.findMessagesByDiscussion('disc-1', 50, 0, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalled();
    });
  });

  // ─── findMessageById ──────────────────────────────────────────────────────

  describe('findMessageById()', () => {
    it('returns message when found', async () => {
      setupSelectChain([MOCK_MESSAGE]);
      const result = await service.findMessageById('msg-1', MOCK_AUTH);
      expect(result).toEqual(MOCK_MESSAGE);
    });

    it('returns null when message not found', async () => {
      setupSelectChain([]);
      const result = await service.findMessageById('nonexistent', MOCK_AUTH);
      expect(result).toBeNull();
    });

    it('calls withTenantContext', async () => {
      setupSelectChain([MOCK_MESSAGE]);
      await service.findMessageById('msg-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledOnce();
    });
  });

  // ─── findRepliesByParent ──────────────────────────────────────────────────

  describe('findRepliesByParent()', () => {
    it('returns replies for a parent message', async () => {
      setupSelectChain([MOCK_MESSAGE]);
      const result = await service.findRepliesByParent('msg-1', 20, 0, MOCK_AUTH);
      expect(result).toBeDefined();
    });

    it('calls withTenantContext', async () => {
      setupSelectChain([MOCK_MESSAGE]);
      await service.findRepliesByParent('msg-1', 20, 0, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledOnce();
    });
  });

  // ─── countReplies ─────────────────────────────────────────────────────────

  describe('countReplies()', () => {
    it('returns count value when replies exist', async () => {
      setupSelectChain([{ count: 3 }]);
      const result = await service.countReplies('msg-1', MOCK_AUTH);
      expect(result).toBe(3);
    });

    it('returns 0 when no replies found', async () => {
      setupSelectChain([{ count: 0 }]);
      const result = await service.countReplies('msg-1', MOCK_AUTH);
      expect(result).toBe(0);
    });

    it('returns 0 when query returns empty array', async () => {
      setupSelectChain([]);
      const result = await service.countReplies('msg-1', MOCK_AUTH);
      expect(result).toBe(0);
    });
  });

  // ─── addMessage ───────────────────────────────────────────────────────────

  describe('addMessage()', () => {
    it('adds a message and returns it', async () => {
      setupSelectChain([MOCK_DISCUSSION]);
      setupInsertChain([MOCK_MESSAGE]);

      const input = {
        content: 'Hello world',
        messageType: 'TEXT' as const,
      };
      const result = await service.addMessage('disc-1', input, MOCK_AUTH);
      expect(result).toEqual(MOCK_MESSAGE);
    });

    it('calls withTenantContext for RLS enforcement', async () => {
      setupSelectChain([MOCK_DISCUSSION]);
      setupInsertChain([MOCK_MESSAGE]);

      await service.addMessage('disc-1', { content: 'Test', messageType: 'TEXT' as const }, MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalled();
    });

    it('throws NotFoundException when parent message not found', async () => {
      // findDiscussionById → MOCK_DISCUSSION; findMessageById → [] (not found)
      setupSelectChain([MOCK_DISCUSSION]);
      // Override for subsequent select (parent lookup) to return empty
      mockFrom.mockReturnValueOnce({
        where: vi.fn(() => Object.assign(Promise.resolve([MOCK_DISCUSSION]), {
          limit: vi.fn(() => Promise.resolve([MOCK_DISCUSSION])),
          orderBy: vi.fn(() => ({ limit: vi.fn(() => ({ offset: vi.fn(() => Promise.resolve([])) })) })),
        })),
      }).mockReturnValue({
        where: vi.fn(() => Object.assign(Promise.resolve([]), {
          limit: vi.fn(() => Promise.resolve([])),
          orderBy: vi.fn(() => ({ limit: vi.fn(() => ({ offset: vi.fn(() => Promise.resolve([])) })) })),
        })),
      });

      const input = {
        content: 'Reply',
        messageType: 'TEXT' as const,
        parentMessageId: '550e8400-e29b-41d4-a716-446655440001',
      };
      await expect(
        service.addMessage('disc-1', input, MOCK_AUTH)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── findParticipantsByDiscussion ─────────────────────────────────────────

  describe('findParticipantsByDiscussion()', () => {
    it('returns participants array', async () => {
      setupSelectChain([MOCK_DISCUSSION]);
      const result = await service.findParticipantsByDiscussion('disc-1', MOCK_AUTH);
      expect(result).toBeDefined();
    });

    it('calls withTenantContext', async () => {
      setupSelectChain([MOCK_DISCUSSION]);
      await service.findParticipantsByDiscussion('disc-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalled();
    });
  });

  // ─── countParticipants ────────────────────────────────────────────────────

  describe('countParticipants()', () => {
    it('returns participant count', async () => {
      setupSelectChain([{ count: 5 }]);
      const result = await service.countParticipants('disc-1', MOCK_AUTH);
      expect(result).toBe(5);
    });

    it('returns 0 when no participants', async () => {
      setupSelectChain([{ count: 0 }]);
      const result = await service.countParticipants('disc-1', MOCK_AUTH);
      expect(result).toBe(0);
    });

    it('returns 0 when query returns empty array', async () => {
      setupSelectChain([]);
      const result = await service.countParticipants('disc-1', MOCK_AUTH);
      expect(result).toBe(0);
    });
  });

  // ─── countMessages ────────────────────────────────────────────────────────

  describe('countMessages()', () => {
    it('returns message count', async () => {
      setupSelectChain([{ count: 12 }]);
      const result = await service.countMessages('disc-1', MOCK_AUTH);
      expect(result).toBe(12);
    });

    it('returns 0 when empty result', async () => {
      setupSelectChain([]);
      const result = await service.countMessages('disc-1', MOCK_AUTH);
      expect(result).toBe(0);
    });

    it('calls withTenantContext', async () => {
      setupSelectChain([{ count: 0 }]);
      await service.countMessages('disc-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalledOnce();
    });
  });

  // ─── joinDiscussion ───────────────────────────────────────────────────────

  describe('joinDiscussion()', () => {
    it('returns true when user joins successfully (not already participant)', async () => {
      // findDiscussionById → discussion; existing participant check → []
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        const result = callCount === 1 ? [MOCK_DISCUSSION] : [];
        const whereResult = Object.assign(Promise.resolve(result), {
          limit: vi.fn(() => Promise.resolve(result)),
          orderBy: vi.fn(() => ({ limit: vi.fn(() => ({ offset: vi.fn(() => Promise.resolve(result)) })) })),
        });
        return { where: vi.fn(() => whereResult), limit: vi.fn(() => Promise.resolve(result)) };
      });
      mockSelect.mockReturnValue({ from: mockFrom });

      const mockParticipantValues = vi.fn().mockResolvedValue([MOCK_PARTICIPANT]);
      mockInsert.mockReturnValue({ values: mockParticipantValues });

      const result = await service.joinDiscussion('disc-1', MOCK_AUTH);
      expect(result).toBe(true);
    });

    it('returns true immediately when already a participant (no insert)', async () => {
      // Both select calls return results
      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        const result = callCount === 1 ? [MOCK_DISCUSSION] : [MOCK_PARTICIPANT];
        const whereResult = Object.assign(Promise.resolve(result), {
          limit: vi.fn(() => Promise.resolve(result)),
          orderBy: vi.fn(() => ({ limit: vi.fn(() => ({ offset: vi.fn(() => Promise.resolve(result)) })) })),
        });
        return { where: vi.fn(() => whereResult), limit: vi.fn(() => Promise.resolve(result)) };
      });
      mockSelect.mockReturnValue({ from: mockFrom });

      const result = await service.joinDiscussion('disc-1', MOCK_AUTH);
      expect(result).toBe(true);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('calls withTenantContext', async () => {
      setupSelectChain([MOCK_DISCUSSION]);
      const mockParticipantValues = vi.fn().mockResolvedValue([MOCK_PARTICIPANT]);
      mockInsert.mockReturnValue({ values: mockParticipantValues });

      await service.joinDiscussion('disc-1', MOCK_AUTH);
      expect(withTenantContext).toHaveBeenCalled();
    });
  });

  // ─── leaveDiscussion ──────────────────────────────────────────────────────

  describe('leaveDiscussion()', () => {
    it('throws ForbiddenException when creator tries to leave', async () => {
      // MOCK_AUTH.userId === MOCK_DISCUSSION.creator_id ('user-1')
      setupSelectChain([MOCK_DISCUSSION]);

      await expect(
        service.leaveDiscussion('disc-1', MOCK_AUTH)
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws with descriptive message when creator tries to leave', async () => {
      setupSelectChain([MOCK_DISCUSSION]);

      await expect(
        service.leaveDiscussion('disc-1', MOCK_AUTH)
      ).rejects.toThrow('Discussion creator cannot leave');
    });

    it('returns true when a non-creator user leaves', async () => {
      const nonCreatorAuth: AuthContext = { ...MOCK_AUTH, userId: 'user-2' };
      setupSelectChain([MOCK_DISCUSSION]);
      setupDeleteChain();

      const result = await service.leaveDiscussion('disc-1', nonCreatorAuth);
      expect(result).toBe(true);
    });

    it('calls withTenantContext', async () => {
      const nonCreatorAuth: AuthContext = { ...MOCK_AUTH, userId: 'user-2' };
      setupSelectChain([MOCK_DISCUSSION]);
      setupDeleteChain();

      await service.leaveDiscussion('disc-1', nonCreatorAuth);
      expect(withTenantContext).toHaveBeenCalled();
    });
  });
});
