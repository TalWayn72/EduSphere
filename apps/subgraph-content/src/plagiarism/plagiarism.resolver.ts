/**
 * PlagiarismResolver — GraphQL resolver for F-005 plagiarism detection endpoints
 */
import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import type { TenantContext } from '@edusphere/db';
import { SubmissionService } from './submission.service.js';
import { PlagiarismService } from './plagiarism.service.js';
import type { GraphQLContext } from '../auth/auth.middleware.js';

@Resolver()
export class PlagiarismResolver {
  private readonly logger = new Logger(PlagiarismResolver.name);

  constructor(
    private readonly submissionService: SubmissionService,
    private readonly plagiarismService: PlagiarismService,
  ) {}

  @Mutation('submitTextAssignment')
  async submitTextAssignment(
    @Args('contentItemId') contentItemId: string,
    @Args('textContent') textContent: string,
    @Args('courseId') courseId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const tenantCtx: TenantContext = {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: (auth.roles?.[0] ?? 'STUDENT') as TenantContext['userRole'],
    };

    this.logger.log(
      `submitTextAssignment: contentItemId=${contentItemId} userId=${auth.userId}`,
    );

    return this.submissionService.submitAssignment(
      contentItemId,
      auth.userId,
      auth.tenantId,
      courseId,
      textContent,
      tenantCtx,
    );
  }

  @Query('mySubmissions')
  async mySubmissions(
    @Args('contentItemId') contentItemId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const tenantCtx: TenantContext = {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: (auth.roles?.[0] ?? 'STUDENT') as TenantContext['userRole'],
    };

    return this.submissionService.getMySubmissions(
      contentItemId,
      auth.userId,
      tenantCtx,
    );
  }

  @Query('submissionPlagiarismReport')
  async submissionPlagiarismReport(
    @Args('submissionId') submissionId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const tenantCtx: TenantContext = {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: (auth.roles?.[0] ?? 'STUDENT') as TenantContext['userRole'],
    };

    this.logger.log(
      `submissionPlagiarismReport: submissionId=${submissionId} userId=${auth.userId}`,
    );

    return this.submissionService.getPlagiarismReport(
      submissionId,
      auth.userId,
      tenantCtx,
    );
  }
}
