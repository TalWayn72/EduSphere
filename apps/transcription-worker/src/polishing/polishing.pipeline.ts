/**
 * polishing.pipeline.ts
 *
 * Stateless helper functions used by PolishingOrchestratorService:
 *  - buildPolishingModel   — selects OpenAI or Ollama based on env
 *  - loadSegments          — fetches transcript segments via Drizzle
 *  - loadGlossary          — fetches jargon entries for lesson domains
 *  - loadInstructorId      — fetches the instructor id for a lesson
 *  - runWithProgress       — streams the LangGraph workflow and emits NATS progress events
 *  - publishCompletion     — emits POLISHING_EVENTS.COMPLETED (+ AUTO_PUBLISHED if ≥ 95%)
 */
import { Logger } from '@nestjs/common';
import { createOpenAI } from '@ai-sdk/openai';
import { createOllama } from 'ollama-ai-provider';
import { ollamaConfig } from '@edusphere/config';
import type { LanguageModel } from 'ai';
import {
  db,
  schema,
  withTenantContext,
  eq,
  and,
  asc,
  isNull,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { NatsService } from '../nats/nats.service';
import {
  detectLessonDomains,
  loadTermsForDomain,
} from '../jargon/jargon-knowledge-client';
import { POLISHING_EVENTS } from './polishing.events';
import { createTranscriptPolishingWorkflow } from '@edusphere/langgraph-workflows';
import type {
  JargonEntry,
  PolishingState,
  FormattedBlock,
} from '@edusphere/langgraph-workflows';

const pipelineLogger = new Logger('PolishingPipeline');

// ─── Types ────────────────────────────────────────────────────────────────────

export type SegmentRow = {
  id: string;
  start_time: string;
  end_time: string;
  text: string;
};

/** Convenience alias so callers don't need to import TenantContext separately. */
export type TenantCtx = TenantContext;

// ─── Model factory ────────────────────────────────────────────────────────────

export function buildPolishingModel(): LanguageModel {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    return openai('gpt-4o-mini') as unknown as LanguageModel;
  }
  const ollama = createOllama({ baseURL: `${ollamaConfig.url}/api` });
  return ollama('llama3.2') as unknown as LanguageModel;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

export async function loadSegments(
  lessonId: string,
  tenantCtx: TenantCtx
): Promise<SegmentRow[]> {
  try {
    return withTenantContext(db, tenantCtx, async (txDb) =>
      txDb
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
  } catch (err) {
    pipelineLogger.error({ err, lessonId }, 'Failed to load segments');
    return [];
  }
}

export async function loadGlossary(
  lessonId: string,
  tenantId: string
): Promise<JargonEntry[]> {
  const { domains } = await detectLessonDomains(lessonId, tenantId);
  const glossary: JargonEntry[] = [];
  for (const { domain } of domains) {
    const terms = await loadTermsForDomain(domain.id, tenantId, 100);
    for (const t of terms) {
      glossary.push({ canonical: t.canonicalForm, altForms: t.altForms });
    }
  }
  return glossary;
}

export async function loadInstructorId(
  lessonId: string,
  tenantCtx: TenantCtx
): Promise<string | null> {
  try {
    const rows = await withTenantContext(db, tenantCtx, async (txDb) =>
      txDb
        .select({ instructor_id: schema.lessons.instructor_id })
        .from(schema.lessons)
        .where(
          and(
            eq(schema.lessons.id, lessonId),
            isNull(schema.lessons.deleted_at)
          )
        )
        .limit(1)
    );
    return rows[0]?.instructor_id ?? null;
  } catch {
    return null;
  }
}

// ─── Workflow streaming ────────────────────────────────────────────────────────

export async function runWithProgress(
  workflow: ReturnType<typeof createTranscriptPolishingWorkflow>,
  initialState: Partial<PolishingState>,
  lessonId: string,
  tenantId: string,
  polishedId: string,
  nats: NatsService
): Promise<PolishingState> {
  const stream = await workflow.stream(initialState as PolishingState);
  let finalState = initialState as PolishingState;

  for await (const update of stream) {
    finalState = { ...finalState, ...update };
    const progress = finalState.progress ?? 0;
    if (progress > 0) {
      await nats.publish(POLISHING_EVENTS.PROGRESS, {
        lessonId,
        tenantId,
        polishedTranscriptId: polishedId,
        progress,
        timestamp: new Date().toISOString(),
      });
    }
  }
  return finalState;
}

// ─── NATS completion events ───────────────────────────────────────────────────

export const AUTO_PUBLISH_THRESHOLD = 0.95;

export async function publishCompletion(
  lessonId: string,
  tenantId: string,
  polishedId: string,
  result: PolishingState,
  nats: NatsService
): Promise<void> {
  const coverageScore = result.coverageScore ?? 0;
  const blockCount = result.formattedBlocks?.length ?? 0;
  const changeCount =
    result.formattedBlocks?.reduce(
      (sum, b: FormattedBlock) => sum + (b.changes?.length ?? 0),
      0
    ) ?? 0;

  await nats.publish(POLISHING_EVENTS.COMPLETED, {
    lessonId,
    tenantId,
    polishedTranscriptId: polishedId,
    coverageScore,
    blockCount,
    changeCount,
    timestamp: new Date().toISOString(),
  });

  if (coverageScore >= AUTO_PUBLISH_THRESHOLD) {
    await nats.publish(POLISHING_EVENTS.AUTO_PUBLISHED, {
      lessonId,
      tenantId,
      polishedTranscriptId: polishedId,
      coverageScore,
      timestamp: new Date().toISOString(),
    });
    pipelineLogger.log(
      { lessonId, coverageScore },
      'Transcript auto-published (coverage ≥ 95%)'
    );
  }
}
