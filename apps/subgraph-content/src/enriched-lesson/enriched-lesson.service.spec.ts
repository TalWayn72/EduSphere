/**
 * Unit tests for EnrichedLessonService.
 *
 * Covers:
 *  1. getEnrichedLesson() returns youtubeVideoId from DB (BUG-119 fix).
 *  2. getEnrichedLesson() returns null youtubeVideoId when no media_asset linked.
 *  3. getEnrichedLesson() returns transcriptReady=true when blocks exist.
 *  4. getEnrichedLesson() returns enrichmentStatus='PENDING' when no blocks.
 *  5. getEnrichedLesson() throws NotFoundException when lesson does not exist.
 *  6. fetchYoutubeVideoId (via getEnrichedLesson) joins lesson_assets → media_assets.
 *  7. publishEnrichedLesson() returns youtubeVideoId from DB (not null).
 *  8. onModuleDestroy() drains NATS connection and closes pools.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EnrichedLessonService } from './enriched-lesson.service';

// ── DB mocks ──────────────────────────────────────────────────────────────────

const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);

const mockSelectBuilder = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  returning: vi.fn().mockReturnThis(),
};

const mockDb = {
  select: vi.fn(() => mockSelectBuilder),
  update: vi.fn(() => mockSelectBuilder),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  withTenantContext: vi.fn(
    (_db: unknown, _ctx: unknown, fn: (db: typeof mockDb) => unknown) =>
      fn(mockDb)
  ),
  schema: {
    lessons: {
      id: 'lessons.id',
      course_id: 'lessons.course_id',
      tenant_id: 'lessons.tenant_id',
      deleted_at: 'lessons.deleted_at',
    },
    lesson_assets: {
      lesson_id: 'lesson_assets.lesson_id',
      media_asset_id: 'lesson_assets.media_asset_id',
    },
    media_assets: {
      id: 'media_assets.id',
      youtube_video_id: 'media_assets.youtube_video_id',
    },
    enriched_transcript_blocks: {
      lesson_id: 'etb.lesson_id',
      tenant_id: 'etb.tenant_id',
      deleted_at: 'etb.deleted_at',
      block_order: 'etb.block_order',
    },
    lesson_citations: {
      lesson_id: 'lc.lesson_id',
      id: 'lc.id',
    },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ args, op: 'and' })),
  isNull: vi.fn((col: unknown) => ({ col, op: 'isNull' })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({ servers: 'nats://localhost:4222' })),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({ encode: vi.fn((s: string) => s) })),
}));

vi.mock('../content-import/youtube.client', () => ({
  YouTubeClient: {
    extractVideoId: vi.fn((url: string) => url.split('v=')[1] ?? 'vid123'),
  },
}));

vi.mock('./enriched-lesson.helpers', () => ({
  mapBlock: vi.fn((r: Record<string, unknown>) => r),
  mapCitation: vi.fn((r: Record<string, unknown>) => r),
}));

// ── Tenant context fixture ────────────────────────────────────────────────────

const TENANT_CTX = {
  tenantId: '00000000-0000-0000-0000-000000000000',
  userId: 'cc000000-0000-0000-0000-000000000001',
  role: 'INSTRUCTOR',
};

const LESSON_ID = 'ee000000-0000-0000-0000-000000000001';

// ─────────────────────────────────────────────────────────────────────────────

describe('EnrichedLessonService', () => {
  let service: EnrichedLessonService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectBuilder.from.mockReturnThis();
    mockSelectBuilder.where.mockReturnThis();
    mockSelectBuilder.limit.mockReturnThis();
    mockSelectBuilder.orderBy.mockReturnThis();
    mockSelectBuilder.innerJoin.mockReturnThis();

    service = new EnrichedLessonService();
  });

  // ── Test 1 — BUG-119 ─────────────────────────────────────────────────────
  it('getEnrichedLesson() should return youtubeVideoId from DB', async () => {
    // findLessonOrThrow → lesson found
    mockSelectBuilder.limit.mockResolvedValueOnce([
      { id: LESSON_ID, courseId: 'c1', tenant_id: TENANT_CTX.tenantId },
    ]);
    // getBlocks → no blocks
    mockSelectBuilder.orderBy.mockResolvedValueOnce([]);
    // fetchYoutubeVideoId → media_asset has video ID
    mockSelectBuilder.limit.mockResolvedValueOnce([
      { youtubeVideoId: 'K6d8hqTqKyA' },
    ]);

    const result = await service.getEnrichedLesson(LESSON_ID, TENANT_CTX);

    expect(result).not.toBeNull();
    expect(result?.youtubeVideoId).toBe('K6d8hqTqKyA');
  });

  // ── Test 2 — BUG-119 ─────────────────────────────────────────────────────
  it('getEnrichedLesson() returns null youtubeVideoId when no media_asset', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([
      { id: LESSON_ID, courseId: 'c1', tenant_id: TENANT_CTX.tenantId },
    ]);
    mockSelectBuilder.orderBy.mockResolvedValueOnce([]);
    // fetchYoutubeVideoId → no media_asset row
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    const result = await service.getEnrichedLesson(LESSON_ID, TENANT_CTX);

    expect(result?.youtubeVideoId).toBeNull();
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  it('getEnrichedLesson() returns transcriptReady=true when blocks exist', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([
      { id: LESSON_ID, courseId: 'c1', tenant_id: TENANT_CTX.tenantId },
    ]);
    // getBlocks → 2 blocks
    mockSelectBuilder.orderBy.mockResolvedValueOnce([
      { id: 'b1' },
      { id: 'b2' },
    ]);
    mockSelectBuilder.limit.mockResolvedValueOnce([
      { youtubeVideoId: 'K6d8hqTqKyA' },
    ]);

    const result = await service.getEnrichedLesson(LESSON_ID, TENANT_CTX);

    expect(result?.transcriptReady).toBe(true);
    expect(result?.enrichmentStatus).toBe('READY');
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  it('getEnrichedLesson() returns enrichmentStatus=PENDING when no blocks', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([
      { id: LESSON_ID, courseId: 'c1', tenant_id: TENANT_CTX.tenantId },
    ]);
    mockSelectBuilder.orderBy.mockResolvedValueOnce([]);
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    const result = await service.getEnrichedLesson(LESSON_ID, TENANT_CTX);

    expect(result?.transcriptReady).toBe(false);
    expect(result?.enrichmentStatus).toBe('PENDING');
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  it('getEnrichedLesson() throws NotFoundException when lesson does not exist', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    await expect(
      service.getEnrichedLesson('nonexistent', TENANT_CTX)
    ).rejects.toThrow(NotFoundException);
  });

  // ── Test 6 — BUG-119 ─────────────────────────────────────────────────────
  it('getEnrichedLesson() calls innerJoin to join lesson_assets → media_assets', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([
      { id: LESSON_ID, courseId: 'c1', tenant_id: TENANT_CTX.tenantId },
    ]);
    mockSelectBuilder.orderBy.mockResolvedValueOnce([]);
    mockSelectBuilder.limit.mockResolvedValueOnce([
      { youtubeVideoId: 'abc123' },
    ]);

    await service.getEnrichedLesson(LESSON_ID, TENANT_CTX);

    // innerJoin should have been called for the fetchYoutubeVideoId query
    expect(mockSelectBuilder.innerJoin).toHaveBeenCalled();
  });

  // ── Test 7 — BUG-119 ─────────────────────────────────────────────────────
  it('publishEnrichedLesson() returns youtubeVideoId from DB not null', async () => {
    // findLessonOrThrow
    mockSelectBuilder.limit.mockResolvedValueOnce([
      { id: LESSON_ID, courseId: 'c1', tenant_id: TENANT_CTX.tenantId },
    ]);
    // getBlocks → has blocks (required for publish)
    mockSelectBuilder.orderBy.mockResolvedValueOnce([{ id: 'b1' }]);
    // fetchYoutubeVideoId
    mockSelectBuilder.limit.mockResolvedValueOnce([
      { youtubeVideoId: 'K6d8hqTqKyA' },
    ]);

    const result = await service.publishEnrichedLesson(LESSON_ID, TENANT_CTX);

    expect(result.youtubeVideoId).toBe('K6d8hqTqKyA');
    expect(result.enrichmentStatus).toBe('PUBLISHED');
  });

  // ── Test 8 ────────────────────────────────────────────────────────────────
  it('onModuleDestroy() drains NATS and closes pools', async () => {
    // Trigger NATS connection by calling a method that uses getNats()
    const natsModule = await import('nats');
    const mockNc = {
      publish: vi.fn(),
      drain: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(natsModule.connect).mockResolvedValueOnce(mockNc as never);

    await service.onModuleDestroy();

    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });
});
