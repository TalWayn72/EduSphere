import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions, NatsSubjects } from '@edusphere/nats-client';
import type { LessonPayload } from '@edusphere/nats-client';

export interface AddLessonAssetInput {
  assetType: 'VIDEO' | 'AUDIO' | 'NOTES' | 'WHITEBOARD';
  sourceUrl?: string;
  fileUrl?: string;
  mediaAssetId?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class LessonAssetService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonAssetService.name);
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

  private publishEvent(subject: string, payload: LessonPayload): void {
    this.getNats()
      .then((nc) =>
        nc.publish(subject, this.sc.encode(JSON.stringify(payload)))
      )
      .catch((err: unknown) => {
        this.logger.warn(`Failed to publish ${subject}: ${String(err)}`);
      });
  }

  private mapAsset(row: Record<string, unknown> | null | undefined) {
    if (!row) return null;
    return {
      id: row['id'],
      lessonId: row['lesson_id'] ?? row['lessonId'],
      assetType: row['asset_type'] ?? row['assetType'],
      sourceUrl: row['source_url'] ?? row['sourceUrl'] ?? null,
      fileUrl: row['file_url'] ?? row['fileUrl'] ?? null,
      mediaAssetId: row['media_asset_id'] ?? row['mediaAssetId'] ?? null,
      metadata: row['metadata'] ?? {},
    };
  }

  async findByLesson(lessonId: string) {
    const rows = await this.db
      .select()
      .from(schema.lesson_assets)
      .where(eq(schema.lesson_assets.lesson_id, lessonId));
    return rows.map((r) => this.mapAsset(r as Record<string, unknown>));
  }

  async addAsset(
    lessonId: string,
    input: AddLessonAssetInput,
    tenantCtx: TenantContext
  ) {
    const [row] = await this.db
      .insert(schema.lesson_assets)
      .values({
        lesson_id: lessonId,
        asset_type: input.assetType,
        source_url: input.sourceUrl ?? null,
        file_url: input.fileUrl ?? null,
        media_asset_id: input.mediaAssetId ?? null,
        metadata: input.metadata ?? {},
      })
      .returning();

    this.logger.log(
      `Lesson asset added: ${String(row?.['id'])} for lesson ${lessonId}`
    );

    // Get courseId for NATS event
    const [lessonRow] = await this.db
      .select({ course_id: schema.lessons.course_id })
      .from(schema.lessons)
      .where(eq(schema.lessons.id, lessonId))
      .limit(1);

    const payload: LessonPayload = {
      type: 'lesson.asset.uploaded',
      lessonId,
      courseId: String(lessonRow?.['course_id'] ?? ''),
      tenantId: tenantCtx.tenantId,
      timestamp: new Date().toISOString(),
    };
    this.publishEvent(NatsSubjects.LESSON_ASSET_UPLOADED, payload);

    return this.mapAsset(row as Record<string, unknown>);
  }
}
