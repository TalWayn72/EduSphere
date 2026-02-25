import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import type { TenantContext } from '@edusphere/db';
import { ScenarioService } from './scenario.service';
import type { GraphQLContext } from '../auth/auth.middleware';

@Resolver()
export class ScenarioResolver {
  private readonly logger = new Logger(ScenarioResolver.name);

  constructor(private readonly scenarioService: ScenarioService) {}

  @Query('scenarioNode')
  async getScenarioNode(
    @Args('contentItemId') contentItemId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const tenantCtx = this.requireAuth(ctx);
    this.logger.debug(`scenarioNode: id=${contentItemId} user=${tenantCtx.userId}`);
    return this.scenarioService.getScenarioNode(contentItemId, tenantCtx);
  }

  @Query('myScenarioProgress')
  async getMyScenarioProgress(
    @Args('scenarioRootId') scenarioRootId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const tenantCtx = this.requireAuth(ctx);
    return this.scenarioService.getScenarioProgress(scenarioRootId, tenantCtx);
  }

  @Mutation('recordScenarioChoice')
  async recordScenarioChoice(
    @Args('fromContentItemId') fromContentItemId: string,
    @Args('choiceId') choiceId: string,
    @Args('scenarioRootId') scenarioRootId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const tenantCtx = this.requireAuth(ctx);
    this.logger.log(
      `recordScenarioChoice: from=${fromContentItemId} choice=${choiceId} user=${tenantCtx.userId}`,
    );
    return this.scenarioService.recordChoice(
      fromContentItemId,
      choiceId,
      scenarioRootId,
      tenantCtx,
    );
  }

  private requireAuth(ctx: GraphQLContext): TenantContext {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: (auth.roles?.[0] ?? 'STUDENT') as TenantContext['userRole'],
    };
  }
}
