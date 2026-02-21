/**
 * LangGraph workflow adapters.
 *
 * Each adapter wraps a LangGraph workflow class from @edusphere/langgraph-workflows,
 * compiles the graph with a durable checkpointer, invokes it with a
 * thread_id derived from the agent session ID, and returns an AIResult.
 *
 * Checkpointer strategy:
 *  - When DATABASE_URL is set: PostgresSaver (durable, multi-replica safe).
 *  - Otherwise: MemorySaver (development / single-replica fallback).
 *
 * The checkpointer instance is module-level so it is created only once per
 * process. PostgresSaver.setup() is idempotent and creates the checkpoint
 * tables if they do not yet exist.
 */

import { MemorySaver } from '@langchain/langgraph';
import { PostgresSaver } from '@langchain/langgraph-checkpoint-postgres';
import pg from 'pg';
import {
  createDebateWorkflow,
  createQuizWorkflow,
  createTutorWorkflow,
  createAssessmentWorkflow,
} from '@edusphere/langgraph-workflows';
import type { AIResult } from './ai.service';

// ── Checkpointer factory ──────────────────────────────────────────────────────

let _checkpointer: MemorySaver | PostgresSaver | null = null;

export async function getCheckpointer(): Promise<MemorySaver | PostgresSaver> {
  if (_checkpointer) return _checkpointer;

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const pool = new pg.Pool({ connectionString: dbUrl, max: 5 });
      const saver = new PostgresSaver(pool);
      // Creates checkpoint tables if they do not exist (idempotent).
      await saver.setup();
      _checkpointer = saver;
      console.log('[LangGraph] Using PostgresSaver for durable checkpointing');
    } catch (err) {
      console.warn(
        '[LangGraph] PostgresSaver init failed, falling back to MemorySaver:',
        err
      );
      _checkpointer = new MemorySaver();
    }
  } else {
    _checkpointer = new MemorySaver();
    console.log(
      '[LangGraph] DATABASE_URL not set — using MemorySaver (dev mode)'
    );
  }
  return _checkpointer;
}

// ── Thread config helper ───────────────────────────────────────────────────

function threadConfig(threadId: string) {
  return { configurable: { thread_id: threadId } };
}

// ── Chavruta / Debate adapter ──────────────────────────────────────────────

export async function runLangGraphDebate(
  threadId: string,
  message: string,
  context: Record<string, unknown>,
  locale: string = 'en'
): Promise<AIResult> {
  const checkpointer = await getCheckpointer();
  const workflow = createDebateWorkflow(undefined, locale);
  const compiled = workflow.compile({ checkpointer });

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
  context: Record<string, unknown>,
  locale: string = 'en'
): Promise<AIResult> {
  const checkpointer = await getCheckpointer();
  const workflow = createQuizWorkflow(undefined, locale);
  const compiled = workflow.compile({ checkpointer });

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
  context: Record<string, unknown>,
  locale: string = 'en'
): Promise<AIResult> {
  const checkpointer = await getCheckpointer();
  const workflow = createTutorWorkflow(undefined, locale);
  const compiled = workflow.compile({ checkpointer });

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
  context: Record<string, unknown>,
  locale: string = 'en'
): Promise<AIResult> {
  const checkpointer = await getCheckpointer();
  const workflow = createAssessmentWorkflow(undefined, locale);
  const compiled = workflow.compile({ checkpointer });

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
