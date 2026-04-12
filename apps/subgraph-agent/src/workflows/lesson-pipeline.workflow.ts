/**
 * Lesson Pipeline Workflow — Phase 58.
 *
 * LangGraph-style state machine for generating a lesson from a prompt.
 * Stages: parsePrompt → fetchCitations → generateOutline → enrichWithGraph
 *         → verifyHebrew → exportMarkdown
 *
 * Two archetypes:
 *   THEMATIC    — medium citation density, topic-based structure
 *   SEQUENTIAL  — strict sequential text progression (Kabbalistic/Talmudic)
 *
 * Memory safety: no persistent state beyond input/output maps (stateless fn calls).
 */
import { generateText, type LanguageModel } from 'ai';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LessonPipelineArchetype = 'THEMATIC' | 'SEQUENTIAL';
export type LessonPipelineStatus = 'IN_PROGRESS' | 'COMPLETE' | 'FAILED';

export interface LessonPipelineInput {
  prompt: string;
  archetype: LessonPipelineArchetype;
  language?: string;
  maxCitations?: number;
}

export interface LessonCitation {
  source: string;
  reference: string;
  text: string;
}

export interface LessonPipelineResult {
  executionId: string;
  status: LessonPipelineStatus;
  markdownContent: string | null;
  citations: string[];
  hebrewNerEntities: string[];
  stage: string;
}

/** Callback for semantic search — injected by the resolver at runtime. */
export type CitationSearchFn = (
  query: string,
  limit: number
) => Promise<
  { id: string; text: string; similarity: number; source?: string }[]
>;

/** Callback for Apache AGE graph enrichment — injected by the resolver at runtime. */
export type GraphEnrichFn = (
  topic: string
) => Promise<{ name: string; type?: string }[]>;

interface PipelineContext {
  input: LessonPipelineInput;
  parsedTopic: string;
  citations: LessonCitation[];
  outline: string;
  enrichedOutline: string;
  hebrewEntities: string[];
  markdownContent: string | null;
  status: LessonPipelineStatus;
  currentStage: string;
  error: string | null;
  searchFn?: CitationSearchFn;
  graphEnrichFn?: GraphEnrichFn;
}

// ── Stage implementations ─────────────────────────────────────────────────────

async function parsePrompt(
  ctx: PipelineContext,
  model: LanguageModel
): Promise<PipelineContext> {
  const { text } = await generateText({
    model,
    messages: [
      {
        role: 'user',
        content: `Extract the core learning topic from this educational lesson request. Return only the topic name, 1-3 words.\n\nRequest: "${ctx.input.prompt}"`,
      },
    ],
    maxOutputTokens: 50,
  });
  return { ...ctx, parsedTopic: text.trim(), currentStage: 'fetchCitations' };
}

async function fetchCitations(ctx: PipelineContext): Promise<PipelineContext> {
  const maxCitations = ctx.input.maxCitations ?? 5;

  // Use real pgvector semantic search when a search function is provided
  if (ctx.searchFn) {
    try {
      const results = await ctx.searchFn(ctx.parsedTopic, maxCitations);
      const citations: LessonCitation[] = results.map((r) => ({
        source: r.source ?? 'Knowledge Base',
        reference: r.id,
        text: r.text,
      }));
      return { ...ctx, citations, currentStage: 'generateOutline' };
    } catch {
      // Search failed — return empty citations rather than fake data
      return { ...ctx, citations: [], currentStage: 'generateOutline' };
    }
  }

  // No search function provided — return empty array (not fake data)
  return { ...ctx, citations: [], currentStage: 'generateOutline' };
}

async function generateOutline(
  ctx: PipelineContext,
  model: LanguageModel
): Promise<PipelineContext> {
  const citationBlock = ctx.citations
    .map((c) => `- ${c.reference}: ${c.text}`)
    .join('\n');
  const archetypeInstructions =
    ctx.input.archetype === 'SEQUENTIAL'
      ? 'Structure as a strict sequential progression through primary texts.'
      : 'Structure as interconnected thematic clusters with cross-references.';

  const { text } = await generateText({
    model,
    messages: [
      {
        role: 'user',
        content: `Create a lesson outline for: "${ctx.input.prompt}"\n\nArchetype: ${ctx.input.archetype}\n${archetypeInstructions}\n\nCitations available:\n${citationBlock}\n\nReturn a markdown outline with 3-5 sections.`,
      },
    ],
    maxOutputTokens: 500,
  });
  return { ...ctx, outline: text.trim(), currentStage: 'enrichWithGraph' };
}

