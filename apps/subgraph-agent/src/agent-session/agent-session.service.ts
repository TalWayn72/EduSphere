import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@edusphere/db';
import { agentSessions, NewAgentSession } from '@edusphere/db';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class AgentSessionService {
  async findById(id: string) {
    const [session] = await db
      .select()
      .from(agentSessions)
      .where(eq(agentSessions.id, id))
      .limit(1);

    if (!session) {
      throw new NotFoundException(`AgentSession with ID ${id} not found`);
    }

    return session;
  }

  async findByUser(userId: string, limit: number = 20) {
    return db
      .select()
      .from(agentSessions)
      .where(eq(agentSessions.userId, userId))
      .orderBy(desc(agentSessions.createdAt))
      .limit(limit);
  }

  async findActiveByUser(userId: string) {
    return db
      .select()
      .from(agentSessions)
      .where(and(eq(agentSessions.userId, userId), eq(agentSessions.status, 'ACTIVE')))
      .orderBy(desc(agentSessions.createdAt));
  }

  async create(input: Partial<NewAgentSession>) {
    const [session] = await db
      .insert(agentSessions)
      .values(input as NewAgentSession)
      .returning();

    return session;
  }

  async update(id: string, input: Partial<NewAgentSession>) {
    const [updated] = await db
      .update(agentSessions)
      .set(input)
      .where(eq(agentSessions.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`AgentSession with ID ${id} not found`);
    }

    return updated;
  }

  async complete(id: string) {
    return this.update(id, {
      status: 'COMPLETED',
      completedAt: new Date(),
    });
  }

  async cancel(id: string) {
    return this.update(id, {
      status: 'CANCELLED',
      completedAt: new Date(),
    });
  }
}
