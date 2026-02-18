import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  DiscussionResolver,
  DiscussionMessageResolver,
  DiscussionParticipantResolver,
} from './discussion.resolver';
import type { AuthContext } from '@edusphere/auth';

// ── Mock graphql-yoga pubSub ──────────────────────────────────────────────────

const mockPublish = vi.fn();
const mockSubscribe = vi.fn(() => ({ [Symbol.asyncIterator]: vi.fn() }));

vi.mock('graphql-yoga', () => ({
  createPubSub: vi.fn(() => ({
    publish: mockPublish,
    subscribe: mockSubscribe,
  })),
}));

// ── Mock DiscussionService ────────────────────────────────────────────────────

const mockDiscussionService = {
  findDiscussionById: vi.fn(),
  findDiscussionsByCourse: vi.fn(),
  findMessagesByDiscussion: vi.fn(),
  findMessageById: vi.fn(),
  findRepliesByParent: vi.fn(),
  countReplies: vi.fn(),
  findParticipantsByDiscussion: vi.fn(),
  countParticipants: vi.fn(),
  countMessages: vi.fn(),
  createDiscussion: vi.fn(),
  addMessage: vi.fn(),
  joinDiscussion: vi.fn(),
  leaveDiscussion: vi.fn(),
};

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

// ── DiscussionResolver tests ──────────────────────────────────────────────────

