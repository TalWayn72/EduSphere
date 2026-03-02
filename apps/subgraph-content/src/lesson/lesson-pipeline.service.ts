import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  desc,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions, NatsSubjects } from '@edusphere/nats-client';
import type { LessonPayload } from '@edusphere/nats-client';
import { LessonPipelineOrchestratorService } from './lesson-pipeline-orchestrator.service';

export interface SaveLessonPipelineInput {
  templateName?: string;
  nodes: unknown[];
  config?: Record<string, unknown>;
}

@Injectable()
export class LessonPipelineService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonPipelineService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;

  constructor(
    private readonly orchestrator: LessonPipelineOrchestratorService
  ) {}

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

  private mapPipeline(row: Record<string, unknown> | null | undefined) {
    if (!row) return null;
    return {
      id: row['id'],
      lessonId: row['lesson_id'] ?? row['lessonId'],
      templateName: row['template_name'] ?? null,
      nodes: row['nodes'] ?? [],
      config: row['config'] ?? {},
      status: row['status'],
      createdAt: row['created_at'] ? String(row['created_at']) : null,
    };
  }

  private mapRun(row: Record<string, unknown> | null | undefined) {
    if (!row) return null;
    return {
      id: row['id'],
      pipelineId: row['pipeline_id'] ?? row['pipelineId'],
      startedAt: row['started_at'] ? String(row['started_at']) : null,
      completedAt: row['completed_at'] ? String(row['completed_at']) : null,
      status: row['status'],
      logs: row['logs'] ?? [],
    };
  }

  async findByLesson(lessonId: string) {
    const [row] = await this.db
      .select()
      .from(schema.lesson_pipelines)
      .where(eq(schema.lesson_pipelines.lesson_id, lessonId))
      .orderBy(desc(schema.lesson_pipelines.created_at))
      .limit(1);
    return this.mapPipeline(row as Record<string, unknown>);
  }

  async findRunById(runId: string) {
    const [row] = await this.db
      .select()
      .from(schema.lesson_pipeline_runs)
      .where(eq(schema.lesson_pipeline_runs.id, runId))
      .limit(1);
    return this.mapRun(row as Record<string, unknown>);
  }

  async findResultsByRunId(runId: string) {
    const rows = await this.db
      .select()
      .from(schema.lesson_pipeline_results)
      .where(eq(schema.lesson_pipeline_results.run_id, runId));
    return rows.map((r) => ({
      id: r.id,
      runId: r.run_id,
      moduleName: r.module_name,
      outputType: r.output_type,
      outputData: r.output_data,
      fileUrl: r.file_url ?? null,
      createdAt: String(r.created_at),
    }));
  }

  async savePipeline(
    lessonId: string,
    input: SaveLessonPipelineInput,
    _tenantCtx: TenantContext
  ) {
    const existing = await this.findByLesson(lessonId);
    if (existing) {
      const [row] = await this.db
        .update(schema.lesson_pipelines)
        .set({
          template_name: input.templateName ?? null,
          nodes: input.nodes,
          config: input.config ?? {},
          status: 'DRAFT',
        })
        .where(eq(schema.lesson_pipelines.id, String(existing.id)))
        .returning();
      return this.mapPipeline(row as Record<string, unknown>);
    }

    const [row] = await this.db
      .insert(schema.lesson_pipelines)
      .values({
        lesson_id: lessonId,
        template_name: input.templateName ?? null,
        nodes: input.nodes,
        config: input.config ?? {},
        status: 'DRAFT',
      })
      .returning();
    this.logger.log(`Pipeline saved for lesson ${lessonId}`);
    return this.mapPipeline(row as Record<string, unknown>);
  }

  async startRun(pipelineId: string, tenantCtx: TenantContext) {
    // Prevent duplicate concurrent runs
    const [existing] = await this.db
      .select()
      .from(schema.lesson_pipeline_runs)
      .where(
        and(
          eq(schema.lesson_pipeline_runs.pipeline_id, pipelineId),
          eq(schema.lesson_pipeline_runs.status, 'RUNNING')
        )
      )
      .limit(1);
    if (existing) return this.mapRun(existing as Record<string, unknown>);

    const [row] = await this.db
      .insert(schema.lesson_pipeline_runs)
      .values({
        pipeline_id: pipelineId,
        started_at: new Date(),
        status: 'RUNNING',
      })
      .returning();

    const run = this.mapRun(row as Record<string, unknown>);
    const runId = String(row?.['id']);

    // Get lesson info for NATS event
    const [pipeline] = await this.db
      .select({ lesson_id: schema.lesson_pipelines.lesson_id })
      .from(schema.lesson_pipelines)
      .where(eq(schema.lesson_pipelines.id, pipelineId))
      .limit(1);

    const [lessonRow] = pipeline
      ? await this.db
          .select({ course_id: schema.lessons.course_id })
          .from(schema.lessons)
          .where(eq(schema.lessons.id, String(pipeline['lesson_id'])))
          .limit(1)
      : [];

    const payload: LessonPayload = {
      type: 'lesson.pipeline.started',
      lessonId: String(pipeline?.['lesson_id'] ?? ''),
      courseId: String(lessonRow?.['course_id'] ?? ''),
      tenantId: tenantCtx.tenantId,
      timestamp: new Date().toISOString(),
    };
    this.publishEvent(NatsSubjects.LESSON_PIPELINE_STARTED, payload);

    // Fire-and-forget with 5-minute timeout per memory safety rules
    const FIVE_MINUTES = 5 * 60 * 1000;
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error('Pipeline run timed out')),
        FIVE_MINUTES
      )
    );
    Promise.race([
      this.orchestrator.executeRun(runId, pipelineId, tenantCtx),
      timeoutPromise,
    ]).catch((err: unknown) => {
      this.logger.error(`Pipeline run ${runId} failed: ${String(err)}`);
      this.db
        .update(schema.lesson_pipeline_runs)
        .set({ status: 'FAILED', completed_at: new Date() })
        .where(eq(schema.lesson_pipeline_runs.id, runId))
        .catch(() => undefined);
    });

    return run;
  }

  async cancelRun(runId: string, tenantCtx: TenantContext) {
    this.orchestrator.cancelRun(runId);
    const [row] = await this.db
      .update(schema.lesson_pipeline_runs)
      .set({ status: 'CANCELLED', completed_at: new Date() })
      .where(eq(schema.lesson_pipeline_runs.id, runId))
      .returning();
    this.logger.log(`Run ${runId} cancelled by ${tenantCtx.userId}`);
    return this.mapRun(row as Record<string, unknown>);
  }
}
