/**
 * TenantUsageService — aggregates usage metrics for a single tenant.
 * Used by the myTenantUsage query (F-05).
 *
 * SI-9: all tenant-scoped queries use withTenantContext().
 * Memory safety: OnModuleDestroy closes all DB pools.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  schema,
  eq,
  count,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface TenantUsageResult {
  activeUsers: number;
  storageUsedMb: number;
  apiCalls: number;
  coursesCreated: number;
  agentSessions: number;
}

@Injectable()
export class TenantUsageService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantUsageService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getTenantUsage(
    ctx: TenantContext,
    year?: number
  ): Promise<TenantUsageResult> {
    const targetYear = year ?? new Date().getFullYear();

    try {
      return await withTenantContext(this.db, ctx, async (tx) => {
        const [usersResult, coursesResult] = await Promise.all([
          tx
            .select({ value: count() })
            .from(schema.users)
            .where(eq(schema.users.tenant_id, ctx.tenantId)),
          tx
            .select({ value: count() })
            .from(schema.courses)
            .where(eq(schema.courses.tenant_id, ctx.tenantId)),
        ]);

        // agentSessions table has no tenantId column — count via
        // YAU events as a proxy for agent activity this year.
        const [yauResult] = await tx
          .select({ value: count() })
          .from(schema.yauEvents)
          .where(eq(schema.yauEvents.tenantId, ctx.tenantId));

        return {
          activeUsers: usersResult[0]?.value ?? 0,
          storageUsedMb: 0, // Storage metering not yet wired
          apiCalls: 0, // API call counter not yet wired
          coursesCreated: coursesResult[0]?.value ?? 0,
          agentSessions: yauResult?.value ?? 0,
        };
      });
    } catch (err) {
      this.logger.error(
        { err, tenantId: ctx.tenantId, year: targetYear },
        '[TenantUsageService] getTenantUsage failed'
      );
      return {
        activeUsers: 0,
        storageUsedMb: 0,
        apiCalls: 0,
        coursesCreated: 0,
        agentSessions: 0,
      };
    }
  }
}
