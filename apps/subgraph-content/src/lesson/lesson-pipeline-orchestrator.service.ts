import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions, NatsSubjects } from '@edusphere/nats-client';
import type {
  LessonPipelineModuleCompletedPayload,
  NEREntityItem,
} from '@edusphere/nats-client';
import {
  createLessonIngestionWorkflow,
  createHebrewNERWorkflow,
  createContentCleaningWorkflow,
  createSummarizationWorkflow,
  createStructuredNotesWorkflow,
  createDiagramGeneratorWorkflow,
  createCitationVerifierWorkflow,
  createQAWorkflow,
} from '@edusphere/langgraph-workflows';
import { LessonPublishService } from './lesson-publish.service';

interface PipelineNode {
  id: string;
  moduleType: string;
  config: Record<string, unknown>;
  enabled: boolean;
  order: number;
}

@Injectable()
export class LessonPipelineOrchestratorService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonPipelineOrchestratorService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;
  private readonly activeControllers = new Set<AbortController>();
  private readonly runControllers = new Map<string, AbortController>();

  constructor(private readonly publishService: LessonPublishService) {}

  async onModuleDestroy(): Promise<void> {
    for (const ctrl of this.activeControllers) {
      ctrl.abort();
    }
    this.activeControllers.clear();
    this.runControllers.clear();
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

  private publishModuleEvent(
    payload: LessonPipelineModuleCompletedPayload
  ): void {
    this.getNats()
      .then((nc) =>
        nc.publish(
          NatsSubjects.LESSON_PIPELINE_MODULE_COMPLETED,
          this.sc.encode(JSON.stringify(payload))
        )
      )
      .catch(() => undefined);
  }

  private publishNEREntities(
    tenantId: string,
    lessonId: string,
    runId: string,
    entities: NEREntityItem[]
  ): void {
    if (!entities.length) return;
    const subject = `EDUSPHERE.content.${tenantId}.ner.extracted`;
    const payload = {
      type: 'lesson.ner.extracted' as const,
      tenantId,
      lessonId,
      runId,
      entities,
      timestamp: new Date().toISOString(),
    };
    this.getNats()
      .then((nc) =>
        nc.publish(subject, this.sc.encode(JSON.stringify(payload)))
      )
      .catch((err) =>
        this.logger.error(
          { err, tenantId, lessonId, runId },
          'Failed to publish NER entities to NATS'
        )
      );
  }

  cancelRun(runId: string): void {
    const ctrl = this.runControllers.get(runId);
    if (ctrl) {
      ctrl.abort();
      this.runControllers.delete(runId);
      this.activeControllers.delete(ctrl);
    }
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
      const [pipelineRow] = await this.db
        .select()
        .from(schema.lesson_pipelines)
        .where(eq(schema.lesson_pipelines.id, pipelineId))
        .limit(1);

      if (!pipelineRow) throw new NotFoundException(`Pipeline ${pipelineId} not found`);

      const nodes = (pipelineRow.nodes as PipelineNode[])
        .filter((n) => n.enabled !== false)
        .sort((a, b) => a.order - b.order);

      const lessonId = String(pipelineRow.lesson_id);

      // Fetch lesson assets so INGESTION module can locate source content
      const lessonAssets = await this.db
        .select()
        .from(schema.lesson_assets)
        .where(eq(schema.lesson_assets.lesson_id, lessonId));
      const videoAsset = lessonAssets.find((a) => a.asset_type === 'VIDEO');
      const audioAsset = lessonAssets.find((a) => a.asset_type === 'AUDIO');
      const notesAsset = lessonAssets.find((a) => a.asset_type === 'NOTES');

      let sharedContext: Record<string, unknown> = {
        lessonId,
        runId,
        tenantId: tenantCtx.tenantId,
        videoUrl: videoAsset?.source_url ?? videoAsset?.file_url ?? undefined,
        audioFileKey: audioAsset?.file_url ?? undefined,
        notesFileKey: notesAsset?.file_url ?? undefined,
      };

      for (const node of nodes) {
        if (ctrl.signal.aborted) break;

        this.logger.log(`[Run ${runId}] Executing module: ${node.moduleType}`);
        const startedAt = Date.now();

        try {
          const output = await this.executeModule(
            node,
            sharedContext,
            tenantCtx
          );
          sharedContext = { ...sharedContext, ...output };

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

          this.publishModuleEvent({
            type: 'lesson.pipeline.module.completed',
            lessonId,
            runId,
            moduleType: node.moduleType,
            moduleName: node.moduleType,
            status: 'COMPLETED',
            tenantId: tenantCtx.tenantId,
            timestamp: new Date().toISOString(),
          });

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
            this.publishNEREntities(
              tenantCtx.tenantId,
              lessonId,
              runId,
              nerEntities
            );
          }
        } catch (moduleErr: unknown) {
          this.logger.error(
            `[Run ${runId}] Module ${node.moduleType} failed: ${String(moduleErr)}`
          );
          this.publishModuleEvent({
            type: 'lesson.pipeline.module.completed',
            lessonId,
            runId,
            moduleType: node.moduleType,
            moduleName: node.moduleType,
            status: 'FAILED',
            tenantId: tenantCtx.tenantId,
            timestamp: new Date().toISOString(),
          });
        }
      }

      if (!ctrl.signal.aborted) {
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

        this.getNats()
          .then((nc) =>
            nc.publish(
              NatsSubjects.LESSON_PIPELINE_COMPLETED,
              this.sc.encode(
                JSON.stringify({
                  type: 'lesson.pipeline.completed',
                  lessonId,
                  courseId: '',
                  tenantId: tenantCtx.tenantId,
                  timestamp: new Date().toISOString(),
                })
              )
            )
          )
          .catch(() => undefined);
      }
    } finally {
      this.activeControllers.delete(ctrl);
      this.runControllers.delete(runId);
    }
  }

  private async executeModule(
    node: PipelineNode,
    context: Record<string, unknown>,
    _tenantCtx: TenantContext
  ): Promise<Record<string, unknown>> {
    const model = (node.config['model'] as string | undefined) ?? 'gpt-4o';
    const locale = 'he';

    switch (node.moduleType) {
      case 'INGESTION': {
        const wf = createLessonIngestionWorkflow(model, locale);
        // node.config['sourceUrl'] overrides the lesson asset URL
        const configUrl = node.config['sourceUrl'] as string | undefined;
        const result = await wf.run({
          videoUrl: configUrl ?? (context['videoUrl'] as string | undefined),
          audioFileKey: context['audioFileKey'] as string | undefined,
          notesFileKey: context['notesFileKey'] as string | undefined,
        });
        return { ingestion: result, bundle: result.bundle };
      }

      case 'NER_SOURCE_LINKING': {
        const wf = createHebrewNERWorkflow(model, locale);
        const result = await wf.run({
          transcript: (context['transcript'] as string | undefined) ?? '',
        });
        return {
          ner: result,
          entities: result.entities,
          enrichedTranscript: result.enrichedTranscript,
        };
      }

      case 'CONTENT_CLEANING': {
        const wf = createContentCleaningWorkflow(model, locale);
        const transcript =
          (context['enrichedTranscript'] as string | undefined) ??
          (context['transcript'] as string | undefined) ??
          '';
        const result = await wf.run({ rawText: transcript });
        return { cleaning: result, cleanedText: result.cleanedText };
      }

      case 'SUMMARIZATION': {
        const wf = createSummarizationWorkflow(model, locale);
        const text =
          (context['cleanedText'] as string | undefined) ??
          (context['transcript'] as string | undefined) ??
          '';
        const lessonType =
          (context['lessonType'] as string | undefined) === 'SEQUENTIAL'
            ? 'SEQUENTIAL'
            : 'THEMATIC';
        const result = await wf.run({ text, lessonType });
        return {
          summarization: result,
          shortSummary: result.shortSummary,
          longSummary: result.longSummary,
          keyPoints: result.keyPoints,
        };
      }

      case 'STRUCTURED_NOTES': {
        const wf = createStructuredNotesWorkflow(model, locale);
        const result = await wf.run({
          summary: (context['longSummary'] as string | undefined) ?? '',
          keyPoints: (context['keyPoints'] as string[] | undefined) ?? [],
          entities:
            (context['entities'] as
              | Array<{ text: string; type: string }>
              | undefined) ?? [],
        });
        return {
          structuredNotes: result,
          outputMarkdown: result.outputMarkdown,
        };
      }

      case 'DIAGRAM_GENERATOR': {
        const wf = createDiagramGeneratorWorkflow(model, locale);
        const result = await wf.run({
          keyPoints: (context['keyPoints'] as string[] | undefined) ?? [],
          diagramType:
            (node.config['diagramType'] as
              | 'flowchart'
              | 'mindmap'
              | 'graph'
              | undefined) ?? 'mindmap',
        });
        return {
          diagram: result,
          mermaidSrc: result.mermaidSrc,
          svgOutput: result.svgOutput,
        };
      }

      case 'CITATION_VERIFIER': {
        const wf = createCitationVerifierWorkflow(model, locale);
        const result = await wf.run({
          citations:
            (context['citations'] as
              | Array<{
                  sourceText: string;
                  bookName: string;
                }>
              | undefined) ?? [],
          strictMode: Boolean(node.config['strictMode'] ?? false),
        });
        return {
          citationVerification: result,
          matchReport: result.matchReport,
        };
      }

      case 'QA_GATE': {
        const wf = createQAWorkflow(model, locale);
        const content = [
          context['longSummary'],
          context['cleanedText'],
          context['outputMarkdown'],
        ]
          .filter(Boolean)
          .join('\n\n');
        const result = await wf.run({
          content: content || 'No content',
          lessonType: 'THEMATIC',
        });
        return {
          qa: result,
          qaScore: result.overallScore,
          fixList: result.fixList,
        };
      }

      case 'ASR':
        this.logger.log(
          `ASR module: transcription handled by transcription-worker via NATS`
        );
        return { asrDelegated: true };

      case 'PUBLISH_SHARE': {
        const lessonId = context['lessonId'] as string;
        const currentRunId = context['runId'] as string;
        const result = await this.publishService.publishLesson(
          lessonId,
          currentRunId,
          _tenantCtx
        );
        return {
          publishReady: true,
          publishUrl: result.publishUrl,
          publishedAt: result.publishedAt,
          publishedRunId: result.publishedRunId,
        };
      }

      default:
        this.logger.warn(`Unknown module type: ${node.moduleType}`);
        return {};
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

    // Build shared context from existing pipeline results
    const existingResults = await this.db
      .select()
      .from(schema.lesson_pipeline_results)
      .where(eq(schema.lesson_pipeline_results.run_id, runId));

    let sharedContext: Record<string, unknown> = {
      lessonId,
      runId,
      tenantId: tenantCtx.tenantId,
    };
    for (const result of existingResults) {
      const data = result.output_data as Record<string, unknown>;
      sharedContext = { ...sharedContext, ...data };
    }

    this.logger.log(
      `[Run ${runId}] Retrying module: ${moduleType}`
    );
    const startedAt = Date.now();

    try {
      const output = await this.executeModule(
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

      this.publishModuleEvent({
        type: 'lesson.pipeline.module.completed',
        lessonId,
        runId,
        moduleType,
        moduleName: moduleType,
        status: 'COMPLETED',
        tenantId: tenantCtx.tenantId,
        timestamp: new Date().toISOString(),
      });

      // Mark run as COMPLETED after successful retry
      await this.db
        .update(schema.lesson_pipeline_runs)
        .set({ status: 'COMPLETED', completed_at: new Date() })
        .where(eq(schema.lesson_pipeline_runs.id, runId));
    } catch (err: unknown) {
      this.logger.error(
        `[Run ${runId}] Module ${moduleType} retry failed: ${String(err)}`
      );
      this.publishModuleEvent({
        type: 'lesson.pipeline.module.completed',
        lessonId,
        runId,
        moduleType,
        moduleName: moduleType,
        status: 'FAILED',
        tenantId: tenantCtx.tenantId,
        timestamp: new Date().toISOString(),
      });

      await this.db
        .update(schema.lesson_pipeline_runs)
        .set({ status: 'FAILED', completed_at: new Date() })
        .where(eq(schema.lesson_pipeline_runs.id, runId));
    }
  }
}
