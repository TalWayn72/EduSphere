/**
 * Unit tests for AnalyticsSnapshotCron — daily snapshot job.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyticsSnapshotCron } from './analytics-snapshot.cron';

const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockInsert = vi.fn();
const mockValues = vi.fn();
const mockOnConflict = vi.fn();
const mockExecute = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: mockSelect,
    execute: mockExecute,
    insert: mockInsert,
  })),
  closeAllPools: vi.fn(),
  schema: {
    tenants: { id: 'tenants.id' },
    tenantAnalyticsSnapshots: {
      tenantId: 'snapshots.tenantId',
      snapshotDate: 'snapshots.snapshotDate',
      snapshotType: 'snapshots.snapshotType',
    },
  },
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  }),
}));

describe('AnalyticsSnapshotCron', () => {
  let cron: AnalyticsSnapshotCron;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockResolvedValue([]);
    mockInsert.mockReturnValue({ values: mockValues });
    mockValues.mockReturnValue({ onConflictDoUpdate: mockOnConflict });
    mockOnConflict.mockResolvedValue(undefined);
    mockExecute.mockResolvedValue({
      rows: [
        {
          active_learners: '5',
          completions: '2',
          new_enrollments: '3',
          total_minutes: '7200',
          avg_completion_rate: '45.5',
        },
      ],
    });

    cron = new AnalyticsSnapshotCron();
  });

  it('should iterate all tenants on daily snapshot', async () => {
    mockFrom.mockResolvedValue([{ id: 'tenant-1' }, { id: 'tenant-2' }]);

    await cron.runDailySnapshot();

    // select from tenants should be called
    expect(mockSelect).toHaveBeenCalled();
  });

  it('should handle empty tenant list', async () => {
    mockFrom.mockResolvedValue([]);

    await cron.runDailySnapshot();

    // No inserts should happen
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    mockFrom.mockRejectedValue(new Error('DB connection failed'));

    // Should not throw
    await expect(cron.runDailySnapshot()).resolves.toBeUndefined();
  });

  describe('onModuleDestroy', () => {
    it('should call closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await cron.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
