import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AuthContext } from '@edusphere/auth';

// ── NATS mock ─────────────────────────────────────────────────────────────────

const mockPublish = vi.fn().mockResolvedValue(undefined);
const mockNatsClient = { publish: mockPublish, close: vi.fn() };

vi.mock('@edusphere/nats-client', () => ({
  NatsKVClient: vi.fn().mockImplementation(() => mockNatsClient),
  createNatsConnection: vi.fn().mockResolvedValue(mockNatsClient),
}));

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockDiscussion = {
  id: 'disc-1',
  tenant_id: 'tenant-1',
  course_id: 'course-1',
  title: 'NATS Test',
  creator_id: 'user-1',
  discussion_type: 'FORUM',
};

const mockMessage = {
  id: 'msg-1',
  discussion_id: 'disc-1',
  user_id: 'user-1',
  content: 'Hello',
  message_type: 'TEXT',
  parent_message_id: null,
};

const mockReturning = vi.fn();
const mockValues = vi.fn(() => ({ returning: mockReturning }));
const mockInsert = vi.fn(() => ({ values: mockValues }));
const mockWhere = vi.fn(() =>
  Object.assign(Promise.resolve([mockDiscussion]), {
    limit: vi.fn(() => Promise.resolve([mockDiscussion])),
    orderBy: vi.fn(() => ({
      limit: vi.fn(() => ({ offset: vi.fn(() => Promise.resolve([])) })),
    })),
  })
);
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));
const mockTx = { select: mockSelect, insert: mockInsert };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  schema: {
    discussions: {
      id: 'id',
      tenant_id: 'tenant_id',
      course_id: 'course_id',
      creator_id: 'creator_id',
      discussion_type: 'discussion_type',
    },
    discussion_participants: {
      discussion_id: 'discussion_id',
      user_id: 'user_id',
    },
    discussion_messages: {
      id: 'id',
      discussion_id: 'discussion_id',
      parent_message_id: 'parent_message_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ conditions: c })),
  desc: vi.fn((col) => ({ col })),
  sql: vi.fn(() => ({ raw: true })),
  inArray: vi.fn(),
  withTenantContext: vi.fn(
    async (_db: unknown, _ctx: unknown, cb: (tx: unknown) => unknown) =>
      cb(mockTx)
  ),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

// ── pubSub mock (the resolver publishes NATS-equivalent events via pubSub) ───

const mockPubSubPublish = vi.fn();

vi.mock('graphql-yoga', () => ({
  createPubSub: vi.fn(() => ({
    publish: mockPubSubPublish,
    subscribe: vi.fn(),
  })),
}));

import { DiscussionService } from './discussion.service';
import { DiscussionResolver } from './discussion.resolver';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_AUTH: AuthContext = {
  userId: 'user-1',
  email: 'u@example.com',
  username: 'u1',
  tenantId: 'tenant-1',
  roles: ['STUDENT'],
  scopes: ['read'],
  isSuperAdmin: false,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Discussion — NATS event publishing', () => {
  let resolver: DiscussionResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReturning.mockResolvedValue([mockDiscussion]);
    // Reset insert chain each test
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ returning: mockReturning });

    const service = new DiscussionService();
    resolver = new DiscussionResolver(service);
  });

  describe('createDiscussion', () => {
    it('does not throw when DB insert succeeds (fire-and-forget pattern)', async () => {
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const input = {
        courseId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'New',
        discussionType: 'FORUM' as const,
      };
      await expect(
        resolver.createDiscussion(input, ctx)
      ).resolves.toBeDefined();
    });

    it('returns the created discussion from the service', async () => {
      const ctx = { req: {}, authContext: MOCK_AUTH };
      const input = {
        courseId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'New',
        discussionType: 'FORUM' as const,
      };
      const result = await resolver.createDiscussion(input, ctx);
      expect(result).toMatchObject({ id: 'disc-1', tenant_id: 'tenant-1' });
    });
  });

  describe('addMessage (discussion.reply_added)', () => {
    it('publishes to pubSub channel after adding a message', async () => {
      mockReturning.mockResolvedValueOnce([mockMessage]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      await resolver.addMessage(
        'disc-1',
        { content: 'Hello', messageType: 'TEXT' as const },
        ctx
      );
      expect(mockPubSubPublish).toHaveBeenCalledWith(
        'messageAdded_disc-1',
        expect.objectContaining({
          messageAdded: expect.objectContaining({ id: 'msg-1' }),
        })
      );
    });

    it('publishes event containing authorId (user_id)', async () => {
      mockReturning.mockResolvedValueOnce([mockMessage]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      await resolver.addMessage(
        'disc-1',
        { content: 'Hi', messageType: 'TEXT' as const },
        ctx
      );
      const published = mockPubSubPublish.mock.calls[0][1] as {
        messageAdded: typeof mockMessage;
      };
      expect(published.messageAdded.user_id).toBe('user-1');
    });

    it('publishes event containing discussion_id', async () => {
      mockReturning.mockResolvedValueOnce([mockMessage]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      await resolver.addMessage(
        'disc-1',
        { content: 'Hi', messageType: 'TEXT' as const },
        ctx
      );
      const published = mockPubSubPublish.mock.calls[0][1] as {
        messageAdded: typeof mockMessage;
      };
      expect(published.messageAdded.discussion_id).toBe('disc-1');
    });

    it('DB message is still persisted even if pubSub.publish were to fail', async () => {
      mockPubSubPublish.mockImplementationOnce(() => {
        throw new Error('pubSub error');
      });
      mockReturning.mockResolvedValueOnce([mockMessage]);
      const ctx = { req: {}, authContext: MOCK_AUTH };
      // Resolver must propagate because pubSub is synchronous here — verify insert was called
      try {
        await resolver.addMessage(
          'disc-1',
          { content: 'Hi', messageType: 'TEXT' as const },
          ctx
        );
      } catch {
        // Expected when pubSub throws synchronously
      }
      expect(mockInsert).toHaveBeenCalled();
    });
  });
});
