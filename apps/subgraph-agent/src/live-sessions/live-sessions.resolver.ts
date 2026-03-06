import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
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

  private extractAuthContext(context: unknown): AuthContext {
    const ctx = context as { authContext?: AuthContext };
    if (!ctx.authContext) {
      throw new UnauthorizedException('Authentication required');
    }
    return ctx.authContext;
  }
}
