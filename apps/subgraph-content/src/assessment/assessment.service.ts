/**
 * AssessmentService — F-030: 360° Multi-Rater Assessments
 * Campaign lifecycle: create → activate → collect responses → complete + aggregate
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { AssessmentAggregatorService } from './assessment-aggregator.service.js';

export type RaterRole = 'SELF' | 'PEER' | 'MANAGER' | 'DIRECT_REPORT';
export type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED';

export interface CreateCampaignInput {
  title: string;
  targetUserId: string;
  rubric: Record<string, unknown>;
  dueDate?: Date;
  courseId?: string;
}

@Injectable()
export class AssessmentService implements OnModuleDestroy {
  private readonly logger = new Logger(AssessmentService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly aggregator: AssessmentAggregatorService) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('AssessmentService destroyed - connections closed');
  }

  async createCampaign(
    input: CreateCampaignInput,
    tenantId: string,
    createdBy: string,
  ): Promise<typeof schema.assessmentCampaigns.$inferSelect> {
    const ctx: TenantContext = { tenantId, userId: createdBy, userRole: 'ORG_ADMIN' };
    const [campaign] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.assessmentCampaigns)
        .values({
          tenantId,
          targetUserId: input.targetUserId,
          title: input.title,
          rubric: input.rubric,
          dueDate: input.dueDate ?? null,
          courseId: input.courseId ?? null,
          status: 'DRAFT',
          createdBy,
        })
        .returning(),
    );
    this.logger.log({ campaignId: campaign!.id, tenantId }, 'Assessment campaign created');
    return campaign!;
  }

  async activateCampaign(
    campaignId: string,
    tenantId: string,
  ): Promise<typeof schema.assessmentCampaigns.$inferSelect> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    const [updated] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.update(schema.assessmentCampaigns)
        .set({ status: 'ACTIVE' })
        .where(and(
          eq(schema.assessmentCampaigns.id, campaignId),
          eq(schema.assessmentCampaigns.tenantId, tenantId),
        ))
        .returning(),
    );
    if (!updated) throw new NotFoundException('Campaign not found');
    this.logger.log({ campaignId, tenantId }, 'Assessment campaign activated');
    return updated;
  }

  async submitResponse(
    campaignId: string,
    responderId: string,
    raterRole: RaterRole,
    criteriaScores: Record<string, number>,
    narrative: string | null,
    tenantId: string,
  ): Promise<typeof schema.assessmentResponses.$inferSelect> {
    const ctx: TenantContext = { tenantId, userId: responderId, userRole: 'STUDENT' };
    try {
      const [response] = await withTenantContext(this.db, ctx, async (tx) =>
        tx.insert(schema.assessmentResponses)
          .values({ campaignId, responderId, tenantId, raterRole, criteriaScores, narrative })
          .returning(),
      );
      this.logger.log({ campaignId, responderId, raterRole }, 'Assessment response submitted');
      return response!;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('assessment_responses_responder_unique')) {
        throw new ConflictException('Response already submitted for this campaign and role');
      }
      throw err;
    }
  }

  async listCampaignsForTarget(
    targetUserId: string,
    tenantId: string,
  ): Promise<typeof schema.assessmentCampaigns.$inferSelect[]> {
    const ctx: TenantContext = { tenantId, userId: targetUserId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.assessmentCampaigns)
        .where(and(
          eq(schema.assessmentCampaigns.targetUserId, targetUserId),
          eq(schema.assessmentCampaigns.tenantId, tenantId),
        )),
    );
  }

  async listCampaignsForResponder(
    responderId: string,
    tenantId: string,
  ): Promise<typeof schema.assessmentCampaigns.$inferSelect[]> {
    const ctx: TenantContext = { tenantId, userId: responderId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.assessmentCampaigns)
        .where(and(
          eq(schema.assessmentCampaigns.tenantId, tenantId),
          eq(schema.assessmentCampaigns.status, 'ACTIVE'),
        )),
    );
  }

  async getResult(
    campaignId: string,
    tenantId: string,
  ): Promise<typeof schema.assessmentResults.$inferSelect | null> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'STUDENT' };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.assessmentResults)
        .where(and(
          eq(schema.assessmentResults.campaignId, campaignId),
          eq(schema.assessmentResults.tenantId, tenantId),
        )),
    );
    return rows[0] ?? null;
  }

  async completeCampaign(
    campaignId: string,
    tenantId: string,
  ): Promise<typeof schema.assessmentResults.$inferSelect> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.update(schema.assessmentCampaigns)
        .set({ status: 'COMPLETED' })
        .where(and(
          eq(schema.assessmentCampaigns.id, campaignId),
          eq(schema.assessmentCampaigns.tenantId, tenantId),
        )),
    );
    this.logger.log({ campaignId, tenantId }, 'Assessment campaign completed — running aggregation');
    return this.aggregator.aggregate(campaignId, tenantId);
  }
}
