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

// ── Context helpers ───────────────────────────────────────────────────────────

const makeCtx = (opts: { sub?: string; tenant_id?: string } = {}) => ({
  req: { user: opts },
});

const AUTH_CTX = makeCtx({ sub: 'user-1', tenant_id: 'tenant-abc' });
const EMPTY_CTX = makeCtx({});

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

  // Test 1: userId returns sub from context
  it('userId — returns sub from context user', async () => {
    mockBreakoutService.listRooms.mockResolvedValue([]);

    await resolver.breakoutRooms('session-1', AUTH_CTX as never);

    // listRooms is called with (sessionId, tenantId, userId)
    expect(mockBreakoutService.listRooms).toHaveBeenCalledWith(
      'session-1',
      'tenant-abc',
      'user-1'
    );
  });

  // Test 2: userId returns empty string when user is absent
  it('userId — returns empty string when user has no sub', async () => {
    mockBreakoutService.listRooms.mockResolvedValue([]);

    await resolver.breakoutRooms('session-1', EMPTY_CTX as never);

    expect(mockBreakoutService.listRooms).toHaveBeenCalledWith(
      'session-1',
      '',
      ''
    );
  });

  // Test 3: tenantId returns tenant_id from context
  it('tenantId — returns tenant_id from context user', async () => {
    mockPollService.listPolls.mockResolvedValue([]);

    await resolver.sessionPolls('session-1', AUTH_CTX as never);

    expect(mockPollService.listPolls).toHaveBeenCalledWith(
      'session-1',
      'tenant-abc',
      'user-1'
    );
  });

  // Test 4: tenantId returns empty string when tenant_id is absent
  it('tenantId — returns empty string when user has no tenant_id', async () => {
    const ctxNoTenant = makeCtx({ sub: 'user-1' });
    mockPollService.listPolls.mockResolvedValue([]);

    await resolver.sessionPolls('session-1', ctxNoTenant as never);

    expect(mockPollService.listPolls).toHaveBeenCalledWith(
      'session-1',
      '',
      'user-1'
    );
  });

  // Test 5: breakoutRooms delegates to breakoutService.listRooms
  it('breakoutRooms — delegates to breakoutService.listRooms and returns result', async () => {
    const rooms = [
      { id: 'room-1', roomName: 'Group A', capacity: 5, assignedUserIds: [] },
    ];
    mockBreakoutService.listRooms.mockResolvedValue(rooms);

    const result = await resolver.breakoutRooms(
      'session-99',
      AUTH_CTX as never
    );

    expect(result).toEqual(rooms);
  });

  // Test 6: sessionPolls delegates to pollService.listPolls
  it('sessionPolls — delegates to pollService.listPolls and returns result', async () => {
    const polls = [{ id: 'poll-1', question: 'Agree?' }];
    mockPollService.listPolls.mockResolvedValue(polls);

    const result = await resolver.sessionPolls('session-1', AUTH_CTX as never);

    expect(result).toEqual(polls);
  });

  // Test 7: createPoll delegates to pollService.createPoll
  it('createPoll — delegates question and options to pollService.createPoll', async () => {
    const poll = {
      id: 'poll-new',
      question: 'Is this useful?',
      options: ['Yes', 'No'],
    };
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

  // Test 8: votePoll delegates to pollService.vote and returns true
  it('votePoll — calls pollService.vote and returns true', async () => {
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

  // Test 9: pollResults delegates to pollService.getPollResults
  it('pollResults — delegates to pollService.getPollResults and returns result', async () => {
    const results = { pollId: 'poll-1', votes: [5, 3] };
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
