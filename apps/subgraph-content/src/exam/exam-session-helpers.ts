/**
 * ExamSessionHelpers — Shared DB lookups + assertions for exam delivery.
 */
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  schema,
  eq,
  and,
  count,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext, DrizzleDB } from '@edusphere/db';
import type { ExamSession, ExamBlueprint } from '@edusphere/db';

export class ExamSessionHelpers {
  constructor(private readonly db: DrizzleDB) {}

  async loadBlueprint(id: string, ctx: TenantContext): Promise<ExamBlueprint> {
    const rows = await withTenantContext(this.db, ctx, (tx) =>
      tx.select().from(schema.examBlueprints)
        .where(eq(schema.examBlueprints.id, id)).limit(1),
    );
    if (!rows[0]) throw new NotFoundException(`Blueprint ${id} not found`);
    return rows[0];
  }

  async loadSession(id: string, ctx: TenantContext): Promise<ExamSession> {
    const rows = await withTenantContext(this.db, ctx, (tx) =>
      tx.select().from(schema.examSessions)
        .where(eq(schema.examSessions.id, id)).limit(1),
    );
    if (!rows[0]) throw new NotFoundException(`Session ${id} not found`);
    return rows[0];
  }

  async getAttemptCount(
    blueprintId: string, userId: string, ctx: TenantContext,
  ): Promise<number> {
    const rows = await withTenantContext(this.db, ctx, (tx) =>
      tx.select({ total: count() }).from(schema.examSessions).where(
        and(
          eq(schema.examSessions.blueprintId, blueprintId),
          eq(schema.examSessions.userId, userId),
        ),
      ),
    );
    return rows[0]?.total ?? 0;
  }

  async checkRetakeEligibility(
    blueprintId: string, userId: string,
    ctx: TenantContext, bp: ExamBlueprint,
  ): Promise<void> {
    const attempts = await this.getAttemptCount(blueprintId, userId, ctx);
    if (attempts >= bp.maxRetakes) {
      throw new BadRequestException(`Maximum retakes (${bp.maxRetakes}) exhausted`);
    }
    if (attempts === 0) return;

    const sessions = await withTenantContext(this.db, ctx, (tx) =>
      tx.select().from(schema.examSessions).where(
        and(
          eq(schema.examSessions.blueprintId, blueprintId),
          eq(schema.examSessions.userId, userId),
        ),
      ).orderBy(schema.examSessions.createdAt),
    );
    const last = sessions[sessions.length - 1];
    if (!last?.submittedAt) return;

    const cooldownMs = bp.retakeCooldownHours * 3_600_000;
    const elapsed = Date.now() - last.submittedAt.getTime();
    if (elapsed < cooldownMs) {
      const hoursLeft = Math.ceil((cooldownMs - elapsed) / 3_600_000);
      throw new BadRequestException(`Retake cooldown: ${hoursLeft}h remaining`);
    }
  }

  assertActive(session: ExamSession, userId: string): void {
    if (session.status !== 'IN_PROGRESS') {
      throw new BadRequestException(`Session is ${session.status}, not IN_PROGRESS`);
    }
    if (session.userId !== userId) {
      throw new ForbiddenException('Session belongs to another user');
    }
  }

  assertItemInOrder(session: ExamSession, itemId: string): void {
    const order = session.questionOrder as string[] | null;
    if (!order?.includes(itemId)) {
      throw new BadRequestException(`Item ${itemId} not in question order`);
    }
  }

  /**
   * Server-authoritative time remaining.
   * Uses blueprint time limit (via loadBlueprint) for true remaining.
   * Fallback: snapshot in session for non-blueprint-aware callers.
   */
  computeRemainingFromBlueprint(session: ExamSession, timeLimitMinutes: number): number {
    if (!session.startedAt) return 0;
    const totalSec = timeLimitMinutes * 60;
    const elapsedSec = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);
    return Math.max(0, totalSec - elapsedSec);
  }

  /** Quick remaining estimate using session snapshot (for answer submission). */
  computeRemainingSnapshot(session: ExamSession): number {
    if (!session.startedAt || session.timeRemainingSeconds == null) return 0;
    return session.timeRemainingSeconds;
  }

  async upsertResponse(
    tx: DrizzleDB, sessionId: string, itemId: string,
    data: { answerData?: unknown; answeredAt?: Date },
  ): Promise<void> {
    const existing = await tx.select().from(schema.examResponses)
      .where(and(
        eq(schema.examResponses.sessionId, sessionId),
        eq(schema.examResponses.itemId, itemId),
      )).limit(1);

    if (existing.length > 0) {
      await tx.update(schema.examResponses).set(data)
        .where(eq(schema.examResponses.id, existing[0]!.id));
    } else {
      await tx.insert(schema.examResponses).values({ sessionId, itemId, ...data });
    }
  }

  async toggleFlag(tx: DrizzleDB, sessionId: string, itemId: string): Promise<void> {
    const rows = await tx.select().from(schema.examResponses)
      .where(and(
        eq(schema.examResponses.sessionId, sessionId),
        eq(schema.examResponses.itemId, itemId),
      )).limit(1);

    if (rows.length > 0) {
      await tx.update(schema.examResponses)
        .set({ isFlagged: !rows[0]!.isFlagged })
        .where(eq(schema.examResponses.id, rows[0]!.id));
    } else {
      await tx.insert(schema.examResponses).values({
        sessionId, itemId, isFlagged: true,
      });
    }
  }
}
