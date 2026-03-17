/**
 * PlatformStatsService — cross-tenant platform-wide statistics.
 * Used by platformLiveStats query (F-06).
 *
 * CRITICAL: This is cross-tenant. Does NOT use withTenantContext.
 * Caller must be SUPER_ADMIN (enforced by @requiresRole directive + resolver guard).
 *
 * Memory safety: OnModuleDestroy closes all DB pools.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  count,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';

export interface PlatformStatsResult {
  totalTenants: number;
  totalLearners: number;
  totalCoursesCreated: number;
  avgEngagementScore: number;
}

@Injectable()
export class PlatformStatsService implements OnModuleDestroy {
  private readonly logger = new Logger(PlatformStatsService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /**
   * Aggregate platform-wide stats. No tenant context — SUPER_ADMIN only.
   */
  async getPlatformStats(): Promise<PlatformStatsResult> {
    try {
      const [tenantsResult, learnersResult, coursesResult] =
        await Promise.all([
          this.db.select({ value: count() }).from(schema.tenants),
          this.db
            .select({ value: count() })
            .from(schema.users)
            .where(eq(schema.users.role, 'STUDENT')),
          this.db.select({ value: count() }).from(schema.courses),
        ]);

      return {
        totalTenants: tenantsResult[0]?.value ?? 0,
        totalLearners: learnersResult[0]?.value ?? 0,
        totalCoursesCreated: coursesResult[0]?.value ?? 0,
        avgEngagementScore: 0, // Engagement scoring not yet wired
      };
    } catch (err) {
      this.logger.error(
        { err },
        '[PlatformStatsService] getPlatformStats failed'
      );
      return {
        totalTenants: 0,
        totalLearners: 0,
        totalCoursesCreated: 0,
        avgEngagementScore: 0,
      };
    }
  }
}
