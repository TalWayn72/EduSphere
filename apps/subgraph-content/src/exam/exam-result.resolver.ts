/**
 * ExamResultResolver — Queries for exam results, analytics, and reliability.
 */
import {
  Resolver,
  Query,
  Args,
  Context,
} from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { ExamResultQueryService } from './exam-result-query.service';

interface GqlContext {
  authContext?: AuthContext;
}

function requireAuth(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth?.tenantId || !auth?.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: auth.roles?.[0] ?? 'STUDENT',
  };
}

@Resolver('ExamResult')
export class ExamResultResolver {
  constructor(
    private readonly resultQueryService: ExamResultQueryService,
  ) {}

  @Query('examResult')
  async examResult(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GqlContext,
  ) {
    const tc = requireAuth(ctx);
    return this.resultQueryService.getResult(sessionId, tc);
  }

  @Query('myExamResults')
  async myExamResults(
    @Args('courseId') courseId: string | undefined,
    @Context() ctx: GqlContext,
  ) {
    const tc = requireAuth(ctx);
    return this.resultQueryService.getMyResults(tc, courseId);
  }

  @Query('examBlueprintAnalytics')
  async examBlueprintAnalytics(
    @Args('blueprintId') blueprintId: string,
    @Context() ctx: GqlContext,
  ) {
    const tc = requireAuth(ctx);
    return this.resultQueryService.getBlueprintAnalytics(blueprintId, tc);
  }

  // Note: examReliabilityReport query lives in PsychometricsResolver
  // (has KR-20/alpha implementation via TestReliabilityService).
}
