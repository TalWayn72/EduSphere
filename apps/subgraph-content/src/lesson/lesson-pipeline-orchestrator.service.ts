import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type { NEREntityItem } from '@edusphere/nats-client';
import { PipelineModuleExecutorService } from './pipeline-module-executor.service';
import { PipelineNatsService } from './pipeline-nats.service';
import type { PipelineNode } from './pipeline-module-executor.service';
import type { LessonPipelineModuleCompletedPayload } from '@edusphere/nats-client';

function moduleEvent(
  lessonId: string, runId: string, moduleType: string,
  status: string, tenantId: string
): LessonPipelineModuleCompletedPayload {
  return {
    type: 'lesson.pipeline.module.completed',
    lessonId, runId, moduleType, moduleName: moduleType,
    status, tenantId, timestamp: new Date().toISOString(),
  };
}

@Injectable()
export class LessonPipelineOrchestratorService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonPipelineOrchestratorService.name);
  private readonly db = createDatabaseConnection();
  private readonly activeControllers = new Set<AbortController>();
  private readonly runControllers = new Map<string, AbortController>();

  constructor(
    private readonly moduleExecutor: PipelineModuleExecutorService,
    private readonly natsService: PipelineNatsService
  ) {}

  async onModuleDestroy(): Promise<void> {
    for (const ctrl of this.activeControllers) ctrl.abort();
    this.activeControllers.clear();
    this.runControllers.clear();
    await closeAllPools();
  }

  cancelRun(runId: string): void {
    const ctrl = this.runControllers.get(runId);
    if (!ctrl) return;
    ctrl.abort();
    this.runControllers.delete(runId);
    this.activeControllers.delete(ctrl);
  }

  async executeRun(
    runId: string,
    pipelineId: string,
    tenantCtx: TenantContext
  ): Promise<void> {
    const ctrl = new AbortController();
    this.activeControllers.add(ctrl);
    this.runControllers.set(runId, ctrl);

    try {
      const { nodes, lessonId, sharedContext } =
        await this.loadPipelineContext(pipelineId, runId, tenantCtx);

      let ctx = sharedContext;
      for (const node of nodes) {
        if (ctrl.signal.aborted) break;
        ctx = await this.runSingleNode(node, ctx, runId, lessonId, tenantCtx);
      }

      if (!ctrl.signal.aborted) {
        await this.markRunCompleted(runId, pipelineId, lessonId, tenantCtx);
      }
    } finally {
      this.activeControllers.delete(ctrl);
      this.runControllers.delete(runId);
    }
  }

  async executeSingleModule(
    runId: string,
    pipelineId: string,
    moduleType: string,
    tenantCtx: TenantContext
  ): Promise<void> {
    const [pipelineRow] = await this.db
      .select()
      .from(schema.lesson_pipelines)
      .where(eq(schema.lesson_pipelines.id, pipelineId))
      .limit(1);

    if (!pipelineRow) {
      throw new NotFoundException(`Pipeline ${pipelineId} not found`);
    }

    const nodes = (pipelineRow.nodes as PipelineNode[]).filter(
      (n) => n.enabled !== false
    );
    const targetNode = nodes.find((n) => n.moduleType === moduleType);
    if (!targetNode) {
      throw new NotFoundException(
        `Module ${moduleType} not found in pipeline`
      );
    }

    const lessonId = String(pipelineRow.lesson_id);
    const sharedContext = await this.buildContextFromResults(
      runId, lessonId, tenantCtx
    );

    this.logger.log(`[Run ${runId}] Retrying module: ${moduleType}`);
    const startedAt = Date.now();

    try {
      const output = await this.moduleExecutor.executeModule(
        targetNode,
        sharedContext,
        tenantCtx
      );

      await this.db.insert(schema.lesson_pipeline_results).values({
        run_id: runId,
        module_name: moduleType,
        output_type: moduleType.toLowerCase(),
        output_data: output as Record<string, unknown>,
      });

      const elapsed = Date.now() - startedAt;
      this.logger.log(
        `[Run ${runId}] Module ${moduleType} retry completed in ${elapsed}ms`
      );

      this.natsService.publishModuleEvent(
        moduleEvent(lessonId, runId, moduleType, 'COMPLETED', tenantCtx.tenantId)
      );
      await this.db.update(schema.lesson_pipeline_runs)
        .set({ status: 'COMPLETED', completed_at: new Date() })
        .where(eq(schema.lesson_pipeline_runs.id, runId));
    } catch (err: unknown) {
      this.logger.error(`[Run ${runId}] Module ${moduleType} retry failed: ${String(err)}`);
      this.natsService.publishModuleEvent(
        moduleEvent(lessonId, runId, moduleType, 'FAILED', tenantCtx.tenantId)
      );
      await this.db.update(schema.lesson_pipeline_runs)
        .set({ status: 'FAILED', completed_at: new Date() })
        .where(eq(schema.lesson_pipeline_runs.id, runId));
    }
  }

  private async loadPipelineContext(
    pipelineId: string, runId: string, tenantCtx: TenantContext
  ): Promise<{ nodes: PipelineNode[]; lessonId: string; sharedContext: Record<string, unknown> }> {
    const [row] = await this.db.select().from(schema.lesson_pipelines)
      .where(eq(schema.lesson_pipelines.id, pipelineId)).limit(1);
    if (!row) throw new NotFoundException(`Pipeline ${pipelineId} not found`);

    const nodes = (row.nodes as PipelineNode[])
      .filter((n) => n.enabled !== false).sort((a, b) => a.order - b.order);
    const lessonId = String(row.lesson_id);

    const assets = await this.db.select().from(schema.lesson_assets)
      .where(eq(schema.lesson_assets.lesson_id, lessonId));
    const find = (t: string) => assets.find((a) => a.asset_type === t);

    return {
      nodes, lessonId,
      sharedContext: {
        lessonId, runId, tenantId: tenantCtx.tenantId,
        videoUrl: find('VIDEO')?.source_url ?? find('VIDEO')?.file_url ?? undefined,
        audioFileKey: find('AUDIO')?.file_url ?? undefined,
        notesFileKey: find('NOTES')?.file_url ?? undefined,
      },
    };
  }

  private async buildContextFromResults(
    runId: string,
    lessonId: string,
    tenantCtx: TenantContext
  ): Promise<Record<string, unknown>> {
    const existingResults = await this.db
      .select()
      .from(schema.lesson_pipeline_results)
      .where(eq(schema.lesson_pipeline_results.run_id, runId));

    let ctx: Record<string, unknown> = {
      lessonId,
      runId,
      tenantId: tenantCtx.tenantId,
    };
    for (const result of existingResults) {
      ctx = { ...ctx, ...(result.output_data as Record<string, unknown>) };
    }
    return ctx;
  }

  private async runSingleNode(
    node: PipelineNode,
    sharedContext: Record<string, unknown>,
    runId: string,
    lessonId: string,
    tenantCtx: TenantContext
  ): Promise<Record<string, unknown>> {
    this.logger.log(`[Run ${runId}] Executing module: ${node.moduleType}`);
    const startedAt = Date.now();

    try {
      const output = await this.moduleExecutor.executeModule(
        node, sharedContext, tenantCtx
      );
      const merged = { ...sharedContext, ...output };

      await this.db.insert(schema.lesson_pipeline_results).values({
        run_id: runId,
        module_name: node.moduleType,
        output_type: node.moduleType.toLowerCase(),
        output_data: output as Record<string, unknown>,
      });

      const elapsed = Date.now() - startedAt;
      this.logger.log(
        `[Run ${runId}] Module ${node.moduleType} completed in ${elapsed}ms`
      );

      this.natsService.publishModuleEvent(
        moduleEvent(lessonId, runId, node.moduleType, 'COMPLETED', tenantCtx.tenantId)
      );

      // BUG-076: Bridge NER entities to Knowledge Graph via NATS
      if (node.moduleType === 'NER_SOURCE_LINKING' && output['entities']) {
        const rawEntities = output['entities'] as Array<{
          text: string;
          type: string;
        }>;
        const nerEntities: NEREntityItem[] = rawEntities.map((e) => ({
          name: e.text,
          type: (e.type as NEREntityItem['type']) || 'Concept',
          confidence: 1.0,
          sourceText: e.text,
        }));
        this.natsService.publishNEREntities(
          tenantCtx.tenantId, lessonId, runId, nerEntities
        );
      }

      return merged;
    } catch (moduleErr: unknown) {
      this.logger.error(
        `[Run ${runId}] Module ${node.moduleType} failed: ${String(moduleErr)}`
      );
      this.natsService.publishModuleEvent(
        moduleEvent(lessonId, runId, node.moduleType, 'FAILED', tenantCtx.tenantId)
      );
      return sharedContext;
    }
  }

  private async markRunCompleted(
    runId: string,
    pipelineId: string,
    lessonId: string,
    tenantCtx: TenantContext
  ): Promise<void> {
    await this.db
      .update(schema.lesson_pipeline_runs)
      .set({ status: 'COMPLETED', completed_at: new Date() })
      .where(eq(schema.lesson_pipeline_runs.id, runId));

    await this.db
      .update(schema.lesson_pipelines)
      .set({ status: 'COMPLETED' })
      .where(eq(schema.lesson_pipelines.id, pipelineId));

    await this.db
      .update(schema.lessons)
      .set({ status: 'READY' })
      .where(eq(schema.lessons.id, lessonId));

    this.natsService.publishPipelineCompleted(lessonId, tenantCtx.tenantId);
  }
}
