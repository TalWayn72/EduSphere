import { Injectable, Logger } from '@nestjs/common';
import { openai } from '@ai-sdk/openai';
import { generateText, streamText, stepCountIs, type LanguageModel } from 'ai';
import { createChavrutaWorkflow, type ChavrutaContext } from '../workflows/chavruta.workflow.js';
import { createQuizWorkflow as createLegacyQuizWorkflow, type QuizContext } from '../workflows/quiz.workflow.js';
import { createSummarizerWorkflow, type SummarizerContext } from '../workflows/summarizer.workflow.js';
import { buildSearchKnowledgeGraphTool, buildFetchCourseContentTool } from './tools/agent-tools.js';
import { searchKnowledgeGraph, fetchContentItem } from './ai.service.db.js';
import { injectLocale } from './locale-prompt.js';
import { createOllama } from 'ollama-ai-provider';
import type { AIResult } from './ai.service.js';

const MAX_TOOL_STEPS = 5;

interface AgentConfig {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  [key: string]: unknown;
}

export interface AgentDefinition {
  template: string;
  config?: unknown;
}

export interface ExecutionInput {
  message?: string;
  query?: string;
  context?: Record<string, unknown>;
  sessionId?: string;
  workflowState?: unknown;
  userAnswer?: number;
  tenantId?: string;
}

const DEFAULT_SYSTEM_PROMPTS: Record<string, string> = {
  EXPLAIN: 'You are a clear and patient explainer. Break down complex concepts into simple terms, use analogies, and check for understanding.',
  RESEARCH_SCOUT: 'You are a research assistant. Help learners explore topics, suggest resources, identify knowledge gaps, and guide inquiry-based learning.',
  CUSTOM: 'You are a helpful AI learning assistant.',
};

function getAgentConfig(agent: AgentDefinition): AgentConfig {
  if (agent.config !== null && typeof agent.config === 'object') {
    return agent.config as AgentConfig;
  }
  return {};
}

@Injectable()
export class AiLegacyRunnerService {
  private readonly logger = new Logger(AiLegacyRunnerService.name);

  getModel(): LanguageModel {
    if (process.env.OLLAMA_URL) {
      const ollama = createOllama({ baseURL: process.env.OLLAMA_URL + '/api' });
      const modelId = process.env.OLLAMA_MODEL ?? 'llama3.2';
      return ollama(modelId) as unknown as LanguageModel;
    }
    return (process.env.OPENAI_API_KEY
      ? openai('gpt-4-turbo')
      : openai('gpt-3.5-turbo')) as unknown as LanguageModel;
  }

  buildTools(tenantId: string) {
    return {
      searchKnowledgeGraph: buildSearchKnowledgeGraphTool(
        (query, limit) => searchKnowledgeGraph(query, tenantId, limit),
      ),
      fetchCourseContent: buildFetchCourseContentTool(
        (contentItemId) => fetchContentItem(contentItemId, tenantId),
      ),
    };
  }

  async runGeneric(
    model: LanguageModel,
    agent: { template: string; config?: unknown },
    input: ExecutionInput,
    locale: string = 'en',
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
    return { text: result.text, usage: result.usage, finishReason: result.finishReason };
  }

  async runChavruta(model: LanguageModel, input: ExecutionInput, locale = 'en'): Promise<AIResult> {
    const ctx = this.buildChavrutaCtx(input);
    const result = await createChavrutaWorkflow(model, locale).step(ctx);
    return { text: result.text, workflowResult: { nextState: result.nextState, understandingScore: result.understandingScore, isComplete: result.isComplete } };
  }

  async runQuiz(model: LanguageModel, input: ExecutionInput, locale = 'en'): Promise<AIResult> {
    const ctx = this.buildQuizCtx(input);
    const result = await createLegacyQuizWorkflow(model, locale).step(ctx, input.userAnswer);
    return { text: result.text, workflowResult: { nextState: result.nextState, updatedContext: result.updatedContext, isComplete: result.isComplete } };
  }

  async runSummarizer(model: LanguageModel, input: ExecutionInput, locale = 'en'): Promise<AIResult> {
    const ctx = this.buildSummarizerCtx(input);
    const result = await createSummarizerWorkflow(model, locale).step(ctx);
    return { text: result.text, workflowResult: { nextState: result.nextState, summary: result.summary, isComplete: result.isComplete } };
  }

  async executeStream(agent: AgentDefinition, input: ExecutionInput, locale = 'en', abortSignal?: AbortSignal) {
    this.logger.debug('Streaming agent: ' + agent.template);
    const model = this.getModel();
    if (agent.template === 'CHAVRUTA_DEBATE') {
      return createChavrutaWorkflow(model, locale).stream(this.buildChavrutaCtx(input));
    }
    if (agent.template === 'QUIZ_ASSESS') {
      return createLegacyQuizWorkflow(model, locale).stream(this.buildQuizCtx(input), input.userAnswer);
    }
    if (agent.template === 'SUMMARIZE') {
      return createSummarizerWorkflow(model, locale).stream(this.buildSummarizerCtx(input));
    }
    const system = injectLocale(this.resolveSystemPrompt(agent), locale);
    const prompt = this.buildUserPrompt(input);
    const cfg = getAgentConfig(agent);
    const tenantId = input.tenantId ?? '';
    return streamText({ model, system, prompt, temperature: cfg.temperature ?? 0.7, maxOutputTokens: cfg.maxTokens ?? 2000, stopWhen: stepCountIs(MAX_TOOL_STEPS), tools: this.buildTools(tenantId), abortSignal });
  }

  buildChavrutaCtx(input: ExecutionInput): ChavrutaContext {
    const state = input.workflowState as Partial<ChavrutaContext> | undefined;
    return { sessionId: input.sessionId ?? 'default', content: (input.context?.['content'] as string) ?? '', history: state?.history ?? [], understandingScore: state?.understandingScore ?? 3, turn: state?.turn ?? 0, currentState: state?.currentState ?? 'ASSESS' };
  }

  buildQuizCtx(input: ExecutionInput): QuizContext {
    const state = input.workflowState as Partial<QuizContext> | undefined;
    return { sessionId: input.sessionId ?? 'default', courseContent: (input.context?.['content'] as string) ?? (input.message ?? ''), questions: state?.questions ?? [], currentQuestionIndex: state?.currentQuestionIndex ?? 0, answers: state?.answers ?? [], score: state?.score ?? 0, currentState: state?.currentState ?? 'LOAD_CONTENT' };
  }

  buildSummarizerCtx(input: ExecutionInput): SummarizerContext {
    const state = input.workflowState as Partial<SummarizerContext> | undefined;
    return { sessionId: input.sessionId ?? 'default', content: (input.context?.['content'] as string) ?? (input.message ?? ''), rawExtraction: state?.rawExtraction ?? '', outline: state?.outline ?? '', draft: state?.draft ?? '', finalSummary: state?.finalSummary ?? null, currentState: state?.currentState ?? 'EXTRACT' };
  }

  resolveSystemPrompt(agent: { template: string; config?: unknown }): string {
    const tpl = DEFAULT_SYSTEM_PROMPTS[agent.template];
    if (tpl) return tpl;
    const cfg = getAgentConfig(agent as AgentDefinition);
    return cfg.systemPrompt ?? 'You are a helpful AI learning assistant.';
  }

  buildUserPrompt(input: ExecutionInput): string {
    const ctx = input.context ? 'Context: ' + JSON.stringify(input.context) + '\n\n' : '';
    return ctx + (input.message ?? input.query ?? '');
  }
}
