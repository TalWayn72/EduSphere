import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadRequestException,
} from '@nestjs/common';
import {
  schema,
  eq,
  and,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions, NatsSubjects } from '@edusphere/nats-client';
import type { LessonPayload } from '@edusphere/nats-client';
import { LessonPipelineOrchestratorService } from './lesson-pipeline-orchestrator.service';
import { LessonPipelineQueryService } from './lesson-pipeline-query.service.js';

export interface SaveLessonPipelineInput {
  templateName?: string;
  nodes: unknown[];
  config?: Record<string, unknown>;
}

@Injectable()
export class LessonPipelineService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonPipelineService.name);
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;

  constructor(
    private readonly orchestrator: LessonPipelineOrchestratorService,
    private readonly queryService: LessonPipelineQueryService
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    // queryService handles its own pool cleanup
  }

  private async getNats(): Promise<NatsConnection> {
    if (!this.nc) this.nc = await connect(buildNatsOptions());
    return this.nc;
  }

  private publishEvent(subject: string, payload: LessonPayload): void {
    this.getNats()
      .then((nc) => nc.publish(subject, this.sc.encode(JSON.stringify(payload))))
      .catch((err: unknown) => { this.logger.warn(`Failed to publish ${subject}: ${String(err)}`); });
  }

  // ── Query delegates ──────────────────────────────────────────────────────

  findByLesson(lessonId: string) { return this.queryService.findByLesson(lessonId); }
  findRunById(runId: string) { return this.queryService.findRunById(runId); }
  findCurrentRunByPipeline(pipelineId: string) { return this.queryService.findCurrentRunByPipeline(pipelineId); }
  findResultsByRunId(runId: string) { return this.queryService.findResultsByRunId(runId); }
  getNextRunNumber(lessonId: string) { return this.queryService.getNextRunNumber(lessonId); }
  findRunHistory(lessonId: string, limit = 10) { return this.queryService.findRunHistory(lessonId, limit); }

  // ── Mutations ──────────────────────────────────────────────────────────────

  async restoreRun(runId: string, tenantCtx: TenantContext) {
    const sourceRun = await this.queryService.findRunById(runId);
    if (!sourceRun) throw new BadRequestException(`Run "${runId}" not found`);
    const pipelineId = String(sourceRun.pipelineId);
    const lessonId = String(sourceRun.lessonId ?? '');
    const sourceResults = await this.queryService.findResultsByRunId(runId);
    const nextRun = lessonId ? await this.queryService.getNextRunNumber(lessonId) : 1;
    const db = this.queryService.db;

    const [newRow] = await db.insert(schema.lesson_pipeline_runs).values({
      pipeline_id: pipelineId, lesson_id: lessonId || null,
      run_number: nextRun, triggered_by: 'RESTORE',
      started_at: new Date(), completed_at: new Date(), status: 'COMPLETED',
    }).returning();
    const newRunId = String((newRow as Record<string, unknown>)['id']);

    if (sourceResults.length > 0) {
      await db.insert(schema.lesson_pipeline_results).values(
        sourceResults.map((r) => ({
          run_id: newRunId, module_name: r.moduleName,
          output_type: r.outputType, output_data: r.outputData ?? {},
          file_url: r.fileUrl ?? null,
        }))
      );
    }
    this.logger.log(`Run ${runId} restored as ${newRunId} by ${tenantCtx.userId}`);
    return this.queryService.mapRun(newRow as Record<string, unknown>);
  }

  async savePipeline(lessonId: string, input: SaveLessonPipelineInput, _tenantCtx: TenantContext) {
    const db = this.queryService.db;
    try {
      const existing = await this.queryService.findByLesson(lessonId);
      if (existing) {
        const [row] = await db.update(schema.lesson_pipelines).set({
          template_name: input.templateName ?? null,
          nodes: input.nodes, config: input.config ?? {}, status: 'DRAFT',
        }).where(eq(schema.lesson_pipelines.id, String(existing.id))).returning();
        return this.queryService.mapPipeline(row as Record<string, unknown>);
      }
      const [row] = await db.insert(schema.lesson_pipelines).values({
        lesson_id: lessonId, template_name: input.templateName ?? null,
        nodes: input.nodes, config: input.config ?? {}, status: 'DRAFT',
      }).returning();
      this.logger.log(`Pipeline saved for lesson ${lessonId}`);
      return this.queryService.mapPipeline(row as Record<string, unknown>);
    } catch (err) {
      this.logger.error(`Failed to save pipeline for lesson "${lessonId}": ${String(err)}`);
      throw new BadRequestException('Failed to save pipeline. Ensure the lesson exists.');
    }
  }

  async startRun(pipelineId: string, tenantCtx: TenantContext) {
    const db = this.queryService.db;
    let existing: Record<string, unknown> | undefined;
    try {
      [existing] = await db.select().from(schema.lesson_pipeline_runs)
        .where(and(
          eq(schema.lesson_pipeline_runs.pipeline_id, pipelineId),
          eq(schema.lesson_pipeline_runs.status, 'RUNNING')
        )).limit(1) as unknown as [Record<string, unknown>];
    } catch (err) {
      this.logger.error(`Failed to check existing runs for pipeline "${pipelineId}": ${String(err)}`);
      throw new BadRequestException('Failed to start pipeline run. Ensure the pipeline exists.');
    }
    if (existing) return this.queryService.mapRun(existing);

    const [pipelineRow] = await db.select({ lesson_id: schema.lesson_pipelines.lesson_id })
      .from(schema.lesson_pipelines).where(eq(schema.lesson_pipelines.id, pipelineId)).limit(1);
    const lessonIdForRun = pipelineRow ? String(pipelineRow['lesson_id']) : null;
    const runNumber = lessonIdForRun ? await this.queryService.getNextRunNumber(lessonIdForRun) : 1;

    let row: Record<string, unknown>;
    try {
      [row] = await db.insert(schema.lesson_pipeline_runs).values({
        pipeline_id: pipelineId, lesson_id: lessonIdForRun, run_number: runNumber,
        triggered_by: 'MANUAL', started_at: new Date(), status: 'RUNNING',
      }).returning() as unknown as [Record<string, unknown>];
    } catch (err) {
      this.logger.error(`Failed to create run for pipeline "${pipelineId}": ${String(err)}`);
      throw new BadRequestException('Failed to start pipeline run. Ensure the pipeline exists.');
    }

    const run = this.queryService.mapRun(row);
    const runId = String(row?.['id']);

    const [lessonRow] = lessonIdForRun
      ? await db.select({ course_id: schema.lessons.course_id })
          .from(schema.lessons).where(eq(schema.lessons.id, lessonIdForRun)).limit(1)
      : [];
    const payload: LessonPayload = {
      type: 'lesson.pipeline.started', lessonId: lessonIdForRun ?? '',
      courseId: String(lessonRow?.['course_id'] ?? ''),
      tenantId: tenantCtx.tenantId, timestamp: new Date().toISOString(),
    };
    this.publishEvent(NatsSubjects.LESSON_PIPELINE_STARTED, payload);

    const FIVE_MINUTES = 5 * 60 * 1000;
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Pipeline run timed out')), FIVE_MINUTES)
    );
    Promise.race([
      this.orchestrator.executeRun(runId, pipelineId, tenantCtx),
      timeoutPromise,
    ]).catch((err: unknown) => {
      this.logger.error(`Pipeline run ${runId} failed: ${String(err)}`);
      db.update(schema.lesson_pipeline_runs)
        .set({ status: 'FAILED', completed_at: new Date() })
        .where(eq(schema.lesson_pipeline_runs.id, runId))
        .catch(() => undefined);
    });
    return run;
  }

  async cancelRun(runId: string, tenantCtx: TenantContext) {
    this.orchestrator.cancelRun(runId);
    const db = this.queryService.db;
    const [row] = await db.update(schema.lesson_pipeline_runs)
      .set({ status: 'CANCELLED', completed_at: new Date() })
      .where(eq(schema.lesson_pipeline_runs.id, runId)).returning();
    this.logger.log(`Run ${runId} cancelled by ${tenantCtx.userId}`);
    return this.queryService.mapRun(row as Record<string, unknown>);
  }

  async retryModule(runId: string, moduleType: string, tenantCtx: TenantContext) {
    const db = this.queryService.db;
    const [runRow] = await db.select().from(schema.lesson_pipeline_runs)
      .where(eq(schema.lesson_pipeline_runs.id, runId)).limit(1);
    if (!runRow) throw new BadRequestException(`Run ${runId} not found`);
    if (runRow.status !== 'FAILED' && runRow.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Run ${runId} is in ${runRow.status} state. Only FAILED or COMPLETED runs support module retry.`
      );
    }
    const pipelineId = String(runRow.pipeline_id);
    const [pipeline] = await db.select().from(schema.lesson_pipelines)
      .where(eq(schema.lesson_pipelines.id, pipelineId)).limit(1);
    if (!pipeline) throw new BadRequestException(`Pipeline ${pipelineId} not found`);
    const nodes = pipeline.nodes as Array<{ moduleType: string }>;
    if (!nodes.find((n) => n.moduleType === moduleType)) {
      throw new BadRequestException(`Module type ${moduleType} not found in pipeline`);
    }
    const [updatedRun] = await db.update(schema.lesson_pipeline_runs)
      .set({ status: 'RUNNING', completed_at: null })
      .where(eq(schema.lesson_pipeline_runs.id, runId)).returning();
    this.logger.log({ msg: 'Retrying pipeline module', runId, moduleType, tenantId: tenantCtx.tenantId, userId: tenantCtx.userId });

    const FIVE_MINUTES = 5 * 60 * 1000;
    const timeoutPromise = new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('Module retry timed out')), FIVE_MINUTES)
    );
    Promise.race([
      this.orchestrator.executeSingleModule(runId, pipelineId, moduleType, tenantCtx),
      timeoutPromise,
    ]).catch((err: unknown) => {
      this.logger.error(`Module retry ${moduleType} on run ${runId} failed: ${String(err)}`);
      db.update(schema.lesson_pipeline_runs)
        .set({ status: 'FAILED', completed_at: new Date() })
        .where(eq(schema.lesson_pipeline_runs.id, runId))
        .catch(() => undefined);
    });
    return this.queryService.mapRun(updatedRun as Record<string, unknown>);
  }
}
