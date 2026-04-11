/**
 * EnrichedLessonBlocksService
 *
 * Responsible for auto-generating enriched_transcript_blocks from
 * transcript_segments for a given lesson.
 *
 * Groups consecutive ~2-minute segments into TEXT blocks and prepends a
 * HEADING block with the lesson title.  Uses onConflictDoNothing so the
 * operation is fully idempotent.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  isNull,
  asc,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { withTenantContext } from '@edusphere/db';
import type { EnrichedLessonView } from './enriched-lesson.helpers';

/** Group consecutive transcript segments into chunks of at most this many seconds. */
const BLOCK_DURATION_SECONDS = 120;

@Injectable()
export class EnrichedLessonBlocksService {
  private readonly logger = new Logger(EnrichedLessonBlocksService.name);
  private readonly db = createDatabaseConnection();

  /**
   * Auto-create enriched_transcript_blocks from transcript_segments.
   *
   * Steps:
   *  1. Fetch the lesson (verify it exists + get its title).
   *  2. Find the media_asset linked to the lesson.
   *  3. Fetch transcript_segments ordered by start_time via transcript → media_asset.
   *  4. Group segments into ~2-minute TEXT blocks.
   *  5. Prepend a HEADING block at order=0.
   *  6. Insert all blocks with onConflictDoNothing (idempotent).
   *
   * Returns an EnrichedLessonView so callers can resolve the full EnrichedLesson.
   */
  async createBlocksFromSegments(
    lessonId: string,
    tenantCtx: TenantContext
  ): Promise<EnrichedLessonView> {
    const lesson = await this.findLesson(lessonId, tenantCtx);
    const segments = await this.fetchSegments(lessonId, tenantCtx);

    if (segments.length === 0) {
      this.logger.warn(
        `createBlocksFromSegments: no transcript segments found for lesson=${lessonId}`
      );
      return this.buildView(lessonId, lesson.title ?? '', null);
    }

    const groups = this.groupSegments(segments);
    const blocks = this.buildBlocks(lessonId, tenantCtx.tenantId, lesson.title ?? '', groups);

    await withTenantContext(this.db, tenantCtx, async (db) => {
      await db
        .insert(schema.enriched_transcript_blocks)
        .values(blocks)
        .onConflictDoNothing();
    });

    this.logger.log(
      `createBlocksFromSegments: inserted ${blocks.length} blocks for lesson=${lessonId}`
    );

    const youtubeVideoId = await this.fetchYoutubeVideoId(lessonId, tenantCtx);
    return this.buildView(lessonId, lesson.title ?? '', youtubeVideoId);
  }

  // ─── Private ────────────────────────────────────────────────────────────────

  private async findLesson(lessonId: string, tenantCtx: TenantContext) {
    const [lesson] = await this.db
      .select({
        id: schema.lessons.id,
        title: schema.lessons.title,
        courseId: schema.lessons.course_id,
      })
      .from(schema.lessons)
      .where(
        and(
          eq(schema.lessons.id, lessonId),
          eq(schema.lessons.tenant_id, tenantCtx.tenantId),
          isNull(schema.lessons.deleted_at)
        )
      )
      .limit(1);

    if (!lesson) throw new NotFoundException(`Lesson ${lessonId} not found`);
    return lesson;
  }

  /** Fetch transcript segments via lesson_assets → media_assets → transcripts → segments. */
  private async fetchSegments(lessonId: string, tenantCtx: TenantContext) {
    return withTenantContext(this.db, tenantCtx, async (db) =>
      db
        .select({
          id: schema.transcript_segments.id,
          start_time: schema.transcript_segments.start_time,
          end_time: schema.transcript_segments.end_time,
          text: schema.transcript_segments.text,
        })
        .from(schema.lesson_assets)
        .innerJoin(
          schema.media_assets,
          eq(schema.lesson_assets.media_asset_id, schema.media_assets.id)
        )
        .innerJoin(
          schema.transcripts,
          eq(schema.transcripts.asset_id, schema.media_assets.id)
        )
        .innerJoin(
          schema.transcript_segments,
          eq(schema.transcript_segments.transcript_id, schema.transcripts.id)
        )
        .where(eq(schema.lesson_assets.lesson_id, lessonId))
        .orderBy(asc(schema.transcript_segments.start_time))
    );
  }

