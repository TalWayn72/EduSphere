import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@edusphere/db';
import { agentMessages, NewAgentMessage } from '@edusphere/db';
import { eq, asc } from 'drizzle-orm';

@Injectable()
export class AgentMessageService {
  async findById(id: string) {
    const [message] = await db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.id, id))
      .limit(1);

    if (!message) {
      throw new NotFoundException(`AgentMessage with ID ${id} not found`);
    }

    return message;
  }

  async findBySession(sessionId: string) {
    return db
      .select()
      .from(agentMessages)
      .where(eq(agentMessages.sessionId, sessionId))
      .orderBy(asc(agentMessages.createdAt));
  }

  async create(input: Partial<NewAgentMessage>) {
    const [message] = await db
      .insert(agentMessages)
      .values(input as NewAgentMessage)
      .returning();

    return message;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(agentMessages).where(eq(agentMessages.id, id));
    return (result.rowCount ?? 0) > 0;
  }
}
