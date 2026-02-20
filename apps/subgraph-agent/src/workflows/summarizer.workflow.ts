/**
 * Summarizer Workflow — structured content summarization state machine.
 *
 * States: EXTRACT → OUTLINE → DRAFT → REFINE → COMPLETE
 *
 * Processes course content / transcripts and produces a structured summary
 * with key concepts, main points, and learning objectives.
 */

import { generateText, streamText, type LanguageModelV1 } from 'ai';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SummarizerState =
  | 'EXTRACT'
  | 'OUTLINE'
  | 'DRAFT'
  | 'REFINE'
  | 'COMPLETE';

export interface SummaryOutput {
  keyConcepts: string[];
  mainPoints: string[];
  learningObjectives: string[];
  summary: string;
  estimatedReadTime: number; // minutes
}

export interface SummarizerContext {
  sessionId: string;
  content: string;
  rawExtraction: string;
  outline: string;
  draft: string;
  finalSummary: SummaryOutput | null;
  currentState: SummarizerState;
}

export interface SummarizerResult {
  text: string;
  nextState: SummarizerState;
  updatedContext: Partial<SummarizerContext>;
  isComplete: boolean;
  summary?: SummaryOutput;
}

// ── Prompt Templates ──────────────────────────────────────────────────────────

const EXTRACT_PROMPT = (content: string) => `
You are an expert content analyst for an educational platform.
Analyze the following course content and extract raw information:

CONTENT:
---
${content.slice(0, 4000)}
---

Extract:
1. All named concepts, terms, and definitions mentioned
2. Every factual claim or key statement
3. Any learning goals explicitly stated
4. Important examples or case studies

Output as plain text bullet lists under labeled sections:
## CONCEPTS
## FACTS
## GOALS
## EXAMPLES
`;

const OUTLINE_PROMPT = (extraction: string) => `
You are a curriculum designer. Based on the extracted information below,
create a structured outline for a concise educational summary.

EXTRACTION:
${extraction}

Create a hierarchical outline with:
- 3-5 main sections
- 2-4 bullet points per section
- Each point should map to a clear learning insight

Output as a markdown outline only (no prose).
`;

const DRAFT_PROMPT = (content: string, outline: string) => `
You are an educational content writer. Using the outline provided,
write a comprehensive but concise summary of the course content.

ORIGINAL CONTENT (excerpt):
${content.slice(0, 2000)}

OUTLINE TO FOLLOW:
${outline}

Write the summary as clear educational prose. Target 200-300 words.
Include all key concepts naturally in context.
`;

const REFINE_PROMPT = (draft: string, content: string) => `
You are a senior educational editor. Refine this draft summary to be clear,
accurate, and pedagogically effective.

DRAFT:
${draft}

ORIGINAL CONTENT (reference):
${content.slice(0, 1500)}

Return a JSON object with this exact structure (raw JSON, no markdown):
{
  "keyConcepts": ["concept1", "concept2", ...],
  "mainPoints": ["point1", "point2", ...],
  "learningObjectives": ["After this module, students will be able to...", ...],
  "summary": "Full refined summary prose here (200-300 words)",
  "estimatedReadTime": 3
}
`;

// ── Output Parsing ─────────────────────────────────────────────────────────────

function parseSummaryOutput(raw: string): SummaryOutput | null {
  try {
    const jsonStart = raw.indexOf('{');
    const jsonEnd = raw.lastIndexOf('}') + 1;
    if (jsonStart === -1 || jsonEnd === 0) return null;
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd)) as Record<
      string,
      unknown
    >;
    return {
      keyConcepts: Array.isArray(parsed['keyConcepts'])
        ? (parsed['keyConcepts'] as string[])
        : [],
      mainPoints: Array.isArray(parsed['mainPoints'])
        ? (parsed['mainPoints'] as string[])
        : [],
      learningObjectives: Array.isArray(parsed['learningObjectives'])
        ? (parsed['learningObjectives'] as string[])
        : [],
      summary:
        typeof parsed['summary'] === 'string' ? parsed['summary'] : raw,
      estimatedReadTime:
        typeof parsed['estimatedReadTime'] === 'number'
          ? parsed['estimatedReadTime']
          : 3,
    };
  } catch {
    return null;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function createSummarizerWorkflow(model: LanguageModelV1) {
  async function step(ctx: SummarizerContext): Promise<SummarizerResult> {
    switch (ctx.currentState) {
      case 'EXTRACT': {
        const { text } = await generateText({
          model,
          prompt: EXTRACT_PROMPT(ctx.content),
          temperature: 0.2,
          maxTokens: 800,
        });
        return {
          text: 'Content extracted. Building outline...',
          nextState: 'OUTLINE',
          updatedContext: { rawExtraction: text },
          isComplete: false,
        };
      }

      case 'OUTLINE': {
        const { text } = await generateText({
          model,
          prompt: OUTLINE_PROMPT(ctx.rawExtraction),
          temperature: 0.3,
          maxTokens: 600,
        });
        return {
          text: 'Outline created. Drafting summary...',
          nextState: 'DRAFT',
          updatedContext: { outline: text },
          isComplete: false,
        };
      }

      case 'DRAFT': {
        const { text } = await generateText({
          model,
          prompt: DRAFT_PROMPT(ctx.content, ctx.outline),
          temperature: 0.5,
          maxTokens: 700,
        });
        return {
          text: 'Draft complete. Refining...',
          nextState: 'REFINE',
          updatedContext: { draft: text },
          isComplete: false,
        };
      }

      case 'REFINE': {
        const { text } = await generateText({
          model,
          prompt: REFINE_PROMPT(ctx.draft, ctx.content),
          temperature: 0.3,
          maxTokens: 900,
        });
        const summary = parseSummaryOutput(text);
        return {
          text: summary?.summary ?? text,
          nextState: 'COMPLETE',
          updatedContext: { finalSummary: summary },
          isComplete: false,
          summary: summary ?? undefined,
        };
      }

      case 'COMPLETE': {
        const summaryText = ctx.finalSummary?.summary ?? ctx.draft;
        return {
          text: summaryText,
          nextState: 'COMPLETE',
          updatedContext: {},
          isComplete: true,
          summary: ctx.finalSummary ?? undefined,
        };
      }
    }
  }

  async function stream(ctx: SummarizerContext) {
    const prompt =
      ctx.currentState === 'EXTRACT'
        ? EXTRACT_PROMPT(ctx.content)
        : ctx.currentState === 'OUTLINE'
          ? OUTLINE_PROMPT(ctx.rawExtraction)
          : ctx.currentState === 'DRAFT'
            ? DRAFT_PROMPT(ctx.content, ctx.outline)
            : REFINE_PROMPT(ctx.draft, ctx.content);

    return streamText({ model, prompt, temperature: 0.3, maxTokens: 900 });
  }

  return { step, stream };
}
