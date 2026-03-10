import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  db,
  withTenantContext,
  groupChallenges,
  challengeParticipants,
  eq,
  and,
  desc,
  asc,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { GroupChallengeService } from './group-challenge.service';

@Injectable()
export class GroupChallengeLeaderboardService {
  private readonly logger = new Logger(GroupChallengeLeaderboardService.name);

  constructor(private readonly challengeService: GroupChallengeService) {}

  private ctx(
    tenantId: string,
    userId: string,
    role: TenantContext['userRole'] = 'STUDENT'
  ): TenantContext {
    return { tenantId, userId, userRole: role };
  }

  async getChallengeLeaderboard(
    tenantId: string,
    userId: string,
    challengeId: string
  ) {
    return withTenantContext(db, this.ctx(tenantId, userId), async (tx) => {
      const [challenge] = await tx
        .select({ id: groupChallenges.id })
        .from(groupChallenges)
        .where(eq(groupChallenges.id, challengeId))
        .limit(1);
      if (!challenge) throw new NotFoundException('Challenge not found');

      const participants = await tx
        .select()
        .from(challengeParticipants)
        .where(eq(challengeParticipants.challengeId, challengeId))
        .orderBy(desc(challengeParticipants.score), asc(challengeParticipants.joinedAt));

      return participants.map((p, idx) => ({ ...p, rank: idx + 1 }));
    });
  }

  async submitChallengeScore(
    tenantId: string,
    userId: string,
    challengeId: string,
    score: number
  ) {
    const result = await withTenantContext(
      db,
      this.ctx(tenantId, userId),
      async (tx) => {
        // IDOR guard: user must be a participant
        const [participant] = await tx
          .select()
          .from(challengeParticipants)
          .where(
            and(
              eq(challengeParticipants.challengeId, challengeId),
              eq(challengeParticipants.userId, userId)
            )
          )
          .limit(1);

        if (!participant) {
          throw new BadRequestException('You are not a participant in this challenge');
        }

        const [updated] = await tx
          .update(challengeParticipants)
          .set({ score, completedAt: new Date() })
          .where(eq(challengeParticipants.id, participant.id))
          .returning();

        // Recompute ranks for all participants in this challenge
        const allParticipants = await tx
          .select({ id: challengeParticipants.id })
          .from(challengeParticipants)
          .where(eq(challengeParticipants.challengeId, challengeId))
          .orderBy(desc(challengeParticipants.score));

        for (let i = 0; i < allParticipants.length; i++) {
          await tx
            .update(challengeParticipants)
            .set({ rank: i + 1 })
            .where(eq(challengeParticipants.id, allParticipants[i].id));
        }

        return updated;
      }
    );

    // Publish NATS event after successful score submission
    await this.challengeService.publishScoreEvent(tenantId, userId, challengeId, score);

    this.logger.log(
      { tenantId, userId, challengeId, score },
      'GroupChallengeLeaderboardService: score submitted'
    );

    return result;
  }
}
