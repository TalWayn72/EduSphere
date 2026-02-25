import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { db, users, scimSyncLog } from '@edusphere/db';
import { count, gte, eq, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export interface AdminOverviewData {
  totalUsers: number;
  activeUsersThisMonth: number;
  totalCourses: number;
  completionsThisMonth: number;
  atRiskCount: number;
  lastScimSync: string | null;
  lastComplianceReport: string | null;
  storageUsedMb: number;
}

const SAFE_DEFAULTS: AdminOverviewData = {
  totalUsers: 0,
  activeUsersThisMonth: 0,
  totalCourses: 0,
  completionsThisMonth: 0,
  atRiskCount: 0,
  lastScimSync: null,
  lastComplianceReport: null,
  storageUsedMb: 0,
};

@Injectable()
export class AdminOverviewService implements OnModuleDestroy {
  private readonly logger = new Logger(AdminOverviewService.name);

  onModuleDestroy(): void {
    // No resources to clean up
  }

  async getOverview(tenantId: string): Promise<AdminOverviewData> {
    try {
      const [totalUsersResult, activeUsersResult, lastScimResult] = await Promise.all([
        db
          .select({ value: count() })
          .from(users)
          .where(eq(users.tenant_id, tenantId)),
        db
          .select({ value: count() })
          .from(users)
          .where(
            gte(users.updated_at, sql`NOW() - INTERVAL '30 days'`)
          ),
        db
          .select({ createdAt: scimSyncLog.createdAt })
          .from(scimSyncLog)
          .where(eq(scimSyncLog.tenantId, tenantId))
          .orderBy(desc(scimSyncLog.createdAt))
          .limit(1),
      ]);

      const totalUsers = totalUsersResult[0]?.value ?? 0;
      const activeUsersThisMonth = activeUsersResult[0]?.value ?? 0;
      const lastScimSyncRow = lastScimResult[0];
      const lastScimSync = lastScimSyncRow?.createdAt
        ? lastScimSyncRow.createdAt.toISOString()
        : null;

      return {
        totalUsers,
        activeUsersThisMonth,
        totalCourses: 0,
        completionsThisMonth: 0,
        atRiskCount: 0,
        lastScimSync,
        lastComplianceReport: null,
        storageUsedMb: 0,
      };
    } catch (err) {
      this.logger.error({ tenantId, err }, 'Failed to fetch admin overview');
      return { ...SAFE_DEFAULTS };
    }
  }
}
