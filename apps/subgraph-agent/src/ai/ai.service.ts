import { Injectable, Logger } from '@nestjs/common';
import { openai } from '@ai-sdk/openai';
import { generateText, streamText, stepCountIs, type LanguageModel } from 'ai';
import {
  createChavrutaWorkflow,
  type ChavrutaContext,
} from '../workflows/chavruta.workflow';
import {
  createQuizWorkflow as createLegacyQuizWorkflow,
  type QuizContext,
} from '../workflows/quiz.workflow';
import {
  createSummarizerWorkflow,
  type SummarizerContext,
} from '../workflows/summarizer.workflow';
import {
  runLangGraphDebate,
  runLangGraphQuiz,
  runLangGraphTutor,
} from './ai.langgraph';
import {
  buildSearchKnowledgeGraphTool,
  buildFetchCourseContentTool,
} from './tools/agent-tools';
import {
  searchKnowledgeGraph,
  fetchContentItem,
} from './ai.service.db';
import { injectLocale } from './locale-prompt';
import { LangGraphService } from './langgraph.service';
import { createOllama } from 'ollama-ai-provider';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_TOOL_STEPS = 5;

// ── Agent types ───────────────────────────────────────────────────────────────

interface AgentConfig {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  [key: string]: unknown;
}

interface AgentDefinition {
  template: string;
  config?: unknown;
}

function getAgentConfig(agent: AgentDefinition): AgentConfig {
  if (agent.config !== null && typeof agent.config === 'object') {
    return agent.config as AgentConfig;
  }
  return {};
}

interface ExecutionInput {
  message?: string;
  query?: string;
  context?: Record<string, unknown>;
  sessionId?: string;
  workflowState?: unknown;
  userAnswer?: number;
  tenantId?: string;
}

export interface AIResult {
  text: string;
  usage?: unknown;
  finishReason?: string;
  workflowResult?: unknown;
}

// ── LangGraph-backed template types ───────────────────────────────────────────

const LANGGRAPH_TEMPLATES = new Set([
  'CHAVRUTA_DEBATE',
  'TUTOR',
  'QUIZ_GENERATOR',
  'QUIZ_ASSESS',
  'EXPLANATION_GENERATOR',
]);

// ── Default system prompts (fallback for non-workflow templates) ───────────────

