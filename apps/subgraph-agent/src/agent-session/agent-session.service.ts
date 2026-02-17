import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db, withTenantContext, type Database } from '@edusphere/db';
import { agentSessions, NewAgentSession } from '@edusphere/db';
import { eq, and, desc } from 'drizzle-orm';
import type { AuthContext } from '@edusphere/auth';
import { NatsService } from '../nats/nats.service';

@Injectable()
export class AgentSessionService {
  private readonly logger = new Logger(AgentSessionService.name);

  constructor(private readonly natsService: NatsService) {}

  async findById(id: string, authContext: AuthContext) {
    if (!authContext.tenantId) {
      throw new NotFoundException('Tenant ID required');
    }

    return withTenantContext(db, {
      tenantId: authContext.tenantId,
      userId: authContext.userId,
      userRole: authContext.roles[0] as any,
    }, async (txDb: Database) => {
      const [session] = await txDb
        .select()
        .from(agentSessions)
        .where(eq(agentSessions.id, id))
        .limit(1);

      if (!session) {
        throw new NotFoundException(`AgentSession with ID ${id} not found`);
      }

      return session;
    });
  }

  async findByUser(userId: string, authContext: AuthContext) {
    if (!authContext.tenantId) {
      throw new NotFoundException('Tenant ID required');
    }

    return withTenantContext(db, {
      tenantId: authContext.tenantId,
      userId: authContext.userId,
      userRole: authContext.roles[0] as any,
    }, async (txDb: Database) => {
      return txDb
        .select()
        .from(agentSessions)
        .where(eq(agentSessions.userId, userId))
        .orderBy(desc(agentSessions.createdAt))
        .limit(20);
    });
  }

  async findActiveByUser(userId: string, authContext: AuthContext) {
    if (!authContext.tenantId) {
      throw new NotFoundException('Tenant ID required');
    }

    return withTenantContext(db, {
      tenantId: authContext.tenantId,
      userId: authContext.userId,
      userRole: authContext.roles[0] as any,
    }, async (txDb: Database) => {
      return txDb
        .select()
        .from(agentSessions)
        .where(and(eq(agentSessions.userId, userId), eq(agentSessions.status, 'ACTIVE')))
        .orderBy(desc(agentSessions.createdAt));
    });
  }

  async create(input: Partial<NewAgentSession>, authContext: AuthContext) {
    if (!authContext.tenantId) {
      throw new NotFoundException('Tenant ID required');
    }

    return withTenantContext(db, {
      tenantId: authContext.tenantId,
      userId: authContext.userId,
      userRole: authContext.roles[0] as any,
    }, async (txDb: Database) => {
      const [session] = await txDb
        .insert(agentSessions)
        .values(input as NewAgentSession)
        .returning();

      if (!session) {
        throw new NotFoundException('Failed to create session');
      }

      this.logger.log(`Created agent session ${session.id} for user ${authContext.userId}`);

      // Publish session created event
      await this.natsService.publish({
        type: 'session.created',
        sessionId: session.id,
        userId: authContext.userId,
        tenantId: authContext.tenantId,
        data: { agentType: session.agentType },
        timestamp: new Date(),
      });

      return session;
    });
  }

  async update(id: string, input: Partial<NewAgentSession>, authContext: AuthContext) {
    if (!authContext.tenantId) {
      throw new NotFoundException('Tenant ID required');
    }

    return withTenantContext(db, {
      tenantId: authContext.tenantId,
      userId: authContext.userId,
      userRole: authContext.roles[0] as any,
    }, async (txDb: Database) => {
      const [updated] = await txDb
        .update(agentSessions)
        .set(input)
        .where(eq(agentSessions.id, id))
        .returning();

      if (!updated) {
        throw new NotFoundException(`AgentSession with ID ${id} not found`);
      }

      return updated;
    });
  }

  async complete(id: string, authContext: AuthContext) {
    if (!authContext.tenantId) {
      throw new NotFoundException('Tenant ID required');
    }

    const session = await this.update(id, {
      status: 'COMPLETED',
      completedAt: new Date(),
    }, authContext);

    // Publish session completed event
    await this.natsService.publish({
      type: 'session.completed',
      sessionId: session.id,
      userId: authContext.userId,
      tenantId: authContext.tenantId,
      data: { status: 'COMPLETED' },
      timestamp: new Date(),
    });

    return session;
  }

  async cancel(id: string, authContext: AuthContext) {
    return this.update(id, {
      status: 'CANCELLED',
      completedAt: new Date(),
    }, authContext);
  }
}
