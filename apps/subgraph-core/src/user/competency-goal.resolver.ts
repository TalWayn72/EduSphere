import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { CompetencyGoalService } from './competency-goal.service';
import type { AuthContext } from '@edusphere/auth';

interface GraphQLContext {
  req: unknown;
  authContext?: AuthContext;
}

@Resolver('CompetencyGoal')
export class CompetencyGoalResolver {
  constructor(private readonly competencyGoalService: CompetencyGoalService) {}

  private requireAuth(context: GraphQLContext) {
    if (!context.authContext?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      userId: context.authContext.userId,
      tenantId: context.authContext.tenantId || '',
    };
  }

  @Query('myCompetencyGoals')
  async getMyCompetencyGoals(@Context() context: GraphQLContext) {
    const { userId, tenantId } = this.requireAuth(context);
    return this.competencyGoalService.getMyGoals(userId, tenantId);
  }

  @Mutation('addCompetencyGoal')
  async addCompetencyGoal(
    @Args('targetConceptName') targetConceptName: string,
    @Args('targetLevel') targetLevel: string | undefined,
    @Context() context: GraphQLContext,
  ) {
    const { userId, tenantId } = this.requireAuth(context);
    return this.competencyGoalService.addGoal(
      userId,
      tenantId,
      targetConceptName,
      targetLevel,
    );
  }

  @Mutation('removeCompetencyGoal')
  async removeCompetencyGoal(
    @Args('goalId') goalId: string,
    @Context() context: GraphQLContext,
  ) {
    const { userId, tenantId } = this.requireAuth(context);
    return this.competencyGoalService.removeGoal(goalId, userId, tenantId);
  }
}
