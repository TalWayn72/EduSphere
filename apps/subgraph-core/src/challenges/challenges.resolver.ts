import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { GroupChallengeService } from './group-challenge.service';
import { GroupChallengeLeaderboardService } from './group-challenge-leaderboard.service';
import type { AuthContext } from '@edusphere/auth';

interface GqlContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver('GroupChallenge')
export class ChallengesResolver {
  constructor(
    private readonly challengeService: GroupChallengeService,
    private readonly leaderboardService: GroupChallengeLeaderboardService,
  ) {}

  private requireAuth(ctx: GqlContext) {
    if (!ctx.authContext?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      userId: ctx.authContext.userId,
      tenantId: ctx.authContext.tenantId || '',
      role: (ctx.authContext.roles?.[0] ?? 'STUDENT') as 'INSTRUCTOR' | 'ORG_ADMIN' | 'SUPER_ADMIN' | 'STUDENT' | 'RESEARCHER',
    };
  }

  @Query('activeChallenges')
  async activeChallenges(
    @Args('courseId') courseId: string | undefined,
    @Args('first') first: number | undefined,
    @Args('after') after: string | undefined,
    @Context() ctx: GqlContext,
  ) {
    const { tenantId, userId } = this.requireAuth(ctx);
    return this.challengeService.getActiveChallenges(tenantId, userId, courseId, first, after);
  }

  @Query('challengeLeaderboard')
  async challengeLeaderboard(
    @Args('challengeId') challengeId: string,
    @Context() ctx: GqlContext,
  ) {
    const { tenantId, userId } = this.requireAuth(ctx);
    return this.leaderboardService.getChallengeLeaderboard(tenantId, userId, challengeId);
  }

  @Query('myChallengePariticipations')
  async myChallengePariticipations(@Context() ctx: GqlContext) {
    const { tenantId, userId } = this.requireAuth(ctx);
    return this.challengeService.getMyParticipations(tenantId, userId);
  }

  @Mutation('createChallenge')
  async createChallenge(
    @Args('input') input: {
      title: string;
      description?: string;
      courseId?: string;
      challengeType: string;
      targetScore: number;
      startDate: string;
      endDate: string;
      maxParticipants?: number;
    },
    @Context() ctx: GqlContext,
  ) {
    const { tenantId, userId, role } = this.requireAuth(ctx);
    return this.challengeService.createChallenge(tenantId, userId, role, input);
  }

  @Mutation('joinChallenge')
  async joinChallenge(
    @Args('challengeId') challengeId: string,
    @Context() ctx: GqlContext,
  ) {
    const { tenantId, userId } = this.requireAuth(ctx);
    return this.challengeService.joinChallenge(tenantId, userId, challengeId);
  }

  @Mutation('submitChallengeScore')
  async submitChallengeScore(
    @Args('challengeId') challengeId: string,
    @Args('score') score: number,
    @Context() ctx: GqlContext,
  ) {
    const { tenantId, userId } = this.requireAuth(ctx);
    return this.leaderboardService.submitChallengeScore(tenantId, userId, challengeId, score);
  }
}
