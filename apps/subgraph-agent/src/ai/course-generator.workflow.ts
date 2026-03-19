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
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import type { LanguageModel } from 'ai';
import { ollamaConfig } from '@edusphere/config';

// ── Zod schema for the AI-generated course outline ────────────────────────────

export const CourseSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(1000),
  modules: z
    .array(
      z.object({
        title: z.string().max(200),
        description: z.string().max(500),
        contentItemTitles: z.array(z.string().max(200)).max(6),
      })
    )
    .min(2)
    .max(8),
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

// ── Direct Ollama API call (bypasses AI SDK version mismatch) ────────────────

async function generateViaOllama(
  systemPrompt: string,
  userPrompt: string,
): Promise<GeneratedCourse> {
  const model = process.env.OLLAMA_MODEL ?? 'llama3.2';
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
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json() as { message?: { content?: string } };
  const content = data.message?.content;
  if (!content) {
    throw new Error('Ollama returned empty response');
  }

  const parsed: unknown = JSON.parse(content);
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
    const isConnectionError =
      msg.includes('ECONNREFUSED') ||
      msg.includes('fetch failed') ||
      msg.includes('network');
    if (isConnectionError) {
      return {
        error: `LLM service unavailable. Ensure Ollama is running at ${ollamaConfig.url} or set OPENAI_API_KEY for cloud LLM.`,
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
