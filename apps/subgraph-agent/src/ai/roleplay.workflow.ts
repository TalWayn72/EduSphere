/**
 * Roleplay LangGraph workflow — F-007 AI Role-Play Scenarios.
 *
 * Nodes:
 *  1. scene_setting      — AI character opens the scene with generateText
 *  2. awaiting_learner   — human-in-the-loop interrupt (waits for learner input)
 *  3. character_response — AI stays in character, responds to learner
 *  4. check_completion   — if turn_count >= max_turns → evaluation else loop
 *  5. evaluation         — generateObject scores learner against the rubric
 *
 * The workflow uses LangGraph interrupt() (0.2.x) to pause for human input.
 * State is persisted via the checkpointer passed at invoke time.
 */

import { StateGraph, Annotation, interrupt } from '@langchain/langgraph';
import { generateText, generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createOllama } from 'ollama-ai-provider';
import { z } from 'zod';
import type { LanguageModel } from 'ai';
import type { RubricCriterion, EvaluationResult } from '@edusphere/db';

// ── Evaluation schema ─────────────────────────────────────────────────────────

export const EvaluationSchema = z.object({
  overallScore: z.number().min(0).max(100),
  criteriaScores: z.array(
    z.object({ name: z.string(), score: z.number(), feedback: z.string() }),
  ),
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  summary: z.string(),
});

// ── Conversation turn ─────────────────────────────────────────────────────────

export interface ConversationTurn {
  role: 'character' | 'learner';
  content: string;
}

// ── Workflow state ────────────────────────────────────────────────────────────

const RoleplayState = Annotation.Root({
  sessionId: Annotation<string>(),
  characterPersona: Annotation<string>(),
  sceneDescription: Annotation<string>(),
  evaluationRubric: Annotation<RubricCriterion[]>(),
  maxTurns: Annotation<number>(),
  turnCount: Annotation<number>(),
  history: Annotation<ConversationTurn[]>(),
  currentLearnerMessage: Annotation<string | undefined>(),
  evaluation: Annotation<EvaluationResult | undefined>(),
  error: Annotation<string | undefined>(),
});

export type RoleplayStateType = typeof RoleplayState.State;

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

// ── Node: scene_setting ───────────────────────────────────────────────────────

async function sceneSettingNode(
  state: RoleplayStateType,
): Promise<Partial<RoleplayStateType>> {
  const model = buildModel();
  try {
    const { text } = await generateText({
      model: model as Parameters<typeof generateText>[0]['model'],
      system: state.characterPersona,
      prompt:
        `Scene context: ${state.sceneDescription}. ` +
        `Open the role-play with a natural first line as your character. Stay fully in character.`,
    });
    return { history: [{ role: 'character', content: text }], turnCount: 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `scene_setting failed: ${msg}` };
  }
}

// ── Node: awaiting_learner ────────────────────────────────────────────────────

function awaitingLearnerNode(
  state: RoleplayStateType,
): Partial<RoleplayStateType> {
  // interrupt() suspends the graph and returns a value when resumed
  const learnerMessage = interrupt<string>('Waiting for learner response');
  return {
    currentLearnerMessage: learnerMessage,
    history: [...state.history, { role: 'learner', content: learnerMessage }],
    turnCount: state.turnCount + 1,
  };
}

// ── Node: character_response ──────────────────────────────────────────────────

async function characterResponseNode(
  state: RoleplayStateType,
): Promise<Partial<RoleplayStateType>> {
  if (!state.currentLearnerMessage) return {};
  const model = buildModel();
  const historyText = state.history
    .map((t) => `${t.role === 'character' ? 'You' : 'Learner'}: ${t.content}`)
    .join('\n');
  try {
    const { text } = await generateText({
      model: model as Parameters<typeof generateText>[0]['model'],
      system:
        state.characterPersona +
        '\nNEVER break character. Never acknowledge being an AI.',
      prompt: `Conversation:\n${historyText}\n\nRespond as your character.`,
    });
    return {
      history: [...state.history, { role: 'character', content: text }],
      currentLearnerMessage: undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `character_response failed: ${msg}` };
  }
}

// ── Node: check_completion (pure routing) ─────────────────────────────────────

function checkCompletionNode(_state: RoleplayStateType): Partial<RoleplayStateType> {
  return {};
}

// ── Node: evaluation ──────────────────────────────────────────────────────────

async function evaluationNode(
  state: RoleplayStateType,
): Promise<Partial<RoleplayStateType>> {
  const model = buildModel();
  const learnerTurns = state.history
    .filter((t) => t.role === 'learner')
    .map((t) => t.content)
    .join('\n---\n');
  const rubricText = state.evaluationRubric
    .map((c) => `- ${c.name} (max ${c.maxScore}): ${c.description}`)
    .join('\n');
  try {
    const { object } = await generateObject({
      model: model as Parameters<typeof generateObject>[0]['model'],
      schema: EvaluationSchema,
      system: 'You are an expert communication coach. Be specific and constructive.',
      prompt:
        `Rubric:\n${rubricText}\n\nLearner messages:\n${learnerTurns}\n\n` +
        `Score each criterion (as a percentage of maxScore), identify strengths and areas for improvement.`,
    });
    return { evaluation: object as EvaluationResult };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `evaluation failed: ${msg}` };
  }
}

// ── Graph builder ─────────────────────────────────────────────────────────────

export function createRoleplayWorkflow() {
  const graph = new StateGraph(RoleplayState)
    .addNode('scene_setting', sceneSettingNode)
    .addNode('awaiting_learner', awaitingLearnerNode)
    .addNode('character_response', characterResponseNode)
    .addNode('check_completion', checkCompletionNode)
    .addNode('evaluation', evaluationNode)
    .addEdge('__start__', 'scene_setting')
    .addEdge('scene_setting', 'awaiting_learner')
    .addEdge('awaiting_learner', 'character_response')
    .addEdge('character_response', 'check_completion')
    .addConditionalEdges('check_completion', (state: RoleplayStateType) =>
      state.turnCount >= state.maxTurns ? 'evaluation' : 'awaiting_learner',
    )
    .addEdge('evaluation', '__end__');

  return graph.compile();
}
