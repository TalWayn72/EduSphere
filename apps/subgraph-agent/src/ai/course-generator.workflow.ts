/**
 * Course Generator LangGraph workflow.
 *
 * Nodes:
 *  1. outline_generation — generateObject with CourseSchema (Vercel AI SDK)
 *  2. concept_linking    — extract key concept names for knowledge-graph linking
 *  3. finalize           — assemble final output state
 *
 * The workflow uses the "simpler approach": generates the outline and returns
 * it as structured JSON for frontend preview before the instructor accepts it.
 * No inter-service DB calls are made here to avoid circular dependencies.
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createOllama } from 'ollama-ai-provider';
import { z } from 'zod';
import type { LanguageModel } from 'ai';

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
      }),
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

// ── Model builder ─────────────────────────────────────────────────────────────

function buildModel(): LanguageModel {
  if (process.env.OPENAI_API_KEY) {
    return openai('gpt-4o-mini') as unknown as LanguageModel;
  }
  const ollama = createOllama({
    baseURL: `${process.env.OLLAMA_URL ?? 'http://localhost:11434'}/api`,
  });
  return ollama(process.env.OLLAMA_MODEL ?? 'llama3.2') as unknown as LanguageModel;
}

// ── Node: outline_generation ──────────────────────────────────────────────────

async function outlineGenerationNode(
  state: CourseGenStateType,
): Promise<Partial<CourseGenStateType>> {
  const levelHint = state.targetAudienceLevel
    ? `Target audience level: ${state.targetAudienceLevel}.`
    : '';
  const hoursHint = state.estimatedHours
    ? `Target duration: approximately ${state.estimatedHours} hours.`
    : '';
  const langHint = state.language && state.language !== 'en'
    ? `Generate content in language: ${state.language}.`
    : '';

  const prompt = [
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
    const model = buildModel();
    const { object } = await generateObject({
      model: model as Parameters<typeof generateObject>[0]['model'],
      schema: CourseSchema,
      system:
        'You are an expert instructional designer. Generate structured, pedagogically sound course outlines.',
      prompt,
    });
    return { courseOutline: object };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `outline_generation failed: ${msg}` };
  }
}

// ── Node: concept_linking ─────────────────────────────────────────────────────

function conceptLinkingNode(
  state: CourseGenStateType,
): Partial<CourseGenStateType> {
  if (!state.courseOutline) {
    return { conceptNames: [] };
  }
  // Extract concept names from title and module titles for knowledge-graph linking
  const names = [
    state.courseOutline.title,
    ...state.courseOutline.modules.map((m) => m.title),
  ]
    .map((s) => s.trim())
    .filter(Boolean);
  return { conceptNames: names };
}

// ── Node: finalize ────────────────────────────────────────────────────────────

function finalizeNode(
  state: CourseGenStateType,
): Partial<CourseGenStateType> {
  // No additional transformation — just pass state through
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
