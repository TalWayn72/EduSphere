import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  createDatabaseConnection,
  schema,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';

/**
 * GDPR Art.20 — Right to Data Portability.
 * Exports all user-owned personal data as a structured JSON object.
 * Caller may serialize, zip, and deliver the result to the user.
 */
@Injectable()
export class UserExportService {
  private readonly logger = new Logger(UserExportService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async exportUserData(
    userId: string,
    tenantId: string,
    userRole: 'SUPER_ADMIN' | 'ORG_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'RESEARCHER' = 'STUDENT',
  ): Promise<UserDataExport> {
    const tenantCtx = { tenantId, userId, userRole };

    const exportData = await withTenantContext(this.db, tenantCtx, async (tx) => {
      const [profile, annotations, agentSessions, progress, enrollments] =
        await Promise.all([
          tx.select().from(schema.users).where(eq(schema.users.id, userId)),
          tx.select().from(schema.annotations).where(eq(schema.annotations.user_id, userId)),
          tx.select().from(schema.agentSessions).where(eq(schema.agentSessions.userId, userId)),
          tx.select().from(schema.userProgress).where(eq(schema.userProgress.userId, userId)),
          tx.select().from(schema.userCourses).where(eq(schema.userCourses.userId, userId)),
        ]);

      return {
        exportedAt: new Date().toISOString(),
        gdprArticle: '20' as const,
        format: 'EduSphere-UserExport/1.0',
        userId,
        profile: (profile[0] as Record<string, unknown>) ?? null,
        annotations: annotations as Record<string, unknown>[],
        agentSessions: agentSessions as Record<string, unknown>[],
        learningProgress: progress as Record<string, unknown>[],
        enrollments: enrollments as Record<string, unknown>[],
      };
    });

    // Write audit log for the export operation
    await this.writeAuditLog(tenantId, userId, exportData);

    this.logger.log({ userId, tenantId }, 'GDPR Art.20 data export completed');

    return exportData;
  }

  private async writeAuditLog(
    tenantId: string,
    userId: string,
    exportData: UserDataExport,
  ): Promise<void> {
    try {
      await this.db.insert(schema.auditLog).values({
        tenantId,
        userId,
        action: 'EXPORT',
        resourceType: 'USER',
        resourceId: userId,
        status: 'SUCCESS',
        metadata: {
          gdprArticle: '20',
          exportedEntityCounts: {
            annotations: exportData.annotations.length,
            agentSessions: exportData.agentSessions.length,
            learningProgress: exportData.learningProgress.length,
            enrollments: exportData.enrollments.length,
          },
        },
      });
    } catch (auditError) {
      this.logger.error(
        { tenantId, userId, auditError },
        'Failed to write GDPR export audit log',
      );
    }
  }
}

export interface UserDataExport {
  exportedAt: string;
  gdprArticle: '20';
  format: string;
  userId: string;
  profile: Record<string, unknown> | null;
  annotations: Record<string, unknown>[];
  agentSessions: Record<string, unknown>[];
  learningProgress: Record<string, unknown>[];
  enrollments: Record<string, unknown>[];
}
