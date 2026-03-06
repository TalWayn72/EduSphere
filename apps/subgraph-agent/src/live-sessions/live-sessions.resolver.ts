import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import type { AuthContext } from '@edusphere/auth';

@Resolver('LiveSession')
export class LiveSessionsResolver {
  private readonly logger = new Logger(LiveSessionsResolver.name);

  constructor(private readonly liveSessionsService: LiveSessionsService) {}

  @Mutation('startLiveSession')
  async startLiveSession(
    @Args('sessionId') sessionId: string,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    const tenantId = authContext.tenantId ?? '';
    const userId = authContext.userId;
    const userRole = authContext.roles[0] ?? 'STUDENT';

    this.logger.debug(
      `[LiveSessionsResolver] startLiveSession sessionId=${sessionId} userId=${userId}`
    );

    return this.liveSessionsService.startLiveSession(
      sessionId,
      tenantId,
      userId,
      userRole
    );
  }

  @Mutation('endLiveSession')
  async endLiveSession(
    @Args('sessionId') sessionId: string,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    const tenantId = authContext.tenantId ?? '';
    const userId = authContext.userId;

    this.logger.debug(
      `[LiveSessionsResolver] endLiveSession sessionId=${sessionId} userId=${userId}`
    );

    return this.liveSessionsService.endLiveSession(sessionId, userId, tenantId);
  }

  @Mutation('joinLiveSession')
  async joinLiveSession(
    @Args('sessionId') sessionId: string,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    const tenantId = authContext.tenantId ?? '';
    const userId = authContext.userId;

    this.logger.debug(
      `[LiveSessionsResolver] joinLiveSession sessionId=${sessionId} userId=${userId}`
    );

    return this.liveSessionsService.joinLiveSession(sessionId, userId, tenantId);
  }

  @Mutation('cancelLiveSession')
  async cancelLiveSession(
    @Args('sessionId') sessionId: string,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    const tenantId = authContext.tenantId ?? '';
    const userId = authContext.userId;

    this.logger.debug(
      `[LiveSessionsResolver] cancelLiveSession sessionId=${sessionId} userId=${userId}`
    );

    return this.liveSessionsService.cancelLiveSession(sessionId, userId, tenantId);
  }

  @Query('sessionAttendees')
  async sessionAttendees(
    @Args('sessionId') sessionId: string,
    @Args('first') first: number | undefined,
    @Args('after') after: string | undefined,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    const tenantId = authContext.tenantId ?? '';
    const userId = authContext.userId;

    this.logger.debug(
      `[LiveSessionsResolver] sessionAttendees sessionId=${sessionId} userId=${userId}`
    );

    return this.liveSessionsService.getSessionAttendees(
      sessionId,
      userId,
      tenantId,
      { first, after }
    );
  }

  private extractAuthContext(context: unknown): AuthContext {
    const ctx = context as { authContext?: AuthContext };
    if (!ctx.authContext) {
      throw new UnauthorizedException('Authentication required');
    }
    return ctx.authContext;
  }
}
