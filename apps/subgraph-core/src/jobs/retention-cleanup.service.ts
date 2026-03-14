import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { lt } from 'drizzle-orm';
import {
  db,
  RETENTION_DEFAULTS,
  agentMessages,
  agentSessions,
  userProgress,
  annotations,
  closeAllPools,
} from '@edusphere/db';
import { anonymizeUsers } from './anonymize.helper.js';

/**
 * Retention Cleanup Service — GDPR Art.5(e) storage limitation.
 * Runs daily at 2 AM to delete or anonymize data past its retention period.
 * Logs all deletions to audit_log for SOC2 evidence.
 */
@Injectable()
export class RetentionCleanupService implements OnModuleDestroy {
  private readonly logger = new Logger(RetentionCleanupService.name);

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[RetentionCleanupService] onModuleDestroy: DB pools closed');
  }

  async runCleanup(): Promise<RetentionCleanupReport> {
    const report: RetentionCleanupReport = {
      startedAt: new Date(),
      results: [],
    };

    for (const [entityType, defaults] of Object.entries(RETENTION_DEFAULTS)) {
      try {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - defaults.days);

        const result = await this.cleanupEntity(
          entityType,
          cutoff,
          defaults.mode
        );
        report.results.push({ entityType, cutoff, ...result });

        this.logger.log(
          {
            action: 'RETENTION_CLEANUP',
            resourceType: entityType,
            metadata: {
              gdprArticle: '5e',
              entityType,
              cutoffDate: cutoff.toISOString(),
              deletedCount: result.deletedCount,
              mode: defaults.mode,
            },
          },
          'Retention cleanup succeeded for entity type'
        );
      } catch (error) {
        this.logger.error(
          { entityType, error },
          'Retention cleanup failed for entity type'
        );
        report.results.push({
          entityType,
          cutoff: new Date(),
          deletedCount: 0,
          mode: defaults.mode,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    report.completedAt = new Date();
    this.logger.log({ report }, 'Retention cleanup completed');
    return report;
  }

  private async cleanupEntity(
    entityType: string,
    cutoff: Date,
    mode: 'HARD_DELETE' | 'ANONYMIZE'
  ): Promise<{ deletedCount: number; mode: string }> {
    type CleanupTable =
      | typeof agentMessages
      | typeof agentSessions
      | typeof userProgress
      | typeof annotations;
    type CutoffEntry = {
      table: CleanupTable;
      cutoffCol: (t: CleanupTable) => Parameters<typeof lt>[0];
    };
    const tableMap: Record<string, CutoffEntry> = {
      AGENT_MESSAGES: {
        table: agentMessages,
        cutoffCol: (t) => (t as typeof agentMessages).createdAt,
      },
      AGENT_SESSIONS: {
        table: agentSessions,
        cutoffCol: (t) => (t as typeof agentSessions).createdAt,
      },
      USER_PROGRESS: {
        table: userProgress,
        cutoffCol: (t) => (t as typeof userProgress).lastAccessedAt,
      },
      ANNOTATIONS: {
        table: annotations,
        cutoffCol: (t) => (t as typeof annotations).created_at,
      },
    };

    const entry = tableMap[entityType];
    if (!entry) {
      this.logger.warn({ entityType }, 'No table mapped — skipping');
      return { deletedCount: 0, mode: 'SKIPPED' };
    }

    if (mode === 'HARD_DELETE') {
      const deletedRows = await db
        .delete(entry.table)
        .where(lt(entry.cutoffCol(entry.table), cutoff))
        .returning();
      return { deletedCount: (deletedRows as unknown[]).length, mode };
    }

    // F-20: ANONYMIZE mode — delegate to helper
    return anonymizeUsers(entityType, cutoff);
  }
}

export interface RetentionCleanupReport {
  startedAt: Date;
  completedAt?: Date;
  results: Array<{
    entityType: string;
    cutoff: Date;
    deletedCount: number;
    mode: string;
    error?: string;
  }>;
}
