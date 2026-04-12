/**
 * Unit tests for EnrichedLessonBlocksService.
 *
 * Covers:
 *  1. createBlocksFromSegments() inserts HEADING + TEXT blocks.
 *  2. createBlocksFromSegments() returns PENDING view when no segments.
 *  3. createBlocksFromSegments() throws NotFoundException for missing lesson.
 *  4. Segments are grouped into ~2-minute blocks.
 *  5. onConflictDoNothing is used (idempotent).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { EnrichedLessonBlocksService } from './enriched-lesson-blocks.service';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockInsertBuilder = {
  values: vi.fn().mockReturnThis(),
  onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
};

const mockSelectBuilder = {
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
};

const mockDb = {
  select: vi.fn(() => mockSelectBuilder),
  insert: vi.fn(() => mockInsertBuilder),
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: () => mockDb,
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  withTenantContext: vi.fn(
    (_db: unknown, _ctx: unknown, fn: (db: typeof mockDb) => unknown) =>
      fn(mockDb)
  ),
  schema: {
    lessons: {
      id: 'lessons.id',
      course_id: 'lessons.course_id',
      tenant_id: 'lessons.tenant_id',
      title: 'lessons.title',
      deleted_at: 'lessons.deleted_at',
    },
    lesson_assets: {
      lesson_id: 'la.lesson_id',
      media_asset_id: 'la.media_asset_id',
    },
    media_assets: {
      id: 'ma.id',
      youtube_video_id: 'ma.youtube_video_id',
    },
    transcripts: {
      id: 'tr.id',
      asset_id: 'tr.asset_id',
    },
    transcript_segments: {
      id: 'ts.id',
      transcript_id: 'ts.transcript_id',
      start_time: 'ts.start_time',
      end_time: 'ts.end_time',
      text: 'ts.text',
    },
    enriched_transcript_blocks: {},
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val, op: 'eq' })),
  and: vi.fn((...args: unknown[]) => ({ args, op: 'and' })),
  isNull: vi.fn((col: unknown) => ({ col, op: 'isNull' })),
  asc: vi.fn((col: unknown) => ({ col, op: 'asc' })),
}));

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TENANT_CTX = {
  tenantId: '00000000-0000-0000-0000-000000000000',
  userId: 'cc000000-0000-0000-0000-000000000001',
  userRole: 'INSTRUCTOR',
};
const LESSON_ID = 'ee000000-0000-0000-0000-000000000001';

const LESSON_ROW = {
  id: LESSON_ID,
  title: 'Test Lesson',
  courseId: 'c1',
};

const SEGMENTS = [
  { id: 's1', start_time: '0', end_time: '60', text: 'Hello world' },
  { id: 's2', start_time: '60', end_time: '120', text: 'How are you' },
  {
    id: 's3',
    start_time: '130',
    end_time: '200',
    text: 'New block starts here',
  },
];

// ─────────────────────────────────────────────────────────────────────────────

describe('EnrichedLessonBlocksService', () => {
  let service: EnrichedLessonBlocksService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSelectBuilder.from.mockReturnThis();
    mockSelectBuilder.where.mockReturnThis();
    mockSelectBuilder.limit.mockReturnThis();
    mockSelectBuilder.innerJoin.mockReturnThis();
    mockSelectBuilder.orderBy.mockReturnThis();
    mockInsertBuilder.values.mockReturnThis();
    mockInsertBuilder.onConflictDoNothing.mockResolvedValue(undefined);

    service = new EnrichedLessonBlocksService();
  });

  // ── Test 1 ───────────────────────────────────────────────────────────────
  it('createBlocksFromSegments() inserts HEADING + TEXT blocks when segments exist', async () => {
    // findLesson
    mockSelectBuilder.limit.mockResolvedValueOnce([LESSON_ROW]);
    // fetchSegments
    mockSelectBuilder.orderBy.mockResolvedValueOnce(SEGMENTS);
    // fetchYoutubeVideoId
    mockSelectBuilder.limit.mockResolvedValueOnce([{ youtubeVideoId: 'abc' }]);

    const result = await service.createBlocksFromSegments(
      LESSON_ID,
      TENANT_CTX
    );

    expect(mockDb.insert).toHaveBeenCalledTimes(1);
    const insertedValues = mockInsertBuilder.values.mock
      .calls[0]?.[0] as Array<{
      block_type: string;
    }>;
    // HEADING + at least 1 TEXT block
    expect(insertedValues.some((b) => b.block_type === 'HEADING')).toBe(true);
    expect(insertedValues.some((b) => b.block_type === 'TEXT')).toBe(true);
    expect(result.lessonId).toBe(LESSON_ID);
  });

  // ── Test 2 ───────────────────────────────────────────────────────────────
  it('createBlocksFromSegments() returns PENDING view when no segments found', async () => {
    // findLesson
    mockSelectBuilder.limit.mockResolvedValueOnce([LESSON_ROW]);
    // fetchSegments → empty
    mockSelectBuilder.orderBy.mockResolvedValueOnce([]);

    const result = await service.createBlocksFromSegments(
      LESSON_ID,
      TENANT_CTX
    );

    expect(mockDb.insert).not.toHaveBeenCalled();
    expect(result.enrichmentStatus).toBe('PENDING');
    expect(result.transcriptReady).toBe(false);
  });

  // ── Test 3 ───────────────────────────────────────────────────────────────
  it('createBlocksFromSegments() throws NotFoundException when lesson not found', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    await expect(
      service.createBlocksFromSegments(LESSON_ID, TENANT_CTX)
    ).rejects.toThrow(NotFoundException);
  });

  // ── Test 4 ───────────────────────────────────────────────────────────────
  it('segments spanning > 120s are split into separate TEXT blocks', async () => {
    const longSegments = [
      { id: 's1', start_time: '0', end_time: '119', text: 'Block A' },
      { id: 's2', start_time: '120', end_time: '240', text: 'Block B' },
    ];
    mockSelectBuilder.limit.mockResolvedValueOnce([LESSON_ROW]);
    mockSelectBuilder.orderBy.mockResolvedValueOnce(longSegments);
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    await service.createBlocksFromSegments(LESSON_ID, TENANT_CTX);

    const insertedValues = mockInsertBuilder.values.mock
      .calls[0]?.[0] as Array<{
      block_type: string;
    }>;
    const textBlocks = insertedValues.filter((b) => b.block_type === 'TEXT');
    // s1 ends at 119, s2 starts at 120 (diff >= 120), so should split into 2 TEXT blocks
    expect(textBlocks.length).toBeGreaterThanOrEqual(2);
  });

  // ── Test 5 ───────────────────────────────────────────────────────────────
  it('insert uses onConflictDoNothing for idempotency', async () => {
    mockSelectBuilder.limit.mockResolvedValueOnce([LESSON_ROW]);
    mockSelectBuilder.orderBy.mockResolvedValueOnce(SEGMENTS);
    mockSelectBuilder.limit.mockResolvedValueOnce([]);

    await service.createBlocksFromSegments(LESSON_ID, TENANT_CTX);

    expect(mockInsertBuilder.onConflictDoNothing).toHaveBeenCalledTimes(1);
  });
});
