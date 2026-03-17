/**
 * CourseGeneratorService — orchestrates the course generation workflow.
 *
 * SI-10: Checks THIRD_PARTY_LLM consent before any LLM call.
 * Memory safety: implements OnModuleDestroy and closes the DB pool.
 */

import { Injectable, Logger, OnModuleDestroy, InternalServerErrorException } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  closeAllPools,
  eq,
} from '@edusphere/db';
import { LlmConsentGuard } from './llm-consent.guard.js';
import { createCourseGeneratorWorkflow } from './course-generator.workflow.js';

export interface GenerateCourseOptions {
  prompt: string;
  targetAudienceLevel?: string;
  estimatedHours?: number;
  language?: string;
}

export interface CourseGenerationRecord {
  executionId: string;
  status: string;
  courseTitle?: string;
  courseDescription?: string;
  modules: {
    title: string;
    description: string;
    contentItemTitles: string[];
  }[];
  draftCourseId?: string;
}

@Injectable()
export class CourseGeneratorService implements OnModuleDestroy {
  private readonly logger = new Logger(CourseGeneratorService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly consentGuard: LlmConsentGuard) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /**
   * Start async course generation.
   * Returns immediately with executionId and RUNNING status.
   * The LangGraph workflow runs in the background.
   */
  async generateCourse(
    options: GenerateCourseOptions,
    userId: string,
    tenantId: string
  ): Promise<CourseGenerationRecord> {
    // SI-10: Require THIRD_PARTY_LLM consent when using external LLM
    const isExternal = Boolean(
      process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
    );
    await this.consentGuard.assertConsent(userId, isExternal);

    const [execution] = await this.db
      .insert(schema.agent_executions)
      .values({
        agent_id: 'course-generator',
        user_id: userId,
        input: {
          prompt: options.prompt,
          targetAudienceLevel: options.targetAudienceLevel,
          estimatedHours: options.estimatedHours,
          language: options.language,
          tenantId,
        },
        status: 'RUNNING',
        metadata: { templateType: 'COURSE_GENERATOR' },
      })
      .returning();

    if (!execution) {
      throw new InternalServerErrorException('Failed to create execution record');
    }

    const executionId = execution.id;

    // Fire-and-forget with 5-min timeout (Memory Safety: Promise.race required)
    const WORKFLOW_TIMEOUT_MS = 5 * 60 * 1000;
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Course generation timed out after 5 minutes')), WORKFLOW_TIMEOUT_MS)
    );
    Promise.race([this.runWorkflowAsync(executionId, options), timeoutPromise]).catch(
      async (err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          { executionId, err: msg },
          'Course generation workflow failed'
        );
        await this.markFailed(executionId, msg).catch((dbErr) =>
          this.logger.error({ executionId, dbErr }, 'Failed to mark execution as failed')
        );
      }
    );

    return { executionId, status: 'RUNNING', modules: [] };
  }

  private async runWorkflowAsync(
    executionId: string,
    options: GenerateCourseOptions
  ): Promise<void> {
    try {
      const workflow = createCourseGeneratorWorkflow();
      const result = await workflow.invoke({
        prompt: options.prompt,
        targetAudienceLevel: options.targetAudienceLevel,
        estimatedHours: options.estimatedHours,
        language: options.language ?? 'en',
        courseOutline: undefined,
        conceptNames: [],
        error: undefined,
      });

      if (result.error) {
        await this.markFailed(executionId, result.error);
        return;
      }

      const outline = result.courseOutline;
      if (!outline) {
        await this.markFailed(executionId, 'Workflow produced no outline');
        return;
      }

      await this.db
        .update(schema.agent_executions)
        .set({
          status: 'COMPLETED',
          output: {
            courseTitle: outline.title,
            courseDescription: outline.description,
            modules: outline.modules,
            conceptNames: result.conceptNames,
          },
          completed_at: new Date(),
        })
        .where(eq(schema.agent_executions.id, executionId));

      this.logger.log({ executionId }, 'Course generation completed');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.markFailed(executionId, msg);
    }
  }

  private async markFailed(executionId: string, error: string): Promise<void> {
    await this.db
      .update(schema.agent_executions)
      .set({ status: 'FAILED', output: { error }, completed_at: new Date() })
      .where(eq(schema.agent_executions.id, executionId));
    this.logger.error({ executionId, error }, 'Course generation failed');
  }

  async getResult(executionId: string): Promise<CourseGenerationRecord | null> {
    const [execution] = await this.db
      .select()
      .from(schema.agent_executions)
      .where(eq(schema.agent_executions.id, executionId))
      .limit(1);

    if (!execution) return null;

    const output = execution.output as Record<string, unknown> | null;
    return {
      executionId: execution.id,
      status: execution.status,
      courseTitle: output?.courseTitle as string | undefined,
      courseDescription: output?.courseDescription as string | undefined,
      modules: (output?.modules as CourseGenerationRecord['modules']) ?? [],
    };
  }
}
