import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  withTenantContext,
  closeAllPools,
  groupChallenges,
  challengeParticipants,
  eq,
  and,
  count,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext, NewGroupChallenge } from '@edusphere/db';
import { connect, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

const SUBJECT_SCORE_SUBMITTED = 'EDUSPHERE.challenge.score_submitted';
const DEFAULT_MAX_PARTICIPANTS = 50;

export interface CreateChallengeInput {
  title: string;
  description?: string;
  courseId?: string;
  challengeType: string;
  targetScore: number;
  startDate: string;
  endDate: string;
  maxParticipants?: number;
}

@Injectable()
export class GroupChallengeService implements OnModuleDestroy {
  private readonly logger = new Logger(GroupChallengeService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;

  constructor() {
    this.db = createDatabaseConnection();
    this.initNats().catch((err) =>
      this.logger.warn({ err }, 'GroupChallengeService: NATS unavailable')
    );
  }

  private async initNats(): Promise<void> {
    this.nats = await connect(buildNatsOptions());
    this.logger.log('GroupChallengeService: NATS connected');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.nats) {
      await this.nats.drain();
      this.nats = null;
    }
    await closeAllPools();
  }

  private ctx(
    tenantId: string,
    userId: string,
    role: TenantContext['userRole'] = 'STUDENT'
  ): TenantContext {
    return { tenantId, userId, userRole: role };
  }

  async createChallenge(
    tenantId: string,
    userId: string,
    role: TenantContext['userRole'],
    input: CreateChallengeInput
  ) {
    const values: NewGroupChallenge = {
      tenantId, createdBy: userId, title: input.title,
      description: input.description ?? null, courseId: input.courseId ?? null,
      challengeType: input.challengeType, targetScore: input.targetScore,
      startDate: new Date(input.startDate), endDate: new Date(input.endDate),
      maxParticipants: input.maxParticipants ?? DEFAULT_MAX_PARTICIPANTS, status: 'ACTIVE',
    };
    return withTenantContext(this.db, this.ctx(tenantId, userId, role), async (tx) => {
      const [row] = await tx.insert(groupChallenges).values(values).returning();
      return row;
    });
  }

  async joinChallenge(tenantId: string, userId: string, challengeId: string) {
    return withTenantContext(this.db, this.ctx(tenantId, userId), async (tx) => {
      const [challenge] = await tx
        .select({ maxParticipants: groupChallenges.maxParticipants })
        .from(groupChallenges)
        .where(eq(groupChallenges.id, challengeId))
        .limit(1);
      if (!challenge) throw new NotFoundException('Challenge not found');

      const [{ total }] = await tx
        .select({ total: count() })
        .from(challengeParticipants)
        .where(eq(challengeParticipants.challengeId, challengeId));

      if (Number(total) >= challenge.maxParticipants) {
        throw new BadRequestException('Challenge is full');
      }

      const existing = await tx
        .select({ id: challengeParticipants.id })
        .from(challengeParticipants)
        .where(
          and(
            eq(challengeParticipants.challengeId, challengeId),
            eq(challengeParticipants.userId, userId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new BadRequestException('Already joined this challenge');
      }

      const [participant] = await tx
        .insert(challengeParticipants)
        .values({ challengeId, userId, score: 0 })
        .returning();
      return participant;
    });
  }

  async getActiveChallenges(
    tenantId: string,
    userId: string,
    courseId?: string,
    first = 20,
    _after?: string
  ) {
    return withTenantContext(this.db, this.ctx(tenantId, userId), async (tx) => {
      const conditions = [eq(groupChallenges.status, 'ACTIVE')];
      if (courseId) conditions.push(eq(groupChallenges.courseId, courseId));

      const rows = await tx
        .select({
          challenge: groupChallenges,
          participantCount: sql<number>`(
            SELECT COUNT(*) FROM challenge_participants cp WHERE cp.challenge_id = ${groupChallenges.id}
          )`.as('participant_count'),
        })
        .from(groupChallenges)
        .where(and(...conditions))
        .limit(first);

      return rows.map(({ challenge, participantCount }) => ({
        ...challenge,
        participantCount: Number(participantCount),
      }));
    });
  }

  async getMyParticipations(tenantId: string, userId: string) {
    return withTenantContext(this.db, this.ctx(tenantId, userId), async (tx) =>
      tx
        .select()
        .from(challengeParticipants)
        .where(eq(challengeParticipants.userId, userId))
    );
  }

  async publishScoreEvent(
    tenantId: string,
    userId: string,
    challengeId: string,
    score: number
  ): Promise<void> {
    if (!this.nats) return;
    try {
      const payload = { tenantId, userId, challengeId, score, timestamp: new Date().toISOString() };
      this.nats.publish(SUBJECT_SCORE_SUBMITTED, new TextEncoder().encode(JSON.stringify(payload)));
    } catch (err) {
      this.logger.warn({ err }, 'GroupChallengeService: failed to publish score event');
    }
  }
}
