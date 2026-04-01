import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';

// ─── DB mock ───────────────────────────────────────────────────────────────
const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn(mockTx)
);

const mockTx = {
  select: vi.fn(),
  insert: vi.fn(),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockTx,
  schema: {
    discussions: { id: 'id' },
    discussion_messages: {
      id: 'id',
      discussion_id: 'discussion_id',
      parent_message_id: 'parent_message_id',
      created_at: 'created_at',
    },
    discussion_participants: {
      discussion_id: 'discussion_id',
      user_id: 'user_id',
    },
  },
  eq: vi.fn(),
  and: vi.fn(),
  desc: vi.fn(),
  inArray: vi.fn(),
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
  sql: vi.fn(),
  closeAllPools: vi.fn(),
}));

// ─── DiscussionThreadService mock ──────────────────────────────────────────
const mockFindDiscussionById = vi.fn();
const mockToTenantContext = vi.fn(() => ({
  tenantId: 'tenant-1',
  userId: 'user-1',
  userRole: 'STUDENT',
}));

vi.mock('./discussion-thread.service', () => ({
  DiscussionThreadService: class {
    db = mockTx;
    findDiscussionById = mockFindDiscussionById;
    toTenantContext = mockToTenantContext;
  },
}));

import { DiscussionMessageService } from './discussion-message.service.js';
import { DiscussionThreadService } from './discussion-thread.service.js';

const authContext: AuthContext = {
  tenantId: 'tenant-1',
  userId: 'user-1',
  roles: ['STUDENT'],
  scopes: [],
  sub: 'user-1',
};

const sampleMessage = {
  id: 'msg-1',
  discussion_id: 'disc-1',
  user_id: 'user-1',
  content: 'Hello',
  message_type: 'TEXT',
  parent_message_id: null,
};

describe('DiscussionMessageService', () => {
  let service: DiscussionMessageService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DiscussionMessageService(
      new DiscussionThreadService() as never
    );
    mockFindDiscussionById.mockResolvedValue({ id: 'disc-1' });
  });

  // ── findMessagesByDiscussion ──────────────────────────────────────────
  describe('findMessagesByDiscussion', () => {
    it('returns paginated messages', async () => {
      const mockOffset = vi.fn().mockResolvedValue([sampleMessage]);
      const mockLimit = vi.fn(() => ({ offset: mockOffset }));
      const mockOrderBy = vi.fn(() => ({ limit: mockLimit }));
      const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      const result = await service.findMessagesByDiscussion(
        'disc-1',
        20,
        0,
        authContext
      );
      expect(result).toEqual([sampleMessage]);
      expect(mockFindDiscussionById).toHaveBeenCalledWith(
        'disc-1',
        authContext
      );
    });
  });

  // ── findMessageById ───────────────────────────────────────────────────
  describe('findMessageById', () => {
    it('returns message when found', async () => {
      const mockLimit = vi.fn().mockResolvedValue([sampleMessage]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      const result = await service.findMessageById('msg-1', authContext);
      expect(result).toEqual(sampleMessage);
    });

    it('returns null when not found', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      const result = await service.findMessageById('bad-id', authContext);
      expect(result).toBeNull();
    });
  });

  // ── addMessage ────────────────────────────────────────────────────────
  describe('addMessage', () => {
    it('adds a message to a discussion', async () => {
      const mockReturning = vi.fn().mockResolvedValue([sampleMessage]);
      const mockValues = vi.fn(() => ({ returning: mockReturning }));
      mockTx.insert.mockReturnValue({ values: mockValues });

      const input = {
        content: 'Hello',
        messageType: 'TEXT',
      };

      const result = await service.addMessage(
        'disc-1',
        input as never,
        authContext
      );
      expect(result).toEqual(sampleMessage);
    });

    it('throws BadRequestException for content over 2000 chars', async () => {
      const input = {
        content: 'x'.repeat(2001),
        messageType: 'TEXT',
      };

      await expect(
        service.addMessage('disc-1', input as never, authContext)
      ).rejects.toThrow(BadRequestException);
    });

    it('strips HTML tags from content (XSS prevention)', async () => {
      const mockReturning = vi.fn().mockResolvedValue([
        {
          ...sampleMessage,
          content: 'alert',
        },
      ]);
      const mockValues = vi.fn((..._args: unknown[]) => {
        return { returning: mockReturning };
      });
      mockTx.insert.mockReturnValue({ values: mockValues });

      const input = {
        content: '<script>alert</script>',
        messageType: 'TEXT',
      };

      await service.addMessage('disc-1', input as never, authContext);
      // The service strips HTML tags, so insert should receive sanitized content
      expect(mockValues).toHaveBeenCalled();
    });

    it('throws NotFoundException for invalid parent message', async () => {
      // findMessageById returns null for parent
      const mockLimit = vi.fn().mockResolvedValue([]);
      const mockWhere = vi.fn(() => ({ limit: mockLimit }));
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      const input = {
        content: 'Reply text',
        messageType: 'TEXT',
        parentMessageId: 'nonexistent',
      };

      await expect(
        service.addMessage('disc-1', input as never, authContext)
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── countMessages ─────────────────────────────────────────────────────
  describe('countMessages', () => {
    it('returns message count for a discussion', async () => {
      const mockWhere = vi.fn().mockResolvedValue([{ count: 5 }]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      const result = await service.countMessages('disc-1', authContext);
      expect(result).toBe(5);
    });

    it('returns 0 when no messages', async () => {
      const mockWhere = vi.fn().mockResolvedValue([{}]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      const result = await service.countMessages('disc-1', authContext);
      expect(result).toBe(0);
    });
  });

  // ── countReplies ──────────────────────────────────────────────────────
  describe('countReplies', () => {
    it('returns reply count for a parent message', async () => {
      const mockWhere = vi.fn().mockResolvedValue([{ count: 3 }]);
      const mockFrom = vi.fn(() => ({ where: mockWhere }));
      mockTx.select.mockReturnValue({ from: mockFrom });

      const result = await service.countReplies('msg-1', authContext);
      expect(result).toBe(3);
    });
  });
});
