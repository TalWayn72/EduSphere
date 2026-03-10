/**
 * ChavrutaPartnerMatchService — GAP-3: Chavruta debate partner matching.
 * Finds enrolled peers in the same course and creates partner sessions.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  db,
  withTenantContext,
  closeAllPools,
  chavrutaPartnerSessions,
  userCourses,
  eq,
  and,
  ne,
  sql,
} from '@edusphere/db';
import type { TenantContext, NewChavrutaPartnerSession } from '@edusphere/db';

export interface ChavrutaPartnerMatch {
  partnerId: string;
  partnerName: string;
  courseId: string;
  topic: string;
  matchReason: string;
  compatibilityScore: number;
}

export interface FindChavrutaPartnerInput {
  courseId: string;
  preferredTopic?: string;
}

@Injectable()
export class ChavrutaPartnerMatchService implements OnModuleDestroy {
  private readonly logger = new Logger(ChavrutaPartnerMatchService.name);

  onModuleDestroy(): void {
    closeAllPools().catch((err) =>
      this.logger.error(
        { err },
        '[ChavrutaPartnerMatchService] closeAllPools error'
      )
    );
  }

  private ctx(tenantId: string, userId: string): TenantContext {
    return { tenantId, userId, userRole: 'STUDENT' };
  }

  async findPartnerForDebate(
    userId: string,
    tenantId: string,
    input: FindChavrutaPartnerInput
  ): Promise<ChavrutaPartnerMatch[]> {
    const candidates = await withTenantContext(
      db,
      this.ctx(tenantId, userId),
      async (tx) => {
        const rows = await tx
          .select({ candidateId: userCourses.userId, courseId: userCourses.courseId })
          .from(userCourses)
          .where(
            and(
              eq(userCourses.courseId, input.courseId),
              ne(userCourses.userId, userId),
              sql`EXISTS (
                SELECT 1 FROM courses c
                WHERE c.id = ${userCourses.courseId}
                  AND c.tenant_id::text = ${tenantId}
              )`
            )
          )
          .limit(5);
        return rows;
      }
    );

    if (candidates.length === 0) {
      this.logger.warn(
        { userId, courseId: input.courseId, tenantId },
        '[ChavrutaPartnerMatchService] No debate candidates found'
      );
      return [];
    }

    const topic = input.preferredTopic ?? 'Key concepts from this course';
    return candidates.map((c, idx) => ({
      partnerId: c.candidateId,
      partnerName: `Learner ${idx + 1}`,
      courseId: c.courseId,
      topic,
      matchReason: 'Both enrolled in the same course with complementary perspectives',
      compatibilityScore: Math.min(1, 0.7 + idx * 0.05),
    }));
  }

  async createPartnerSession(
    initiatorId: string,
    tenantId: string,
    partnerId: string,
    courseId: string,
    topic: string
  ): Promise<{ id: string; initiatorId: string; partnerId: string; courseId: string; topic: string; status: string; initiatedAt: string }> {
    return withTenantContext(
      db,
      this.ctx(tenantId, initiatorId),
      async (tx) => {
        const values: NewChavrutaPartnerSession = {
          tenantId,
          initiatorId,
          partnerId,
          courseId: courseId || null,
          topic,
          matchReason: 'Manual topic selection',
          status: 'PENDING',
        };
        const rows = await tx
          .insert(chavrutaPartnerSessions)
          .values(values)
          .returning();
        const session = rows[0];
        if (!session) {
          throw new Error('[ChavrutaPartnerMatchService] Insert returned no rows');
        }
        this.logger.log(
          { sessionId: session.id, initiatorId, partnerId },
          '[ChavrutaPartnerMatchService] Partner session created'
        );
        return {
          id: session.id,
          initiatorId: session.initiatorId,
          partnerId: session.partnerId,
          courseId: session.courseId ?? courseId,
          topic: session.topic,
          status: session.status,
          initiatedAt: session.initiatedAt.toISOString(),
        };
      }
    );
  }

  async getMyPartnerSessions(
    userId: string,
    tenantId: string
  ): Promise<Array<{ id: string; initiatorId: string; partnerId: string; courseId: string; topic: string; status: string; initiatedAt: string }>> {
    return withTenantContext(
      db,
      this.ctx(tenantId, userId),
      async (tx) => {
        const rows = await tx
          .select()
          .from(chavrutaPartnerSessions)
          .where(eq(chavrutaPartnerSessions.tenantId, tenantId));
        return rows.map((r) => ({
          id: r.id,
          initiatorId: r.initiatorId,
          partnerId: r.partnerId,
          courseId: r.courseId ?? '',
          topic: r.topic,
          status: r.status,
          initiatedAt: r.initiatedAt.toISOString(),
        }));
      }
    );
  }
}
