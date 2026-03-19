/**
 * Course Generator LangGraph workflow.
 *
 * Nodes:
 *  1. outline_generation — generates structured JSON course outline
 *  2. concept_linking    — extract key concept names for knowledge-graph linking
 *  3. finalize           — assemble final output state
 *
 * BUG-093: Uses direct Ollama HTTP API for local dev (bypasses @ai-sdk/openai
 * version mismatch: container has v3 spec but ai v5 needs v2). Falls back to
 * generateObject for OpenAI cloud.
 *
 * BUG-095: Auto-selects the smallest available Ollama model for fast CPU
 * generation. llama3.2 (3.2B) is too slow on CPU-only containers (>5 min),
 * causing fetch timeouts. Prefers qwen2.5:0.5b when available.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import type { LanguageModel } from 'ai';
import { ollamaConfig } from '@edusphere/config';

// ── Zod schema for the AI-generated course outline ────────────────────────────

/** BUG-095: Max modules increased to 20 to avoid Zod rejection of verbose LLMs.
 *  The UI can display any number; truncation is no longer needed. */
export const CourseSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(1000).default(''),
  modules: z
    .array(
      z.object({
        title: z.string().max(200),
        // LLMs sometimes omit description — default to empty string
        description: z.string().max(500).default(''),
        // Default to empty array — LLMs sometimes omit this field or use
        // alternative names (content_items, lessons, topics).
        contentItemTitles: z.array(z.string().max(200)).max(10).default([]),
      })
    )
    .min(1)
    .max(20),
});

export type GeneratedCourse = z.infer<typeof CourseSchema>;

// ── Workflow state ────────────────────────────────────────────────────────────

const CourseGenState = Annotation.Root({
  prompt: Annotation<string>(),
  targetAudienceLevel: Annotation<string | undefined>(),
  estimatedHours: Annotation<number | undefined>(),
  language: Annotation<string | undefined>(),
  courseOutline: Annotation<GeneratedCourse | undefined>(),
  conceptNames: Annotation<string[]>(),
  error: Annotation<string | undefined>(),
});

type CourseGenStateType = typeof CourseGenState.State;

// ── BUG-095: Auto-select fastest available Ollama model ──────────────────────
// Sorted by parameter size ascending — smaller models generate faster on CPU.
const PREFERRED_MODELS = ['qwen2.5:0.5b', 'qwen2.5:1.5b', 'llama3.2:1b', 'llama3.2'];
const FALLBACK_MODEL = 'llama3.2';

/** Cache resolved model name to avoid repeated /api/tags calls. */
let _resolvedModel: string | null = null;

