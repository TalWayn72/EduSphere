/**
 * ExamGradingPersistence — DB operations for exam grading.
 * Separated from ExamGradingService to keep file sizes under 150 lines.
 */
import {
  schema,
  eq,
  and,
  inArray,
  sql,
  withTenantContext,
} from '@edusphere/db';
import type { DrizzleDB, TenantContext } from '@edusphere/db';
import type {
  ExamResult,
  ExamItem,
  ExamResponse,
  ExamSession,
  ExamBlueprint,
  NewExamResult,
} from '@edusphere/db';

interface GradedItem {
  itemId: string;
  correct: boolean;
  timeSpentMs: number | null;
}

export class ExamGradingPersistence {
  constructor(private readonly db: DrizzleDB) {}

  async loadSession(id: string, ctx: TenantContext): Promise<ExamSession> {
    const rows = await withTenantContext(this.db, ctx, (tx) =>
      tx.select().from(schema.examSessions)
        .where(eq(schema.examSessions.id, id)).limit(1),
    );
    if (!rows[0]) throw new Error(`Session ${id} not found`);
    return rows[0];
  }

  async loadResponses(sessionId: string, ctx: TenantContext): Promise<ExamResponse[]> {
    return withTenantContext(this.db, ctx, (tx) =>
      tx.select().from(schema.examResponses)
        .where(eq(schema.examResponses.sessionId, sessionId)),
    );
  }

  async loadItems(ids: string[], ctx: TenantContext): Promise<ExamItem[]> {
    if (ids.length === 0) return [];
    return withTenantContext(this.db, ctx, (tx) =>
      tx.select().from(schema.examItems)
        .where(inArray(schema.examItems.id, ids)),
    );
  }

  async loadBlueprint(id: string, ctx: TenantContext): Promise<ExamBlueprint> {
    const rows = await withTenantContext(this.db, ctx, (tx) =>
      tx.select().from(schema.examBlueprints)
        .where(eq(schema.examBlueprints.id, id)).limit(1),
    );
    if (!rows[0]) throw new Error(`Blueprint ${id} not found`);
    return rows[0];
  }

  async insertResult(ctx: TenantContext, data: NewExamResult): Promise<ExamResult> {
    const [result] = await withTenantContext(this.db, ctx, (tx) =>
      tx.insert(schema.examResults).values(data).returning(),
    );
    return result!;
  }

  async writeResponseLog(
    graded: GradedItem[], tenantId: string, userId: string, ctx: TenantContext,
  ): Promise<void> {
    if (graded.length === 0) return;
    const entries = graded.map((g) => ({
      tenantId,
      itemId: g.itemId,
      userId,
      isCorrect: g.correct,
      responseTimeMs: g.timeSpentMs,
    }));
    await withTenantContext(this.db, ctx, (tx) =>
      tx.insert(schema.itemResponseLog).values(entries),
    );
  }

  async updateExposureCounts(itemIds: string[], ctx: TenantContext): Promise<void> {
    if (itemIds.length === 0) return;
    await withTenantContext(this.db, ctx, (tx) =>
      tx.update(schema.examItems)
        .set({ exposureCount: sql`${schema.examItems.exposureCount} + 1` })
        .where(inArray(schema.examItems.id, itemIds)),
    );
  }

  async markResponseCorrectness(
    sessionId: string, graded: GradedItem[], ctx: TenantContext,
  ): Promise<void> {
    for (const g of graded) {
      await withTenantContext(this.db, ctx, (tx) =>
        tx.update(schema.examResponses)
          .set({ isCorrect: g.correct })
          .where(and(
            eq(schema.examResponses.sessionId, sessionId),
            eq(schema.examResponses.itemId, g.itemId),
          )),
      );
    }
  }
}
