/**
 * SkillGapResolver — handles skill gap analysis queries/mutations (F-006).
 * Kept separate from graph.resolver.ts to respect the 150-line guideline.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { SkillGapService } from './skill-gap.service';
import type { GraphQLContext } from '../auth/auth.middleware';

@Resolver()
export class SkillGapResolver {
  constructor(private readonly skillGapService: SkillGapService) {}

  private getAuthContext(context: GraphQLContext) {
    if (!context.authContext?.userId || !context.authContext?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      tenantId: context.authContext.tenantId,
      userId: context.authContext.userId,
      role: context.authContext.roles?.[0] ?? 'STUDENT',
    };
  }

  @Query('skillGapAnalysis')
  async skillGapAnalysis(
    @Args('roleId') roleId: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.skillGapService.analyzeSkillGap(userId, tenantId, role, roleId);
  }

  @Query('skillProfiles')
  async skillProfiles(@Context() context: GraphQLContext) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.skillGapService.listSkillProfiles(tenantId, userId, role);
  }

  @Mutation('createSkillProfile')
  async createSkillProfile(
    @Args('roleName') roleName: string,
    @Args('description') description: string | null,
    @Args('requiredConcepts') requiredConcepts: string[],
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.skillGapService.createSkillProfile(
      tenantId,
      userId,
      role,
      roleName,
      description ?? null,
      requiredConcepts
    );
  }
}
