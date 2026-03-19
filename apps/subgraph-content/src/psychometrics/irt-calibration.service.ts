/**
 * IRTCalibrationService — Item Response Theory 3PL parameter estimation
 *
 * Implements EM-based calibration and MLE ability estimation.
 * Heavy math extracted to irt-math.ts for testability.
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
import type {
  IRTParameters,
  AbilityEstimate,
  ItemResponse,
} from './psychometrics.types.js';
import {
  clamp,
  runEM,
  estimateAbilityMLE,
  computeTestInformation,
} from './irt-math.js';

const MIN_RESPONSES = 200;

function sysCtx(tenantId: string): TenantContext {
  return { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };
}

@Injectable()
export class IRTCalibrationService implements OnModuleDestroy {
  private readonly logger = new Logger(IRTCalibrationService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[IRTCalibrationService] DB pools closed');
  }

  /** Calibrate a single item via EM algorithm. Requires N >= 200. */
  async calibrateItem(
    itemId: string,
    tenantId: string,
  ): Promise<IRTParameters | null> {
    const ctx = sysCtx(tenantId);
    const responses = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .select()
        .from(schema.itemResponseLog)
        .where(
          and(
            eq(schema.itemResponseLog.itemId, itemId),
            eq(schema.itemResponseLog.tenantId, tenantId),
          ),
        ),
    );

    if (responses.length < MIN_RESPONSES) {
      this.logger.warn(
        { itemId, count: responses.length, required: MIN_RESPONSES },
        '[IRTCalibrationService] Insufficient responses for calibration',
      );
      return null;
    }

    const userThetas = await this.estimateInitialAbilities(
      responses,
      tenantId,
    );
    const result = runEM(
      responses.map((r) => ({ userId: r.userId, isCorrect: r.isCorrect })),
      userThetas,
    );

    await withTenantContext(this.db, ctx, (tx) =>
      tx
        .update(schema.examItems)
        .set({
          irtA: result.a,
          irtB: result.b,
          irtC: result.c,
          calibrationStatus: 'CALIBRATED',
        })
        .where(eq(schema.examItems.id, itemId)),
    );

    this.logger.log(
      { itemId, ...result },
      '[IRTCalibrationService] Item calibrated',
    );
    return { itemId, ...result };
  }

  /** MLE ability estimation via Newton-Raphson. */
  estimateAbility(responses: ItemResponse[]): AbilityEstimate {
    return estimateAbilityMLE(responses);
  }

  /** Fisher information at a given theta for a set of items. */
  computeItemInformation(
    items: Array<{ a: number; b: number; c: number }>,
    theta: number,
  ): number {
    return computeTestInformation(items, theta);
  }

  // ── Private ────────────────────────────────────────────────────────────

  private async estimateInitialAbilities(
    responses: { userId: string; isCorrect: boolean }[],
    tenantId: string,
  ): Promise<Map<string, number>> {
    const ctx = sysCtx(tenantId);
    const userIds = [...new Set(responses.map((r) => r.userId))];
    const thetas = new Map<string, number>();

    for (const uid of userIds) {
      const all = await withTenantContext(this.db, ctx, (tx) =>
        tx
          .select({ isCorrect: schema.itemResponseLog.isCorrect })
          .from(schema.itemResponseLog)
          .where(
            and(
              eq(schema.itemResponseLog.userId, uid),
              eq(schema.itemResponseLog.tenantId, tenantId),
            ),
          ),
      );
      const p = all.filter((r) => r.isCorrect).length / (all.length || 1);
      const bounded = clamp(p, 0.01, 0.99);
      thetas.set(uid, Math.log(bounded / (1 - bounded)));
    }
    return thetas;
  }
}
