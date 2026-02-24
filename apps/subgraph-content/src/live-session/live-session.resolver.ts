import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
} from '@nestjs/graphql';
import { LiveSessionService } from './live-session.service';

interface GraphQLContext {
  req: {
    user?: {
      sub?: string;
      name?: string;
      preferred_username?: string;
      role?: string;
      tenant_id?: string;
    };
  };
}

@Resolver('LiveSession')
export class LiveSessionResolver {
  constructor(private readonly liveSessionService: LiveSessionService) {}

  @Query('liveSession')
  async getLiveSession(
    @Args('contentItemId') contentItemId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const tenantId = ctx.req.user?.tenant_id ?? '';
    return this.liveSessionService.getByContentItem(contentItemId, tenantId);
  }

  @Mutation('createLiveSession')
  async createLiveSession(
    @Args('contentItemId') contentItemId: string,
    @Args('scheduledAt') scheduledAt: string,
    @Args('meetingName') meetingName: string,
    @Context() ctx: GraphQLContext,
  ) {
    const tenantId = ctx.req.user?.tenant_id ?? '';
    return this.liveSessionService.createLiveSession(
      contentItemId,
      tenantId,
      new Date(scheduledAt),
      meetingName,
    );
  }

  @Mutation('joinLiveSession')
  async joinLiveSession(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext,
  ): Promise<string> {
    const tenantId = ctx.req.user?.tenant_id ?? '';
    const userName =
      ctx.req.user?.name ??
      ctx.req.user?.preferred_username ??
      'Learner';
    const userRole = ctx.req.user?.role ?? 'LEARNER';

    return this.liveSessionService.getJoinUrl(
      sessionId,
      tenantId,
      userName,
      userRole,
    );
  }

  @Mutation('endLiveSession')
  async endLiveSession(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const tenantId = ctx.req.user?.tenant_id ?? '';
    return this.liveSessionService.endSession(sessionId, tenantId);
  }
}
