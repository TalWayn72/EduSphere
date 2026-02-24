/**
 * AutoPathResolver — handles myLearningPath query (F-002).
 * Kept separate from graph.resolver.ts to respect the 150-line guideline.
 */
import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { AutoPathService } from './auto-path.service';
import type { GraphQLContext } from '../auth/auth.middleware';

@Resolver()
export class AutoPathResolver {
  constructor(private readonly autoPathService: AutoPathService) {}

  private getAuthContext(context: GraphQLContext) {
    if (
      !context.authContext ||
      !context.authContext.userId ||
      !context.authContext.tenantId
    ) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      tenantId: context.authContext.tenantId,
      userId: context.authContext.userId,
      role: context.authContext.roles[0] ?? 'STUDENT',
    };
  }

  @Query('myLearningPath')
  async myLearningPath(
    @Args('targetConceptName') targetConceptName: string,
    @Context() context: GraphQLContext,
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    return this.autoPathService.getMyLearningPath(
      targetConceptName,
      userId,
      tenantId,
      role,
    );
  }
}
