import { Injectable, Logger, OnModuleDestroy, NotFoundException } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  desc,
  and,
  closeAllPools,
} from '@edusphere/db';
import { AIService } from '../ai/ai.service';

interface StartExecutionInput {
  agentId: string;
  userId: string;
  input: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AgentService implements OnModuleDestroy {
  private readonly logger = new Logger(AgentService.name);
  private db = createDatabaseConnection();

  constructor(private readonly aiService: AIService) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async findById(id: string) {
    const [execution] = await this.db
      .select()
      .from(schema.agent_executions)
      .where(eq(schema.agent_executions.id, id))
      .limit(1);
    return execution || null;
  }

  async findByUser(userId: string, limit: number) {
    return this.db
      .select()
      .from(schema.agent_executions)
      .where(eq(schema.agent_executions.user_id, userId))
      .orderBy(desc(schema.agent_executions.started_at))
      .limit(limit);
  }

  async findByAgent(agentId: string, limit: number) {
    return this.db
      .select()
      .from(schema.agent_executions)
      .where(eq(schema.agent_executions.agent_id, agentId))
      .orderBy(desc(schema.agent_executions.started_at))
      .limit(limit);
  }

  async findRunning(userId: string) {
    return this.db
      .select()
      .from(schema.agent_executions)
      .where(
        and(
          eq(schema.agent_executions.user_id, userId),
          eq(schema.agent_executions.status, 'RUNNING')
        )
      )
      .orderBy(desc(schema.agent_executions.started_at));
  }

  async startExecution(input: StartExecutionInput) {
    const [execution] = await this.db
      .insert(schema.agent_executions)
      .values({
        agent_id: input.agentId,
        user_id: input.userId,
        input: input.input,
        status: 'QUEUED',
        metadata: input.metadata || {},
      })
      .returning();

    if (execution) {
      this.logger.log(`Agent execution ${execution.id} started (QUEUED)`);

      // Process execution asynchronously
      this.processExecution(execution.id).catch((err) => {
        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`Execution ${execution.id} failed: ${errorMessage}`);
      });
    }

    return execution;
  }

  async cancelExecution(id: string) {
    const [execution] = await this.db
      .update(schema.agent_executions)
      .set({
        status: 'CANCELLED',
        completed_at: new Date(),
      })
      .where(eq(schema.agent_executions.id, id))
      .returning();

    this.logger.log(`Agent execution ${id} cancelled`);
    return execution;
  }

  private async processExecution(executionId: string) {
    await this.db
      .update(schema.agent_executions)
      .set({
        status: 'RUNNING',
        started_at: new Date(),
      })
      .where(eq(schema.agent_executions.id, executionId));

    try {
      const execution = await this.findById(executionId);
      if (!execution) {
        throw new NotFoundException('Execution not found');
      }

      // Get agent definition
      const [agent] = await this.db
        .select()
        .from(schema.agent_definitions)
        .where(eq(schema.agent_definitions.id, execution!.agent_id))
        .limit(1);

      if (!agent) {
        throw new NotFoundException('Agent definition not found');
      }

      // Execute with AI service (Memory Safety: Promise.race with 10-min timeout)
      // BUG-093: Increased from 5 min → 10 min — CPU-based Ollama on dev
      // machines regularly needs 4-6 min for structured JSON generation.
      const EXECUTION_TIMEOUT_MS = 600_000;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Execution timed out after 10 minutes')),
          EXECUTION_TIMEOUT_MS
        )
      );
      const result = await Promise.race([
        this.aiService.execute(
          agent,
          execution!.input as Record<string, unknown>
        ),
        timeoutPromise,
      ]);

      // Update with result
      await this.db
        .update(schema.agent_executions)
        .set({
          status: 'COMPLETED',
          output: result as unknown as Record<string, unknown>,
          completed_at: new Date(),
        })
        .where(eq(schema.agent_executions.id, executionId));

      this.logger.log(`Agent execution ${executionId} completed`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      await this.db
        .update(schema.agent_executions)
        .set({
          status: 'FAILED',
          output: { error: errorMessage } as Record<string, unknown>,
          completed_at: new Date(),
        })
        .where(eq(schema.agent_executions.id, executionId));

      this.logger.error(
        `Agent execution ${executionId} failed: ${errorMessage}`
      );
    }
  }
}
