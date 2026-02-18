import { Injectable, Logger } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, desc } from '@edusphere/db';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: any;
  createdAt: Date;
}

@Injectable()
export class MemoryService {
  private readonly logger = new Logger(MemoryService.name);
  private db = createDatabaseConnection();

  async getConversationHistory(
    sessionId: string,
    limit: number = 10
  ): Promise<ConversationMessage[]> {
    const messages = await this.db
      .select()
      .from(schema.agentMessages)
      .where(eq(schema.agentMessages.sessionId, sessionId))
      .orderBy(desc(schema.agentMessages.createdAt))
      .limit(limit);

    // Reverse to get chronological order
    return messages.reverse().map((msg) => ({
      role: msg.role.toLowerCase() as any,
      content: msg.content,
      metadata: msg.metadata,
      createdAt: msg.createdAt,
    }));
  }

  async addMessage(
    sessionId: string,
    role: 'user' | 'assistant' | 'system' | 'tool',
    content: string,
    metadata?: any
  ): Promise<void> {
    await this.db.insert(schema.agentMessages).values({
      sessionId: sessionId,
      role: role.toUpperCase() as any,
      content,
      metadata: metadata || {},
    });

    this.logger.debug(`Added ${role} message to session ${sessionId}`);
  }

  async summarizeConversation(sessionId: string): Promise<string> {
    const messages = await this.getConversationHistory(sessionId, 50);

    if (messages.length === 0) {
      return 'No conversation history';
    }

    // Simple summarization - in production, use LLM for better summaries
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
    const messages = await this.db
      .select()
      .from(schema.agentMessages)
      .where(eq(schema.agentMessages.sessionId, sessionId));

    return messages.length;
  }
}
