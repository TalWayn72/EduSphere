/**
 * AtRiskThresholdsService — F-18: tenant-level at-risk thresholds.
 *
 * Stores thresholds in the tenant's JSONB `settings` column.
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
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface AtRiskThresholdsConfig {
  inactivityDays: number;
  minCompletionPct: number;
  minQuizScorePct: number;
}

const DEFAULT_THRESHOLDS: AtRiskThresholdsConfig = {
  inactivityDays: 14,
  minCompletionPct: 30,
  minQuizScorePct: 50,
};

@Injectable()
export class AtRiskThresholdsService implements OnModuleDestroy {
  private readonly logger = new Logger(AtRiskThresholdsService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getThresholds(
    tenantId: string,
    ctx: TenantContext
  ): Promise<AtRiskThresholdsConfig> {
    try {
      return await withTenantContext(this.db, ctx, async (tx) => {
        const [tenant] = await tx
          .select({ settings: schema.tenants.settings })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, tenantId))
          .limit(1);

        const settings = tenant?.settings as Record<string, unknown> | null;
        const stored = settings?.['atRiskThresholds'] as
          | AtRiskThresholdsConfig
          | undefined;

        return stored ?? DEFAULT_THRESHOLDS;
      });
    } catch (err) {
      this.logger.error(
        { err, tenantId },
        '[AtRiskThresholdsService] getThresholds failed'
      );
      return DEFAULT_THRESHOLDS;
    }
  }

  async saveThresholds(
    tenantId: string,
    thresholds: AtRiskThresholdsConfig,
    ctx: TenantContext
  ): Promise<AtRiskThresholdsConfig> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const [tenant] = await tx
        .select({ settings: schema.tenants.settings })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, tenantId))
        .limit(1);

      const currentSettings =
        (tenant?.settings as Record<string, unknown>) ?? {};
      const merged = {
        ...currentSettings,
        atRiskThresholds: thresholds,
      };

      await tx
        .update(schema.tenants)
        .set({ settings: merged })
        .where(eq(schema.tenants.id, tenantId));

      this.logger.log(
        { tenantId, thresholds },
        '[AtRiskThresholdsService] Thresholds saved'
      );

      return thresholds;
    });
  }
}
