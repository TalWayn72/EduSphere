/**
 * RoleplaySessionService — session lifecycle (start, send, get).
 * Split from RoleplayService to keep files under 150 lines.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  createDatabaseConnection,
  scenario_templates,
  scenario_sessions,
  type EvaluationResult,
  type RubricCriterion,
} from '@edusphere/db';
import { and, eq } from 'drizzle-orm';
import { LlmConsentGuard } from '../ai/llm-consent.guard.js';
import { createRoleplayWorkflow } from '../ai/roleplay.workflow.js';
import type { RoleplayStateType } from '../ai/roleplay.workflow.js';

const MAX_MESSAGE_LENGTH = 2000;

@Injectable()
export class RoleplaySessionService {
  private readonly logger = new Logger(RoleplaySessionService.name);
  readonly db = createDatabaseConnection();

  constructor(private readonly consentGuard: LlmConsentGuard) {}

  async startSession(scenarioId: string, userId: string, tenantId: string) {
    const isExternal = Boolean(
      process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
    );
    await this.consentGuard.assertConsent(userId, isExternal);

    const [template] = await this.db
      .select()
      .from(scenario_templates)
      .where(
        and(
          eq(scenario_templates.id, scenarioId),
          eq(scenario_templates.tenant_id, tenantId),
          eq(scenario_templates.is_active, true)
        )
      )
      .limit(1);

    if (!template) throw new NotFoundException('Scenario template not found');

    const [session] = await this.db
      .insert(scenario_sessions)
      .values({ user_id: userId, scenario_id: scenarioId, tenant_id: tenantId })
      .returning();

    if (!session) throw new Error('Failed to create scenario session');

    this.runWorkflowAsync(session.id, template).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        { sessionId: session.id, err: msg },
        'Roleplay start failed'
      );
    });

    this.logger.log(
      { sessionId: session.id, scenarioId },
      'Roleplay session started'
    );
    return session;
  }

  async sendMessage(
    sessionId: string,
    message: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    const safeMessage = message.slice(0, MAX_MESSAGE_LENGTH);

    const [session] = await this.db
      .select()
      .from(scenario_sessions)
      .where(
        and(
          eq(scenario_sessions.id, sessionId),
          eq(scenario_sessions.user_id, userId),
          eq(scenario_sessions.tenant_id, tenantId),
          eq(scenario_sessions.status, 'IN_PROGRESS')
        )
      )
      .limit(1);

    if (!session)
      throw new NotFoundException('Session not found or not in progress');

    const [template] = await this.db
      .select()
      .from(scenario_templates)
      .where(eq(scenario_templates.id, session.scenario_id))
      .limit(1);

    if (!template) throw new NotFoundException('Scenario template not found');

    this.resumeWorkflowAsync(
      sessionId,
      safeMessage,
      template,
      session.turn_count
    ).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error({ sessionId, err: msg }, 'Roleplay resume failed');
    });
    return true;
  }

  async getSession(sessionId: string, userId: string, tenantId: string) {
    const [session] = await this.db
      .select()
      .from(scenario_sessions)
      .where(
        and(
          eq(scenario_sessions.id, sessionId),
          eq(scenario_sessions.user_id, userId),
          eq(scenario_sessions.tenant_id, tenantId)
        )
      )
      .limit(1);
    return session ?? null;
  }

  private async runWorkflowAsync(
    sessionId: string,
    template: typeof scenario_templates.$inferSelect
  ): Promise<void> {
    const workflow = createRoleplayWorkflow();
    try {
      await workflow.invoke(
        {
          sessionId,
          characterPersona: template.character_persona,
          sceneDescription: template.scene_description,
          evaluationRubric: template.evaluation_rubric as RubricCriterion[],
          maxTurns: template.max_turns,
          turnCount: 0,
          history: [],
          currentLearnerMessage: undefined,
          evaluation: undefined,
          error: undefined,
        },
        { configurable: { thread_id: sessionId } }
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug(
        { sessionId, msg },
        'Workflow paused on interrupt (expected)'
      );
    }
  }

  private async resumeWorkflowAsync(
    sessionId: string,
    message: string,
    template: typeof scenario_templates.$inferSelect,
    currentTurnCount: number
  ): Promise<void> {
    const workflow = createRoleplayWorkflow();
    const newTurnCount = currentTurnCount + 1;
    const isComplete = newTurnCount >= template.max_turns;
    try {
      const result = await workflow.invoke(
        { currentLearnerMessage: message } as Partial<RoleplayStateType>,
        { configurable: { thread_id: sessionId } }
      );
      await this.db
        .update(scenario_sessions)
        .set({
          turn_count: newTurnCount,
          ...(isComplete && {
            status: 'COMPLETED',
            completed_at: new Date(),
            evaluation_result: result.evaluation as EvaluationResult,
          }),
        })
        .where(eq(scenario_sessions.id, sessionId));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.debug({ sessionId, msg }, 'Workflow resumed');
      await this.db
        .update(scenario_sessions)
        .set({ turn_count: newTurnCount })
        .where(eq(scenario_sessions.id, sessionId));
    }
  }
}
