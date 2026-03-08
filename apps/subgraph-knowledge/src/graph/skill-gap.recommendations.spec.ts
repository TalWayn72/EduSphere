import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── DB mock ──────────────────────────────────────────────────────────────────
const mockDbExecute = vi.fn();

vi.mock('@edusphere/db', () => ({
  db: { execute: (...args: unknown[]) => mockDbExecute(...args) },
  sql: vi.fn((_strings: TemplateStringsArray, ..._values: unknown[]) => ({})),
}));

// ─── EmbeddingDataLoader mock ─────────────────────────────────────────────────
const mockBatchLoad = vi.fn();

vi.mock('../embedding/embedding.dataloader', () => ({
  EmbeddingDataLoader: class {
    batchLoad = mockBatchLoad;
  },
}));

import { SkillGapRecommendations } from './skill-gap.recommendations.js';
import { EmbeddingDataLoader } from '../embedding/embedding.dataloader.js';

describe('SkillGapRecommendations', () => {
  let service: SkillGapRecommendations;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SkillGapRecommendations(new EmbeddingDataLoader({} as never));
  });

  describe('buildGapItems()', () => {
    it('returns one gap item per concept with content recommendations', async () => {
      mockBatchLoad.mockResolvedValue(
        new Map([['React', [{ refId: 'seg-1', similarity: 0.92 }, { refId: 'seg-2', similarity: 0.85 }]]])
      );
      mockDbExecute.mockResolvedValue([{ title: 'Intro to React' }]);

      const items = await service.buildGapItems(['React'], 'tenant-1');

      expect(items).toHaveLength(1);
      expect(items[0]!.conceptName).toBe('React');
      expect(items[0]!.isMastered).toBe(false);
      expect(items[0]!.recommendedContentItems).toEqual(['seg-1', 'seg-2']);
      expect(items[0]!.relevanceScore).toBe(0.92);
    });

    it('uses the first result similarity as relevanceScore', async () => {
      mockBatchLoad.mockResolvedValue(
        new Map([['TypeScript', [{ refId: 'seg-a', similarity: 0.77 }]]])
      );
      mockDbExecute.mockResolvedValue([]);

      const items = await service.buildGapItems(['TypeScript'], 'tenant-1');
      expect(items[0]!.relevanceScore).toBe(0.77);
    });

    it('returns relevanceScore 0 when no semantic results', async () => {
      mockBatchLoad.mockResolvedValue(new Map([['Graphs', []]]));
      mockDbExecute.mockResolvedValue([]);

      const items = await service.buildGapItems(['Graphs'], 'tenant-1');
      expect(items[0]!.relevanceScore).toBe(0);
      expect(items[0]!.recommendedContentItems).toEqual([]);
    });

    it('returns empty recommendedContentTitles when db.execute returns empty', async () => {
      mockBatchLoad.mockResolvedValue(
        new Map([['Algebra', [{ refId: 'seg-1', similarity: 0.8 }]]])
      );
      mockDbExecute.mockResolvedValue([]);

      const items = await service.buildGapItems(['Algebra'], 'tenant-1');
      expect(items[0]!.recommendedContentTitles).toEqual([]);
    });

    it('handles multiple concepts in parallel', async () => {
      mockBatchLoad.mockResolvedValue(
        new Map([
          ['Math', [{ refId: 'seg-1', similarity: 0.9 }]],
          ['Physics', [{ refId: 'seg-2', similarity: 0.8 }]],
          ['Chemistry', [{ refId: 'seg-3', similarity: 0.7 }]],
        ])
      );
      mockDbExecute.mockResolvedValue([{ title: 'Course A' }]);

      const items = await service.buildGapItems(
        ['Math', 'Physics', 'Chemistry'],
        'tenant-2'
      );

      expect(items).toHaveLength(3);
      expect(items.map((i) => i.conceptName)).toEqual([
        'Math',
        'Physics',
        'Chemistry',
      ]);
    });

    it('returns empty array for empty gapConcepts', async () => {
      const items = await service.buildGapItems([], 'tenant-1');
      expect(items).toEqual([]);
      expect(mockBatchLoad).not.toHaveBeenCalled();
    });

    it('marks all items as isMastered = false', async () => {
      mockBatchLoad.mockResolvedValue(
        new Map([['A', []], ['B', []]])
      );
      mockDbExecute.mockResolvedValue([]);

      const items = await service.buildGapItems(['A', 'B'], 'tenant-1');
      expect(items.every((i) => i.isMastered === false)).toBe(true);
    });

    it('includes explanationText on every item', async () => {
      mockBatchLoad.mockResolvedValue(
        new Map([['React', [{ refId: 'seg-1', similarity: 0.9 }]]])
      );
      mockDbExecute.mockResolvedValue([]);

      const items = await service.buildGapItems(['React'], 'tenant-1');
      expect(items[0]!.explanationText).toContain('unmastered skill gaps');
    });

    it('calls batchLoad once for all concepts (N+1 fix)', async () => {
      mockBatchLoad.mockResolvedValue(
        new Map([['A', []], ['B', []], ['C', []]])
      );
      mockDbExecute.mockResolvedValue([]);

      await service.buildGapItems(['A', 'B', 'C'], 'tenant-1');
      expect(mockBatchLoad).toHaveBeenCalledTimes(1);
    });

    it('handles missing map entry gracefully', async () => {
      // DataLoader returns partial map (missing 'FailConcept')
      mockBatchLoad.mockResolvedValue(new Map());

      const items = await service.buildGapItems(['FailConcept'], 'tenant-1');
      expect(items).toHaveLength(1);
      expect(items[0]!.conceptName).toBe('FailConcept');
      expect(items[0]!.recommendedContentItems).toEqual([]);
      expect(items[0]!.relevanceScore).toBe(0);
    });
  });
});
