import { Injectable, Logger } from '@nestjs/common';
import type { TenantContext } from '@edusphere/db';
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

export interface PipelineNode {
  id: string;
  moduleType: string;
  config: Record<string, unknown>;
  enabled: boolean;
  order: number;
}

@Injectable()
export class PipelineModuleExecutorService {
  private readonly logger = new Logger(PipelineModuleExecutorService.name);

  constructor(private readonly publishService: LessonPublishService) {}

  async executeModule(
    node: PipelineNode,
    context: Record<string, unknown>,
    _tenantCtx: TenantContext
  ): Promise<Record<string, unknown>> {
    const model = (node.config['model'] as string | undefined) ?? 'gpt-4o';
    const locale = 'he';

    switch (node.moduleType) {
      case 'INGESTION':
        return this.runIngestion(node, context, model, locale);
      case 'NER_SOURCE_LINKING':
        return this.runNER(context, model, locale);
      case 'CONTENT_CLEANING':
        return this.runContentCleaning(context, model, locale);
      case 'SUMMARIZATION':
        return this.runSummarization(context, model, locale);
      case 'STRUCTURED_NOTES':
        return this.runStructuredNotes(context, model, locale);
      case 'DIAGRAM_GENERATOR':
        return this.runDiagramGenerator(node, context, model, locale);
      case 'CITATION_VERIFIER':
        return this.runCitationVerifier(node, context, model, locale);
      case 'QA_GATE':
        return this.runQAGate(context, model, locale);
      case 'ASR':
        this.logger.log(
          `ASR module: transcription handled by transcription-worker via NATS`
        );
        return { asrDelegated: true };
      case 'PUBLISH_SHARE':
        return this.runPublish(context, _tenantCtx);
      default:
        this.logger.warn(`Unknown module type: ${node.moduleType}`);
        return {};
    }
  }

  private async runIngestion(
    node: PipelineNode,
    context: Record<string, unknown>,
    model: string,
    locale: string
  ): Promise<Record<string, unknown>> {
    const wf = createLessonIngestionWorkflow(model, locale);
    const configUrl = node.config['sourceUrl'] as string | undefined;
    const result = await wf.run({
      videoUrl: configUrl ?? (context['videoUrl'] as string | undefined),
      audioFileKey: context['audioFileKey'] as string | undefined,
      notesFileKey: context['notesFileKey'] as string | undefined,
    });
    return { ingestion: result, bundle: result.bundle };
  }

  private async runNER(
    context: Record<string, unknown>,
    model: string,
    locale: string
  ): Promise<Record<string, unknown>> {
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

  private async runContentCleaning(
    context: Record<string, unknown>,
    model: string,
    locale: string
  ): Promise<Record<string, unknown>> {
    const wf = createContentCleaningWorkflow(model, locale);
    const transcript =
      (context['enrichedTranscript'] as string | undefined) ??
      (context['transcript'] as string | undefined) ??
      '';
    const result = await wf.run({ rawText: transcript });
    return { cleaning: result, cleanedText: result.cleanedText };
  }

  private async runSummarization(
    context: Record<string, unknown>,
    model: string,
    locale: string
  ): Promise<Record<string, unknown>> {
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

  private async runStructuredNotes(
    context: Record<string, unknown>,
    model: string,
    locale: string
  ): Promise<Record<string, unknown>> {
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

  private async runDiagramGenerator(
    node: PipelineNode,
    context: Record<string, unknown>,
    model: string,
    locale: string
  ): Promise<Record<string, unknown>> {
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

  private async runCitationVerifier(
    node: PipelineNode,
    context: Record<string, unknown>,
    model: string,
    locale: string
  ): Promise<Record<string, unknown>> {
    const wf = createCitationVerifierWorkflow(model, locale);
    const result = await wf.run({
      citations:
        (context['citations'] as
          | Array<{ sourceText: string; bookName: string }>
          | undefined) ?? [],
      strictMode: Boolean(node.config['strictMode'] ?? false),
    });
    return {
      citationVerification: result,
      matchReport: result.matchReport,
    };
  }

  private async runQAGate(
    context: Record<string, unknown>,
    model: string,
    locale: string
  ): Promise<Record<string, unknown>> {
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

  private async runPublish(
    context: Record<string, unknown>,
    tenantCtx: TenantContext
  ): Promise<Record<string, unknown>> {
    const lessonId = context['lessonId'] as string;
    const currentRunId = context['runId'] as string;
    const result = await this.publishService.publishLesson(
      lessonId,
      currentRunId,
      tenantCtx
    );
    return {
      publishReady: true,
      publishUrl: result.publishUrl,
      publishedAt: result.publishedAt,
      publishedRunId: result.publishedRunId,
    };
  }
}
