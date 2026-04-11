/**
 * Unit tests for TranscriptReadyConsumer.
 *
 * Covers:
 *  1. onModuleInit() subscribes to 'transcription.completed' subject.
 *  2. Valid payload triggers createBlocksFromSegments with correct lessonId.
 *  3. Skips block generation when no lesson is linked to asset.
 *  4. onModuleDestroy() unsubscribes and drains NATS.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── vi.hoisted: avoid top-level variable reference before initialisation ──────

const { mockSub, mockNc, mockSelectBuilder, mockDb } = vi.hoisted(() => {
  const mockSub = {
    unsubscribe: vi.fn(),
    [Symbol.asyncIterator]: vi.fn(),
  };
  const mockNc = {
    subscribe: vi.fn(() => mockSub),
    drain: vi.fn().mockResolvedValue(undefined),
  };
  const mockSelectBuilder = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  };
  const mockDb = { select: vi.fn(() => mockSelectBuilder) };
  return { mockSub, mockNc, mockSelectBuilder, mockDb };
});

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue(mockNc),
  StringCodec: vi.fn(() => ({
    encode: (s: string) => s,
    decode: (s: string) => s,
  })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  schema: {
    lesson_assets: { lesson_id: 'la.lesson_id', media_asset_id: 'la.media_asset_id' },
    media_assets: { id: 'ma.id' },
  },
  eq: vi.fn(),
}));

// ── Import AFTER mocks are declared ──────────────────────────────────────────

import { TranscriptReadyConsumer } from './transcript-ready.consumer';

// ── Blocks service stub ───────────────────────────────────────────────────────

const mockCreateBlocks = vi.fn().mockResolvedValue({ lessonId: 'l1' });
const mockBlocksService = { createBlocksFromSegments: mockCreateBlocks };

// ─────────────────────────────────────────────────────────────────────────────

describe('TranscriptReadyConsumer', () => {
  let consumer: TranscriptReadyConsumer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectBuilder.from.mockReturnThis();
    mockSelectBuilder.where.mockReturnThis();
    mockSelectBuilder.limit.mockReturnThis();
    mockSelectBuilder.innerJoin.mockReturnThis();
    mockNc.subscribe.mockReturnValue(mockSub);
    // Make the async iterator immediately finish (empty subscription)
    mockSub[Symbol.asyncIterator].mockReturnValue({
      next: vi.fn().mockResolvedValue({ done: true, value: undefined }),
    });

    consumer = new TranscriptReadyConsumer(mockBlocksService as never);
  });

  // ── Test 1 ───────────────────────────────────────────────────────────────
  it('onModuleInit() subscribes to transcription.completed with queue group', async () => {
    await consumer.onModuleInit();

    expect(mockNc.subscribe).toHaveBeenCalledWith(
      'transcription.completed',
      expect.objectContaining({ queue: 'enriched-lesson-blocks' })
    );
  });

  // ── Test 2 ───────────────────────────────────────────────────────────────
  it('handleTranscriptionCompleted() calls createBlocksFromSegments when lesson found', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([{ lessonId: 'lesson-123' }]);

    const c = consumer as unknown as {
      handleTranscriptionCompleted: (p: unknown) => Promise<void>;
    };
    await c.handleTranscriptionCompleted({ assetId: 'asset-abc', tenantId: 'tenant-xyz' });

    expect(mockCreateBlocks).toHaveBeenCalledWith('lesson-123', {
      tenantId: 'tenant-xyz',
      userId: 'system',
      userRole: 'SYSTEM',
    });
  });

  // ── Test 3 ───────────────────────────────────────────────────────────────
  it('handleTranscriptionCompleted() skips generation when no lesson linked to asset', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    const c = consumer as unknown as {
      handleTranscriptionCompleted: (p: unknown) => Promise<void>;
    };
    await c.handleTranscriptionCompleted({ assetId: 'asset-unknown', tenantId: 'tenant-xyz' });

    expect(mockCreateBlocks).not.toHaveBeenCalled();
  });

  // ── Test 4 ───────────────────────────────────────────────────────────────
  it('onModuleDestroy() unsubscribes and drains NATS connection', async () => {
    await consumer.onModuleInit();
    await consumer.onModuleDestroy();

    expect(mockSub.unsubscribe).toHaveBeenCalled();
    expect(mockNc.drain).toHaveBeenCalled();
  });
});
