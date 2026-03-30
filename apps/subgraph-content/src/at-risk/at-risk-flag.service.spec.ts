import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AtRiskFlagService } from './at-risk-flag.service';

const mockTx = { select: vi.fn(), insert: vi.fn(), update: vi.fn() };
const mockDb = {};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    atRiskFlags: {
      id: 'id',
      learnerId: 'learner_id',
      courseId: 'course_id',
      status: 'status',
      tenantId: 'tenant_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...c) => ({ and: c })),
  withTenantContext: vi.fn((_db, _ctx, fn) => fn(mockTx)),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((s: string) => Buffer.from(s)),
  })),
}));

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

function makeInsertChain() {
  const values = vi.fn().mockResolvedValue(undefined);
  return { values };
}

function makeUpdateChain() {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });
  return { set, where };
}

describe('AtRiskFlagService', () => {
  let service: AtRiskFlagService;
  const ctx = { tenantId: 't1', userId: 'u1', userRole: 'INSTRUCTOR' as const };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AtRiskFlagService();
  });

  it('returns db from getDb()', () => {
    expect(service.getDb()).toBe(mockDb);
  });

  describe('onModuleDestroy()', () => {
    it('closes NATS and DB connections', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });

  describe('findActiveFlag()', () => {
    it('returns flag when found', async () => {
      const chain = makeSelectChain([{ id: 'flag-1' }]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.findActiveFlag('learner-1', 'course-1', ctx);
      expect(result).toEqual({ id: 'flag-1' });
    });

    it('returns null when no active flag exists', async () => {
      const chain = makeSelectChain([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.findActiveFlag('learner-1', 'course-1', ctx);
      expect(result).toBeNull();
    });
  });

  describe('createFlag()', () => {
    it('inserts a flag record', async () => {
      const chain = makeInsertChain();
      mockTx.insert.mockReturnValueOnce({ values: chain.values });

      await service.createFlag('l1', 'c1', 't1', 85, { lowProgress: true });

      expect(mockTx.insert).toHaveBeenCalled();
      expect(chain.values).toHaveBeenCalledWith(
        expect.objectContaining({
          learnerId: 'l1',
          courseId: 'c1',
          tenantId: 't1',
          riskScore: 85,
          status: 'active',
        }),
      );
    });
  });

  describe('resolveFlag()', () => {
    it('updates flag status to resolved', async () => {
      const chain = makeUpdateChain();
      mockTx.update.mockReturnValueOnce({ set: chain.set });

      await service.resolveFlag('flag-1', ctx);

      expect(chain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'resolved' }),
      );
    });
  });

  describe('publishFlagEvent()', () => {
    it('publishes to NATS without throwing', async () => {
      await expect(
        service.publishFlagEvent('l1', 'c1', 't1', 85),
      ).resolves.toBeUndefined();
    });

    it('does not throw when NATS connect fails', async () => {
      const { connect } = await import('nats');
      (connect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('NATS down'),
      );

      await expect(
        service.publishFlagEvent('l1', 'c1', 't1', 85),
      ).resolves.toBeUndefined();
    });
  });

  describe('getAtRiskLearners()', () => {
    it('returns mapped learners with risk factors', async () => {
      const chain = makeSelectChainNoLimit([
        {
          id: 'f1',
          learnerId: 'l1',
          courseId: 'c1',
          riskScore: 80,
          riskFactors: { inactiveForDays: true, lowProgress: false },
          flaggedAt: new Date('2025-06-01'),
        },
      ]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.getAtRiskLearners('c1', ctx);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'f1',
        learnerId: 'l1',
        riskScore: 80,
      });
      expect(result[0]!.riskFactors).toEqual([
        { key: 'inactiveForDays', description: 'No activity for more than 7 days' },
      ]);
    });

    it('returns empty array when no flags exist', async () => {
      const chain = makeSelectChainNoLimit([]);
      mockTx.select.mockReturnValueOnce({ from: chain.from });

      const result = await service.getAtRiskLearners('c1', ctx);
      expect(result).toEqual([]);
    });
  });

  describe('dismissFlag()', () => {
    it('sets status to dismissed and returns true', async () => {
      const chain = makeUpdateChain();
      mockTx.update.mockReturnValueOnce({ set: chain.set });

      const result = await service.dismissFlag('flag-1', ctx);

      expect(result).toBe(true);
      expect(chain.set).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'dismissed' }),
      );
    });
  });
});