async function enrichWithGraph(ctx: PipelineContext): Promise<PipelineContext> {
  if (!ctx.graphEnrichFn) {
    // No graph function injected — pass outline through unchanged.
    return {
      ...ctx,
      enrichedOutline: ctx.outline,
      currentStage: 'verifyHebrew',
    };
  }

  try {
    const concepts = await ctx.graphEnrichFn(ctx.parsedTopic);
    if (concepts.length === 0) {
      return {
        ...ctx,
        enrichedOutline: ctx.outline,
        currentStage: 'verifyHebrew',
      };
    }

    const conceptBlock = concepts
      .map((c) => `- **${c.name}**${c.type ? ` _(${c.type})_` : ''}`)
      .join('\n');

    const enriched =
      ctx.outline +
      `\n\n<!-- Knowledge Graph: related concepts for "${ctx.parsedTopic}" -->\n` +
      '## Related Concepts (from Knowledge Graph)\n\n' +
      conceptBlock;

    return { ...ctx, enrichedOutline: enriched, currentStage: 'verifyHebrew' };
  } catch {
    // Graph query failed — continue with unenriched outline.
    return {
      ...ctx,
      enrichedOutline: ctx.outline,
      currentStage: 'verifyHebrew',
    };
  }
}

async function verifyHebrew(ctx: PipelineContext): Promise<PipelineContext> {
  // Stub: in production, uses Hebrew NER on citations to extract entities
  const entities: string[] = ctx.citations.map((c) => c.reference);
  return { ...ctx, hebrewEntities: entities, currentStage: 'exportMarkdown' };
}

async function exportMarkdown(
  ctx: PipelineContext,
  model: LanguageModel
): Promise<PipelineContext> {
  const { text } = await generateText({
    model,
    messages: [
      {
        role: 'user',
        content: `Convert this lesson outline into a complete, ready-to-teach lesson in Markdown format.\n\nLanguage: ${ctx.input.language ?? 'he'}\nOutline:\n${ctx.enrichedOutline}\n\nCitations:\n${ctx.citations.map((c) => `- **${c.reference}**: ${c.text}`).join('\n')}\n\nInclude: introduction, main sections, key concepts, discussion questions, and conclusion.`,
      },
    ],
    maxOutputTokens: 2000,
  });
  return {
    ...ctx,
    markdownContent: text.trim(),
    status: 'COMPLETE',
    currentStage: 'done',
  };
}

// ── Main pipeline runner ──────────────────────────────────────────────────────

export async function runLessonPipeline(
  input: LessonPipelineInput,
  model: LanguageModel,
  executionId: string,
  searchFn?: CitationSearchFn,
  graphEnrichFn?: GraphEnrichFn
): Promise<LessonPipelineResult> {
  let ctx: PipelineContext = {
    input,
    parsedTopic: '',
    citations: [],
    outline: '',
    enrichedOutline: '',
    hebrewEntities: [],
    markdownContent: null,
    status: 'IN_PROGRESS',
    currentStage: 'parsePrompt',
    error: null,
    searchFn,
    graphEnrichFn,
  };

  try {
    ctx = await parsePrompt(ctx, model);
    ctx = await fetchCitations(ctx);
    ctx = await generateOutline(ctx, model);
    ctx = await enrichWithGraph(ctx);
    ctx = await verifyHebrew(ctx);
    ctx = await exportMarkdown(ctx, model);
  } catch {
    return {
      executionId,
      status: 'FAILED',
      markdownContent: null,
      citations: [],
      hebrewNerEntities: [],
      stage: ctx.currentStage,
    };
  }

  return {
    executionId,
    status: 'COMPLETE',
    markdownContent: ctx.markdownContent,
    citations: ctx.citations.map((c) => `${c.reference}: ${c.text}`),
    hebrewNerEntities: ctx.hebrewEntities,
    stage: 'done',
  };
}
