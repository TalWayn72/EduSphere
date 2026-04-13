/**
 * PeerReviewResolver — Phase 45: Social Learning
 * Thin resolver — all business logic delegated to PeerReviewService.
 * IDOR prevention: always passes ctx.userId (never raw arg) to service.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { OnModuleDestroy } from '@nestjs/common';
import { UnauthorizedException, Logger } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { PeerReviewService } from './peer-review.service.js';
import type { GraphQLContext } from '../auth/auth.middleware.js';

type UserRole =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'INSTRUCTOR'
  | 'STUDENT'
  | 'RESEARCHER';

@Resolver()
export class PeerReviewResolver implements OnModuleDestroy {
  private readonly logger = new Logger(PeerReviewResolver.name);
  private readonly db: Database;

  constructor(private readonly peerReviewService: PeerReviewService) {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /** Resolve content item title from DB; returns the raw ID as fallback. */
  private async resolveTitle(
    contentItemId: string,
    tenantId: string,
    userId: string,
    role: UserRole
  ): Promise<string> {
    try {
      const ctx: TenantContext = { tenantId, userId, userRole: role };
      const [row] = await withTenantContext(this.db, ctx, async (tx) =>
        tx
          .select({ title: schema.contentItems.title })
          .from(schema.contentItems)
          .where(eq(schema.contentItems.id, contentItemId))
          .limit(1)
      );
      return row?.title ?? contentItemId;
    } catch {
      return contentItemId;
    }
  }

  private extractRole(auth: GraphQLContext['authContext']): UserRole {
    return (auth?.roles?.[0] as UserRole) ?? 'STUDENT';
  }

  @Query('myReviewAssignments')
  async myReviewAssignments(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    const role = this.extractRole(auth);
    const list = await this.peerReviewService.getMyAssignmentsToReview(
      auth.userId,
      { tenantId: auth.tenantId, userId: auth.userId, userRole: role }
    );
    const titles = await Promise.all(
      list.map((a) =>
        this.resolveTitle(a.contentItemId, auth.tenantId!, auth.userId, role)
      )
    );
    return list.map((a, i) => ({
      id: a.id,
      contentItemId: a.contentItemId,
      // eslint-disable-next-line security/detect-object-injection
      contentItemTitle: titles[i],
      submitterId: a.submitterId,
      submitterDisplayName: null,
      status: a.status,
      submissionText: a.submissionText ?? null,
      feedback: a.feedback ?? null,
      score: a.score ?? null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  @Query('mySubmissions')
  async mySubmissions(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    const role = this.extractRole(auth);
    const list = await this.peerReviewService.getMySubmissions(auth.userId, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: role,
    });
    const titles = await Promise.all(
      list.map((a) =>
        this.resolveTitle(a.contentItemId, auth.tenantId!, auth.userId, role)
      )
    );
    return list.map((a, i) => ({
      id: a.id,
      contentItemId: a.contentItemId,
      // eslint-disable-next-line security/detect-object-injection
      contentItemTitle: titles[i],
      status: a.status,
      score: a.score ?? null,
      feedback: a.feedback ?? null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  @Query('peerReviewRubric')
  async peerReviewRubric(
    @Args('contentItemId') contentItemId: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.tenantId) throw new UnauthorizedException();
    const rubric = await this.peerReviewService.getRubric(contentItemId, {
      tenantId: auth.tenantId,
      userId: auth.userId ?? '',
      userRole: this.extractRole(auth),
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
    @Args('input')
    input: {
      contentItemId: string;
      criteria: string;
      minReviewers?: number;
      isAnonymous?: boolean;
    },
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    this.logger.log(
      { contentItemId: input.contentItemId, tenantId: auth.tenantId },
      'createPeerReviewRubric'
    );
    const rubric = await this.peerReviewService.createRubric(input, {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: this.extractRole(auth) ?? 'INSTRUCTOR',
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
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    const role = this.extractRole(auth);
    this.logger.log(
      { contentItemId, userId: auth.userId, tenantId: auth.tenantId },
      'submitForPeerReview'
    );
    const assignments = await this.peerReviewService.createAssignment(
      contentItemId,
      auth.userId,
      submissionText,
      { tenantId: auth.tenantId, userId: auth.userId, userRole: role }
    );
    const titles = await Promise.all(
      assignments.map((a) =>
        this.resolveTitle(a.contentItemId, auth.tenantId!, auth.userId, role)
      )
    );
    return assignments.map((a, i) => ({
      id: a.id,
      contentItemId: a.contentItemId,
      // eslint-disable-next-line security/detect-object-injection
      contentItemTitle: titles[i],
      submitterId: a.submitterId,
      submitterDisplayName: null,
      status: a.status,
      submissionText: a.submissionText ?? null,
      feedback: a.feedback ?? null,
      score: a.score ?? null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  @Mutation('submitPeerReview')
  async submitPeerReview(
    @Args('assignmentId') assignmentId: string,
    @Args('criteriaScores') criteriaScores: string,
    @Args('feedback') feedback: string | undefined,
    @Context() ctx: GraphQLContext
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
        userRole: this.extractRole(auth),
      }
    );
  }
}
