import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { GroupChallengeService } from './group-challenge.service';
import { GroupChallengeLeaderboardService } from './group-challenge-leaderboard.service';
import type { AuthContext } from '@edusphere/auth';

interface GqlContext {
  req: unknown;
  authContext?: AuthContext;
}

/** Safely convert a Date or string to ISO string for GraphQL String! fields. */
function toISOString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value ?? '');
}

/** Serialize Drizzle challenge row (Date→String) for GroupChallenge GraphQL type. */
function serializeChallenge(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    startDate: toISOString(row.startDate),
    endDate: toISOString(row.endDate),
    createdBy: String(row.createdBy ?? ''),
  };
}

/** Serialize Drizzle participant row (Date→String) for ChallengeParticipant GraphQL type. */
function serializeParticipant(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    joinedAt: toISOString(row.joinedAt),
    completedAt: row.completedAt ? toISOString(row.completedAt) : null,
  };
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
    const challenges = await this.challengeService.getActiveChallenges(tenantId, userId, courseId, first, after);

    // Wrap flat array into Relay-style GroupChallengeConnection
    const nodes = challenges.map((c: Record<string, unknown>) => serializeChallenge(c));

    const edges = nodes.map((node: Record<string, unknown>) => ({
      node,
      cursor: Buffer.from(String(node.id)).toString('base64'),
    }));

    return {
      edges,
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: !!after,
        startCursor: edges.length > 0 ? edges[0].cursor : null,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
      totalCount: edges.length,
    };
  }

  @Query('challengeLeaderboard')
  async challengeLeaderboard(
    @Args('challengeId') challengeId: string,
    @Context() ctx: GqlContext,
  ) {
    const { tenantId, userId } = this.requireAuth(ctx);
    const rows = await this.leaderboardService.getChallengeLeaderboard(tenantId, userId, challengeId);
    return (rows as Record<string, unknown>[]).map(serializeParticipant);
  }

  @Query('myChallengePariticipations')
  async myChallengePariticipations(@Context() ctx: GqlContext) {
    const { tenantId, userId } = this.requireAuth(ctx);
    const rows = await this.challengeService.getMyParticipations(tenantId, userId);
    return (rows as Record<string, unknown>[]).map(serializeParticipant);
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
    const row = await this.challengeService.createChallenge(tenantId, userId, role, input);
    return serializeChallenge(row as unknown as Record<string, unknown>);
  }

  @Mutation('joinChallenge')
  async joinChallenge(
    @Args('challengeId') challengeId: string,
    @Context() ctx: GqlContext,
  ) {
    const { tenantId, userId } = this.requireAuth(ctx);
    const row = await this.challengeService.joinChallenge(tenantId, userId, challengeId);
    return serializeParticipant(row as unknown as Record<string, unknown>);
  }

  @Mutation('submitChallengeScore')
  async submitChallengeScore(
    @Args('challengeId') challengeId: string,
    @Args('score') score: number,
    @Context() ctx: GqlContext,
  ) {
    const { tenantId, userId } = this.requireAuth(ctx);
    const row = await this.leaderboardService.submitChallengeScore(tenantId, userId, challengeId, score);
    return serializeParticipant(row as unknown as Record<string, unknown>);
  }
}
