/**
 * PeerReviewService — Facade that delegates to PeerReviewCoreService
 * and PeerReviewAssignmentService. Preserves the original public API
 * so that all existing imports continue to work unchanged.
 */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import type { TenantContext } from '@edusphere/db';
import { schema } from '@edusphere/db';
import { PeerReviewCoreService } from './peer-review-core.service';
import { PeerReviewAssignmentService } from './peer-review-assignment.service';

export interface CreateRubricInput {
  contentItemId: string;
  criteria: string;
  minReviewers?: number;
  isAnonymous?: boolean;
}

export interface AuthContext {
  tenantId: string;
  userId: string;
  userRole: TenantContext['userRole'];
}

@Injectable()
export class PeerReviewService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly core: PeerReviewCoreService,
    private readonly assignments: PeerReviewAssignmentService
  ) {}

  async onModuleInit(): Promise<void> {
    await this.core.onModuleInit();
  }

  async onModuleDestroy(): Promise<void> {
    await this.core.onModuleDestroy();
  }

  async createRubric(
    input: CreateRubricInput,
    ctx: AuthContext
  ): Promise<typeof schema.peerReviewRubrics.$inferSelect> {
    return this.core.createRubric(input, ctx);
  }

  async getRubric(
    contentItemId: string,
    ctx: AuthContext
  ): Promise<typeof schema.peerReviewRubrics.$inferSelect | null> {
    return this.core.getRubric(contentItemId, ctx);
  }

  async createAssignment(
    contentItemId: string,
    submitterId: string,
    submissionText: string,
    ctx: AuthContext
  ): Promise<(typeof schema.peerReviewAssignments.$inferSelect)[]> {
    return this.assignments.createAssignment(
      contentItemId,
      submitterId,
      submissionText,
      ctx
    );
  }

  async submitReview(
    assignmentId: string,
    reviewerId: string,
    criteriaScores: string,
    feedback: string,
    ctx: AuthContext
  ): Promise<boolean> {
    return this.assignments.submitReview(
      assignmentId,
      reviewerId,
      criteriaScores,
      feedback,
      ctx
    );
  }

  async getMyAssignmentsToReview(
    reviewerId: string,
    ctx: AuthContext
  ): Promise<(typeof schema.peerReviewAssignments.$inferSelect)[]> {
    return this.core.getMyAssignmentsToReview(reviewerId, ctx);
  }

  async getMySubmissions(
    submitterId: string,
    ctx: AuthContext
  ): Promise<(typeof schema.peerReviewAssignments.$inferSelect)[]> {
    return this.core.getMySubmissions(submitterId, ctx);
  }
}
