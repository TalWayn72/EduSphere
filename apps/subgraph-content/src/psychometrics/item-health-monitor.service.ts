/**
 * ItemHealthMonitorService — scheduled item quality review
 *
 * Scans calibrated items for poor metrics. Flags items failing 2
 * consecutive checks; auto-retires items flagged 3+ consecutive times.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { ClassicalAnalysisService } from './classical-analysis.service.js';
import type { HealthCheckReport } from './psychometrics.types.js';

/** Thresholds for item health evaluation. */
const THRESHOLDS = {
  minP: 0.2,
  maxP: 0.9,
  minD: 0.2,
  minRpbis: 0.15,
  maxExposure: 500,
  flagCountToRetire: 3,
  flagCountToFlag: 2,
} as const;

function sysCtx(tenantId: string): TenantContext {
  return { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };
}

@Injectable()
export class ItemHealthMonitorService implements OnModuleDestroy {
  private readonly logger = new Logger(ItemHealthMonitorService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly classicalService: ClassicalAnalysisService) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[ItemHealthMonitorService] DB pools closed');
  }

  /**
   * Run a full health check on all CALIBRATED items for a tenant.
   */
  async runHealthCheck(tenantId: string): Promise<HealthCheckReport> {
    const ctx = sysCtx(tenantId);

    const items = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .select({
          id: schema.examItems.id,
          exposureCount: schema.examItems.exposureCount,
          difFlagged: schema.examItems.difFlagged,
          iwfFlags: schema.examItems.iwfFlags,
        })
        .from(schema.examItems)
        .where(
          and(
            eq(schema.examItems.tenantId, tenantId),
            eq(schema.examItems.calibrationStatus, 'CALIBRATED')
          )
        )
    );

    const flaggedItemIds: string[] = [];
    const retiredItemIds: string[] = [];

    for (const item of items) {
      const stats = await this.classicalService.analyzeItem(item.id, tenantId);
      if (stats.totalResponses === 0) continue;

      const poor =
        stats.pValue < THRESHOLDS.minP ||
        stats.pValue > THRESHOLDS.maxP ||
        stats.dIndex < THRESHOLDS.minD ||
        stats.rpbis < THRESHOLDS.minRpbis ||
        item.difFlagged ||
        item.exposureCount > THRESHOLDS.maxExposure;

      if (!poor) continue;

      const currentFlags = (item.iwfFlags as string[]) ?? [];
      const consecutiveFails = this.countConsecutiveFlags(currentFlags);

      if (consecutiveFails + 1 >= THRESHOLDS.flagCountToRetire) {
        await this.retireItem(item.id, ctx);
        retiredItemIds.push(item.id);
      } else {
        const downgrade = consecutiveFails + 1 >= THRESHOLDS.flagCountToFlag;
        await this.recordCheckFail(item.id, currentFlags, ctx, downgrade);
        flaggedItemIds.push(item.id);
      }
    }

    const report: HealthCheckReport = {
      tenantId,
      totalScanned: items.length,
      flaggedCount: flaggedItemIds.length,
      retiredCount: retiredItemIds.length,
      flaggedItemIds,
      retiredItemIds,
      checkedAt: new Date(),
    };

    this.logger.log(
      {
        tenantId,
        scanned: items.length,
        flagged: flaggedItemIds.length,
        retired: retiredItemIds.length,
      },
      '[ItemHealthMonitorService] Health check complete'
    );

    return report;
  }

  // ── Private helpers ────────────────────────────────────────────────────

  private countConsecutiveFlags(flags: string[]): number {
    let count = 0;
    for (let i = flags.length - 1; i >= 0; i--) {
      if (flags[i] === 'HEALTH_CHECK_FAIL') count++;
      else break;
    }
    return count;
  }

  private async retireItem(itemId: string, ctx: TenantContext): Promise<void> {
    await withTenantContext(this.db, ctx, (tx) =>
      tx
        .update(schema.examItems)
        .set({ calibrationStatus: 'RETIRED' })
        .where(eq(schema.examItems.id, itemId))
    );
    this.logger.warn(
      { itemId },
      '[ItemHealthMonitorService] Item auto-retired after 3+ failures'
    );
  }

  private async recordCheckFail(
    itemId: string,
    currentFlags: string[],
    ctx: TenantContext,
    downgrade = false
  ): Promise<void> {
    const updatedFlags = [...currentFlags, 'HEALTH_CHECK_FAIL'];
    const set: Record<string, unknown> = {
      iwfFlags: updatedFlags as unknown as Record<string, unknown>[],
    };
    if (downgrade) set.calibrationStatus = 'PILOT';

    await withTenantContext(this.db, ctx, (tx) =>
      tx
        .update(schema.examItems)
        .set(set)
        .where(eq(schema.examItems.id, itemId))
    );
  }
}
