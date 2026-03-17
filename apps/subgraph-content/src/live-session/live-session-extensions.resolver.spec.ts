import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
  schema: {},
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({ subscribe: vi.fn() }),
  StringCodec: vi.fn(() => ({ encode: vi.fn(), decode: vi.fn() })),
}));

vi.mock('@edusphere/nats-client', () => ({ buildNatsOptions: vi.fn() }));

import { LiveSessionExtensionsResolver } from './live-session-extensions.resolver.js';
import type { GraphQLContext } from '../auth/auth.middleware';

// ── Mock services ─────────────────────────────────────────────────────────────

const mockBreakoutService = {
  listRooms: vi.fn(),
  createBreakoutRooms: vi.fn(),
};

const mockPollService = {
  listPolls: vi.fn(),
  getPollResults: vi.fn(),
  createPoll: vi.fn(),
  activatePoll: vi.fn(),
  closePoll: vi.fn(),
  vote: vi.fn(),
};

// ── Context helpers — NEW authContext pattern ─────────────────────────────────

function makeCtx(opts: {
  tenantId?: string;
  userId?: string;
  headerTenantId?: string;
} = {}): GraphQLContext {
  return {
    req: {
      headers: {
        ...(opts.headerTenantId ? { 'x-tenant-id': opts.headerTenantId } : {}),
      },
    },
    authContext: opts.tenantId || opts.userId
      ? {
          tenantId: opts.tenantId,
          userId: opts.userId ?? '',
          email: 'test@example.com',
          username: 'testuser',
          roles: [],
          scopes: [],
          isSuperAdmin: false,
        }
      : undefined,
  } as unknown as GraphQLContext;
}

/** Context with ONLY the old broken pattern — proves regression is guarded. */
function makeOldCtx(opts: { tenant_id?: string; sub?: string }): Record<string, unknown> {
  return {
    req: {
      user: opts,
      headers: {},
    },
  };
}

