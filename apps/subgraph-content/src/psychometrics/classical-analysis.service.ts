/**
 * ClassicalAnalysisService — Classical Test Theory (CTT) item analysis
 *
 * Computes p-value, discrimination index (D), point-biserial correlation
 * (r_pbis), and distractor effectiveness for exam items.
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
  ClassicalItemStats,
  DistractorReport,
  DistractorStat,
} from './psychometrics.types.js';
import {
  computeDIndex,
  computeRpbis,
  computeOptionRpbis,
} from './ctt-math.js';

function sysCtx(tenantId: string): TenantContext {
  return { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };
}

@Injectable()
export class ClassicalAnalysisService implements OnModuleDestroy {
  private readonly logger = new Logger(ClassicalAnalysisService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[ClassicalAnalysisService] DB pools closed');
  }

  /** Full CTT analysis for a single item: p-value, D-index, r_pbis. */
  async analyzeItem(
    itemId: string,
    tenantId: string,
  ): Promise<ClassicalItemStats> {
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

    const total = responses.length;
    if (total === 0) {
      return { itemId, pValue: 0, dIndex: 0, rpbis: 0, totalResponses: 0 };
    }

    const userScores = await this.computeUserTotalScores(responses, tenantId);
    const correct = responses.filter((r) => r.isCorrect).length;
    const pValue = correct / total;
    const dIndex = computeDIndex(responses, userScores);
    const rpbis = computeRpbis(responses, userScores, pValue);

    return { itemId, pValue, dIndex, rpbis, totalResponses: total };
  }

  /** Distractor analysis — selection rate + r_pbis per option. */
  async analyzeDistractors(
    itemId: string,
    tenantId: string,
  ): Promise<DistractorReport> {
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

    const total = responses.length;
    if (total === 0) return { itemId, distractors: [] };

    const userScores = await this.computeUserTotalScores(responses, tenantId);
    const optionMap = new Map<number, typeof responses>();
    for (const r of responses) {
      const idx = r.selectedOptionIndex ?? -1;
      if (!optionMap.has(idx)) optionMap.set(idx, []);
      optionMap.get(idx)!.push(r);
    }

    const distractors: DistractorStat[] = [];
    for (const [optionIndex, optResponses] of optionMap) {
      if (optionIndex < 0) continue;
      const selectionRate = optResponses.length / total;
      const rpbis = computeOptionRpbis(optResponses, responses, userScores);
      distractors.push({
        optionIndex,
        selectionRate,
        rpbis,
        functional: selectionRate >= 0.05,
      });
    }
    return { itemId, distractors };
  }

  /** Flag items with poor CTT metrics for a given course. */
  async flagPoorItems(courseId: string, tenantId: string): Promise<string[]> {
    const ctx = sysCtx(tenantId);
    const items = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .select({ id: schema.examItems.id })
        .from(schema.examItems)
        .where(
          and(
            eq(schema.examItems.courseId, courseId),
            eq(schema.examItems.tenantId, tenantId),
          ),
        ),
    );

    const flagged: string[] = [];
    for (const item of items) {
      const stats = await this.analyzeItem(item.id, tenantId);
      if (
        stats.pValue < 0.20 || stats.pValue > 0.90 ||
        stats.dIndex < 0.20 || stats.rpbis < 0.15
      ) {
        flagged.push(item.id);
      }
    }
    this.logger.log(
      { courseId, tenantId, flaggedCount: flagged.length },
      '[ClassicalAnalysisService] flagPoorItems complete',
    );
    return flagged;
  }

  /** Compute total exam score for each unique user in the response set. */
  async computeUserTotalScores(
    responses: { userId: string; isCorrect: boolean }[],
    tenantId: string,
  ): Promise<Map<string, number>> {
    const userIds = [...new Set(responses.map((r) => r.userId))];
    const scores = new Map<string, number>();
    const ctx = sysCtx(tenantId);

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
      scores.set(uid, all.filter((r) => r.isCorrect).length);
    }
    return scores;
  }
}
