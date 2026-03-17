import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { LiveSessionService } from './live-session.service';
import type { GraphQLContext } from '../auth/auth.middleware';

/** Extract tenant ID from authContext (preferred) or x-tenant-id header (gateway fallback). */
function extractTenantId(ctx: GraphQLContext): string {
  if (ctx.authContext?.tenantId) return ctx.authContext.tenantId;
  const header = ctx.req?.headers?.['x-tenant-id'];
  return (Array.isArray(header) ? header[0] : header) ?? '';
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
    const tenantId = extractTenantId(ctx);
    return this.liveSessionService.getByContentItem(contentItemId, tenantId);
  }

  @Mutation('createLiveSession')
  async createLiveSession(
    @Args('contentItemId') contentItemId: string,
    @Args('scheduledAt') scheduledAt: string,
    @Args('meetingName') meetingName: string,
    @Context() ctx: GraphQLContext
  ) {
    const tenantId = extractTenantId(ctx);
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
    const tenantId = extractTenantId(ctx);
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
    const tenantId = extractTenantId(ctx);
    return this.liveSessionService.getById(sessionId, tenantId);
  }
}
