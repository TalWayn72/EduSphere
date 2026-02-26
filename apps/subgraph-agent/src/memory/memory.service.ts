import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  desc,
  closeAllPools,
} from '@edusphere/db';
import { NatsKVClient } from '@edusphere/nats-client';

// ── Constants ─────────────────────────────────────────────────────────────────

const KV_BUCKET = 'agent-memory';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface ConversationContext {
  sessionId: string;
  messages: ConversationMessage[];
  summary?: string;
  updatedAt: string;
}

type MessageRole = ConversationMessage['role'];

// ── DB row shape (subset) ─────────────────────────────────────────────────────

interface AgentMessageRow {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

// ── MemoryService ─────────────────────────────────────────────────────────────

@Injectable()
export class MemoryService implements OnModuleDestroy {
  private readonly logger = new Logger(MemoryService.name);
  private readonly db = createDatabaseConnection();
  private readonly kv = new NatsKVClient();

  // ── Database-backed methods ──────────────────────────────────────────────

  async getConversationHistory(
    sessionId: string,
    limit: number = 10
  ): Promise<ConversationMessage[]> {
    const messages = (await this.db
      .select()
      .from(schema.agentMessages)
      .where(eq(schema.agentMessages.sessionId, sessionId))
      .orderBy(desc(schema.agentMessages.createdAt))
      .limit(limit)) as AgentMessageRow[];

    // Reverse to get chronological order
    return messages.reverse().map((msg) => ({
      role: msg.role.toLowerCase() as MessageRole,
      content: msg.content,
      metadata: msg.metadata ?? undefined,
      createdAt: msg.createdAt,
    }));
  }

  async addMessage(
    sessionId: string,
    role: MessageRole,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.db.insert(schema.agentMessages).values({
      sessionId,
      role: role.toUpperCase() as 'USER' | 'ASSISTANT' | 'SYSTEM' | 'TOOL',
      content,
      metadata: metadata ?? {},
    });

    this.logger.debug(`Added ${role} message to session ${sessionId}`);
  }

  async summarizeConversation(sessionId: string): Promise<string> {
    const messages = await this.getConversationHistory(sessionId, 50);

    if (messages.length === 0) {
      return 'No conversation history';
    }

    const messageCount = messages.length;
    const userMessages = messages.filter((m) => m.role === 'user').length;
    const assistantMessages = messages.filter(
      (m) => m.role === 'assistant'
    ).length;

    const firstMessage = messages[0];
    const startTime = firstMessage?.createdAt
      ? firstMessage.createdAt.toISOString()
      : 'unknown';

    return (
      `Session has ${messageCount} messages (${userMessages} user, ${assistantMessages} assistant). ` +
      `Started at ${startTime}.`
    );
  }

  async clearConversation(sessionId: string): Promise<void> {
    await this.db
      .delete(schema.agentMessages)
      .where(eq(schema.agentMessages.sessionId, sessionId));

    this.logger.log(`Cleared conversation history for session ${sessionId}`);
  }

  async getMessageCount(sessionId: string): Promise<number> {
    const messages = (await this.db
      .select()
      .from(schema.agentMessages)
      .where(
        eq(schema.agentMessages.sessionId, sessionId)
      )) as AgentMessageRow[];

    return messages.length;
  }

  // ── NATS KV-backed context cache ─────────────────────────────────────────

  /**
   * Persists `context` to the NATS JetStream KV store under the
   * `agent-memory` bucket. Fast in-memory-backed path for hot sessions.
   *
   * @param sessionId - KV key (one context object per session)
   * @param context   - Full conversation context to cache
   */
  async saveContext(
    sessionId: string,
    context: Omit<ConversationContext, 'sessionId' | 'updatedAt'>
  ): Promise<void> {
    const payload: ConversationContext = {
      ...context,
      sessionId,
      updatedAt: new Date().toISOString(),
    };

    await this.kv.set(KV_BUCKET, sessionId, payload);
    this.logger.debug(`Saved context to NATS KV for session ${sessionId}`);
  }

  /**
   * Retrieves the cached conversation context from NATS KV.
   * Falls back to rebuilding from the database when the KV entry is absent
   * (cold start, TTL expiry, or KV unavailable).
   *
   * @param sessionId - Session whose context is requested
   * @returns The cached or reconstructed `ConversationContext`
   */
  async loadContext(sessionId: string): Promise<ConversationContext> {
    // ── Fast path: NATS KV ────────────────────────────────────────────────
    try {
      const cached = await this.kv.get<ConversationContext>(
        KV_BUCKET,
        sessionId
      );
      if (cached) {
        this.logger.debug(`Cache hit for session ${sessionId} (NATS KV)`);
        return cached;
      }
    } catch (err) {
      // KV unavailable — log and fall through to DB
      this.logger.warn(
        { err, sessionId },
        'NATS KV unavailable; falling back to database'
      );
    }

    // ── Slow path: database fallback ─────────────────────────────────────
    this.logger.debug(`Cache miss for session ${sessionId}; loading from DB`);
    const messages = await this.getConversationHistory(sessionId, 50);
    const context: ConversationContext = {
      sessionId,
      messages,
      updatedAt: new Date().toISOString(),
    };

    // Repopulate the KV cache so the next call is fast
    try {
      await this.kv.set(KV_BUCKET, sessionId, context);
    } catch (err) {
      this.logger.warn(
        { err, sessionId },
        'Failed to repopulate NATS KV after DB fallback'
      );
    }

    return context;
  }

  async onModuleDestroy(): Promise<void> {
    await this.kv.close();
    await closeAllPools();
  }
}
