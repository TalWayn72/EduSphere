/**
 * TestReliabilityService — KR-20, Cronbach's Alpha, SEM
 *
 * Computes test-level reliability metrics from completed exam sessions.
 * Math functions extracted to reliability-math.ts.
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
import type { ExamReliabilityReport } from './psychometrics.types.js';
import {
  variance,
  computeKR20FromMatrix,
  computeAlphaFromMatrix,
  computeSEM,
} from './reliability-math.js';

function sysCtx(tenantId: string): TenantContext {
  return { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' };
}

@Injectable()
export class TestReliabilityService implements OnModuleDestroy {
  private readonly logger = new Logger(TestReliabilityService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[TestReliabilityService] DB pools closed');
  }

  /** KR-20 for a blueprint. */
  async computeKR20(blueprintId: string, tenantId: string): Promise<number> {
    const matrix = await this.buildResponseMatrix(blueprintId, tenantId);
    return computeKR20FromMatrix(matrix);
  }

  /** Cronbach's Alpha for a blueprint. */
  async computeCronbachAlpha(
    blueprintId: string,
    tenantId: string,
  ): Promise<number> {
    const matrix = await this.buildResponseMatrix(blueprintId, tenantId);
    return computeAlphaFromMatrix(matrix);
  }

  /** Full reliability report for a blueprint. */
  async getReliabilityReport(
    blueprintId: string,
    tenantId: string,
  ): Promise<ExamReliabilityReport> {
    const matrix = await this.buildResponseMatrix(blueprintId, tenantId);
    const totalSessions = matrix.length;

    if (totalSessions === 0) {
      return {
        blueprintId, kr20: 0, cronbachAlpha: 0,
        sem: 0, totalSessions: 0, averageScore: 0,
      };
    }

    const totalScores = matrix.map((row) => row.reduce((s, v) => s + v, 0));
    const averageScore = totalScores.reduce((s, v) => s + v, 0) / totalSessions;
    const sdTotal = Math.sqrt(variance(totalScores));
    const kr20 = computeKR20FromMatrix(matrix);
    const cronbachAlpha = computeAlphaFromMatrix(matrix);
    const sem = computeSEM(kr20, sdTotal);

    this.logger.log(
      { blueprintId, tenantId, kr20, cronbachAlpha, sem, totalSessions },
      '[TestReliabilityService] Reliability report generated',
    );

    return { blueprintId, kr20, cronbachAlpha, sem, totalSessions, averageScore };
  }

  /**
   * Build N x K binary response matrix (N examinees, K items).
   * Rows = examinees, columns = items (ordered by itemId).
   */
  private async buildResponseMatrix(
    blueprintId: string,
    tenantId: string,
  ): Promise<number[][]> {
    const ctx = sysCtx(tenantId);
    const sessions = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .select({ id: schema.examSessions.id })
        .from(schema.examSessions)
        .where(
          and(
            eq(schema.examSessions.blueprintId, blueprintId),
            eq(schema.examSessions.tenantId, tenantId),
            eq(schema.examSessions.status, 'GRADED'),
          ),
        ),
    );

    if (sessions.length === 0) return [];

    const allResponses: Array<{
      sessionId: string;
      itemId: string;
      isCorrect: boolean | null;
    }> = [];

    for (const session of sessions) {
      const resp = await withTenantContext(this.db, ctx, (tx) =>
        tx
          .select({
            sessionId: schema.examResponses.sessionId,
            itemId: schema.examResponses.itemId,
            isCorrect: schema.examResponses.isCorrect,
          })
          .from(schema.examResponses)
          .where(eq(schema.examResponses.sessionId, session.id)),
      );
      allResponses.push(...resp);
    }

    const itemIds = [...new Set(allResponses.map((r) => r.itemId))].sort();
    const itemIndex = new Map(itemIds.map((id, i) => [id, i]));

    const bySession = new Map<string, typeof allResponses>();
    for (const r of allResponses) {
      if (!bySession.has(r.sessionId)) bySession.set(r.sessionId, []);
      bySession.get(r.sessionId)!.push(r);
    }

    const matrix: number[][] = [];
    for (const [, responses] of bySession) {
      const row = new Array<number>(itemIds.length).fill(0);
      for (const r of responses) {
        const idx = itemIndex.get(r.itemId);
        if (idx !== undefined) row[idx] = r.isCorrect ? 1 : 0;
      }
      matrix.push(row);
    }
    return matrix;
  }
}
