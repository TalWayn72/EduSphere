import { Injectable, Logger } from '@nestjs/common';
import { LangGraphService } from './langgraph.service.js';
import { AiLanggraphRunnerService } from './ai-langgraph-runner.service.js';
import { AiLegacyRunnerService } from './ai-legacy-runner.service.js';
import { createChavrutaWorkflow, type ChavrutaContext } from '../workflows/chavruta.workflow.js';

// ── Re-exported types consumed by other modules ───────────────────────────────

export interface AIResult {
  text: string;
  usage?: unknown;
  finishReason?: string;
  workflowResult?: unknown;
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

// ── Main dispatcher ───────────────────────────────────────────────────────────

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  constructor(
    private readonly langGraphService: LangGraphService,
    private readonly langgraphRunner: AiLanggraphRunnerService,
    private readonly legacyRunner: AiLegacyRunnerService,
  ) {}

  /** Primary entry point from resolver. Uses session.id as LangGraph thread_id. */
  async continueSession(
    sessionId: string,
    message: string,
    templateType: string,
    context: Record<string, unknown> = {},
    locale: string = 'en',
  ): Promise<AIResult> {
    this.logger.debug(`continueSession: session=${sessionId} template=${templateType}`);
    try {
      if (templateType === 'CHAVRUTA_DEBATE') {
        // Use chavruta.workflow.ts for turn-by-turn Socratic dialogue.
        // runLangGraphDebate runs a full autonomous loop and ignores user input.
        const model = this.legacyRunner.getModel();
        const ctx: ChavrutaContext = {
          sessionId,
          content: (context['topic'] as string) ?? (context['topicId'] as string) ?? '',
          history: [{ role: 'user', text: message }],
          understandingScore: 3,
          turn: 0,
          currentState: 'ASSESS',
        };
        const result = await createChavrutaWorkflow(model, locale).step(ctx);
        return {
          text: result.text,
          workflowResult: {
            nextState: result.nextState,
            understandingScore: result.understandingScore,
            isComplete: result.isComplete,
          },
        };
      }

      // LangGraph templates (QUIZ_GENERATOR, QUIZ_ASSESS, TUTOR, EXPLANATION_GENERATOR).
      const lgResult = await this.langgraphRunner.run(sessionId, message, templateType, context, locale);
      if (lgResult !== null) return lgResult;

      // Legacy templates: SUMMARIZE, EXPLAIN, RESEARCH_SCOUT, CUSTOM, …
      const model = this.legacyRunner.getModel();
      const input: ExecutionInput = { message, context, sessionId };
      if (templateType === 'SUMMARIZE') return this.legacyRunner.runSummarizer(model, input, locale);
      return this.legacyRunner.runGeneric(model, { template: templateType }, input, locale);
    } catch (error) {
      this.logger.error(`continueSession failed: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  /** Backward-compatible entry point used by AgentService.processExecution. */
  async execute(agent: AgentDefinition, input: ExecutionInput): Promise<AIResult> {
    this.logger.debug(`Executing agent: ${agent.template}`);
    try {
      const model = this.legacyRunner.getModel();
      if (agent.template === 'CHAVRUTA_DEBATE') return this.legacyRunner.runChavruta(model, input);
      if (agent.template === 'QUIZ_ASSESS') return this.legacyRunner.runQuiz(model, input);
      if (agent.template === 'SUMMARIZE') return this.legacyRunner.runSummarizer(model, input);
      return this.legacyRunner.runGeneric(model, agent, input);
    } catch (error) {
      this.logger.error(`AI execution failed: ${error instanceof Error ? error.message : error}`);
      throw error;
    }
  }

  /** Streaming entry point delegated entirely to the legacy runner. */
  async executeStream(
    agent: AgentDefinition,
    input: ExecutionInput,
    locale: string = 'en',
    abortSignal?: AbortSignal,
  ) {
    return this.legacyRunner.executeStream(agent, input, locale, abortSignal);
  }

  async getConversationMemory(sessionId: string, _limit: number = 10): Promise<unknown[]> {
    this.logger.debug(`Retrieving conversation memory for session ${sessionId}`);
    return [];
  }

  async saveConversationMemory(
    sessionId: string,
    _role: string,
    _content: string,
    _metadata?: unknown,
  ): Promise<void> {
    this.logger.debug(`Saving conversation memory for session ${sessionId}`);
  }

  isLangGraphTemplate(templateType: string): boolean {
    return this.langgraphRunner.isLangGraphTemplate(templateType);
  }
}
