import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { Logger, UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import {
  LiveSummaryService,
  type LiveSessionSummaryResult,
} from './live-summary.service.js';

@Resolver('LiveSessionSummary')
export class LiveSummaryResolver {
  private readonly logger = new Logger(LiveSummaryResolver.name);

  constructor(private readonly liveSummaryService: LiveSummaryService) {}

  @Query('liveSessionSummary')
  async getLiveSessionSummary(
    @Args('sessionId') sessionId: string,
    @Context() context: unknown
  ): Promise<LiveSessionSummaryResult | null> {
    const auth = this.extractAuth(context);
    this.logger.debug(
      `liveSessionSummary: session=${sessionId} tenant=${auth.tenantId}`
    );
    return this.liveSummaryService.findSummary(sessionId, auth.tenantId);
  }

  @Mutation('generateLiveSessionSummary')
  async generateLiveSessionSummary(
    @Args('sessionId') sessionId: string,
    @Context() context: unknown
  ): Promise<LiveSessionSummaryResult> {
    const auth = this.extractAuth(context);
    this.logger.log(
      `generateLiveSessionSummary: session=${sessionId} tenant=${auth.tenantId} user=${auth.userId}`
    );
    return this.liveSummaryService.generateSummary(sessionId, auth.tenantId);
  }

  private extractAuth(context: unknown): {
    tenantId: string;
    userId: string;
    roles: string[];
  } {
    const ctx = context as { req?: { auth?: AuthContext } };
    const auth = ctx?.req?.auth;
    if (!auth?.tenantId || !auth?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      tenantId: auth.tenantId,
      userId: auth.userId,
      roles: (auth.roles as string[]) ?? [],
    };
  }
}
