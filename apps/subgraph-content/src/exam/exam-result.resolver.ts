/**
 * ExamResultResolver — Queries for exam results, analytics, and reliability.
 */
import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import type { GraphQLContext } from '../auth/auth.middleware';
import type { TenantContext } from '@edusphere/db';
import { ExamResultQueryService } from './exam-result-query.service';

@Resolver('ExamResult')
export class ExamResultResolver {
  private readonly logger = new Logger(ExamResultResolver.name);

  constructor(private readonly resultQueryService: ExamResultQueryService) {}

  @Query('examResult')
  async examResult(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext
  ) {
    const tc = this.extractAuth(ctx);
    return this.resultQueryService.getResult(sessionId, tc);
  }

  @Query('myExamResults')
  async myExamResults(
    @Args('courseId') courseId: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const tc = this.extractAuth(ctx);
    return this.resultQueryService.getMyResults(tc, courseId);
  }

  @Query('examBlueprintAnalytics')
  async examBlueprintAnalytics(
    @Args('blueprintId') blueprintId: string,
    @Context() ctx: GraphQLContext
  ) {
    const tc = this.extractAuth(ctx);
    return this.resultQueryService.getBlueprintAnalytics(blueprintId, tc);
  }

  // Note: examReliabilityReport query lives in PsychometricsResolver
  // (has KR-20/alpha implementation via TestReliabilityService).

  private extractAuth(ctx: GraphQLContext): TenantContext {
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
