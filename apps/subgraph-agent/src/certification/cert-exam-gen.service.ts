/**
 * CertExamGenService — orchestrates certification exam item generation.
 *
 * SI-10: Checks THIRD_PARTY_LLM consent before any LLM call.
 * Memory safety: implements OnModuleDestroy and closes the DB pool.
 * Fire-and-forget: returns executionId immediately, runs workflow async.
 */
import {
  Injectable,
  Inject,
  Logger,
  OnModuleDestroy,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  closeAllPools,
  eq,
  and,
} from '@edusphere/db';
import { createOllama } from 'ollama-ai-provider';
import type { LanguageModel } from 'ai';
import { randomUUID } from 'crypto';
import { LlmConsentGuard } from '../ai/llm-consent.guard.js';
import {
  EXECUTION_PUBSUB,
  executionPubSub,
} from '../agent/execution-pubsub.provider.js';
import { runCertExamGenerator } from './cert-exam-gen.adapter.js';
import type { CitationSearchFn } from '@edusphere/langgraph-workflows';

export interface GenerateExamItemsOptions {
  moduleId: string;
  targetBloomLevels: string[];
  targetCount: number;
  targetDifficulty: string;
  locale?: string;
}

export interface ExamGenRecord {
  executionId: string;
  status: string;
  itemCount: number;
}

const AGENT_NAME = 'cert-exam-generator';
const WORKFLOW_TIMEOUT_MS = 10 * 60 * 1000;

@Injectable()
export class CertExamGenService implements OnModuleDestroy {
  private readonly logger = new Logger(CertExamGenService.name);
  private readonly db = createDatabaseConnection();
  private agentDefId: string | null = null;

  constructor(
    private readonly consentGuard: LlmConsentGuard,
    @Inject(EXECUTION_PUBSUB) private readonly pubSub: typeof executionPubSub
  ) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  private getModel(): LanguageModel {
    const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
    const ollama = createOllama({ baseURL: ollamaUrl + '/api' });
    return ollama(
      process.env['OLLAMA_MODEL'] ?? 'llama3.2'
    ) as unknown as LanguageModel;
  }

  private async ensureAgentDef(
    userId: string,
    tenantId: string
  ): Promise<string> {
    if (this.agentDefId) return this.agentDefId;

    const [existing] = await this.db
      .select({ id: schema.agent_definitions.id })
      .from(schema.agent_definitions)
      .where(
        and(
          eq(schema.agent_definitions.name, AGENT_NAME),
          eq(schema.agent_definitions.tenant_id, tenantId)
        )
      )
      .limit(1);

    if (existing) {
      this.agentDefId = existing.id;
      return existing.id;
    }

    const rows = await this.db
      .insert(schema.agent_definitions)
      .values({
        name: AGENT_NAME,
        template: 'CUSTOM',
        tenant_id: tenantId,
        creator_id: userId,
        config: { type: 'CERT_EXAM_GENERATOR' },
      })
      .returning({ id: schema.agent_definitions.id });

    const id = rows[0]?.id;
    if (!id)
      throw new InternalServerErrorException(
        'Failed to create agent definition'
      );
    this.agentDefId = id;
    return id;
  }

  async generateItems(
    options: GenerateExamItemsOptions,
    userId: string,
    tenantId: string,
    searchFn?: CitationSearchFn
  ): Promise<ExamGenRecord> {
    const isExternal = Boolean(
      process.env['OPENAI_API_KEY'] || process.env['ANTHROPIC_API_KEY']
    );
    await this.consentGuard.assertConsent(userId, isExternal);

    const agentId = await this.ensureAgentDef(userId, tenantId);

    const [execution] = await this.db
      .insert(schema.agent_executions)
      .values({
        agent_id: agentId,
        user_id: userId,
        input: { ...options, tenantId },
        status: 'RUNNING',
        metadata: { templateType: 'CERT_EXAM_GENERATOR' },
      })
      .returning();

    if (!execution)
      throw new InternalServerErrorException('Failed to create execution');

    const executionId = execution.id;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Exam generation timed out after 10 min')),
        WORKFLOW_TIMEOUT_MS
      )
    );
    Promise.race([
      this.runAsync(executionId, options, searchFn),
      timeoutPromise,
    ]).catch(async (err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        { executionId, err: msg },
        '[CertExamGenService] workflow failed'
      );
      await this.markFailed(executionId, msg).catch((e) =>
        this.logger.error(
          { executionId, e },
          '[CertExamGenService] markFailed error'
        )
      );
    });

    return { executionId, status: 'RUNNING', itemCount: 0 };
  }

  private async runAsync(
    executionId: string,
    options: GenerateExamItemsOptions,
    searchFn?: CitationSearchFn
  ): Promise<void> {
    try {
      const model = this.getModel();
      const threadId = randomUUID();

      const result = await runCertExamGenerator(
        threadId,
        options.moduleId,
        options.targetBloomLevels,
        options.targetCount,
        options.targetDifficulty,
        options.locale ?? 'en',
        model as Parameters<typeof runCertExamGenerator>[6],
        undefined,
        searchFn
      );

      const output = { items: result.items, errors: result.errors };
      await this.db
        .update(schema.agent_executions)
        .set({ status: 'COMPLETED', output, completed_at: new Date() })
        .where(eq(schema.agent_executions.id, executionId));

      this.pubSub.publish(`executionStatus_${executionId}`, {
        executionStatusChanged: {
          id: executionId,
          status: 'COMPLETED',
          output,
        },
      });

      this.logger.log(
        { executionId, itemCount: result.items.length },
        '[CertExamGenService] generation completed'
      );
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
    this.pubSub.publish(`executionStatus_${executionId}`, {
      executionStatusChanged: {
        id: executionId,
        status: 'FAILED',
        output: { error },
      },
    });
    this.logger.error({ executionId, error }, '[CertExamGenService] failed');
  }

  async getResult(executionId: string): Promise<ExamGenRecord | null> {
    const [execution] = await this.db
      .select()
      .from(schema.agent_executions)
      .where(eq(schema.agent_executions.id, executionId))
      .limit(1);

    if (!execution) return null;
    const output = execution.output as Record<string, unknown> | null;
    const items = (output?.items as unknown[]) ?? [];
    return {
      executionId: execution.id,
      status: execution.status,
      itemCount: items.length,
    };
  }
}
