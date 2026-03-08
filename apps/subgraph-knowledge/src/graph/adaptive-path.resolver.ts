/**
 * AdaptivePathResolver — exposes the adaptiveLearningPath query.
 * Thin resolver: auth extraction + delegation to AdaptivePathService.
 */
import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { AdaptivePathService } from './adaptive-path.service';
import type { GraphQLContext } from '../auth/auth.middleware';

@Resolver()
export class AdaptivePathResolver {
  constructor(private readonly adaptivePathService: AdaptivePathService) {}

  private getAuthContext(context: GraphQLContext) {
    if (!context.authContext?.userId || !context.authContext?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      tenantId: context.authContext.tenantId,
      userId: context.authContext.userId,
    };
  }

  @Query('adaptiveLearningPath')
  async adaptiveLearningPath(
    @Args('courseId') courseId: string,
    @Args('timeBudgetMinutes') timeBudgetMinutes: number,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId } = this.getAuthContext(context);
    return this.adaptivePathService.getAdaptivePath(
      userId,
      tenantId,
      courseId,
      timeBudgetMinutes
    );
  }
}
