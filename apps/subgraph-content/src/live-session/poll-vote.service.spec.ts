import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { PollVoteService } from './poll-vote.service';

const mockTx = { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
const mockDb = { select: vi.fn() };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    pollVotes: {
      id: 'id',
      pollId: 'poll_id',
      userId: 'user_id',
      tenantId: 'tenant_id',
      optionIndex: 'option_index',
    },
    sessionPolls: {
      id: 'id',
      tenantId: 'tenant_id',
      sessionId: 'session_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
}));

vi.mock('nats', () => {
  const publish = vi.fn();
  const drain = vi.fn().mockResolvedValue(undefined);
  return {
    connect: vi.fn().mockResolvedValue({ publish, drain }),
    StringCodec: vi.fn(() => ({
      encode: vi.fn((s: string) => Buffer.from(s)),
    })),
    __mockPublish: publish,
    __mockDrain: drain,
  };
});

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

function makeSelectChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

function makeSelectChainNoLimit(rows: unknown[]) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

describe('PollVoteService', () => {
  let service: PollVoteService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PollVoteService();
  });

  describe('onModuleDestroy()', () => {
    it('drains NATS and closes DB pools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      // Trigger NATS connection first
      await service.vote('p1', 'u1', 0, 't1').catch(() => undefined);
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });

  describe('vote()', () => {
    it('inserts new vote when no existing vote', async () => {
      const existChain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: existChain.from });
      const insertValues = vi.fn().mockResolvedValue(undefined);
      mockTx.insert.mockReturnValueOnce({ values: insertValues });

      // publishVoteEvent internal queries
      const votesChain = makeSelectChainNoLimit([]);
      const pollChain = makeSelectChain([{ sessionId: 'sess-1' }]);
      mockDb.select
        .mockReturnValueOnce({ from: votesChain.from })
        .mockReturnValueOnce({ from: pollChain.from });

      await service.vote('p1', 'u1', 2, 't1');

      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({ pollId: 'p1', userId: 'u1', optionIndex: 2 })
      );
    });

    it('updates existing vote when user already voted', async () => {
      const existChain = makeSelectChain([{ id: 'vote-1' }]);
      mockTx.select.mockReturnValueOnce({ from: existChain.from });
      const where = vi.fn().mockResolvedValue(undefined);
      const set = vi.fn().mockReturnValue({ where });
      mockTx.update.mockReturnValueOnce({ set });

      // publishVoteEvent internal queries
      const votesChain = makeSelectChainNoLimit([]);
      const pollChain = makeSelectChain([{ sessionId: 'sess-1' }]);
      mockDb.select
        .mockReturnValueOnce({ from: votesChain.from })
        .mockReturnValueOnce({ from: pollChain.from });

      await service.vote('p1', 'u1', 1, 't1');

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ optionIndex: 1 })
      );
    });
  });

  describe('getPollResults()', () => {
    it('returns aggregated poll results', async () => {
      const pollChain = makeSelectChain([
        {
          id: 'p1',
          question: 'Favorite color?',
          options: ['Red', 'Blue', 'Green'],
          tenantId: 't1',
        },
      ]);
      const votesChain = makeSelectChainNoLimit([
        { optionIndex: 0 },
        { optionIndex: 0 },
        { optionIndex: 1 },
        { optionIndex: 2 },
      ]);
      mockTx.select
        .mockReturnValueOnce({ from: pollChain.from })
        .mockReturnValueOnce({ from: votesChain.from });

      const result = await service.getPollResults('p1', 't1', 'u1');

      expect(result.totalVotes).toBe(4);
      expect(result.question).toBe('Favorite color?');
      expect(result.options).toHaveLength(3);
      expect(result.options[0]).toMatchObject({
        text: 'Red',
        count: 2,
        percentage: 50,
      });
      expect(result.options[1]).toMatchObject({
        text: 'Blue',
        count: 1,
        percentage: 25,
      });
      expect(result.options[2]).toMatchObject({
        text: 'Green',
        count: 1,
        percentage: 25,
      });
    });

    it('throws NotFoundException when poll not found', async () => {
      const pollChain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: pollChain.from });

      await expect(
        service.getPollResults('missing', 't1', 'u1')
      ).rejects.toThrow(NotFoundException);
    });

    it('returns zero percentages when no votes', async () => {
      const pollChain = makeSelectChain([
        { id: 'p1', question: 'Q?', options: ['A', 'B'], tenantId: 't1' },
      ]);
      const votesChain = makeSelectChainNoLimit([]);
      mockTx.select
        .mockReturnValueOnce({ from: pollChain.from })
        .mockReturnValueOnce({ from: votesChain.from });

      const result = await service.getPollResults('p1', 't1', 'u1');

      expect(result.totalVotes).toBe(0);
      expect(result.options[0]).toMatchObject({ count: 0, percentage: 0 });
    });
  });
});
