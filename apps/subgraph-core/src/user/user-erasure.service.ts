import { Injectable, Logger } from '@nestjs/common';
import { eq, inArray } from 'drizzle-orm';
import {
  createDatabaseConnection,
  schema,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';

/**
 * GDPR Art.17 — Right to Erasure (Right to be Forgotten).
 * Hard-deletes ALL personal data for a user across all tables.
 * Uses withTenantContext for RLS enforcement.
 * Writes an append-only audit log entry after erasure.
 */
@Injectable()
export class UserErasureService {
  private readonly logger = new Logger(UserErasureService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async eraseUserData(
    userId: string,
    tenantId: string,
    requestedBy: string,
    userRole:
      | 'SUPER_ADMIN'
      | 'ORG_ADMIN'
      | 'INSTRUCTOR'
      | 'STUDENT'
      | 'RESEARCHER' = 'STUDENT'
  ): Promise<ErasureReport> {
    const report: ErasureReport = {
      userId,
      tenantId,
      startedAt: new Date(),
      deletedEntities: [],
      status: 'IN_PROGRESS',
    };

    const tenantCtx = { tenantId, userId: requestedBy, userRole };

    try {
      await withTenantContext(this.db, tenantCtx, async (tx) => {
        // Step 1: Delete agent messages (FK → agent sessions)
        const sessionRows = await tx
          .select({ id: schema.agentSessions.id })
          .from(schema.agentSessions)
          .where(eq(schema.agentSessions.userId, userId));

        if (sessionRows.length > 0) {
          const ids = sessionRows.map((s) => s.id);
          const msgs = await tx
            .delete(schema.agentMessages)
            .where(inArray(schema.agentMessages.sessionId, ids))
            .returning();
          report.deletedEntities.push({
            type: 'AGENT_MESSAGES',
            count: msgs.length,
          });
        } else {
          report.deletedEntities.push({ type: 'AGENT_MESSAGES', count: 0 });
        }

        // Step 2: Delete agent sessions
        const sessions = await tx
          .delete(schema.agentSessions)
          .where(eq(schema.agentSessions.userId, userId))
          .returning();
        report.deletedEntities.push({
          type: 'AGENT_SESSIONS',
          count: sessions.length,
        });

        // Step 3: Delete annotations
        const annotations = await tx
          .delete(schema.annotations)
          .where(eq(schema.annotations.user_id, userId))
          .returning();
        report.deletedEntities.push({
          type: 'ANNOTATIONS',
          count: annotations.length,
        });

        // Step 4: Delete user progress
        const progress = await tx
          .delete(schema.userProgress)
          .where(eq(schema.userProgress.userId, userId))
          .returning();
        report.deletedEntities.push({
          type: 'USER_PROGRESS',
          count: progress.length,
        });

        // Step 5: Delete user enrollments
        const enrollments = await tx
          .delete(schema.userCourses)
          .where(eq(schema.userCourses.userId, userId))
          .returning();
        report.deletedEntities.push({
          type: 'ENROLLMENTS',
          count: enrollments.length,
        });

        // Step 6: Hard-delete user record (not soft-delete — Art.17 mandates removal)
        await tx.delete(schema.users).where(eq(schema.users.id, userId));
        report.deletedEntities.push({ type: 'USER_RECORD', count: 1 });
      });

      report.status = 'COMPLETED';
      report.completedAt = new Date();

      // Write audit log (append-only — outside erasure transaction so it survives)
      await this.writeAuditLog(
        tenantId,
        requestedBy,
        userId,
        'SUCCESS',
        report
      );

      this.logger.log(
        { userId, tenantId, report },
        'GDPR Art.17 erasure completed'
      );
    } catch (error) {
      report.status = 'FAILED';
      report.error = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        { userId, tenantId, error },
        'GDPR Art.17 erasure failed'
      );

      await this.writeAuditLog(tenantId, requestedBy, userId, 'FAILED', report);
    }

    return report;
  }

  private async writeAuditLog(
    tenantId: string,
    requestedBy: string,
    targetUserId: string,
    status: string,
    report: ErasureReport
  ): Promise<void> {
    try {
      await this.db.insert(schema.auditLog).values({
        tenantId,
        userId: requestedBy,
        action: 'DATA_ERASURE',
        resourceType: 'USER',
        resourceId: targetUserId,
        status,
        metadata: {
          gdprArticle: '17',
          selfRequested: requestedBy === targetUserId,
          report,
        },
      });
    } catch (auditError) {
      this.logger.error(
        { tenantId, requestedBy, auditError },
        'Failed to write GDPR erasure audit log'
      );
    }
  }
}

export interface ErasureReport {
  userId: string;
  tenantId: string;
  startedAt: Date;
  completedAt?: Date;
  deletedEntities: { type: string; count: number }[];
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  error?: string;
}
