/**
 * OpenBadge GraphQL resolver — thin layer over OpenBadgeService (F-025)
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { OpenBadgeService } from './open-badge.service.js';
import type { BadgeAssertionResult, CreateBadgeDefinitionInput } from './open-badge.types.js';
import type { schema } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';

interface GqlCtx { req: unknown; authContext?: AuthContext }

function requireAuth(ctx: GqlCtx): { userId: string; tenantId: string; role: string } {
  const auth = ctx.authContext;
  if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException('Authentication required');
  return { userId: auth.userId, tenantId: auth.tenantId, role: auth.roles[0] ?? 'STUDENT' };
}

@Resolver()
export class OpenBadgeResolver {
  constructor(private readonly badgeService: OpenBadgeService) {}

  // ── Queries ───────────────────────────────────────────────────────────────

  @Query('myBadges')
  async myBadges(@Context() ctx: GqlCtx): Promise<BadgeAssertionResult[]> {
    const user = requireAuth(ctx);
    return this.badgeService.getUserBadges(user.userId, user.tenantId);
  }

  @Query('badgeDefinitions')
  async badgeDefinitions(
    @Context() ctx: GqlCtx,
  ): Promise<(typeof schema.openBadgeDefinitions.$inferSelect)[]> {
    const user = requireAuth(ctx);
    return this.badgeService.getBadgeDefinitions(user.tenantId);
  }

  @Query('verifyBadge')
  async verifyBadge(
    @Args('assertionId') assertionId: string,
  ): Promise<{ valid: boolean; error?: string; assertion?: BadgeAssertionResult }> {
    return this.badgeService.verifyCredential(assertionId);
  }

  // ── Mutations ─────────────────────────────────────────────────────────────

  @Mutation('createBadgeDefinition')
  async createBadgeDefinition(
    @Args('name') name: string,
    @Args('description') description: string,
    @Args('imageUrl') imageUrl: string | undefined,
    @Args('criteriaUrl') criteriaUrl: string | undefined,
    @Args('tags') tags: string[] | undefined,
    @Context() ctx: GqlCtx,
  ): Promise<typeof schema.openBadgeDefinitions.$inferSelect> {
    const user = requireAuth(ctx);
    const input: CreateBadgeDefinitionInput = { name, description, imageUrl, criteriaUrl, tags };
    return this.badgeService.createBadgeDefinition(input, user.tenantId);
  }

  @Mutation('issueBadge')
  async issueBadge(
    @Args('userId') userId: string,
    @Args('badgeDefinitionId') badgeDefinitionId: string,
    @Args('evidenceUrl') evidenceUrl: string | undefined,
    @Context() ctx: GqlCtx,
  ): Promise<BadgeAssertionResult> {
    const user = requireAuth(ctx);
    return this.badgeService.issueCredential({
      userId,
      badgeDefinitionId,
      tenantId: user.tenantId,
      evidenceUrl,
    });
  }

  @Mutation('revokeBadge')
  async revokeBadge(
    @Args('assertionId') assertionId: string,
    @Args('reason') reason: string,
    @Context() ctx: GqlCtx,
  ): Promise<boolean> {
    const user = requireAuth(ctx);
    await this.badgeService.revokeCredential(assertionId, reason, user.tenantId);
    return true;
  }
}
