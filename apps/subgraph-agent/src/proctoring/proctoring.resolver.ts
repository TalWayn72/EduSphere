/**
 * ProctoringResolver — GraphQL resolvers for Remote Proctoring (PRD §7.2 G-4).
 * Delegates all logic to ProctoringService.
 */
import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { ProctoringService } from './proctoring.service';
import type { AuthContext } from '@edusphere/auth';

@Resolver('ProctoringSession')
export class ProctoringResolver {
  private readonly logger = new Logger(ProctoringResolver.name);

  constructor(private readonly proctoringService: ProctoringService) {}

  @Query('proctoringSession')
  async proctoringSession(
    @Args('sessionId') sessionId: string,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    const tenantId = authContext.tenantId ?? '';
    this.logger.debug(`[ProctoringResolver] proctoringSession sessionId=${sessionId} tenantId=${tenantId}`);
    return this.proctoringService.getSession(sessionId, tenantId);
  }

  @Query('proctoringReport')
  async proctoringReport(
    @Args('assessmentId') assessmentId: string,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    const tenantId = authContext.tenantId ?? '';
    this.logger.debug(`[ProctoringResolver] proctoringReport assessmentId=${assessmentId} tenantId=${tenantId}`);
    return this.proctoringService.getReport(assessmentId, tenantId);
  }

  @Mutation('startProctoringSession')
  async startProctoringSession(
    @Args('assessmentId') assessmentId: string,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    const tenantId = authContext.tenantId ?? '';
    const userId = authContext.userId;
    this.logger.log(`[ProctoringResolver] startProctoringSession assessmentId=${assessmentId} userId=${userId}`);
    return this.proctoringService.startSession(assessmentId, tenantId, userId);
  }

  @Mutation('flagProctoringEvent')
  async flagProctoringEvent(
    @Args('sessionId') sessionId: string,
    @Args('type') type: string,
    @Args('detail') detail: string | undefined,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    const tenantId = authContext.tenantId ?? '';
    const userId = authContext.userId;
    this.logger.log(`[ProctoringResolver] flagProctoringEvent sessionId=${sessionId} type=${type} userId=${userId}`);
    return this.proctoringService.flagEvent(sessionId, type, detail ?? null, tenantId);
  }

  @Mutation('endProctoringSession')
  async endProctoringSession(
    @Args('sessionId') sessionId: string,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    const tenantId = authContext.tenantId ?? '';
    const userId = authContext.userId;
    this.logger.log(`[ProctoringResolver] endProctoringSession sessionId=${sessionId} userId=${userId}`);
    return this.proctoringService.endSession(sessionId, tenantId);
  }

  private extractAuthContext(context: unknown): AuthContext {
    const ctx = context as { authContext?: AuthContext };
    if (!ctx.authContext) {
      throw new UnauthorizedException('Authentication required');
    }
    return ctx.authContext;
  }
}
