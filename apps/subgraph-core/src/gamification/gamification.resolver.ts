import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { BadgeService } from './badge.service.js';
import { OpenBadgesService } from './open-badges.service.js';
import { StreakService } from './streak.service.js';
import { ChallengesService } from './challenges.service.js';
import { LeaderboardService } from './leaderboard.service.js';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver()
export class GamificationResolver {
  constructor(
    private readonly badgeService: BadgeService,
    private readonly openBadgesService: OpenBadgesService,
    private readonly streakService: StreakService,
    private readonly challengesService: ChallengesService,
    private readonly leaderboardService: LeaderboardService
  ) {}

  private requireAuth(ctx: GraphQLContext) {
    if (!ctx.authContext?.userId)
      throw new UnauthorizedException('Authentication required');
    return {
      userId: ctx.authContext.userId,
      tenantId: ctx.authContext.tenantId || '',
    };
  }

  @Query('myBadges')
  async getMyBadges(@Context() ctx: GraphQLContext) {
    const { userId, tenantId } = this.requireAuth(ctx);
    return this.badgeService.myBadges(userId, tenantId);
  }

  @Query('leaderboard')
  async getLeaderboard(
    @Args('limit') limit: number | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.requireAuth(ctx);
    return this.badgeService.leaderboard(tenantId, limit ?? 10);
  }

  @Query('myRank')
  async getMyRank(@Context() ctx: GraphQLContext) {
    const { userId, tenantId } = this.requireAuth(ctx);
    return this.badgeService.myRank(userId, tenantId);
  }

  @Query('myTotalPoints')
  async getMyTotalPoints(@Context() ctx: GraphQLContext) {
    const { userId, tenantId } = this.requireAuth(ctx);
    return this.badgeService.myTotalPoints(userId, tenantId);
  }

  @Query('adminBadges')
  async getAdminBadges(@Context() ctx: GraphQLContext) {
    const { tenantId } = this.requireAuth(ctx);
    return this.badgeService.adminBadges(tenantId);
  }

  @Mutation('createBadge')
  async createBadge(
    @Args('input') input: Parameters<BadgeService['createBadge']>[0],
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.requireAuth(ctx);
    return this.badgeService.createBadge(input, tenantId);
  }

  @Mutation('updateBadge')
  async updateBadge(
    @Args('id') id: string,
    @Args('input') input: Parameters<BadgeService['updateBadge']>[1],
    @Context() ctx: GraphQLContext
  ) {
    this.requireAuth(ctx);
    return this.badgeService.updateBadge(id, input);
  }

  @Mutation('deleteBadge')
  async deleteBadge(@Args('id') id: string, @Context() ctx: GraphQLContext) {
    this.requireAuth(ctx);
    return this.badgeService.deleteBadge(id);
  }

  // ── Open Badges 3.0 ───────────────────────────────────────────────────────

  @Query('myOpenBadges')
  async getMyOpenBadges(@Context() ctx: GraphQLContext) {
    const { userId, tenantId } = this.requireAuth(ctx);
    const rows = await this.openBadgesService.myOpenBadges(userId, tenantId);
    return rows.map(({ assertion, definition }) => ({
      ...assertion,
      issuedAt: assertion.issuedAt.toISOString(),
      expiresAt: assertion.expiresAt?.toISOString() ?? null,
      revokedAt: assertion.revokedAt?.toISOString() ?? null,
      definition: {
        ...definition,
        createdAt: definition.createdAt.toISOString(),
      },
      vcDocument: JSON.stringify({ ...assertion, proof: assertion.proof }),
    }));
  }

  @Query('verifyOpenBadge')
  async verifyOpenBadge(
    @Args('assertionId') assertionId: string,
    @Context() ctx: GraphQLContext
  ) {
    this.requireAuth(ctx);
    return this.openBadgesService.verifyOpenBadge(assertionId);
  }

  @Mutation('issueBadge')
  async issueBadge(
    @Args('badgeDefinitionId') badgeDefinitionId: string,
    @Args('recipientId') recipientId: string,
    @Args('evidenceUrl') evidenceUrl: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.requireAuth(ctx);
    const { assertion, definition } = await this.openBadgesService.issueBadge(
      badgeDefinitionId,
      recipientId,
      tenantId,
      evidenceUrl
    );
    return {
      ...assertion,
      issuedAt: assertion.issuedAt.toISOString(),
      expiresAt: assertion.expiresAt?.toISOString() ?? null,
      revokedAt: assertion.revokedAt?.toISOString() ?? null,
      definition: {
        ...definition,
        createdAt: definition.createdAt.toISOString(),
      },
      vcDocument: JSON.stringify({ ...assertion, proof: assertion.proof }),
    };
  }

  @Mutation('revokeOpenBadge')
  async revokeOpenBadge(
    @Args('assertionId') assertionId: string,
    @Args('reason') reason: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.requireAuth(ctx);
    return this.openBadgesService.revokeOpenBadge(
      assertionId,
      tenantId,
      reason
    );
  }

  // ── Streaks + Challenges + XP Leaderboard ────────────────────────────────

  @Query('myGamificationStats')
  async getMyGamificationStats(@Context() ctx: GraphQLContext) {
    const { userId, tenantId } = this.requireAuth(ctx);
    const [streak, challenges, leaderboard] = await Promise.all([
      this.streakService.getStreak(userId, tenantId),
      this.challengesService.getUserChallenges(userId, tenantId),
      this.leaderboardService.getLeaderboard(tenantId, 10),
    ]);
    return {
      currentStreak: streak.currentStreak,
      longestStreak: streak.longestStreak,
      activeChallenges: challenges.map((c) => ({
        challengeId: c.id,
        title: c.title,
        description: c.description,
        targetValue: c.targetValue,
        currentValue: c.currentValue,
        xpReward: c.xpReward,
        completed: c.completed,
        endDate: c.endDate,
      })),
      leaderboard,
    };
  }

  @Query('tenantLeaderboard')
  async getTenantLeaderboard(
    @Args('limit') limit: number | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.requireAuth(ctx);
    return this.leaderboardService.getLeaderboard(tenantId, limit ?? 10);
  }
}