describe('DiscussionResolver', () => {
  let resolver: DiscussionResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new DiscussionResolver(mockDiscussionService as any);
  });

  // ─── getDiscussion query ──────────────────────────────────────────────────

  describe('getDiscussion()', () => {
    it('returns discussion when authenticated', async () => {
      mockDiscussionService.findDiscussionById.mockResolvedValue(MOCK_DISCUSSION);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.getDiscussion('disc-1', ctx);
      expect(result).toEqual(MOCK_DISCUSSION);
      expect(mockDiscussionService.findDiscussionById).toHaveBeenCalledWith('disc-1', MOCK_AUTH);
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(resolver.getDiscussion('disc-1', ctx)).rejects.toThrow('Unauthenticated');
    });

    it('does not call service when unauthenticated', async () => {
      const ctx = { req: {} };
      try { await resolver.getDiscussion('disc-1', ctx); } catch (_) { /* expected */ }
      expect(mockDiscussionService.findDiscussionById).not.toHaveBeenCalled();
    });
  });

  // ─── getDiscussions query ─────────────────────────────────────────────────

  describe('getDiscussions()', () => {
    it('returns list of discussions for a course', async () => {
      mockDiscussionService.findDiscussionsByCourse.mockResolvedValue([MOCK_DISCUSSION]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.getDiscussions('course-1', 20, 0, ctx);
      expect(result).toEqual([MOCK_DISCUSSION]);
      expect(mockDiscussionService.findDiscussionsByCourse).toHaveBeenCalledWith(
        'course-1', 20, 0, MOCK_AUTH
      );
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(resolver.getDiscussions('course-1', 20, 0, ctx)).rejects.toThrow('Unauthenticated');
    });

    it('passes correct pagination params to service', async () => {
      mockDiscussionService.findDiscussionsByCourse.mockResolvedValue([]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      await resolver.getDiscussions('course-1', 5, 15, ctx);
      expect(mockDiscussionService.findDiscussionsByCourse).toHaveBeenCalledWith(
        'course-1', 5, 15, MOCK_AUTH
      );
    });
  });

  // ─── getDiscussionMessages query ──────────────────────────────────────────

  describe('getDiscussionMessages()', () => {
    it('returns messages for a discussion', async () => {
      mockDiscussionService.findMessagesByDiscussion.mockResolvedValue([MOCK_MESSAGE]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.getDiscussionMessages('disc-1', 50, 0, ctx);
      expect(result).toEqual([MOCK_MESSAGE]);
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(
        resolver.getDiscussionMessages('disc-1', 50, 0, ctx)
      ).rejects.toThrow('Unauthenticated');
    });
  });

  // ─── createDiscussion mutation ────────────────────────────────────────────

  describe('createDiscussion()', () => {
    const validInput = {
      courseId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'New Forum',
      discussionType: 'FORUM' as const,
    };

    it('creates and returns a discussion', async () => {
      mockDiscussionService.createDiscussion.mockResolvedValue(MOCK_DISCUSSION);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.createDiscussion(validInput, ctx);
      expect(result).toEqual(MOCK_DISCUSSION);
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(resolver.createDiscussion(validInput, ctx)).rejects.toThrow('Unauthenticated');
    });

    it('validates input through Zod schema before calling service', async () => {
      mockDiscussionService.createDiscussion.mockResolvedValue(MOCK_DISCUSSION);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      await resolver.createDiscussion(validInput, ctx);
      // Service receives validated input
      expect(mockDiscussionService.createDiscussion).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Forum' }),
        MOCK_AUTH
      );
    });

    it('rejects invalid input (empty title)', async () => {
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const badInput = { courseId: '550e8400-e29b-41d4-a716-446655440000', title: '', discussionType: 'FORUM' as const };
      await expect(resolver.createDiscussion(badInput, ctx)).rejects.toThrow();
    });
  });

  // ─── addMessage mutation ──────────────────────────────────────────────────

  describe('addMessage()', () => {
    const validMessageInput = {
      content: 'Hello, world!',
      messageType: 'TEXT' as const,
    };

    it('adds message and returns it', async () => {
      mockDiscussionService.addMessage.mockResolvedValue(MOCK_MESSAGE);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.addMessage('disc-1', validMessageInput, ctx);
      expect(result).toEqual(MOCK_MESSAGE);
    });

    it('publishes to pubSub after adding message', async () => {
      mockDiscussionService.addMessage.mockResolvedValue(MOCK_MESSAGE);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      await resolver.addMessage('disc-1', validMessageInput, ctx);
      expect(mockPublish).toHaveBeenCalledWith('messageAdded_disc-1', {
        messageAdded: MOCK_MESSAGE,
      });
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(
        resolver.addMessage('disc-1', validMessageInput, ctx)
      ).rejects.toThrow('Unauthenticated');
    });

    it('does not publish when unauthenticated', async () => {
      const ctx = { req: {} };
      try {
        await resolver.addMessage('disc-1', validMessageInput, ctx);
      } catch (_) { /* expected */ }
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('rejects message with empty content', async () => {
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const badInput = { content: '', messageType: 'TEXT' as const };
      await expect(resolver.addMessage('disc-1', badInput, ctx)).rejects.toThrow();
    });
  });

  // ─── joinDiscussion mutation ──────────────────────────────────────────────

  describe('joinDiscussion()', () => {
    it('returns true when joining succeeds', async () => {
      mockDiscussionService.joinDiscussion.mockResolvedValue(true);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.joinDiscussion('disc-1', ctx);
      expect(result).toBe(true);
    });

    it('delegates to service with correct args', async () => {
      mockDiscussionService.joinDiscussion.mockResolvedValue(true);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      await resolver.joinDiscussion('disc-1', ctx);
      expect(mockDiscussionService.joinDiscussion).toHaveBeenCalledWith('disc-1', MOCK_AUTH);
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(resolver.joinDiscussion('disc-1', ctx)).rejects.toThrow('Unauthenticated');
    });
  });

  // ─── leaveDiscussion mutation ─────────────────────────────────────────────

  describe('leaveDiscussion()', () => {
    it('returns true when leaving succeeds', async () => {
      mockDiscussionService.leaveDiscussion.mockResolvedValue(true);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.leaveDiscussion('disc-1', ctx);
      expect(result).toBe(true);
    });

    it('delegates to service with correct args', async () => {
      mockDiscussionService.leaveDiscussion.mockResolvedValue(true);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      await resolver.leaveDiscussion('disc-1', ctx);
      expect(mockDiscussionService.leaveDiscussion).toHaveBeenCalledWith('disc-1', MOCK_AUTH);
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(resolver.leaveDiscussion('disc-1', ctx)).rejects.toThrow('Unauthenticated');
    });
  });

  // ─── subscribeToMessages subscription ────────────────────────────────────

  describe('subscribeToMessages()', () => {
    it('subscribes to correct pubSub channel', () => {
      resolver.subscribeToMessages('disc-1');
      expect(mockSubscribe).toHaveBeenCalledWith('messageAdded_disc-1');
    });

    it('uses discussionId in channel name', () => {
      resolver.subscribeToMessages('disc-abc-123');
      expect(mockSubscribe).toHaveBeenCalledWith('messageAdded_disc-abc-123');
    });
  });

  // ─── field resolvers ──────────────────────────────────────────────────────

  describe('resolveCourse()', () => {
    it('returns federation stub with course_id', () => {
      const discussion = { ...MOCK_DISCUSSION, course_id: 'course-42' };
      const result = resolver.resolveCourse(discussion);
      expect(result).toEqual({ __typename: 'Course', id: 'course-42' });
    });
  });

  describe('resolveCreator()', () => {
    it('returns federation stub with creator_id', () => {
      const discussion = { ...MOCK_DISCUSSION, creator_id: 'user-99' };
      const result = resolver.resolveCreator(discussion);
      expect(result).toEqual({ __typename: 'User', id: 'user-99' });
    });
  });

  describe('resolveMessages()', () => {
    it('delegates to findMessagesByDiscussion', async () => {
      mockDiscussionService.findMessagesByDiscussion.mockResolvedValue([MOCK_MESSAGE]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.resolveMessages(MOCK_DISCUSSION, 50, 0, ctx);
      expect(mockDiscussionService.findMessagesByDiscussion).toHaveBeenCalledWith(
        'disc-1', 50, 0, MOCK_AUTH
      );
      expect(result).toEqual([MOCK_MESSAGE]);
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(
        resolver.resolveMessages(MOCK_DISCUSSION, 50, 0, ctx)
      ).rejects.toThrow('Unauthenticated');
    });
  });

  describe('resolveParticipants()', () => {
    it('delegates to findParticipantsByDiscussion', async () => {
      mockDiscussionService.findParticipantsByDiscussion.mockResolvedValue([MOCK_PARTICIPANT]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.resolveParticipants(MOCK_DISCUSSION, ctx);
      expect(mockDiscussionService.findParticipantsByDiscussion).toHaveBeenCalledWith('disc-1', MOCK_AUTH);
      expect(result).toEqual([MOCK_PARTICIPANT]);
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(
        resolver.resolveParticipants(MOCK_DISCUSSION, ctx)
      ).rejects.toThrow('Unauthenticated');
    });
  });

  describe('resolveParticipantCount()', () => {
    it('returns participant count', async () => {
      mockDiscussionService.countParticipants.mockResolvedValue(7);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.resolveParticipantCount(MOCK_DISCUSSION, ctx);
      expect(result).toBe(7);
    });
  });

  describe('resolveMessageCount()', () => {
    it('returns message count', async () => {
      mockDiscussionService.countMessages.mockResolvedValue(42);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.resolveMessageCount(MOCK_DISCUSSION, ctx);
      expect(result).toBe(42);
    });
  });
});

// ── DiscussionMessageResolver tests ──────────────────────────────────────────

describe('DiscussionMessageResolver', () => {
  let resolver: DiscussionMessageResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new DiscussionMessageResolver(mockDiscussionService as any);
  });

  describe('resolveDiscussion()', () => {
    it('returns parent discussion', async () => {
      mockDiscussionService.findDiscussionById.mockResolvedValue(MOCK_DISCUSSION);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.resolveDiscussion(MOCK_MESSAGE, ctx);
      expect(result).toEqual(MOCK_DISCUSSION);
      expect(mockDiscussionService.findDiscussionById).toHaveBeenCalledWith('disc-1', MOCK_AUTH);
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(
        resolver.resolveDiscussion(MOCK_MESSAGE, ctx)
      ).rejects.toThrow('Unauthenticated');
    });
  });

  describe('resolveUser()', () => {
    it('returns federation stub with user_id', () => {
      const message = { ...MOCK_MESSAGE, user_id: 'user-77' };
      const result = resolver.resolveUser(message);
      expect(result).toEqual({ __typename: 'User', id: 'user-77' });
    });
  });

  describe('resolveParentMessage()', () => {
    it('returns null when no parent_message_id', async () => {
      const message = { ...MOCK_MESSAGE, parent_message_id: null };
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.resolveParentMessage(message, ctx);
      expect(result).toBeNull();
    });

    it('returns parent message when parent_message_id present', async () => {
      const parentMsg = { ...MOCK_MESSAGE, id: 'parent-1' };
      mockDiscussionService.findMessageById.mockResolvedValue(parentMsg);
      const message = { ...MOCK_MESSAGE, parent_message_id: 'parent-1' };
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.resolveParentMessage(message, ctx);
      expect(result).toEqual(parentMsg);
    });

    it('throws Unauthenticated when parent_message_id set but no authContext', async () => {
      const message = { ...MOCK_MESSAGE, parent_message_id: 'parent-1' };
      const ctx = { req: {} };
      await expect(
        resolver.resolveParentMessage(message, ctx)
      ).rejects.toThrow('Unauthenticated');
    });
  });

  describe('resolveReplies()', () => {
    it('returns replies for a message', async () => {
      const reply = { ...MOCK_MESSAGE, id: 'reply-1', parent_message_id: 'msg-1' };
      mockDiscussionService.findRepliesByParent.mockResolvedValue([reply]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.resolveReplies(MOCK_MESSAGE, 20, 0, ctx);
      expect(result).toEqual([reply]);
      expect(mockDiscussionService.findRepliesByParent).toHaveBeenCalledWith('msg-1', 20, 0, MOCK_AUTH);
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(
        resolver.resolveReplies(MOCK_MESSAGE, 20, 0, ctx)
      ).rejects.toThrow('Unauthenticated');
    });
  });

  describe('resolveReplyCount()', () => {
    it('returns reply count', async () => {
      mockDiscussionService.countReplies.mockResolvedValue(3);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.resolveReplyCount(MOCK_MESSAGE, ctx);
      expect(result).toBe(3);
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(
        resolver.resolveReplyCount(MOCK_MESSAGE, ctx)
      ).rejects.toThrow('Unauthenticated');
    });
  });
});

// ── DiscussionParticipantResolver tests ───────────────────────────────────────

describe('DiscussionParticipantResolver', () => {
  let resolver: DiscussionParticipantResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new DiscussionParticipantResolver(mockDiscussionService as any);
  });

  describe('resolveDiscussion()', () => {
    it('returns discussion for participant', async () => {
      mockDiscussionService.findDiscussionById.mockResolvedValue(MOCK_DISCUSSION);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const result = await resolver.resolveDiscussion(MOCK_PARTICIPANT, ctx);
      expect(result).toEqual(MOCK_DISCUSSION);
      expect(mockDiscussionService.findDiscussionById).toHaveBeenCalledWith('disc-1', MOCK_AUTH);
    });

    it('throws Unauthenticated when no authContext', async () => {
      const ctx = { req: {} };
      await expect(
        resolver.resolveDiscussion(MOCK_PARTICIPANT, ctx)
      ).rejects.toThrow('Unauthenticated');
    });
  });

  describe('resolveUser()', () => {
    it('returns federation stub with user_id', () => {
      const participant = { ...MOCK_PARTICIPANT, user_id: 'user-55' };
      const result = resolver.resolveUser(participant);
      expect(result).toEqual({ __typename: 'User', id: 'user-55' });
    });
  });
});
