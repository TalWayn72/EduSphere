/**
 * CohortInsightsResolver — thin resolver over CohortInsightsService (GAP-7)
 */
import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { CohortInsightsService } from './cohort-insights.service.js';
import type { CohortInsightsResult } from './cohort-insights.service.js';
import type { AuthContext } from '@edusphere/auth';

interface GqlCtx {
  req: unknown;
  authContext?: AuthContext;
}

function requireAuth(ctx: GqlCtx): {
  userId: string;
  tenantId: string;
} {
  const auth = ctx.authContext;
  if (!auth?.userId || !auth?.tenantId)
    throw new UnauthorizedException('Authentication required');
  return { userId: auth.userId, tenantId: auth.tenantId };
}

@Resolver()
export class CohortInsightsResolver {
  constructor(private readonly insightsService: CohortInsightsService) {}

  @Query('cohortInsights')
  async cohortInsights(
    @Args('conceptId') conceptId: string,
    @Args('courseId') courseId: string,
    @Args('limit') limit: number | undefined,
    @Context() ctx: GqlCtx,
  ): Promise<CohortInsightsResult> {
    const user = requireAuth(ctx);
    return this.insightsService.getCohortInsights(
      conceptId,
      courseId,
      user.tenantId,
      user.userId,
      limit ?? 5,
    );
  }
}
