/**
 * AssessmentResolver — F-030: 360° Multi-Rater Assessments
 * Thin resolver delegating all business logic to AssessmentService.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { AssessmentService } from './assessment.service.js';
import type { GraphQLContext } from '../auth/auth.middleware.js';
import type { RaterRole } from './assessment.service.js';

interface RubricCriteria {
  id: string;
  label: string;
}

function defaultRubric(): { criteria: RubricCriteria[] } {
  return { criteria: [{ id: 'communication', label: 'Communication' }] };
}

function mapCampaign(c: {
  id: string;
  title: string;
  targetUserId: string;
  status: string;
  dueDate: Date | null;
  rubric: unknown;
}) {
  const rubric = c.rubric as { criteria?: RubricCriteria[] };
  return {
    id: c.id,
    title: c.title,
    targetUserId: c.targetUserId,
    status: c.status,
    dueDate: c.dueDate?.toISOString() ?? null,
    criteriaCount: rubric?.criteria?.length ?? 0,
  };
}

@Resolver()
export class AssessmentResolver {
  private readonly logger = new Logger(AssessmentResolver.name);

  constructor(private readonly svc: AssessmentService) {}

  @Query('myCampaigns')
  async myCampaigns(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    const list = await this.svc.listCampaignsForTarget(
      auth.userId,
      auth.tenantId
    );
    return list.map(mapCampaign);
  }

  @Query('campaignsToRespond')
  async campaignsToRespond(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    const list = await this.svc.listCampaignsForResponder(
      auth.userId,
      auth.tenantId
    );
    return list.map(mapCampaign);
  }

  @Query('assessmentResult')
  async assessmentResult(
    @Args('campaignId') campaignId: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.tenantId) throw new UnauthorizedException();
    const result = await this.svc.getResult(campaignId, auth.tenantId);
    if (!result) return null;
    return {
      campaignId: result.campaignId,
      aggregatedScores: result.aggregatedScores as unknown[],
      summary: result.summary ?? '',
      generatedAt: result.generatedAt.toISOString(),
    };
  }

  @Mutation('createAssessmentCampaign')
  async createAssessmentCampaign(
    @Args('title') title: string,
    @Args('targetUserId') targetUserId: string,
    @Args('dueDate') dueDate: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    this.logger.log(
      { title, targetUserId, tenant: auth.tenantId },
      'createAssessmentCampaign'
    );
    const campaign = await this.svc.createCampaign(
      {
        title,
        targetUserId,
        rubric: defaultRubric(),
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
      auth.tenantId,
      auth.userId
    );
    return mapCampaign(campaign);
  }

  @Mutation('activateAssessmentCampaign')
  async activateAssessmentCampaign(
    @Args('campaignId') campaignId: string,
    @Context() ctx: GraphQLContext
  ): Promise<boolean> {
    const auth = ctx.authContext;
    if (!auth?.tenantId) throw new UnauthorizedException();
    await this.svc.activateCampaign(campaignId, auth.tenantId);
    return true;
  }

  @Mutation('submitAssessmentResponse')
  async submitAssessmentResponse(
    @Args('campaignId') campaignId: string,
    @Args('raterRole') raterRole: RaterRole,
    @Args('criteriaScores') criteriaScores: string,
    @Args('narrative') narrative: string | undefined,
    @Context() ctx: GraphQLContext
  ): Promise<boolean> {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) throw new UnauthorizedException();
    const parsed = JSON.parse(criteriaScores) as Record<string, number>;
    await this.svc.submitResponse(
      campaignId,
      auth.userId,
      raterRole,
      parsed,
      narrative ?? null,
      auth.tenantId
    );
    return true;
  }

  @Mutation('completeAssessmentCampaign')
  async completeAssessmentCampaign(
    @Args('campaignId') campaignId: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.tenantId) throw new UnauthorizedException();
    const result = await this.svc.completeCampaign(campaignId, auth.tenantId);
    return {
      campaignId: result.campaignId,
      aggregatedScores: result.aggregatedScores as unknown[],
      summary: result.summary ?? '',
      generatedAt: result.generatedAt.toISOString(),
    };
  }
}
