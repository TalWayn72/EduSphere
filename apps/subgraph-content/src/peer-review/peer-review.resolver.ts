/**
 * PeerReviewResolver — Phase 45: Social Learning
 * Thin resolver — all business logic delegated to PeerReviewService.
 * IDOR prevention: always passes ctx.userId (never raw arg) to service.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { PeerReviewService } from './peer-review.service.js';
import type { GraphQLContext } from '../auth/auth.middleware.js';

function mapAssignment(a: {
  id: string;
  contentItemId: string;
  submitterId: string;
  reviewerId: string;
  status: string;
  submissionText: string | null;
  feedback: string | null;
  score: number | null;
  createdAt: Date;
}) {
  return {
    id: a.id,
    contentItemId: a.contentItemId,
    contentItemTitle: a.contentItemId, // title resolution via DataLoader in a future phase
    submitterId: a.submitterId,
    submitterDisplayName: null,
    status: a.status,
    submissionText: a.submissionText ?? null,
    feedback: a.feedback ?? null,
    score: a.score ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

function mapSubmission(a: {
  id: string;
  contentItemId: string;
  status: string;
  score: number | null;
  feedback: string | null;
  createdAt: Date;
}) {
  return {
    id: a.id,
    contentItemId: a.contentItemId,
    contentItemTitle: a.contentItemId,
    status: a.status,
    score: a.score ?? null,
    feedback: a.feedback ?? null,
    createdAt: a.createdAt.toISOString(),
  };
}

@Resolver()
export class PeerReviewResolver {
  private readonly logger = new Logger(PeerReviewResolver.name);

  constructor(private readonly peerReviewService: PeerReviewService) {}

  @Query('myReviewAssignments')
  async myReviewAssignments(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    const list = await this.peerReviewService.getMyAssignmentsToReview(auth.userId, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: (auth.roles?.[0] as 'SUPER_ADMIN' | 'ORG_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'RESEARCHER') ?? 'STUDENT',
    });
    return list.map(mapAssignment);
  }

  @Query('mySubmissions')
  async mySubmissions(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    const list = await this.peerReviewService.getMySubmissions(auth.userId, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: (auth.roles?.[0] as 'SUPER_ADMIN' | 'ORG_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'RESEARCHER') ?? 'STUDENT',
    });
    return list.map(mapSubmission);
  }

  @Query('peerReviewRubric')
  async peerReviewRubric(
    @Args('contentItemId') contentItemId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const auth = ctx.authContext;
    if (!auth?.tenantId) throw new UnauthorizedException();
    const rubric = await this.peerReviewService.getRubric(contentItemId, {
      tenantId: auth.tenantId,
      userId: auth.userId ?? '',
      userRole: (auth.roles?.[0] as 'SUPER_ADMIN' | 'ORG_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'RESEARCHER') ?? 'STUDENT',
    });
    if (!rubric) return null;
    return {
      id: rubric.id,
      contentItemId: rubric.contentItemId,
      criteria: JSON.stringify(rubric.criteria),
      minReviewers: rubric.minReviewers,
      isAnonymous: rubric.isAnonymous,
    };
  }

  @Mutation('createPeerReviewRubric')
  async createPeerReviewRubric(
    @Args('input') input: { contentItemId: string; criteria: string; minReviewers?: number; isAnonymous?: boolean },
    @Context() ctx: GraphQLContext,
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    this.logger.log(
      { contentItemId: input.contentItemId, tenantId: auth.tenantId },
      'createPeerReviewRubric',
    );
    const rubric = await this.peerReviewService.createRubric(input, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: (auth.roles?.[0] as 'SUPER_ADMIN' | 'ORG_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'RESEARCHER') ?? 'INSTRUCTOR',
    });
    return {
      id: rubric.id,
      contentItemId: rubric.contentItemId,
      criteria: JSON.stringify(rubric.criteria),
      minReviewers: rubric.minReviewers,
      isAnonymous: rubric.isAnonymous,
    };
  }

  @Mutation('submitForPeerReview')
  async submitForPeerReview(
    @Args('contentItemId') contentItemId: string,
    @Args('submissionText') submissionText: string,
    @Context() ctx: GraphQLContext,
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    this.logger.log(
      { contentItemId, userId: auth.userId, tenantId: auth.tenantId },
      'submitForPeerReview',
    );
    const assignments = await this.peerReviewService.createAssignment(
      contentItemId,
      auth.userId,
      submissionText,
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        userRole: (auth.roles?.[0] as 'SUPER_ADMIN' | 'ORG_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'RESEARCHER') ?? 'STUDENT',
      },
    );
    return assignments.map(mapAssignment);
  }

  @Mutation('submitPeerReview')
  async submitPeerReview(
    @Args('assignmentId') assignmentId: string,
    @Args('criteriaScores') criteriaScores: string,
    @Args('feedback') feedback: string | undefined,
    @Context() ctx: GraphQLContext,
  ): Promise<boolean> {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    // IDOR prevention: always pass ctx.userId — never a raw argument
    return this.peerReviewService.submitReview(
      assignmentId,
      auth.userId,
      criteriaScores,
      feedback ?? '',
      {
        tenantId: auth.tenantId,
        userId: auth.userId,
        userRole: (auth.roles?.[0] as 'SUPER_ADMIN' | 'ORG_ADMIN' | 'INSTRUCTOR' | 'STUDENT' | 'RESEARCHER') ?? 'STUDENT',
      },
    );
  }
}
