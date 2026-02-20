/**
 * LangGraph workflow adapters.
 *
 * Each adapter wraps a LangGraph workflow class from @edusphere/langgraph-workflows,
 * compiles the graph with a MemorySaver checkpointer, invokes it with a
 * thread_id derived from the agent session ID, and returns an AIResult.
 *
 * The MemorySaver is module-level so state persists across HTTP requests
 * within the same Node.js process (development / single-replica).
 * For multi-replica production deployments replace with a Redis-backed
 * checkpointer.
 */

import { MemorySaver } from '@langchain/langgraph';
import {
  createDebateWorkflow,
  createQuizWorkflow,
  createTutorWorkflow,
  createAssessmentWorkflow,
} from '@edusphere/langgraph-workflows';
import type { AIResult } from './ai.service';

// One shared checkpointer instance per process.
export const checkpointer = new MemorySaver();

// ── Thread config helper ───────────────────────────────────────────────────

function threadConfig(threadId: string) {
  return { configurable: { thread_id: threadId } };
}

// ── Chavruta / Debate adapter ──────────────────────────────────────────────

export async function runLangGraphDebate(
  threadId: string,
  message: string,
  context: Record<string, unknown>
): Promise<AIResult> {
  const workflow = createDebateWorkflow();
  const compiled = workflow['graph'].compile({ checkpointer });

  const state = {
    topic: (context['topic'] as string) ?? message,
    position: (context['position'] as 'for' | 'against') ?? 'for',
    rounds: (context['rounds'] as number) ?? 2,
    currentRound: 1,
    arguments: [],
    isComplete: false,
  };

  const result = await compiled.invoke(state, threadConfig(threadId));
  const synthesis = (result as Record<string, unknown>)['synthesis'] as string | undefined;
  const args = (result as Record<string, unknown>)['arguments'];

  return {
    text: synthesis ?? message,
    workflowResult: { synthesis, arguments: args, isComplete: true },
  };
}

// ── Quiz adapter ───────────────────────────────────────────────────────────

export async function runLangGraphQuiz(
  threadId: string,
  message: string,
  context: Record<string, unknown>
): Promise<AIResult> {
  const workflow = createQuizWorkflow();
  const compiled = workflow['graph'].compile({ checkpointer });

  const state = {
    topic: (context['topic'] as string) ?? message,
    numQuestions: (context['numQuestions'] as number) ?? 5,
    difficulty: (context['difficulty'] as 'easy' | 'medium' | 'hard') ?? 'medium',
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    score: 0,
    isComplete: false,
  };

  const result = await compiled.invoke(state, threadConfig(threadId));
  const typedResult = result as Record<string, unknown>;
  const questions = typedResult['questions'];

  return {
    text: `Quiz generated: ${Array.isArray(questions) ? questions.length : 0} questions on "${state.topic}"`,
    workflowResult: { questions, score: typedResult['score'], isComplete: true },
  };
}

// ── Tutor adapter ──────────────────────────────────────────────────────────

export async function runLangGraphTutor(
  threadId: string,
  message: string,
  context: Record<string, unknown>
): Promise<AIResult> {
  const workflow = createTutorWorkflow();
  const compiled = workflow['graph'].compile({ checkpointer });

  const state = {
    question: message,
    context: (context['content'] as string) ?? '',
    studentLevel: 'intermediate' as const,
    conversationHistory: [],
    currentStep: 'assess' as const,
    followupSuggestions: [],
    isComplete: false,
  };

  const result = await compiled.invoke(state, threadConfig(threadId));
  const typedResult = result as Record<string, unknown>;
  const explanation = (typedResult['explanation'] as string) ?? message;

  return {
    text: explanation,
    workflowResult: {
      explanation,
      comprehensionCheck: typedResult['comprehensionCheck'],
      followupSuggestions: typedResult['followupSuggestions'],
      isComplete: true,
    },
  };
}

// ── Assessment adapter ─────────────────────────────────────────────────────

export async function runLangGraphAssessment(
  threadId: string,
  message: string,
  context: Record<string, unknown>
): Promise<AIResult> {
  const workflow = createAssessmentWorkflow();
  const compiled = workflow['graph'].compile({ checkpointer });

  const submission = {
    questionId: 'q1',
    question: message,
    studentAnswer: (context['answer'] as string) ?? '',
    rubric: (context['rubric'] as string) ?? undefined,
  };

  const state = {
    submissions: [submission],
    evaluations: [],
    isComplete: false,
  };

  const result = await compiled.invoke(state, threadConfig(threadId));
  const typedResult = result as Record<string, unknown>;
  const overall = typedResult['overallAssessment'] as Record<string, unknown> | undefined;

  return {
    text: (overall?.['summary'] as string) ?? 'Assessment complete',
    workflowResult: { overallAssessment: overall, isComplete: true },
  };
}
