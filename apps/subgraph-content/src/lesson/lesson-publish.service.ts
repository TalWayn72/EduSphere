/**
 * lesson-publish.service.ts
 * Handles lesson publishing: sets status to PUBLISHED, links the pipeline run,
 * emits NATS LESSON_PUBLISHED event, and logs an audit entry.
 */
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
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions, NatsSubjects } from '@edusphere/nats-client';
import type { LessonPayload } from '@edusphere/nats-client';

export interface PublishResult {
  lessonId: string;
  status: string;
  publishedRunId: string | null;
  publishUrl: string;
  publishedAt: string;
}

@Injectable()
export class LessonPublishService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonPublishService.name);
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

  async publishLesson(
    lessonId: string,
    runId: string,
    tenantCtx: TenantContext
  ): Promise<PublishResult> {
    const [lesson] = await this.db
      .select()
      .from(schema.lessons)
      .where(
        and(
          eq(schema.lessons.id, lessonId),
          eq(schema.lessons.tenant_id, tenantCtx.tenantId),
          isNull(schema.lessons.deleted_at)
        )
      )
      .limit(1);

    if (!lesson) {
      throw new NotFoundException(
        `Lesson ${lessonId} not found for tenant ${tenantCtx.tenantId}`
      );
    }

    // Verify the run exists and is COMPLETED
    const [run] = await this.db
      .select()
      .from(schema.lesson_pipeline_runs)
      .where(eq(schema.lesson_pipeline_runs.id, runId))
      .limit(1);

    if (!run || run.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Pipeline run ${runId} is not in COMPLETED state`
      );
    }

    // Update lesson: set status to PUBLISHED and link the run
    const [updated] = await this.db
      .update(schema.lessons)
      .set({
        status: 'PUBLISHED',
        published_run_id: runId,
      })
      .where(eq(schema.lessons.id, lessonId))
      .returning();

    const publishedAt = new Date().toISOString();
    const publishUrl = `/lessons/${lessonId}`;

    // Structured audit log
    this.logger.log({
      msg: 'Lesson published',
      lessonId,
      runId,
      tenantId: tenantCtx.tenantId,
      userId: tenantCtx.userId,
      publishedAt,
    });

    // Emit NATS event
    const payload: LessonPayload = {
      type: 'lesson.published',
      lessonId,
      courseId: String(updated?.course_id ?? lesson.course_id),
      tenantId: tenantCtx.tenantId,
      timestamp: publishedAt,
    };

    this.getNats()
      .then((nc) =>
        nc.publish(
          NatsSubjects.LESSON_PUBLISHED,
          this.sc.encode(JSON.stringify(payload))
        )
      )
      .catch((err: unknown) => {
        this.logger.warn(
          `Failed to publish LESSON_PUBLISHED event: ${String(err)}`
        );
      });

    return {
      lessonId,
      status: 'PUBLISHED',
      publishedRunId: runId,
      publishUrl,
      publishedAt,
    };
  }
}