async function resolveOllamaModel(): Promise<string> {
  const explicit = process.env.OLLAMA_MODEL;
  if (explicit) return explicit;
  if (_resolvedModel) return _resolvedModel;

  try {
    const resp = await fetch(`${ollamaConfig.url}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return FALLBACK_MODEL;
    const data = await resp.json() as { models?: { name: string }[] };
    const available = new Set(data.models?.map((m) => m.name) ?? []);
    for (const candidate of PREFERRED_MODELS) {
      if (available.has(candidate) || available.has(`${candidate}:latest`)) {
        _resolvedModel = candidate;
        return candidate;
      }
    }
    // Fallback: use whatever is first available
    const first = data.models?.[0]?.name ?? FALLBACK_MODEL;
    _resolvedModel = first;
    return first;
  } catch {
    return FALLBACK_MODEL;
  }
}

// ── Direct Ollama API call (bypasses AI SDK version mismatch) ────────────────
// BUG-095: 10-minute AbortSignal prevents indefinite fetch hangs on slow models.

const OLLAMA_FETCH_TIMEOUT_MS = 10 * 60 * 1000;

async function generateViaOllama(
  systemPrompt: string,
  userPrompt: string,
): Promise<GeneratedCourse> {
  const model = await resolveOllamaModel();
  const url = `${ollamaConfig.url}/api/chat`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      format: 'json',
      stream: false,
      options: { temperature: 0.7, num_ctx: 4096 },
    }),
    signal: AbortSignal.timeout(OLLAMA_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { message?: { content?: string } };
  const content = data.message?.content;
  if (!content) {
    throw new Error('Ollama returned empty response');
  }

  const parsed = JSON.parse(content) as Record<string, unknown>;

  // Normalize common LLM field name variations for modules
  if (Array.isArray(parsed.modules)) {
    for (const mod of parsed.modules as Record<string, unknown>[]) {
      if (!mod.contentItemTitles && Array.isArray(mod.content_items)) {
        mod.contentItemTitles = mod.content_items;
      } else if (!mod.contentItemTitles && Array.isArray(mod.lessons)) {
        mod.contentItemTitles = (mod.lessons as Array<string | { title?: string }>).map(
          (l) => (typeof l === 'string' ? l : l.title ?? '')
        );
      } else if (!mod.contentItemTitles && Array.isArray(mod.topics)) {
        mod.contentItemTitles = mod.topics;
      }
    }
  }

  return CourseSchema.parse(parsed);
}

// ── Node: outline_generation ──────────────────────────────────────────────────

async function outlineGenerationNode(
  state: CourseGenStateType
): Promise<Partial<CourseGenStateType>> {
  const levelHint = state.targetAudienceLevel
    ? `Target audience level: ${state.targetAudienceLevel}.`
    : '';
  const hoursHint = state.estimatedHours
    ? `Target duration: approximately ${state.estimatedHours} hours.`
    : '';
  const langHint =
    state.language && state.language !== 'en'
      ? `Generate content in language: ${state.language}.`
      : '';

  const systemPrompt =
    'You are an expert instructional designer. Generate structured, pedagogically sound course outlines. ' +
    'Respond with a JSON object matching this schema: { title: string, description: string, modules: [{ title: string, description: string, contentItemTitles: string[] }] }. ' +
    'Include 2-8 modules with 2-6 content items each.';

  const userPrompt = [
    `Create a comprehensive course outline for: "${state.prompt}".`,
    levelHint,
    hoursHint,
    langHint,
    'Structure the course with 2-8 modules, each with 2-6 content items.',
    'Content item titles should be descriptive lesson or activity names.',
  ]
    .filter(Boolean)
    .join(' ');

  try {
    // Use OpenAI cloud if API key is set (generateObject works with real OpenAI)
    if (process.env.OPENAI_API_KEY) {
      const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const model = openai('gpt-4o-mini') as unknown as LanguageModel;
      const { object } = await generateObject({
        model: model as Parameters<typeof generateObject>[0]['model'],
        schema: CourseSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });
      return { courseOutline: object };
    }

    // BUG-093: Direct Ollama HTTP API — bypasses @ai-sdk/openai v3 spec mismatch
    const object = await generateViaOllama(systemPrompt, userPrompt);
    return { courseOutline: object };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? err.name : '';
    const isConnectionError =
      msg.includes('ECONNREFUSED') ||
      msg.includes('fetch failed') ||
      msg.includes('network');
    const isTimeout =
      errName === 'TimeoutError' ||
      errName === 'AbortError' ||
      msg.includes('timed out') ||
      msg.includes('aborted');
    if (isConnectionError) {
      return {
        error: `LLM service unavailable. Ensure Ollama is running at ${ollamaConfig.url} or set OPENAI_API_KEY for cloud LLM.`,
      };
    }
    if (isTimeout) {
      return {
        error: `LLM generation timed out after ${OLLAMA_FETCH_TIMEOUT_MS / 60000} minutes. The model may be too large for CPU-only inference. Try setting OLLAMA_MODEL to a smaller model.`,
      };
    }
    return { error: `outline_generation failed: ${msg}` };
  }
}

// ── Node: concept_linking ─────────────────────────────────────────────────────

function conceptLinkingNode(
  state: CourseGenStateType
): Partial<CourseGenStateType> {
  if (!state.courseOutline) {
    return { conceptNames: [] };
  }
  const names = [
    state.courseOutline.title,
    ...state.courseOutline.modules.map((m) => m.title),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  return { conceptNames: names };
}

// ── Node: finalize ────────────────────────────────────────────────────────────

function finalizeNode(_state: CourseGenStateType): Partial<CourseGenStateType> {
  return {};
}

// ── Graph builder ─────────────────────────────────────────────────────────────

export function createCourseGeneratorWorkflow() {
  const graph = new StateGraph(CourseGenState)
    .addNode('outline_generation', outlineGenerationNode)
    .addNode('concept_linking', conceptLinkingNode)
    .addNode('finalize', finalizeNode)
    .addEdge('__start__', 'outline_generation')
    .addEdge('outline_generation', 'concept_linking')
    .addEdge('concept_linking', 'finalize')
    .addEdge('finalize', '__end__');

  return graph.compile();
}
