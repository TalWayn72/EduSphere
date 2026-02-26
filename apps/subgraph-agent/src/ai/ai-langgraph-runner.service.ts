import { Injectable, Logger } from '@nestjs/common';
import {
  runLangGraphDebate,
  runLangGraphQuiz,
  runLangGraphTutor,
} from './ai.langgraph.js';
import { LangGraphService } from './langgraph.service.js';
import type { AIResult } from './ai.service.js';

// ── Templates routed through LangGraph ───────────────────────────────────────

const LANGGRAPH_TEMPLATES = new Set([
  'CHAVRUTA_DEBATE',
  'TUTOR',
  'QUIZ_GENERATOR',
  'QUIZ_ASSESS',
  'EXPLANATION_GENERATOR',
]);

@Injectable()
export class AiLanggraphRunnerService {
  private readonly logger = new Logger(AiLanggraphRunnerService.name);

  constructor(private readonly langGraphService: LangGraphService) {}

  /** Returns true for template types that are executed by LangGraph. */
  isLangGraphTemplate(templateType: string): boolean {
    return LANGGRAPH_TEMPLATES.has(templateType);
  }

  /**
   * Dispatch to the correct LangGraph workflow adapter.
   * Returns null if the templateType is not a LangGraph template,
   * so the caller can fall through to the legacy runner.
   */
  async run(
    sessionId: string,
    message: string,
    templateType: string,
    context: Record<string, unknown>,
    locale: string
  ): Promise<AIResult | null> {
    const checkpointer = this.langGraphService.getCheckpointer();

    if (templateType === 'CHAVRUTA_DEBATE') {
      this.logger.debug(`LangGraph: debate session=${sessionId}`);
      return runLangGraphDebate(
        sessionId,
        message,
        context,
        locale,
        checkpointer
      );
    }

    if (templateType === 'QUIZ_GENERATOR' || templateType === 'QUIZ_ASSESS') {
      this.logger.debug(`LangGraph: quiz session=${sessionId}`);
      return runLangGraphQuiz(
        sessionId,
        message,
        context,
        locale,
        checkpointer
      );
    }

    if (templateType === 'TUTOR' || templateType === 'EXPLANATION_GENERATOR') {
      this.logger.debug(`LangGraph: tutor session=${sessionId}`);
      return runLangGraphTutor(
        sessionId,
        message,
        context,
        locale,
        checkpointer
      );
    }

    // Not a LangGraph template — signal caller to use legacy runner
    return null;
  }
}