const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
  EXPLAIN: `You are a clear and patient explainer. Break down complex concepts into simple terms,
use analogies, and check for understanding. Adapt your explanation level to the learner.`,

  RESEARCH_SCOUT: `You are a research assistant. Help learners explore topics, suggest resources,
identify knowledge gaps, and guide inquiry-based learning.`,

  CUSTOM: 'You are a helpful AI learning assistant.',
};

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(private readonly langGraphService: LangGraphService) {}

  // ── Model factory ──────────────────────────────────────────────────────────

  private getModel(): LanguageModel {
    if (process.env.OLLAMA_URL) {
      const ollama = createOllama({
        baseURL: `${process.env.OLLAMA_URL}/api`,
      });
      const modelId = process.env.OLLAMA_MODEL ?? 'llama3.2';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ollama(modelId) as any;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (process.env.OPENAI_API_KEY
      ? openai('gpt-4-turbo')
      : openai('gpt-3.5-turbo')) as any;
  }

  // ── Tool builder ──────────────────────────────────────────────────────────
  // Provides the LLM with knowledge graph search and content fetch capabilities.

  private buildTools(tenantId: string) {
    return {
      searchKnowledgeGraph: buildSearchKnowledgeGraphTool(
        // Vercel AI SDK calls execute with positional (query, limit) args.
        (query, limit) => searchKnowledgeGraph(query, tenantId, limit)
      ),
      fetchCourseContent: buildFetchCourseContentTool(
        (contentItemId) => fetchContentItem(contentItemId, tenantId)
      ),
    };
  }

  // ── continueSession — primary entry point from resolver ───────────────────
  //
  // Uses the session.id as the LangGraph thread_id so the checkpointer
  // maintains conversation state across successive calls.

  async continueSession(
    sessionId: string,
    message: string,
    templateType: string,
    context: Record<string, unknown> = {},
    locale: string = 'en'
  ): Promise<AIResult> {
    this.logger.debug(
      `continueSession: session=${sessionId} template=${templateType} locale=${locale}`
    );

    try {
      const checkpointer = this.langGraphService.getCheckpointer();

      if (templateType === 'CHAVRUTA_DEBATE') {
        return runLangGraphDebate(sessionId, message, context, locale, checkpointer);
      }
      if (templateType === 'QUIZ_GENERATOR' || templateType === 'QUIZ_ASSESS') {
        return runLangGraphQuiz(sessionId, message, context, locale, checkpointer);
      }
      if (templateType === 'TUTOR' || templateType === 'EXPLANATION_GENERATOR') {
        return runLangGraphTutor(sessionId, message, context, locale, checkpointer);
      }
      if (templateType === 'SUMMARIZE') {
        const model = this.getModel();
        const ctx = this.buildSummarizerCtx({ message, context, sessionId });
        const workflow = createSummarizerWorkflow(model, locale);
        const result = await workflow.step(ctx);
        return {
          text: result.text,
          workflowResult: {
            nextState: result.nextState,
            summary: result.summary,
            isComplete: result.isComplete,
          },
        };
      }
      // Generic fallback (EXPLAIN, RESEARCH_SCOUT, CUSTOM, …)
      return this.runGeneric(
        this.getModel(),
        { template: templateType },
        { message, context, sessionId },
        locale
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`continueSession failed: ${msg}`);
      throw error;
    }
  }

  // ── execute — backward-compatible entry point ──────────────────────────────

  async execute(agent: AgentDefinition, input: ExecutionInput): Promise<AIResult> {
    this.logger.debug(`Executing agent: ${agent.template}`);
    try {
      const model = this.getModel();

      if (agent.template === 'CHAVRUTA_DEBATE') {
        return this.runChavruta(model, input);
      }
      if (agent.template === 'QUIZ_ASSESS') {
        return this.runQuiz(model, input);
      }
      if (agent.template === 'SUMMARIZE') {
        return this.runSummarizer(model, input);
      }
      return this.runGeneric(model, agent, input);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`AI execution failed: ${msg}`);
      throw error;
    }
  }

  // ── executeStream ──────────────────────────────────────────────────────────

  async executeStream(
    agent: AgentDefinition,
    input: ExecutionInput,
    locale: string = 'en',
    abortSignal?: AbortSignal,
  ) {
    this.logger.debug(`Streaming agent: ${agent.template}`);
    const model = this.getModel();

    if (agent.template === 'CHAVRUTA_DEBATE') {
      const ctx = this.buildChavrutaCtx(input);
      return createChavrutaWorkflow(model, locale).stream(ctx);
    }
    if (agent.template === 'QUIZ_ASSESS') {
      const ctx = this.buildQuizCtx(input);
      return createLegacyQuizWorkflow(model, locale).stream(ctx, input.userAnswer);
    }
    if (agent.template === 'SUMMARIZE') {
      const ctx = this.buildSummarizerCtx(input);
      return createSummarizerWorkflow(model, locale).stream(ctx);
    }

    const system = injectLocale(this.resolveSystemPrompt(agent), locale);
    const prompt = this.buildUserPrompt(input);
    const cfg = getAgentConfig(agent);
    const tenantId = input.tenantId ?? '';
    return streamText({
      model,
      system,
      prompt,
      temperature: cfg.temperature ?? 0.7,
      maxOutputTokens: cfg.maxTokens ?? 2000,
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
      tools: this.buildTools(tenantId),
      abortSignal,
    });
  }

  // ── Conversation memory ────────────────────────────────────────────────────

  async getConversationMemory(
    sessionId: string,
    _limit: number = 10
  ): Promise<unknown[]> {
    this.logger.debug(
      `Retrieving conversation memory for session ${sessionId}`
    );
    return [];
  }

  async saveConversationMemory(
    sessionId: string,
    _role: string,
    _content: string,
    _metadata?: unknown
  ): Promise<void> {
    this.logger.debug(`Saving conversation memory for session ${sessionId}`);
  }

  // ── isLangGraphTemplate ───────────────────────────────────────────────────

  isLangGraphTemplate(templateType: string): boolean {
    return LANGGRAPH_TEMPLATES.has(templateType);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async runGeneric(
    model: LanguageModel,
    agent: { template: string },
    input: ExecutionInput,
    locale: string = 'en'
  ): Promise<AIResult> {
    const system = injectLocale(this.resolveSystemPrompt(agent), locale);
    const prompt = this.buildUserPrompt(input);
    const cfg = getAgentConfig(agent as AgentDefinition);
    const tenantId = input.tenantId ?? '';
    const result = await generateText({
      model,
      system,
      prompt,
      temperature: cfg.temperature ?? 0.7,
      maxOutputTokens: cfg.maxTokens ?? 2000,
      stopWhen: stepCountIs(MAX_TOOL_STEPS),
      tools: this.buildTools(tenantId),
    });
    return {
      text: result.text,
      usage: result.usage,
      finishReason: result.finishReason,
    };
  }

  private async runChavruta(
    model: LanguageModel,
    input: ExecutionInput,
    locale: string = 'en'
  ): Promise<AIResult> {
    const ctx = this.buildChavrutaCtx(input);
    const workflow = createChavrutaWorkflow(model, locale);
    const result = await workflow.step(ctx);
    return {
      text: result.text,
      workflowResult: {
        nextState: result.nextState,
        understandingScore: result.understandingScore,
        isComplete: result.isComplete,
      },
    };
  }

  private async runQuiz(
    model: LanguageModel,
    input: ExecutionInput,
    locale: string = 'en'
  ): Promise<AIResult> {
    const ctx = this.buildQuizCtx(input);
    const workflow = createLegacyQuizWorkflow(model, locale);
    const result = await workflow.step(ctx, input.userAnswer);
    return {
      text: result.text,
      workflowResult: {
        nextState: result.nextState,
        updatedContext: result.updatedContext,
        isComplete: result.isComplete,
      },
    };
  }

  private async runSummarizer(
    model: LanguageModel,
    input: ExecutionInput,
    locale: string = 'en'
  ): Promise<AIResult> {
    const ctx = this.buildSummarizerCtx(input);
    const workflow = createSummarizerWorkflow(model, locale);
    const result = await workflow.step(ctx);
    return {
      text: result.text,
      workflowResult: {
        nextState: result.nextState,
        summary: result.summary,
        isComplete: result.isComplete,
      },
    };
  }

  private buildChavrutaCtx(input: ExecutionInput): ChavrutaContext {
    const state = input.workflowState as Partial<ChavrutaContext> | undefined;
    return {
      sessionId: input.sessionId ?? 'default',
      content: (input.context?.['content'] as string) ?? '',
      history: state?.history ?? [],
      understandingScore: state?.understandingScore ?? 3,
      turn: state?.turn ?? 0,
      currentState: state?.currentState ?? 'ASSESS',
    };
  }

  private buildQuizCtx(input: ExecutionInput): QuizContext {
    const state = input.workflowState as Partial<QuizContext> | undefined;
    return {
      sessionId: input.sessionId ?? 'default',
      courseContent:
        (input.context?.['content'] as string) ?? (input.message ?? ''),
      questions: state?.questions ?? [],
      currentQuestionIndex: state?.currentQuestionIndex ?? 0,
      answers: state?.answers ?? [],
      score: state?.score ?? 0,
      currentState: state?.currentState ?? 'LOAD_CONTENT',
    };
  }

  private buildSummarizerCtx(input: ExecutionInput): SummarizerContext {
    const state = input.workflowState as Partial<SummarizerContext> | undefined;
    return {
      sessionId: input.sessionId ?? 'default',
      content:
        (input.context?.['content'] as string) ?? (input.message ?? ''),
      rawExtraction: state?.rawExtraction ?? '',
      outline: state?.outline ?? '',
      draft: state?.draft ?? '',
      finalSummary: state?.finalSummary ?? null,
      currentState: state?.currentState ?? 'EXTRACT',
    };
  }

  private resolveSystemPrompt(agent: { template: string }): string {
    const tpl = DEFAULT_SYSTEM_PROMPTS[agent.template];
    if (tpl) return tpl;
    const cfg = getAgentConfig(agent as AgentDefinition);
    return cfg.systemPrompt ?? 'You are a helpful AI learning assistant.';
  }

  private buildUserPrompt(input: ExecutionInput): string {
    const ctx = input.context
      ? `Context: ${JSON.stringify(input.context)}\n\n`
      : '';
    return `${ctx}${input.message ?? input.query ?? ""}`;
  }
}
