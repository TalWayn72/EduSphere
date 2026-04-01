import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── DiscussionService mock ────────────────────────────────────────────────
const mockFindDiscussionById = vi.fn();
const mockFindMessageById = vi.fn();
const mockFindRepliesByParent = vi.fn();
const mockCountReplies = vi.fn();

vi.mock('./discussion.service', () => ({
  DiscussionService: class {
    findDiscussionById = mockFindDiscussionById;
    findMessageById = mockFindMessageById;
    findRepliesByParent = mockFindRepliesByParent;
    countReplies = mockCountReplies;
  },
}));

import {
  DiscussionMessageResolver,
  DiscussionParticipantResolver,
} from './discussion-field.resolver.js';
import { DiscussionService } from './discussion.service.js';

const authContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roles: ['STUDENT'],
  scopes: [],
  sub: 'user-1',
};

const contextWith = { req: {}, authContext };
const contextWithout = { req: {} };

describe('DiscussionMessageResolver', () => {
  let resolver: DiscussionMessageResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new DiscussionMessageResolver(new DiscussionService() as never);
  });

  const message = {
    id: 'msg-1',
    discussion_id: 'disc-1',
    user_id: 'user-1',
    parent_message_id: null,
  };

  // ── resolveDiscussion ─────────────────────────────────────────────────
  describe('resolveDiscussion', () => {
    it('returns discussion for message', async () => {
      const disc = { id: 'disc-1', title: 'Test' };
      mockFindDiscussionById.mockResolvedValue(disc);

      const result = await resolver.resolveDiscussion(message, contextWith);
      expect(result).toEqual(disc);
      expect(mockFindDiscussionById).toHaveBeenCalledWith(
        'disc-1',
        authContext
      );
    });

    it('throws when unauthenticated', async () => {
      await expect(
        resolver.resolveDiscussion(message, contextWithout)
      ).rejects.toThrow('Unauthenticated');
    });
  });

  // ── resolveUser ───────────────────────────────────────────────────────
  describe('resolveUser', () => {
    it('returns User reference with __typename', () => {
      const result = resolver.resolveUser(message);
      expect(result).toEqual({ __typename: 'User', id: 'user-1' });
    });
  });

  // ── resolveParentMessage ──────────────────────────────────────────────
  describe('resolveParentMessage', () => {
    it('returns null when no parent', async () => {
      const result = await resolver.resolveParentMessage(message, contextWith);
      expect(result).toBeNull();
    });

    it('returns parent message when parentId exists', async () => {
      const parent = { id: 'parent-1', content: 'Parent msg' };
      mockFindMessageById.mockResolvedValue(parent);

      const msgWithParent = { ...message, parent_message_id: 'parent-1' };
      const result = await resolver.resolveParentMessage(
        msgWithParent,
        contextWith
      );
      expect(result).toEqual(parent);
      expect(mockFindMessageById).toHaveBeenCalledWith('parent-1', authContext);
    });

    it('throws when unauthenticated and parent exists', async () => {
      const msgWithParent = { ...message, parent_message_id: 'parent-1' };
      await expect(
        resolver.resolveParentMessage(msgWithParent, contextWithout)
      ).rejects.toThrow('Unauthenticated');
    });
  });

  // ── resolveReplies ────────────────────────────────────────────────────
  describe('resolveReplies', () => {
    it('returns replies with default pagination', async () => {
      const replies = [{ id: 'reply-1' }];
      mockFindRepliesByParent.mockResolvedValue(replies);

      const result = await resolver.resolveReplies(message, 20, 0, contextWith);
      expect(result).toEqual(replies);
      expect(mockFindRepliesByParent).toHaveBeenCalledWith(
        'msg-1',
        20,
        0,
        authContext
      );
    });

    it('throws when unauthenticated', async () => {
      await expect(
        resolver.resolveReplies(message, 20, 0, contextWithout)
      ).rejects.toThrow('Unauthenticated');
    });
  });

  // ── resolveReplyCount ─────────────────────────────────────────────────
  describe('resolveReplyCount', () => {
    it('returns count from service', async () => {
      mockCountReplies.mockResolvedValue(5);
      const result = await resolver.resolveReplyCount(message, contextWith);
      expect(result).toBe(5);
    });

    it('throws when unauthenticated', async () => {
      await expect(
        resolver.resolveReplyCount(message, contextWithout)
      ).rejects.toThrow('Unauthenticated');
    });
  });
});

describe('DiscussionParticipantResolver', () => {
  let resolver: DiscussionParticipantResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new DiscussionParticipantResolver(
      new DiscussionService() as never
    );
  });

  const participant = {
    discussion_id: 'disc-1',
    user_id: 'user-2',
  };

  // ── resolveDiscussion ─────────────────────────────────────────────────
  describe('resolveDiscussion', () => {
    it('returns discussion for participant', async () => {
      const disc = { id: 'disc-1' };
      mockFindDiscussionById.mockResolvedValue(disc);

      const result = await resolver.resolveDiscussion(participant, contextWith);
      expect(result).toEqual(disc);
    });

    it('throws when unauthenticated', async () => {
      await expect(
        resolver.resolveDiscussion(participant, contextWithout)
      ).rejects.toThrow('Unauthenticated');
    });
  });

  // ── resolveUser ───────────────────────────────────────────────────────
  describe('resolveUser', () => {
    it('returns User reference with __typename', () => {
      const result = resolver.resolveUser(participant);
      expect(result).toEqual({ __typename: 'User', id: 'user-2' });
    });
  });
});
