import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
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
  private readonly logger = new Logger(LiveSessionResolver.name);

  constructor(private readonly liveSessionService: LiveSessionService) {}

  @Query('liveSession')
  async getLiveSession(
    @Args('contentItemId') contentItemId: string,
    @Context() ctx: GraphQLContext
  ) {
    const tenantId = ctx.req.user?.tenant_id ?? '';
    return this.liveSessionService.getByContentItem(contentItemId, tenantId);
  }

  @Mutation('createLiveSession')
  async createLiveSession(
    @Args('contentItemId') contentItemId: string,
    @Args('scheduledAt') scheduledAt: string,
    @Args('meetingName') meetingName: string,
    @Context() ctx: GraphQLContext
  ) {
    const tenantId = ctx.req.user?.tenant_id ?? '';
    return this.liveSessionService.createLiveSession(
      contentItemId,
      tenantId,
      new Date(scheduledAt),
      meetingName
    );
  }

  @Query('liveSessions')
  async listSessions(
    @Args('status') status: string | undefined,
    @Args('limit') limit: number | undefined,
    @Args('offset') offset: number | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const tenantId = ctx.req.user?.tenant_id ?? '';
    this.logger.debug(
      `[LiveSessionResolver] liveSessions tenantId=${tenantId} status=${status ?? 'all'}`
    );
    return this.liveSessionService.listSessions(tenantId, status, limit ?? 20, offset ?? 0);
  }

  @Query('liveSessionById')
  async getLiveSessionById(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext
  ) {
    const tenantId = ctx.req.user?.tenant_id ?? '';
    return this.liveSessionService.getById(sessionId, tenantId);
  }
}
