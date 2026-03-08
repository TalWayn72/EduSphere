import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── DB mock ──────────────────────────────────────────────────────────────────
const mockTxExecute = vi.fn();
const mockWithTenantContext = vi.fn(
  async (_db: unknown, _ctx: unknown, fn: (tx: unknown) => Promise<unknown>) =>
    fn({ execute: mockTxExecute })
);

vi.mock('@edusphere/db', () => ({
  db: {},
  withTenantContext: (...args: unknown[]) => mockWithTenantContext(...args),
  sql: vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({})),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

import { AdaptivePathService } from './adaptive-path.service.js';

const MASTERED_IDS_RESPONSE = {
  rows: [{ node_id: 'ci-mastered-1' }, { node_id: 'ci-mastered-2' }],
};

const ALL_CONTENT_RESPONSE = {
  rows: [
    { id: 'ci-mastered-1', title: 'Intro to React', estimated_minutes: 15, order_index: 1 },
    { id: 'ci-mastered-2', title: 'State Management', estimated_minutes: 20, order_index: 2 },
    { id: 'ci-gap-1', title: 'Advanced Hooks', estimated_minutes: 25, order_index: 3 },
    { id: 'ci-gap-2', title: 'Performance', estimated_minutes: 40, order_index: 4 },
    { id: 'ci-gap-3', title: 'Testing React', estimated_minutes: 10, order_index: 5 },
  ],
};

describe('AdaptivePathService', () => {
  let service: AdaptivePathService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdaptivePathService();
  });

  describe('getAdaptivePath()', () => {
    it('ranks unmastered items higher than mastered items', async () => {
      mockTxExecute
        .mockResolvedValueOnce(MASTERED_IDS_RESPONSE)
        .mockResolvedValueOnce(ALL_CONTENT_RESPONSE);

      const result = await service.getAdaptivePath(
        'user-1',
        'tenant-1',
        'course-1',
        30
      );

      // First items should be gap items (priorityScore >= 1.0)
      const firstItem = result.items[0]!;
      expect(firstItem.priorityScore).toBeGreaterThanOrEqual(1.0);

      // Mastered items should be last (priorityScore 0.1)
      const lastItem = result.items[result.items.length - 1]!;
      expect(lastItem.priorityScore).toBeLessThan(1.0);
    });

    it('reports correct masteryGapCount', async () => {
      mockTxExecute
        .mockResolvedValueOnce(MASTERED_IDS_RESPONSE)
        .mockResolvedValueOnce(ALL_CONTENT_RESPONSE);

      const result = await service.getAdaptivePath(
        'user-1',
        'tenant-1',
        'course-1',
        30
      );

      // 3 unmastered out of 5 items
      expect(result.masteryGapCount).toBe(3);
    });

    it('gives time-budget bonus to items that fit', async () => {
      mockTxExecute
        .mockResolvedValueOnce(MASTERED_IDS_RESPONSE)
        .mockResolvedValueOnce(ALL_CONTENT_RESPONSE);

      const result = await service.getAdaptivePath(
        'user-1',
        'tenant-1',
        'course-1',
        25 // only items <=25 min get bonus
      );

      // ci-gap-3 (10 min) should get GAP_BASE + TIME_BONUS = 1.2
      const testingItem = result.items.find((i) => i.contentItemId === 'ci-gap-3');
      expect(testingItem!.priorityScore).toBeCloseTo(1.2);

      // ci-gap-2 (40 min) should get only GAP_BASE = 1.0 (no bonus)
      const perfItem = result.items.find((i) => i.contentItemId === 'ci-gap-2');
      expect(perfItem!.priorityScore).toBeCloseTo(1.0);
    });

    it('returns all items even if duration exceeds budget', async () => {
      mockTxExecute
        .mockResolvedValueOnce(MASTERED_IDS_RESPONSE)
        .mockResolvedValueOnce(ALL_CONTENT_RESPONSE);

      const result = await service.getAdaptivePath(
        'user-1',
        'tenant-1',
        'course-1',
        5 // nothing fits
      );

      expect(result.items).toHaveLength(5);
    });

    it('returns masteryGapCount 0 and all items with low score when all are mastered', async () => {
      const allMastered = {
        rows: [
          { node_id: 'ci-mastered-1' },
          { node_id: 'ci-mastered-2' },
          { node_id: 'ci-gap-1' },
          { node_id: 'ci-gap-2' },
          { node_id: 'ci-gap-3' },
        ],
      };
      mockTxExecute
        .mockResolvedValueOnce(allMastered)
        .mockResolvedValueOnce(ALL_CONTENT_RESPONSE);

      const result = await service.getAdaptivePath(
        'user-1',
        'tenant-1',
        'course-1',
        30
      );

      expect(result.masteryGapCount).toBe(0);
      // All mastered: base 0.1 + optional time bonus 0.2 max → never >= GAP_BASE (1.0)
      expect(result.items.every((i) => i.priorityScore < 1.0)).toBe(true);
    });

    it('returns empty items when course has no content', async () => {
      mockTxExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getAdaptivePath(
        'user-1',
        'tenant-1',
        'course-empty',
        30
      );

      expect(result.items).toHaveLength(0);
      expect(result.masteryGapCount).toBe(0);
    });

    it('returns correct courseId and timeBudgetMinutes in response', async () => {
      mockTxExecute
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.getAdaptivePath(
        'user-1',
        'tenant-1',
        'my-course',
        45
      );

      expect(result.courseId).toBe('my-course');
      expect(result.timeBudgetMinutes).toBe(45);
    });
  });

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
