/**
 * ExamResultQueryService — Read-only queries for exam results + analytics.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  NotFoundException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type { ExamResult } from '@edusphere/db';

@Injectable()
export class ExamResultQueryService implements OnModuleDestroy {
  private readonly logger = new Logger(ExamResultQueryService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('ExamResultQueryService destroyed');
  }

  async getResult(sessionId: string, ctx: TenantContext): Promise<ExamResult | null> {
    const rows = await withTenantContext(this.db, ctx, (tx) =>
      tx.select().from(schema.examResults)
        .where(eq(schema.examResults.sessionId, sessionId)).limit(1),
    );
    return rows[0] ?? null;
  }

  async getMyResults(ctx: TenantContext, courseId?: string): Promise<ExamResult[]> {
    return withTenantContext(this.db, ctx, (tx) => {
      const conditions = courseId
        ? and(
            eq(schema.examResults.userId, ctx.userId),
            eq(schema.examResults.blueprintId, courseId),
          )
        : eq(schema.examResults.userId, ctx.userId);
      return tx.select().from(schema.examResults).where(conditions);
    });
  }

  async getBlueprintAnalytics(blueprintId: string, ctx: TenantContext) {
    const results = await withTenantContext(this.db, ctx, (tx) =>
      tx.select().from(schema.examResults)
        .where(eq(schema.examResults.blueprintId, blueprintId)),
    );

    if (results.length === 0) {
      return {
        blueprintId,
        totalSessions: 0,
        passRate: 0,
        averageScore: 0,
        averageTime: 0,
        domainBreakdown: [],
      };
    }

    const passCount = results.filter((r) => r.passed).length;
    const avgScore = results.reduce((s, r) => s + (r.scaledScore ?? 0), 0) / results.length;

    // Aggregate domain scores across all results
    const domainMap = new Map<string, { correct: number; total: number }>();
    for (const r of results) {
      const ds = (r.domainScores as Array<{ domain: string; correct: number; total: number }>) ?? [];
      for (const d of ds) {
        const e = domainMap.get(d.domain) ?? { correct: 0, total: 0 };
        e.correct += d.correct;
        e.total += d.total;
        domainMap.set(d.domain, e);
      }
    }

    return {
      blueprintId,
      totalSessions: results.length,
      passRate: Math.round((passCount / results.length) * 100) / 100,
      averageScore: Math.round(avgScore),
      averageTime: 0, // Would need session data for accurate time
      domainBreakdown: [...domainMap.entries()].map(([domain, s]) => ({
        domain,
        correct: s.correct,
        total: s.total,
        scaledScore: Math.round(200 + 800 * (s.correct / (s.total || 1))),
      })),
    };
  }

  async getReliabilityReport(blueprintId: string, ctx: TenantContext) {
    const results = await withTenantContext(this.db, ctx, (tx) =>
      tx.select().from(schema.examResults)
        .where(eq(schema.examResults.blueprintId, blueprintId)),
    );

    const n = results.length;
    if (n < 2) {
      return { blueprintId, kr20: 0, cronbachAlpha: 0, sem: 0, totalSessions: n, averageScore: 0 };
    }

    const scores = results.map((r) => r.rawScore);
    const mean = scores.reduce((a, b) => a + b, 0) / n;
    const variance = scores.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);

    // Simplified KR-20 approximation from item analysis
    const items = results.flatMap((r) =>
      ((r.itemAnalysis as Array<{ correct: boolean }>) ?? []).map((i) => i.correct),
    );
    const k = items.length / n || 1; // items per exam
    const pSum = items.filter(Boolean).length / items.length;
    const pqSum = pSum * (1 - pSum) * k;
    const kr20 = variance > 0 ? (k / (k - 1)) * (1 - pqSum / variance) : 0;

    const sem = Math.sqrt(variance * (1 - Math.max(0, Math.min(1, kr20))));

    return {
      blueprintId,
      kr20: Math.round(kr20 * 1000) / 1000,
      cronbachAlpha: Math.round(kr20 * 1000) / 1000, // KR-20 is alpha for binary items
      sem: Math.round(sem * 1000) / 1000,
      totalSessions: n,
      averageScore: Math.round(mean * 1000) / 1000,
    };
  }
}
