import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  db,
  withTenantContext,
  closeAllPools,
  executeCypher,
  peerMatchRequests,
  eq,
  and,
  sql,
} from '@edusphere/db';
import type { TenantContext, NewPeerMatchRequest } from '@edusphere/db';
import { graphConfig } from '@edusphere/config';

const GRAPH_NAME = graphConfig.graphName;

export interface PeerMatchDto {
  userId: string;
  matchReason: string;
  complementarySkills: string[];
  sharedCourseCount: number;
}

@Injectable()
export class PeerMatchingService implements OnModuleDestroy {
  private readonly logger = new Logger(PeerMatchingService.name);

  onModuleDestroy(): void {
    closeAllPools().catch((err) =>
      this.logger.error({ err }, 'PeerMatchingService: closeAllPools error')
    );
  }

  private ctx(tenantId: string, userId: string): TenantContext {
    return { tenantId, userId, userRole: 'STUDENT' };
  }

  async findPeerMatches(
    tenantId: string,
    userId: string,
    courseId?: string
  ): Promise<PeerMatchDto[]> {
    try {
      const cypherQuery = `
        MATCH (me:Person {userId: $userId})-[:HAS_SKILL]->(mySkill:Skill)
        WHERE mySkill.masteryLevel < 0.5
        MATCH (peer:Person)-[:HAS_SKILL]->(peerSkill:Skill)
        WHERE peer.tenantId = $tenantId
          AND peer.userId <> $userId
          AND peerSkill.name = mySkill.name
          AND peerSkill.masteryLevel > 0.7
        RETURN peer.userId AS userId, collect(peerSkill.name) AS skills, count(*) AS matchCount
        ORDER BY matchCount DESC
        LIMIT 5
      `;
      const rows = await executeCypher<{
        userId: string;
        skills: string[];
        matchCount: number;
      }>(db, GRAPH_NAME, cypherQuery, { userId, tenantId }, tenantId);

      if (rows.length > 0) {
        return rows.map((r) => ({
          userId: r.userId,
          matchReason: 'Complementary skill strengths via knowledge graph',
          complementarySkills: r.skills ?? [],
          sharedCourseCount: 0,
        }));
      }
    } catch (err) {
      this.logger.warn(
        { err, userId, tenantId },
        'PeerMatchingService: AGE query failed, falling back to DB query'
      );
    }

    // Fallback: top 5 users enrolled in same course
    return withTenantContext(db, this.ctx(tenantId, userId), async (tx) => {
      const query = courseId
        ? sql`SELECT e.user_id AS "userId", COUNT(*) AS "sharedCourseCount"
              FROM enrollments e
              WHERE e.tenant_id = ${tenantId}::uuid
                AND e.user_id <> ${userId}::uuid
                AND e.course_id = ${courseId}::uuid
              GROUP BY e.user_id ORDER BY 2 DESC LIMIT 5`
        : sql`SELECT e.user_id AS "userId", COUNT(*) AS "sharedCourseCount"
              FROM enrollments e
              WHERE e.tenant_id = ${tenantId}::uuid AND e.user_id <> ${userId}::uuid
              GROUP BY e.user_id ORDER BY 2 DESC LIMIT 5`;
      const result = await tx.execute(query);
      return (result.rows as Array<{ userId: string; sharedCourseCount: number }>).map((r) => ({
        userId: r.userId,
        matchReason: 'Enrolled in same course(s)',
        complementarySkills: [],
        sharedCourseCount: Number(r.sharedCourseCount),
      }));
    });
  }

  async requestPeerMatch(
    tenantId: string,
    requesterId: string,
    matchedUserId: string,
    courseId?: string
  ) {
    if (requesterId === matchedUserId) {
      throw new BadRequestException('Cannot match with yourself');
    }
    const values: NewPeerMatchRequest = {
      tenantId,
      requesterId,
      matchedUserId,
      courseId: courseId ?? null,
      matchReason: 'User-initiated peer match request',
      status: 'PENDING',
    };
    return withTenantContext(db, this.ctx(tenantId, requesterId), async (tx) => {
      const [row] = await tx.insert(peerMatchRequests).values(values).returning();
      return row;
    });
  }

  async respondToPeerMatch(
    tenantId: string,
    userId: string,
    requestId: string,
    accept: boolean
  ) {
    return withTenantContext(db, this.ctx(tenantId, userId), async (tx) => {
      const [request] = await tx
        .select()
        .from(peerMatchRequests)
        .where(eq(peerMatchRequests.id, requestId))
        .limit(1);

      if (!request) throw new NotFoundException('Peer match request not found');
      // IDOR guard: only the matched user can respond
      if (request.matchedUserId !== userId) {
        throw new BadRequestException('Only the matched user can respond to this request');
      }

      const [updated] = await tx
        .update(peerMatchRequests)
        .set({ status: accept ? 'ACCEPTED' : 'DECLINED' })
        .where(eq(peerMatchRequests.id, requestId))
        .returning();
      return updated;
    });
  }

  async getMyPeerMatchRequests(tenantId: string, userId: string) {
    return withTenantContext(db, this.ctx(tenantId, userId), async (tx) =>
      tx
        .select()
        .from(peerMatchRequests)
        .where(
          and(
            eq(peerMatchRequests.tenantId, tenantId),
            eq(peerMatchRequests.requesterId, userId)
          )
        )
    );
  }
}
