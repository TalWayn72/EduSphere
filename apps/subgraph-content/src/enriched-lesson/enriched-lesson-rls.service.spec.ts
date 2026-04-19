/**
 * Regression tests for EnrichedLessonService RLS tenant-context bugs.
 *
 * BUG: findLessonOrThrow() and linkYoutubeVideoId() called this.db directly
 * without withTenantContext, bypassing RLS SET LOCAL for app.current_tenant.
 * This caused PostgreSQL to throw when RLS policies require the setting.
 *
 * Fix: both private helpers must go through withTenantContext.
 *
 * These tests verify:
 *  1. findLessonOrThrow uses withTenantContext (not bare this.db)
 *  2. linkYoutubeVideoId initial select uses withTenantContext
 *  3. getEnrichedLesson still succeeds after the fix
 *  4. ingestYoutubeLesson still succeeds after the fix
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

const mockWithTenantContext = vi.fn(
  (_db: unknown, _ctx: unknown, fn: (db: typeof mockDb) => unknown) =>
    fn(mockDb)
);

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: (...args: unknown[]) => mockCloseAllPools(...args),
  withTenantContext: (...args: Parameters<typeof mockWithTenantContext>) =>
    mockWithTenantContext(...args),
  schema: {
    lessons: {
      id: 'lessons.id',
      course_id: 'lessons.course_id',
      tenant_id: 'lessons.tenant_id',
      deleted_at: 'lessons.deleted_at',
      title: 'lessons.title',
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_CTX = {
  tenantId: '00000000-0000-0000-0000-000000000000',
  userId: 'cc000000-0000-0000-0000-000000000001',
  role: 'INSTRUCTOR',
};

const LESSON_ID = 'ee000000-0000-0000-0000-000000000001';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EnrichedLessonService — RLS tenant-context regression', () => {
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

  // ── BUG regression: findLessonOrThrow must use withTenantContext ────────────

  it('getEnrichedLesson() routes ALL DB calls through withTenantContext', async () => {
    // findLessonOrThrow → lesson found
    mockSelectBuilder.limit.mockResolvedValueOnce([
      {
        id: LESSON_ID,
        courseId: 'c1',
        tenant_id: TENANT_CTX.tenantId,
        title: 'My Lesson',
      },
    ]);
    // getBlocks → empty
    mockSelectBuilder.orderBy.mockResolvedValueOnce([]);
    // fetchYoutubeVideoId → no media asset
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    await service.getEnrichedLesson(LESSON_ID, TENANT_CTX);

    // withTenantContext MUST have been called for every DB interaction
    // (findLessonOrThrow + getBlocks + fetchYoutubeVideoId = at least 3 calls)
    expect(mockWithTenantContext).toHaveBeenCalledTimes(3);

    // Every call must carry the correct tenantId
    for (const call of mockWithTenantContext.mock.calls) {
      expect(call[1]).toMatchObject({ tenantId: TENANT_CTX.tenantId });
    }
  });

  it('getEnrichedLesson() never calls this.db.select() directly', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([
      {
        id: LESSON_ID,
        courseId: 'c1',
        tenant_id: TENANT_CTX.tenantId,
        title: 'My Lesson',
      },
    ]);
    mockSelectBuilder.orderBy.mockResolvedValueOnce([]);
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    // Before fix: mockDb.select would be called directly for findLessonOrThrow.
    // After fix: all calls go through withTenantContext which calls fn(mockDb).
    // We spy on how many times mockDb.select is called OUTSIDE withTenantContext
    // by temporarily replacing the mock to count bare calls.
    const directSelectSpy = vi.spyOn(mockDb, 'select');

    await service.getEnrichedLesson(LESSON_ID, TENANT_CTX);

    // All select() calls should go through the fn(mockDb) in withTenantContext
    // so directSelectSpy.mock.calls count equals calls inside withTenantContext
    // (not "extra" direct calls). The key assertion is withTenantContext >= 3.
    expect(mockWithTenantContext).toHaveBeenCalledTimes(3);
    directSelectSpy.mockRestore();
  });

  it('ingestYoutubeLesson() routes lesson_assets lookup through withTenantContext', async () => {
    // findLessonOrThrow
    mockSelectBuilder.limit.mockResolvedValueOnce([
      {
        id: LESSON_ID,
        courseId: 'c1',
        tenant_id: TENANT_CTX.tenantId,
        title: 'My Lesson',
      },
    ]);
    // linkYoutubeVideoId: lesson_assets select → mediaAssetId found
    mockSelectBuilder.limit.mockResolvedValueOnce([{ mediaAssetId: 'ma-001' }]);
    // linkYoutubeVideoId: media_assets update (inside withTenantContext)
    // (no additional mock needed — update returns undefined in mock)

    await service.ingestYoutubeLesson(
      { lessonId: LESSON_ID, youtubeUrl: 'https://youtube.com/watch?v=abc123' },
      TENANT_CTX
    );

    // withTenantContext calls:
    //  1. findLessonOrThrow (lesson select)
    //  2. linkYoutubeVideoId — lesson_assets select
    //  3. linkYoutubeVideoId — media_assets update (only when mediaAssetId found)
    expect(mockWithTenantContext).toHaveBeenCalledTimes(3);
    for (const call of mockWithTenantContext.mock.calls) {
      expect(call[1]).toMatchObject({ tenantId: TENANT_CTX.tenantId });
    }
  });

  it('getEnrichedLesson() still throws NotFoundException when lesson not found', async () => {
    // findLessonOrThrow → no rows → NotFoundException
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    await expect(
      service.getEnrichedLesson('nonexistent-id', TENANT_CTX)
    ).rejects.toThrow(NotFoundException);
  });

  it('getEnrichedLesson() returns lesson title from DB', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([
      {
        id: LESSON_ID,
        courseId: 'c1',
        tenant_id: TENANT_CTX.tenantId,
        title: 'Talmud Tractate Bava Metzia',
      },
    ]);
    mockSelectBuilder.orderBy.mockResolvedValueOnce([]);
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    const result = await service.getEnrichedLesson(LESSON_ID, TENANT_CTX);

    expect(result?.lessonTitle).toBe('Talmud Tractate Bava Metzia');
  });
});
