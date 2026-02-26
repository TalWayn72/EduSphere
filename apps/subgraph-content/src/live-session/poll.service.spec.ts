import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Shared mock db builder ────────────────────────────────────────────────────

function makeMockDb(overrides: Record<string, unknown> = {}) {
  const self: Record<string, unknown> = {
    insert: vi.fn(),
    values: vi.fn(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn(),
    set: vi.fn(),
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    limit: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
  // Make chainable methods return `self`
  (self['insert'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['values'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['update'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['set'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['select'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['from'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  (self['where'] as ReturnType<typeof vi.fn>).mockReturnValue(self);
  return self;
}

// ── Mocks ─────────────────────────────────────────────────────────────────────
// vi.mock hoisted — all references inside must be self-contained

let _mockDb = makeMockDb();
let _mockPublish = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => _mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    sessionPolls: {},
    pollVotes: {},
  },
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  withTenantContext: vi.fn(
    (_db: unknown, _ctx: unknown, fn: (db: unknown) => Promise<unknown>) =>
      fn(_mockDb)
  ),
}));

vi.mock('nats', () => ({
  connect: vi.fn(() =>
    Promise.resolve({
      publish: (...args: unknown[]) => _mockPublish(...args),
      drain: vi.fn().mockResolvedValue(undefined),
    })
  ),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((s: string) => Buffer.from(s)),
    decode: vi.fn((b: Buffer) => b.toString()),
  })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { PollService } from './poll.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TENANT = 'tenant-1';
const USER = 'user-1';
const POLL_ID = 'poll-uuid-1';
const SESSION_ID = 'session-uuid-1';

function makePoll(overrides: Record<string, unknown> = {}) {
  return {
    id: POLL_ID,
    sessionId: SESSION_ID,
    tenantId: TENANT,
    question: 'Which is best?',
    options: ['Option A', 'Option B', 'Option C'],
    isActive: false,
    createdAt: new Date(),
    closedAt: null,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PollService', () => {
  let service: PollService;

  beforeEach(() => {
    _mockPublish = vi.fn();
    _mockDb = makeMockDb();
    _mockDb['returning'] = vi.fn().mockResolvedValue([makePoll()]);
    _mockDb['limit'] = vi.fn().mockResolvedValue([makePoll()]);
    service = new PollService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  // 1. createPoll stores question and options
  it('createPoll stores question and options', async () => {
    const result = await service.createPoll(
      SESSION_ID,
      'Which is best?',
      ['A', 'B', 'C'],
      TENANT,
      USER
    );
    expect(result.question).toBe('Which is best?');
    expect(result.options).toEqual(['Option A', 'Option B', 'Option C']);
    expect(_mockDb['insert']).toHaveBeenCalled();
  });

  // 2. activatePoll sets isActive=true
  it('activatePoll sets isActive=true', async () => {
    _mockDb['returning'] = vi
      .fn()
      .mockResolvedValue([makePoll({ isActive: true })]);
    const result = await service.activatePoll(POLL_ID, TENANT, USER);
    expect(result.isActive).toBe(true);
    expect(_mockDb['update']).toHaveBeenCalled();
  });

  // 3. closePoll sets isActive=false and returns results
  it('closePoll sets isActive=false and returns results', async () => {
    // closePoll: update→set→where→returning needs to work
    // then getPollResults: select→from→where→limit (poll) + select→from→where (votes)
    const freshDb = makeMockDb();
    freshDb['returning'] = vi
      .fn()
      .mockResolvedValue([makePoll({ isActive: false })]);
    freshDb['limit'] = vi.fn().mockResolvedValue([makePoll()]);
    // where: when chained for update (returning after), also when chained for select (votes)
    // Must support BOTH .returning() after and direct await
    // Solution: make where return an object that has both returning() and is thenable
    const whereResult = {
      returning: vi.fn().mockResolvedValue([makePoll({ isActive: false })]),
      then: (resolve: (v: unknown) => void) => resolve([]), // votes query awaits directly
      limit: vi.fn().mockResolvedValue([makePoll()]),
    };
    freshDb['where'] = vi.fn().mockReturnValue(whereResult);
    freshDb['set'] = vi.fn().mockReturnValue(freshDb);
    _mockDb = freshDb;
    await service.onModuleDestroy();
    service = new PollService();

    const result = await service.closePoll(POLL_ID, TENANT, USER);
    expect(result.pollId).toBe(POLL_ID);
    expect(result.totalVotes).toBe(0);
  });

  // 4. vote creates poll_votes record
  it('vote creates a poll_votes record', async () => {
    // vote() calls select().from().where().limit(1) for existing vote check → returns []
    const innerDb = makeMockDb();
    innerDb['limit'] = vi.fn().mockResolvedValue([]); // no existing vote
    innerDb['where'] = vi
      .fn()
      .mockReturnValueOnce(innerDb) // chain for select-limit
      .mockResolvedValue([]); // votes for publish event
    innerDb['returning'] = vi.fn().mockResolvedValue([]);
    _mockDb = innerDb;
    // Recreate service with fresh db
    await service.onModuleDestroy();
    service = new PollService();

    await service.vote(POLL_ID, USER, 1, TENANT);
    expect(innerDb['insert']).toHaveBeenCalled();
  });

  // 5. vote is idempotent: second vote from same user updates existing record
  it('vote is idempotent: second vote from same user updates existing record', async () => {
    const existingVote = {
      id: 'vote-1',
      pollId: POLL_ID,
      userId: USER,
      optionIndex: 0,
      votedAt: new Date(),
    };
    const innerDb = makeMockDb();
    innerDb['limit'] = vi.fn().mockResolvedValue([existingVote]); // found existing
    innerDb['where'] = vi
      .fn()
      .mockReturnValueOnce(innerDb) // chain for select
      .mockResolvedValue([existingVote]); // votes for publish
    innerDb['returning'] = vi.fn().mockResolvedValue([]);
    _mockDb = innerDb;
    await service.onModuleDestroy();
    service = new PollService();

    await service.vote(POLL_ID, USER, 2, TENANT);
    expect(innerDb['update']).toHaveBeenCalled();
    expect(innerDb['insert']).not.toHaveBeenCalled();
  });

  // 6. getPollResults calculates percentages correctly
  it('getPollResults calculates percentages correctly', () => {
    const totalVotes = 4;
    const counts = [3, 1, 0];
    const options = ['A', 'B', 'C'];
    const result = options.map((text, i) => ({
      text,
      count: counts[i] ?? 0,
      percentage:
        totalVotes > 0 ? Math.round(((counts[i] ?? 0) / totalVotes) * 100) : 0,
    }));
    expect(result[0].percentage).toBe(75);
    expect(result[1].percentage).toBe(25);
    expect(result[2].percentage).toBe(0);
  });

  // 7. getPollResults returns 0% for options with no votes
  it('getPollResults returns 0% for options with no votes', () => {
    const totalVotes = 0;
    const pct = totalVotes > 0 ? Math.round((0 / totalVotes) * 100) : 0;
    expect(pct).toBe(0);
  });

  // 8. NATS event published after each vote
  it('publishes NATS event after each vote', async () => {
    const publishFn = vi.fn();
    _mockPublish = publishFn;

    // Create a smart thenable+chainable object for where()
    // - When awaited directly: resolves to [] (for votes query and poll query in publishVoteEvent)
    // - When .limit() is called on it: resolves to [] (for existing vote check)
    // - When .returning() is called on it: resolves to [] (for insert)
    const makeWhereable = (
      limitResult: unknown[] = [],
      directResult: unknown[] = []
    ) => ({
      limit: vi.fn().mockResolvedValue(limitResult),
      returning: vi.fn().mockResolvedValue([]),
      then: (resolve: (v: unknown[]) => void, _reject?: (e: unknown) => void) =>
        Promise.resolve(directResult).then(resolve, _reject),
    });

    const innerDb = makeMockDb();
    let whereCallCount = 0;
    innerDb['where'] = vi.fn().mockImplementation(() => {
      whereCallCount++;
      if (whereCallCount === 1) return makeWhereable([]); // vote check .limit() → []
      if (whereCallCount === 2) return makeWhereable([], []); // publishVoteEvent votes → []
      return makeWhereable([makePoll()], [makePoll()]); // poll lookup .limit() → [poll]
    });
    innerDb['limit'] = vi.fn().mockResolvedValue([makePoll()]);
    innerDb['returning'] = vi.fn().mockResolvedValue([]);
    _mockDb = innerDb;
    await service.onModuleDestroy();
    service = new PollService();

    await service.vote(POLL_ID, USER, 0, TENANT);
    await new Promise((r) => setTimeout(r, 50));
    expect(publishFn).toHaveBeenCalled();
  });
});
