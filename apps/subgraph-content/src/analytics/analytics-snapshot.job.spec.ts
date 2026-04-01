import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsSnapshotJob } from './analytics-snapshot.job';

const mockInsertValues = vi.fn().mockReturnValue({
  onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
});
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

function makeSelectChainDirect(rows: unknown[]) {
  // For queries without .where() — .from() resolves directly
  const from = vi.fn().mockResolvedValue(rows);
  return { from };
}

function makeSelectChain(rows: unknown[]) {
  // For queries with .where() — .from().where() resolves
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  return { from, where };
}

const mockDb = { select: vi.fn(), insert: mockInsert };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    tenants: { id: 'id' },
    userProgress: { userId: 'user_id', lastAccessedAt: 'last_accessed_at' },
    userCourses: {
      completedAt: 'completed_at',
      enrolledAt: 'enrolled_at',
    },
    tenantAnalyticsSnapshots: {
      tenantId: 'tenant_id',
      snapshotDate: 'snapshot_date',
      snapshotType: 'snapshot_type',
    },
  },
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  sql: vi.fn(),
}));

describe('AnalyticsSnapshotJob', () => {
  let job: AnalyticsSnapshotJob;

  beforeEach(() => {
    vi.clearAllMocks();
    job = new AnalyticsSnapshotJob();
  });

  it('runs onModuleInit without throwing', () => {
    const tenantChain = makeSelectChainDirect([]);
    mockDb.select.mockReturnValueOnce({ from: tenantChain.from });
    expect(() => job.onModuleInit()).not.toThrow();
  });

  it('closes pools on onModuleDestroy', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await job.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });

  describe('runDailySnapshot()', () => {
    it('processes all tenants and upserts snapshots', async () => {
      const tenantChain = makeSelectChainDirect([
        { id: 'tenant-1' },
        { id: 'tenant-2' },
      ]);
      const activeChain = makeSelectChain([{ activeLearners: 5 }]);
      const completionChain = makeSelectChain([{ completions: 3 }]);
      const enrollChain = makeSelectChain([{ newEnrollments: 7 }]);
      const activeChain2 = makeSelectChain([{ activeLearners: 2 }]);
      const completionChain2 = makeSelectChain([{ completions: 1 }]);
      const enrollChain2 = makeSelectChain([{ newEnrollments: 4 }]);

      mockDb.select
        .mockReturnValueOnce({ from: tenantChain.from })
        .mockReturnValueOnce({ from: activeChain.from })
        .mockReturnValueOnce({ from: completionChain.from })
        .mockReturnValueOnce({ from: enrollChain.from })
        .mockReturnValueOnce({ from: activeChain2.from })
        .mockReturnValueOnce({ from: completionChain2.from })
        .mockReturnValueOnce({ from: enrollChain2.from });

      await job.runDailySnapshot();

      expect(mockInsert).toHaveBeenCalledTimes(2);
    });

    it('handles zero tenants gracefully', async () => {
      const tenantChain = makeSelectChainDirect([]);
      mockDb.select.mockReturnValueOnce({ from: tenantChain.from });

      await expect(job.runDailySnapshot()).resolves.toBeUndefined();
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('does not throw when DB query fails', async () => {
      const tenantChain = makeSelectChainDirect([{ id: 't1' }]);
      const failChain = {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error('DB error')),
        }),
      };

      mockDb.select
        .mockReturnValueOnce({ from: tenantChain.from })
        .mockReturnValueOnce({ from: failChain.from });

      await expect(job.runDailySnapshot()).resolves.toBeUndefined();
    });

    it('does not throw when getAllTenants itself fails', async () => {
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockRejectedValue(new Error('connection lost')),
      });

      await expect(job.runDailySnapshot()).resolves.toBeUndefined();
    });

    it('handles null aggregation values', async () => {
      const tenantChain = makeSelectChainDirect([{ id: 't1' }]);
      const activeChain = makeSelectChain([{ activeLearners: null }]);
      const completionChain = makeSelectChain([{ completions: null }]);
      const enrollChain = makeSelectChain([{ newEnrollments: null }]);

      mockDb.select
        .mockReturnValueOnce({ from: tenantChain.from })
        .mockReturnValueOnce({ from: activeChain.from })
        .mockReturnValueOnce({ from: completionChain.from })
        .mockReturnValueOnce({ from: enrollChain.from });

      await job.runDailySnapshot();

      expect(mockInsertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          activeLearners: 0,
          completions: 0,
          newEnrollments: 0,
        })
      );
    });
  });
});
