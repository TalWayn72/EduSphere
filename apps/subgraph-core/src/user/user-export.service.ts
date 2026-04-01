import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  createDatabaseConnection,
  schema,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const piiManifest = require('@edusphere/db/config/pii-bearing-tables.json') as {
  tables: Array<{
    name: string;
    schemaFile: string;
    piiColumns: string[];
    note?: string;
  }>;
};

/**
 * GDPR Art.20 — Right to Data Portability.
 * Exports all user-owned personal data as a structured JSON object.
 * Generates a SHA-256 attestation hash and records it in the audit log.
 */
@Injectable()
export class UserExportService implements OnModuleDestroy {
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
    userRole:
      | 'SUPER_ADMIN'
      | 'ORG_ADMIN'
      | 'INSTRUCTOR'
      | 'STUDENT'
      | 'RESEARCHER' = 'STUDENT'
  ): Promise<UserDataExport> {
    const tenantCtx = { tenantId, userId, userRole };

    const exportData = await withTenantContext(
      this.db,
      tenantCtx,
      async (tx) => {
        const [profile, annotations, agentSessions, progress, enrollments] =
          await Promise.all([
            tx.select().from(schema.users).where(eq(schema.users.id, userId)),
            tx
              .select()
              .from(schema.annotations)
              .where(eq(schema.annotations.user_id, userId)),
            tx
              .select()
              .from(schema.agentSessions)
              .where(eq(schema.agentSessions.userId, userId)),
            tx
              .select()
              .from(schema.userProgress)
              .where(eq(schema.userProgress.userId, userId)),
            tx
              .select()
              .from(schema.userCourses)
              .where(eq(schema.userCourses.userId, userId)),
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
          piiManifest: piiManifest.tables,
        };
      }
    );

    // Compute SHA-256 attestation hash of the export payload
    const sha256Hash = computeExportHash(exportData);

    // Write audit log with GDPR_EXPORT action and attestation hash
    await this.writeAuditLog(tenantId, userId, exportData, sha256Hash);

    this.logger.log(
      { userId, tenantId, sha256Hash },
      'GDPR Art.20 data export completed with attestation'
    );

    return exportData;
  }

  private async writeAuditLog(
    tenantId: string,
    userId: string,
    exportData: UserDataExport,
    sha256Hash: string
  ): Promise<void> {
    try {
      await this.db.insert(schema.auditLog).values({
        tenantId,
        userId,
        action: 'GDPR_EXPORT',
        resourceType: 'USER',
        resourceId: userId,
        status: 'SUCCESS',
        metadata: {
          gdprArticle: '20',
          sha256: sha256Hash,
          exportedEntityCounts: {
            annotations: exportData.annotations.length,
            agentSessions: exportData.agentSessions.length,
            learningProgress: exportData.learningProgress.length,
            enrollments: exportData.enrollments.length,
          },
          piiTablesIncluded: exportData.piiManifest.length,
        },
      });
    } catch (auditError) {
      this.logger.error(
        { tenantId, userId, auditError },
        'Failed to write GDPR export audit log'
      );
    }
  }
}

/** Compute a deterministic SHA-256 hash of the export payload. */
export function computeExportHash(data: UserDataExport): string {
  const json = JSON.stringify(data);
  return createHash('sha256').update(json, 'utf-8').digest('hex');
}

export interface PiiTableEntry {
  name: string;
  schemaFile: string;
  piiColumns: string[];
  note?: string;
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
  piiManifest: PiiTableEntry[];
}
