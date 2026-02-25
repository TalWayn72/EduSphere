/**
 * at-risk.resolver.ts - GraphQL resolver for at-risk learner queries.
 * F-003 Performance Risk Detection
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { AtRiskService } from './at-risk.service.js';
import type { TenantContext } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';

interface GqlContext {
  authContext?: AuthContext;
}

const INSTRUCTOR_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

function requireInstructor(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth?.tenantId || !auth?.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  const role = auth.roles[0] ?? 'STUDENT';
  if (!INSTRUCTOR_ROLES.has(role)) {
    throw new UnauthorizedException('Instructor or Admin role required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: role as TenantContext['userRole'],
  };
}

@Resolver()
export class AtRiskResolver {
  constructor(private readonly atRiskService: AtRiskService) {}

  @Query('atRiskLearners')
  async getAtRiskLearners(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext,
  ) {
    const tenantCtx = requireInstructor(ctx);
    return this.atRiskService.getAtRiskLearners(courseId, tenantCtx);
  }

  @Mutation('resolveAtRiskFlag')
  async resolveAtRiskFlag(
    @Args('flagId') flagId: string,
    @Context() ctx: GqlContext,
  ) {
    const tenantCtx = requireInstructor(ctx);
    return this.atRiskService.dismissFlag(flagId, tenantCtx);
  }
}
