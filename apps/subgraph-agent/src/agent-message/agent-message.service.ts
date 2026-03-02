import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { db, withTenantContext, type Database } from '@edusphere/db';
import { agentMessages, NewAgentMessage } from '@edusphere/db';
import { eq, asc } from 'drizzle-orm';
import type { AuthContext } from '@edusphere/auth';

@Injectable()
export class AgentMessageService {
  private readonly logger = new Logger(AgentMessageService.name);

  async findById(id: string, authContext: AuthContext) {
    if (!authContext.tenantId) {
      throw new NotFoundException('Tenant ID required');
    }

    return withTenantContext(
      db,
      {
        tenantId: authContext.tenantId,
        userId: authContext.userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userRole: authContext.roles[0] as any,
      },
      async (txDb: Database) => {
        const [message] = await txDb
          .select()
          .from(agentMessages)
          .where(eq(agentMessages.id, id))
          .limit(1);

        if (!message) {
          throw new NotFoundException(`AgentMessage with ID ${id} not found`);
        }

        return message;
      }
    );
  }

  async findBySession(sessionId: string, authContext: AuthContext) {
    if (!authContext.tenantId) {
      throw new NotFoundException('Tenant ID required');
    }

    return withTenantContext(
      db,
      {
        tenantId: authContext.tenantId,
        userId: authContext.userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userRole: authContext.roles[0] as any,
      },
      async (txDb: Database) => {
        return txDb
          .select()
          .from(agentMessages)
          .where(eq(agentMessages.sessionId, sessionId))
          .orderBy(asc(agentMessages.createdAt));
      }
    );
  }

  async create(input: Partial<NewAgentMessage>, authContext: AuthContext) {
    if (!authContext.tenantId) {
      throw new NotFoundException('Tenant ID required');
    }

    return withTenantContext(
      db,
      {
        tenantId: authContext.tenantId,
        userId: authContext.userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userRole: authContext.roles[0] as any,
      },
      async (txDb: Database) => {
        const [message] = await txDb
          .insert(agentMessages)
          .values(input as NewAgentMessage)
          .returning();

        if (!message) {
          throw new NotFoundException('Failed to create message');
        }

        this.logger.debug(
          `Created message ${message.id} in session ${input.sessionId}`
        );
        return message;
      }
    );
  }

  async delete(id: string, authContext: AuthContext): Promise<boolean> {
    if (!authContext.tenantId) {
      throw new NotFoundException('Tenant ID required');
    }

    return withTenantContext(
      db,
      {
        tenantId: authContext.tenantId,
        userId: authContext.userId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userRole: authContext.roles[0] as any,
      },
      async (txDb: Database) => {
        const result = await txDb
          .delete(agentMessages)
          .where(eq(agentMessages.id, id));
        return (result.rowCount ?? 0) > 0;
      }
    );
  }
}
