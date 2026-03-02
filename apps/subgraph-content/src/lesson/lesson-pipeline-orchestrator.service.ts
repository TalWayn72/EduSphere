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
import type { LessonPipelineModuleCompletedPayload } from '@edusphere/nats-client';
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

      if (!pipelineRow) throw new Error(`Pipeline ${pipelineId} not found`);

      const nodes = (pipelineRow.nodes as PipelineNode[])
        .filter((n) => n.enabled !== false)
        .sort((a, b) => a.order - b.order);

      const lessonId = String(pipelineRow.lesson_id);
      let sharedContext: Record<string, unknown> = {
        lessonId,
        tenantId: tenantCtx.tenantId,
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
        const result = await wf.run({
          videoUrl: context['videoUrl'] as string | undefined,
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

      case 'PUBLISH_SHARE':
        return { publishReady: true };

      default:
        this.logger.warn(`Unknown module type: ${node.moduleType}`);
        return {};
    }
  }
}
