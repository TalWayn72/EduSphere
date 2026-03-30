/**
 * OrgOnboardingResolver — GraphQL resolvers for org onboarding, invitations,
 * gamification, and analytics. API Keys/Webhooks/Domains/Licensing are in
 * OrgOnboardingApiResolver (split for file-size compliance).
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { OrgProvisioningService } from './org-provisioning.service';
import { OrgInvitationService } from './org-invitation.service';
import { TrialService } from './trial.service';
import { TenantService } from './tenant.service';
import { OrgAnalyticsService } from '../analytics/org-analytics.service';
import { AtRiskLearnerService } from '../analytics/at-risk-learner.service';
import { OrgGamificationService } from '../gamification/org-gamification.service';
import {
  OrgBadgeService,
  type CreateOrgBadgeInput,
} from '../gamification/org-badge.service';
import { requireAuth, type GqlContext } from './org-onboarding.helpers.js';

export { requireAuth, type GqlContext };

@Resolver('Organization')
export class OrgOnboardingResolver {
  constructor(
    private readonly provisioningService: OrgProvisioningService,
    private readonly invitationService: OrgInvitationService,
    private readonly trialService: TrialService,
    private readonly tenantService: TenantService,
    private readonly analyticsService: OrgAnalyticsService,
    private readonly atRiskService: AtRiskLearnerService,
    private readonly gamificationService: OrgGamificationService,
    private readonly orgBadgeService: OrgBadgeService
  ) {}

  // ─── Provisioning ─────────────────────────────────────────

  @Mutation('createOrganization')
  async createOrganization(
    @Args('input') input: {
      name: string; slug: string; adminEmail: string;
      adminFirstName: string; adminLastName: string; idempotencyKey: string;
    }
  ) {
    const result = await this.provisioningService.createOrganization(input);
    return {
      ...result, memberCount: 1,
      onboardingChecklist: {
        brandingConfigured: false, firstUserInvited: false,
        firstCourseCreated: false, domainConfigured: false,
        ssoConfigured: false, completionPercentage: 0,
      },
    };
  }

  @Query('myOrganization')
  async getMyOrganization(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    const tenant = await this.tenantService.findById(tenantCtx.tenantId);
    const settings = (tenant?.settings as Record<string, unknown>) ?? {};
    return {
      id: tenantCtx.tenantId, name: tenant?.name ?? '', slug: tenant?.slug ?? '',
      plan: tenant?.plan ?? 'FREE',
      provisioningStatus: (settings.provisioningStatus as string) ?? 'ACTIVE',
      trialEndsAt: settings.trialEndsAt ? new Date(settings.trialEndsAt as string) : null,
      memberCount: 0, createdAt: tenant?.created_at ?? new Date(),
      onboardingChecklist: null,
    };
  }

  @Query('trialStatus')
  async getTrialStatus(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.trialService.getTrialStatus(tenantCtx.tenantId);
  }

  // ─── Invitations ──────────────────────────────────────────

  @Mutation('inviteUser')
  async inviteUser(
    @Args('input') input: { email: string; role: string; message?: string },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.invitationService.inviteUser(input, tenantCtx);
  }

  @Mutation('acceptInvitation')
  async acceptInvitation(@Args('token') token: string) {
    return this.invitationService.acceptInvitation(token);
  }

  @Mutation('revokeInvitation')
  async revokeInvitation(@Args('id') id: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.invitationService.revokeInvitation(id, tenantCtx);
  }

  @Query('orgInvitations')
  async getOrgInvitations(@Args('status') status: string | undefined, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.invitationService.getInvitations(tenantCtx, status);
  }

  @Query('orgMembers')
  async getOrgMembers(
    @Args('limit') _limit: number, @Args('offset') _offset: number,
    @Context() ctx: GqlContext
  ) {
    requireAuth(ctx);
    return [];
  }

  @Mutation('updateMemberRole')
  async updateMemberRole(
    @Args('userId') _userId: string, @Args('role') _role: string,
    @Context() ctx: GqlContext
  ) {
    requireAuth(ctx);
    return { id: _userId, email: '', name: null, role: _role, joinedAt: new Date(), lastActiveAt: null };
  }

  @Mutation('removeMember')
  async removeMember(@Args('userId') _userId: string, @Context() ctx: GqlContext) {
    requireAuth(ctx);
    return true;
  }

  // ─── Gamification Config ──────────────────────────────────

  @Query('gamificationConfig')
  async getGamificationConfig(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.gamificationService.getConfig(tenantCtx);
  }

  @Mutation('updateGamificationConfig')
  async updateGamificationConfig(
    @Args('input') input: Record<string, unknown>, @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.gamificationService.updateConfig(tenantCtx, input);
  }

  // ─── Org Badges (F-12) ──────────────────────────────────────

  @Query('orgBadges')
  async getOrgBadges(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.orgBadgeService.listBadges(tenantCtx);
  }

  @Mutation('createOrgBadge')
  async createOrgBadge(
    @Args('input') input: {
      name: string; description?: string; iconUrl?: string;
      xpRequired: number; autoAwardCriteria?: unknown;
    },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.orgBadgeService.createBadge(tenantCtx, input as CreateOrgBadgeInput);
  }

  @Mutation('updateOrgBadge')
  async updateOrgBadge(
    @Args('id') id: string, @Args('input') input: Record<string, unknown>,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.orgBadgeService.updateBadge(tenantCtx, id, input);
  }

  @Mutation('deleteOrgBadge')
  async deleteOrgBadge(@Args('id') id: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.orgBadgeService.deleteBadge(tenantCtx, id);
  }

  // ─── Analytics ────────────────────────────────────────────

  @Query('orgAnalytics')
  async getOrgAnalytics(
    @Args('dateRange') dateRange: { from: string; to: string },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.analyticsService.getOrgAnalytics(tenantCtx, {
      from: new Date(dateRange.from), to: new Date(dateRange.to),
    });
  }

  @Query('orgAtRiskLearners')
  async getAtRiskLearners(
    @Args('limit') limit: number, @Args('offset') offset: number,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.atRiskService.getAtRiskLearners(tenantCtx, limit ?? 20, offset ?? 0);
  }

  @Query('learnerDetail')
  async getLearnerDetail(@Args('userId') userId: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.atRiskService.getLearnerDetail(tenantCtx, userId);
  }

  @Mutation('exportAnalytics')
  async exportAnalytics(
    @Args('input') input: { format: string; dateRange: { from: string; to: string } },
    @Context() ctx: GqlContext
  ) {
    requireAuth(ctx);
    return {
      downloadUrl: `https://cdn.edusphere.com/exports/placeholder.${input.format.toLowerCase()}`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      format: input.format,
    };
  }
}
