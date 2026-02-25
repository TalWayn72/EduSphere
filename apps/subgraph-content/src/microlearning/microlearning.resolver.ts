import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import type { TenantContext } from '@edusphere/db';
import { MicrolearningService } from './microlearning.service';
import { ContentItemService } from '../content-item/content-item.service';
import type { GraphQLContext } from '../auth/auth.middleware';

@Resolver()
export class MicrolearningResolver {
  private readonly logger = new Logger(MicrolearningResolver.name);

  constructor(
    private readonly microlearningService: MicrolearningService,
    private readonly contentItemService: ContentItemService,
  ) {}

  @Query('dailyMicrolesson')
  async getDailyMicrolesson(@Context() ctx: GraphQLContext) {
    const tenantCtx = this.requireAuth(ctx);
    const itemId = await this.microlearningService.getDailyLesson(tenantCtx);
    if (!itemId) return null;
    this.logger.debug(`dailyMicrolesson: itemId=${itemId} userId=${tenantCtx.userId}`);
    return this.contentItemService.findById(itemId);
  }

  @Query('microlearningPaths')
  async getMicrolearningPaths(@Context() ctx: GraphQLContext) {
    return this.microlearningService.listPaths(this.requireAuth(ctx));
  }

  @Mutation('createMicrolearningPath')
  async createMicrolearningPath(
    @Args('title') title: string,
    @Args('contentItemIds') contentItemIds: string[],
    @Args('topicClusterId') topicClusterId: string | undefined,
    @Context() ctx: GraphQLContext,
  ) {
    const tenantCtx = this.requireAuth(ctx);
    this.logger.log(`createMicrolearningPath: title="${title}" userId=${tenantCtx.userId}`);
    return this.microlearningService.createPath(
      { title, contentItemIds, topicClusterId },
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
