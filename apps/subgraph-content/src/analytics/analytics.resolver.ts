import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import type { TenantContext } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';

interface GqlContext {
  authContext?: AuthContext;
}

const ALLOWED_ROLES = new Set(['INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN']);

function requireInstructor(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth || !auth.tenantId || !auth.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  const role = auth.roles[0] ?? 'STUDENT';
  if (!ALLOWED_ROLES.has(role)) {
    throw new UnauthorizedException('Instructor, OrgAdmin, or SuperAdmin role required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: role as TenantContext['userRole'],
  };
}

@Resolver()
export class AnalyticsResolver {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Query('courseAnalytics')
  async getCourseAnalytics(
    @Args('courseId') courseId: string,
    @Context() ctx: GqlContext,
  ) {
    const tenantCtx = requireInstructor(ctx);
    return this.analyticsService.getCourseAnalytics(courseId, tenantCtx);
  }
}
