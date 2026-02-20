import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockExecute = vi.fn();

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => ({
    select: mockSelect,
    execute: mockExecute,
  }),
  schema: {
    transcript_segments: { id: 'id', text: 'text' },
  },
  inArray: vi.fn((_col, ids) => `in(${ids.join(',')})`),
  sql: vi.fn((...args) => args),
}));

vi.mock('./ollama.client', () => ({
  embed: vi.fn(),
}));

import { EmbeddingWorker } from './embedding.worker';
import { embed } from './ollama.client';

const mockNatsService = {
  getConnection: vi.fn(),
  getStringCodec: vi.fn(),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeWorker() {
  return new EmbeddingWorker(mockNatsService as any);
}

function makeSegmentQuery(rows: Array<{ id: string; text: string }>) {
  mockSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  });
}

describe('EmbeddingWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('onModuleInit()', () => {
    it('warns and returns when NATS is not connected', async () => {
      mockNatsService.getConnection.mockReturnValue(null);
      const worker = makeWorker();
      // Replace setTimeout to skip delay in tests
      vi.spyOn(global, 'setTimeout').mockImplementationOnce((fn) => {
        (fn as () => void)();
        return 0 as unknown as ReturnType<typeof setTimeout>;
      });
      await expect(worker.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('processEmbeddings() — via direct call', () => {
    it('returns immediately for empty segmentIds', async () => {
      mockNatsService.getConnection.mockReturnValue(null);
      const worker = makeWorker();
      // Access the private method via casting for testing
      await (worker as any).processEmbeddings({
        transcriptId: 't1',
        segmentIds: [],
        tenantId: 'ten-1',
      });
      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('embeds segments and writes to content_embeddings', async () => {
      mockNatsService.getConnection.mockReturnValue(null);
      const worker = makeWorker();

      makeSegmentQuery([
        { id: 'seg-1', text: 'Hello world' },
        { id: 'seg-2', text: 'Second segment' },
      ]);

      vi.mocked(embed).mockResolvedValue([0.1, 0.2, 0.3]);
      mockExecute.mockResolvedValue([]);

      await (worker as any).processEmbeddings({
        transcriptId: 't1',
        segmentIds: ['seg-1', 'seg-2'],
        tenantId: 'ten-1',
      });

      expect(embed).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenCalledTimes(2);
    });

    it('continues processing when one segment fails to embed', async () => {
      mockNatsService.getConnection.mockReturnValue(null);
      const worker = makeWorker();

      makeSegmentQuery([
        { id: 'seg-1', text: 'ok' },
        { id: 'seg-2', text: 'will fail' },
      ]);

      vi.mocked(embed)
        .mockResolvedValueOnce([0.1, 0.2])
        .mockRejectedValueOnce(new Error('provider down'));

      mockExecute.mockResolvedValue([]);

      await (worker as any).processEmbeddings({
        transcriptId: 't1',
        segmentIds: ['seg-1', 'seg-2'],
        tenantId: 'ten-1',
      });

      // First embed succeeded, second failed but didn't crash the loop
      expect(embed).toHaveBeenCalledTimes(2);
      expect(mockExecute).toHaveBeenCalledTimes(1);
    });

    it('warns when no segments found in DB', async () => {
      mockNatsService.getConnection.mockReturnValue(null);
      const worker = makeWorker();

      makeSegmentQuery([]);

      await (worker as any).processEmbeddings({
        transcriptId: 'ghost-transcript',
        segmentIds: ['seg-missing'],
        tenantId: 'ten-1',
      });

      expect(embed).not.toHaveBeenCalled();
      expect(mockExecute).not.toHaveBeenCalled();
    });

    it('processes large batches in chunks of 20', async () => {
      mockNatsService.getConnection.mockReturnValue(null);
      const worker = makeWorker();

      const segments = Array.from({ length: 45 }, (_, i) => ({
        id: `seg-${i}`,
        text: `Segment text ${i}`,
      }));
      const segmentIds = segments.map((s) => s.id);

      makeSegmentQuery(segments);
      vi.mocked(embed).mockResolvedValue([0.1]);
      mockExecute.mockResolvedValue([]);

      await (worker as any).processEmbeddings({
        transcriptId: 't-large',
        segmentIds,
        tenantId: 'ten-1',
      });

      expect(embed).toHaveBeenCalledTimes(45);
    });
  });
});