  /** Fetch youtube_video_id for the lesson. */
  private async fetchYoutubeVideoId(
    lessonId: string,
    tenantCtx: TenantContext
  ): Promise<string | null> {
    const rows = await withTenantContext(this.db, tenantCtx, async (db) =>
      db
        .select({ youtubeVideoId: schema.media_assets.youtube_video_id })
        .from(schema.lesson_assets)
        .innerJoin(
          schema.media_assets,
          eq(schema.lesson_assets.media_asset_id, schema.media_assets.id)
        )
        .where(eq(schema.lesson_assets.lesson_id, lessonId))
        .limit(1)
    );
    return rows[0]?.youtubeVideoId ?? null;
  }

  /**
   * Group segments into chunks where each chunk spans at most BLOCK_DURATION_SECONDS.
   */
  private groupSegments(
    segments: Array<{ id: string; start_time: string; end_time: string; text: string }>
  ): Array<{ segmentId: string; startTime: number; endTime: number; text: string }[]> {
    const groups: Array<{ segmentId: string; startTime: number; endTime: number; text: string }[]> = [];
    let current: { segmentId: string; startTime: number; endTime: number; text: string }[] = [];
    let groupStart = 0;

    for (const seg of segments) {
      const start = Number(seg.start_time);
      const end = Number(seg.end_time);

      if (current.length === 0) {
        groupStart = start;
      }

      if (current.length > 0 && start - groupStart >= BLOCK_DURATION_SECONDS) {
        groups.push(current);
        current = [];
        groupStart = start;
      }

      current.push({ segmentId: seg.id, startTime: start, endTime: end, text: seg.text });
    }

    if (current.length > 0) groups.push(current);
    return groups;
  }

  /** Build the DB insert rows: one HEADING block + one TEXT block per group. */
  private buildBlocks(
    lessonId: string,
    tenantId: string,
    lessonTitle: string,
    groups: Array<{ segmentId: string; startTime: number; endTime: number; text: string }[]>
  ) {
    const blocks: Array<{
      lesson_id: string;
      tenant_id: string;
      block_type: 'TEXT' | 'HEADING';
      block_order: number;
      content: Record<string, unknown>;
      segment_id: string | null;
      start_time: string | null;
      end_time: string | null;
    }> = [];

    // HEADING block at position 0
    blocks.push({
      lesson_id: lessonId,
      tenant_id: tenantId,
      block_type: 'HEADING',
      block_order: 0,
      content: { text: lessonTitle },
      segment_id: null,
      start_time: null,
      end_time: null,
    });

    groups.forEach((group, idx) => {
      const firstSeg = group[0];
      const lastSeg = group[group.length - 1];
      const combinedText = group.map((s) => s.text).join(' ');

      blocks.push({
        lesson_id: lessonId,
        tenant_id: tenantId,
        block_type: 'TEXT',
        block_order: idx + 1,
        content: { text: combinedText },
        segment_id: firstSeg?.segmentId ?? null,
        start_time: firstSeg ? String(firstSeg.startTime) : null,
        end_time: lastSeg ? String(lastSeg.endTime) : null,
      });
    });

    return blocks;
  }

  private buildView(
    lessonId: string,
    lessonTitle: string,
    youtubeVideoId: string | null
  ): EnrichedLessonView {
    return {
      id: lessonId,
      lessonId,
      lessonTitle,
      youtubeVideoId,
      transcriptReady: false,
      enrichmentStatus: 'PENDING',
    };
  }
}
