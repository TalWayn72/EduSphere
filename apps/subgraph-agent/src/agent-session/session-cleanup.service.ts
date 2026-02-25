import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createDatabaseConnection, closeAllPools, agentSessions } from '@edusphere/db';
import { lt } from 'drizzle-orm';
import { SESSION_CLEANUP_INTERVAL_MS, STALE_SESSION_AGE_MS } from '../constants';


@Injectable()
export class SessionCleanupService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SessionCleanupService.name);
  private readonly db = createDatabaseConnection();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  onModuleInit(): void {
    this.cleanupInterval = setInterval(() => {
      void this.cleanupStaleSessions();
    }, SESSION_CLEANUP_INTERVAL_MS);
    this.logger.log(
      'SessionCleanupService: stale session cleanup scheduled every 30 minutes',
    );
  }

  onModuleDestroy(): void {
    if (this.cleanupInterval !== null) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    void closeAllPools();
  }

  async cleanupStaleSessions(): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - STALE_SESSION_AGE_MS);
      this.logger.log(
        `SessionCleanupService: cleaning sessions older than ${cutoff.toISOString()}`,
      );

      const result = await this.db
        .delete(agentSessions)
        .where(lt(agentSessions.createdAt, cutoff))
        .returning({ id: agentSessions.id });

      this.logger.log(
        `SessionCleanupService: removed ${result.length} stale sessions`,
      );
    } catch (err: unknown) {
      this.logger.error(
        `SessionCleanupService: cleanup failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}