const AUTH_CTX = makeCtx({ tenantId: 'tenant-abc', userId: 'user-1' });
const EMPTY_CTX = makeCtx();

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LiveSessionExtensionsResolver', () => {
  let resolver: LiveSessionExtensionsResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new LiveSessionExtensionsResolver(
      mockBreakoutService as never,
      mockPollService as never
    );
  });

  // ── tenantId extraction — authContext preferred ────────────────────────────

  describe('tenantId — authContext.tenantId (preferred path)', () => {
    it('uses authContext.tenantId when present', async () => {
      mockBreakoutService.listRooms.mockResolvedValue([]);

      await resolver.breakoutRooms('session-1', AUTH_CTX as never);

      expect(mockBreakoutService.listRooms).toHaveBeenCalledWith(
        'session-1',
        'tenant-abc',
        'user-1'
      );
    });

    it('prefers authContext.tenantId over x-tenant-id header', async () => {
      mockBreakoutService.listRooms.mockResolvedValue([]);

      const ctx = makeCtx({
        tenantId: 'from-auth',
        userId: 'user-1',
        headerTenantId: 'from-header',
      });

      await resolver.breakoutRooms('session-1', ctx as never);

      expect(mockBreakoutService.listRooms).toHaveBeenCalledWith(
        'session-1',
        'from-auth',
        'user-1'
      );
    });
  });

  // ── tenantId extraction — header fallback ─────────────────────────────────

  describe('tenantId — x-tenant-id header fallback', () => {
    it('falls back to x-tenant-id header when authContext is missing', async () => {
      mockPollService.listPolls.mockResolvedValue([]);

      const ctx = makeCtx({ headerTenantId: 'header-tenant' });

      await resolver.sessionPolls('session-1', ctx as never);

      expect(mockPollService.listPolls).toHaveBeenCalledWith(
        'session-1',
        'header-tenant',
        '' // userId is empty when authContext is absent
      );
    });

    it('handles array header values (picks first element)', async () => {
      mockPollService.listPolls.mockResolvedValue([]);

      const ctx = {
        req: {
          headers: { 'x-tenant-id': ['first-tenant', 'second-tenant'] },
        },
      } as unknown as GraphQLContext;

      await resolver.sessionPolls('session-1', ctx as never);

      expect(mockPollService.listPolls).toHaveBeenCalledWith(
        'session-1',
        'first-tenant',
        ''
      );
    });
  });

  // ── tenantId extraction — empty string when both missing ──────────────────

  describe('tenantId — returns empty string when both sources missing', () => {
    it('returns empty string when authContext and header are both absent', async () => {
      mockBreakoutService.listRooms.mockResolvedValue([]);

      await resolver.breakoutRooms('session-1', EMPTY_CTX as never);

      expect(mockBreakoutService.listRooms).toHaveBeenCalledWith(
        'session-1',
        '',
        ''
      );
    });
  });

  // ── userId extraction — authContext.userId ────────────────────────────────

  describe('userId — authContext.userId', () => {
    it('extracts userId from authContext', async () => {
      mockBreakoutService.listRooms.mockResolvedValue([]);

      await resolver.breakoutRooms('session-1', AUTH_CTX as never);

      expect(mockBreakoutService.listRooms).toHaveBeenCalledWith(
        'session-1',
        'tenant-abc',
        'user-1'
      );
    });

    it('returns empty string when authContext is missing', async () => {
      mockBreakoutService.listRooms.mockResolvedValue([]);

      await resolver.breakoutRooms('session-1', EMPTY_CTX as never);

      expect(mockBreakoutService.listRooms).toHaveBeenCalledWith(
        'session-1',
        '',
        ''
      );
    });
  });

  // ── Regression guard — OLD ctx.req.user pattern must NOT work ─────────────

  describe('regression guard — old ctx.req.user?.tenant_id pattern', () => {
    it('old pattern ctx.req.user.tenant_id does NOT extract tenantId', async () => {
      mockBreakoutService.listRooms.mockResolvedValue([]);

      await resolver.breakoutRooms(
        'session-1',
        makeOldCtx({ tenant_id: 'old-tenant', sub: 'old-user' }) as never
      );

      // Both tenantId and userId should be empty — old pattern is dead
      expect(mockBreakoutService.listRooms).toHaveBeenCalledWith(
        'session-1',
        '', // NOT 'old-tenant'
        '' // NOT 'old-user'
      );
    });

    it('old pattern ctx.req.user.sub does NOT extract userId', async () => {
      mockPollService.vote.mockResolvedValue(undefined);

      await resolver.votePoll(
        'poll-1',
        0,
        makeOldCtx({ sub: 'old-user', tenant_id: 'old-tenant' }) as never
      );

      // userId (2nd arg) and tenantId (4th arg) should be empty
      expect(mockPollService.vote).toHaveBeenCalledWith(
        'poll-1',
        '', // NOT 'old-user'
        0,
        '' // NOT 'old-tenant'
      );
    });
  });

  // ── Query delegates ───────────────────────────────────────────────────────

  describe('query resolvers — delegation', () => {
    it('breakoutRooms — delegates to breakoutService.listRooms', async () => {
      const rooms = [{ id: 'room-1', roomName: 'Group A', capacity: 5 }];
      mockBreakoutService.listRooms.mockResolvedValue(rooms);

      const result = await resolver.breakoutRooms('session-99', AUTH_CTX as never);

      expect(result).toEqual(rooms);
    });

    it('sessionPolls — delegates to pollService.listPolls', async () => {
      const polls = [{ id: 'poll-1', question: 'Agree?' }];
      mockPollService.listPolls.mockResolvedValue(polls);

      const result = await resolver.sessionPolls('session-1', AUTH_CTX as never);

      expect(mockPollService.listPolls).toHaveBeenCalledWith(
        'session-1',
        'tenant-abc',
        'user-1'
      );
      expect(result).toEqual(polls);
    });

    it('pollResults — delegates to pollService.getPollResults', async () => {
      const results = { pollId: 'poll-1', totalVotes: 8, options: [] };
      mockPollService.getPollResults.mockResolvedValue(results);

      const result = await resolver.pollResults('poll-1', AUTH_CTX as never);

      expect(mockPollService.getPollResults).toHaveBeenCalledWith(
        'poll-1',
        'tenant-abc',
        'user-1'
      );
      expect(result).toEqual(results);
    });
  });

  // ── Mutation delegates ────────────────────────────────────────────────────

  describe('mutation resolvers — delegation', () => {
    it('createBreakoutRooms — passes tenantId and userId from authContext', async () => {
      const rooms = [{ roomName: 'Room A', capacity: 4 }];
      mockBreakoutService.createBreakoutRooms.mockResolvedValue([]);

      await resolver.createBreakoutRooms('session-1', rooms as never, AUTH_CTX as never);

      expect(mockBreakoutService.createBreakoutRooms).toHaveBeenCalledWith(
        'session-1',
        rooms,
        'tenant-abc',
        'user-1'
      );
    });

    it('createPoll — passes question, options, tenantId, userId', async () => {
      const poll = { id: 'poll-new', question: 'Is this useful?', options: ['Yes', 'No'] };
      mockPollService.createPoll.mockResolvedValue(poll);

      const result = await resolver.createPoll(
        'session-1',
        'Is this useful?',
        ['Yes', 'No'],
        AUTH_CTX as never
      );

      expect(mockPollService.createPoll).toHaveBeenCalledWith(
        'session-1',
        'Is this useful?',
        ['Yes', 'No'],
        'tenant-abc',
        'user-1'
      );
      expect(result).toEqual(poll);
    });

    it('activatePoll — passes pollId, tenantId, userId', async () => {
      mockPollService.activatePoll.mockResolvedValue({ id: 'poll-1', isActive: true });

      await resolver.activatePoll('poll-1', AUTH_CTX as never);

      expect(mockPollService.activatePoll).toHaveBeenCalledWith(
        'poll-1',
        'tenant-abc',
        'user-1'
      );
    });

    it('closePoll — passes pollId, tenantId, userId', async () => {
      mockPollService.closePoll.mockResolvedValue({ pollId: 'poll-1', totalVotes: 5 });

      await resolver.closePoll('poll-1', AUTH_CTX as never);

      expect(mockPollService.closePoll).toHaveBeenCalledWith(
        'poll-1',
        'tenant-abc',
        'user-1'
      );
    });

    it('votePoll — passes pollId, userId, optionIndex, tenantId and returns true', async () => {
      mockPollService.vote.mockResolvedValue(undefined);

      const result = await resolver.votePoll('poll-1', 2, AUTH_CTX as never);

      expect(mockPollService.vote).toHaveBeenCalledWith(
        'poll-1',
        'user-1',
        2,
        'tenant-abc'
      );
      expect(result).toBe(true);
    });
  });

  // ── Header fallback verified across multiple resolver methods ─────────────

  describe('header fallback — verified across resolver methods', () => {
    it('createPoll uses header tenantId when authContext is absent', async () => {
      mockPollService.createPoll.mockResolvedValue({ id: 'poll-1' });

      const ctx = makeCtx({ headerTenantId: 'header-only' });

      await resolver.createPoll('session-1', 'Q?', ['A', 'B'], ctx as never);

      expect(mockPollService.createPoll).toHaveBeenCalledWith(
        'session-1',
        'Q?',
        ['A', 'B'],
        'header-only',
        ''
      );
    });

    it('activatePoll uses header tenantId when authContext is absent', async () => {
      mockPollService.activatePoll.mockResolvedValue({ id: 'poll-1' });

      const ctx = makeCtx({ headerTenantId: 'header-only' });

      await resolver.activatePoll('poll-1', ctx as never);

      expect(mockPollService.activatePoll).toHaveBeenCalledWith(
        'poll-1',
        'header-only',
        ''
      );
    });
  });
});
