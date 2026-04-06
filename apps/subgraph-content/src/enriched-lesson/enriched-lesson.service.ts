import {
  Injectable,
  Logger,
  OnModuleDestroy,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  isNull,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { withTenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { YouTubeClient } from '../content-import/youtube.client';
import type {
  IngestYoutubeLessonInput,
  UpdateCitationInput,
  SetBlockAnchorTimestampInput,
} from './enriched-lesson.schemas';
import { mapBlock, mapCitation } from './enriched-lesson.helpers';
import type { EnrichedLessonView } from './enriched-lesson.helpers';

const NATS_YOUTUBE_INGEST = 'EDUSPHERE.lesson.youtube.ingest';
const NATS_ENRICHMENT_PUBLISHED = 'EDUSPHERE.lesson.enrichment.published';

@Injectable()
export class EnrichedLessonService implements OnModuleDestroy {
  private readonly logger = new Logger(EnrichedLessonService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;

  async onModuleDestroy(): Promise<void> {
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
  }

  private async getNats(): Promise<NatsConnection> {
    if (!this.nc) this.nc = await connect(buildNatsOptions());
    return this.nc;
  }

  private publishEvent(
    subject: string,
    payload: Record<string, unknown>
  ): void {
    this.getNats()
      .then((nc) =>
        nc.publish(subject, this.sc.encode(JSON.stringify(payload)))
      )
      .catch((err: unknown) => {
        this.logger.warn(`Failed to publish ${subject}: ${String(err)}`);
      });
  }

  /** Ingest a YouTube lesson: validate, extract video ID, publish NATS event. */
  async ingestYoutubeLesson(
    input: IngestYoutubeLessonInput,
    tenantCtx: TenantContext
  ): Promise<EnrichedLessonView> {
    const videoId = YouTubeClient.extractVideoId(input.youtubeUrl);
    const lesson = await this.findLessonOrThrow(input.lessonId, tenantCtx);
    await this.linkYoutubeVideoId(input.lessonId, videoId, tenantCtx);

    this.publishEvent(NATS_YOUTUBE_INGEST, {
      lessonId: input.lessonId,
      youtubeUrl: input.youtubeUrl,
      youtubeVideoId: videoId,
      tenantId: tenantCtx.tenantId,
      courseId: lesson.courseId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      `YouTube ingest initiated: lesson=${input.lessonId} video=${videoId}`
    );

    return {
      id: input.lessonId,
      lessonId: input.lessonId,
      youtubeVideoId: videoId,
      transcriptReady: false,
      enrichmentStatus: 'EXTRACTING_TRANSCRIPT',
    };
  }

  /** Get the enriched lesson view for a given lesson. */
  async getEnrichedLesson(
    lessonId: string,
    tenantCtx: TenantContext
  ): Promise<EnrichedLessonView | null> {
    await this.findLessonOrThrow(lessonId, tenantCtx);
    const blocks = await this.getBlocks(lessonId, tenantCtx);
    const hasBlocks = blocks.length > 0;
    const youtubeVideoId = await this.fetchYoutubeVideoId(lessonId);

    return {
      id: lessonId,
      lessonId,
      youtubeVideoId,
      transcriptReady: hasBlocks,
      enrichmentStatus: hasBlocks ? 'READY' : 'PENDING',
    };
  }

  /** Fetch youtube_video_id from lesson_assets → media_assets join. */
  private async fetchYoutubeVideoId(lessonId: string): Promise<string | null> {
    const rows = await this.db
      .select({ youtubeVideoId: schema.media_assets.youtube_video_id })
      .from(schema.lesson_assets)
      .innerJoin(
        schema.media_assets,
        eq(schema.lesson_assets.media_asset_id, schema.media_assets.id)
      )
      .where(eq(schema.lesson_assets.lesson_id, lessonId))
      .limit(1);
    return rows[0]?.youtubeVideoId ?? null;
  }

  /** Get enriched transcript blocks for a lesson, ordered by block_order. */
  async getBlocks(lessonId: string, tenantCtx: TenantContext) {
    return withTenantContext(this.db, tenantCtx, async (db) => {
      return db
        .select()
        .from(schema.enriched_transcript_blocks)
        .where(
          and(
            eq(schema.enriched_transcript_blocks.lesson_id, lessonId),
            eq(schema.enriched_transcript_blocks.tenant_id, tenantCtx.tenantId),
            isNull(schema.enriched_transcript_blocks.deleted_at)
          )
        )
        .orderBy(schema.enriched_transcript_blocks.block_order);
    });
  }

  /** Get citations for a lesson. */
  async getCitations(lessonId: string, tenantCtx: TenantContext) {
    return withTenantContext(this.db, tenantCtx, async (db) => {
      return db
        .select()
        .from(schema.lesson_citations)
        .where(eq(schema.lesson_citations.lesson_id, lessonId));
    });
  }

  /** Update a lesson citation by ID. */
  async updateCitation(
    citationId: string,
    input: UpdateCitationInput,
    tenantCtx: TenantContext
  ) {
    return withTenantContext(this.db, tenantCtx, async (db) => {
      const updateData: Record<string, unknown> = {};
      if (input.matchStatus !== undefined)
        updateData['match_status'] = input.matchStatus;
      if (input.sourceText !== undefined)
        updateData['source_text'] = input.sourceText;
      if (input.bookName !== undefined)
        updateData['book_name'] = input.bookName;
      if (input.part !== undefined) updateData['part'] = input.part;
      if (input.page !== undefined) updateData['page'] = input.page;
      if (input.column !== undefined) updateData['column'] = input.column;
      if (input.paragraph !== undefined)
        updateData['paragraph'] = input.paragraph;

      const [row] = await db
        .update(schema.lesson_citations)
        .set(updateData)
        .where(eq(schema.lesson_citations.id, citationId))
        .returning();

      if (!row) throw new NotFoundException(`Citation ${citationId} not found`);
      return mapCitation(row);
    });
  }

  /** Set start/end timestamp on an enriched transcript block. */
  async setBlockAnchorTimestamp(
    input: SetBlockAnchorTimestampInput,
    tenantCtx: TenantContext
  ) {
    return withTenantContext(this.db, tenantCtx, async (db) => {
      const [row] = await db
        .update(schema.enriched_transcript_blocks)
        .set({
          start_time: String(input.startTime),
          end_time: input.endTime !== undefined ? String(input.endTime) : null,
        })
        .where(
          and(
            eq(schema.enriched_transcript_blocks.id, input.blockId),
            eq(schema.enriched_transcript_blocks.tenant_id, tenantCtx.tenantId)
          )
        )
        .returning();

      if (!row) throw new NotFoundException(`Block ${input.blockId} not found`);
      return mapBlock(row);
    });
  }

  /** Publish an enriched lesson — validates blocks exist, emits NATS event. */
  async publishEnrichedLesson(
    lessonId: string,
    tenantCtx: TenantContext
  ): Promise<EnrichedLessonView> {
    const lesson = await this.findLessonOrThrow(lessonId, tenantCtx);
    const blocks = await this.getBlocks(lessonId, tenantCtx);

    if (blocks.length === 0) {
      throw new BadRequestException(
        'Cannot publish: no enriched blocks exist for this lesson'
      );
    }

    this.publishEvent(NATS_ENRICHMENT_PUBLISHED, {
      lessonId,
      tenantId: tenantCtx.tenantId,
      courseId: lesson.courseId,
      blockCount: blocks.length,
      timestamp: new Date().toISOString(),
    });

    const youtubeVideoId = await this.fetchYoutubeVideoId(lessonId);
    this.logger.log(`Enriched lesson published: lesson=${lessonId}`);
    return {
      id: lessonId,
      lessonId,
      youtubeVideoId,
      transcriptReady: true,
      enrichmentStatus: 'PUBLISHED',
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async findLessonOrThrow(lessonId: string, tenantCtx: TenantContext) {
    const [lesson] = await this.db
      .select({
        id: schema.lessons.id,
        courseId: schema.lessons.course_id,
        tenant_id: schema.lessons.tenant_id,
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

  private async linkYoutubeVideoId(
    lessonId: string,
    videoId: string,
    tenantCtx: TenantContext
  ): Promise<void> {
    const assets = await this.db
      .select({ mediaAssetId: schema.lesson_assets.media_asset_id })
      .from(schema.lesson_assets)
      .where(eq(schema.lesson_assets.lesson_id, lessonId))
      .limit(1);

    const mediaAssetId = assets[0]?.mediaAssetId;
    if (mediaAssetId) {
      await withTenantContext(this.db, tenantCtx, async (db) => {
        await db
          .update(schema.media_assets)
          .set({ youtube_video_id: videoId })
          .where(eq(schema.media_assets.id, mediaAssetId));
      });
    }
  }
}
