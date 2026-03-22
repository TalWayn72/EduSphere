/**
 * OrgOnboardingResolver — GraphQL resolvers for org onboarding feature.
 *
 * Wires all org management mutations and queries to their respective services.
 * Auth context extracted via requireAuth helper (same pattern as marketplace).
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
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
import { ApiKeyService } from '../api-keys/api-key.service';
import { WebhookService } from '../webhooks/webhook.service';
import { OrgLicensingService } from './org-licensing.service';
import { DomainProvisioningService } from './domain-provisioning.service';

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
    userRole: (auth.roles?.[0] ?? 'STUDENT') as TenantContext['userRole'],
  };
}

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
    private readonly orgBadgeService: OrgBadgeService,
    private readonly apiKeyService: ApiKeyService,
    private readonly webhookService: WebhookService,
    private readonly licensingService: OrgLicensingService,
    private readonly domainProvisioningService: DomainProvisioningService
  ) {}

  // ─── Provisioning ─────────────────────────────────────────

  @Mutation('createOrganization')
  async createOrganization(
    @Args('input') input: {
      name: string;
      slug: string;
      adminEmail: string;
      adminFirstName: string;
      adminLastName: string;
      idempotencyKey: string;
    }
  ) {
    const result = await this.provisioningService.createOrganization(input);
    return {
      ...result,
      memberCount: 1,
      onboardingChecklist: {
        brandingConfigured: false,
        firstUserInvited: false,
        firstCourseCreated: false,
        domainConfigured: false,
        ssoConfigured: false,
        completionPercentage: 0,
      },
    };
  }

  @Query('myOrganization')
  async getMyOrganization(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    const tenant = await this.tenantService.findById(tenantCtx.tenantId);
    const settings = (tenant?.settings as Record<string, unknown>) ?? {};
    return {
      id: tenantCtx.tenantId,
      name: tenant?.name ?? '',
      slug: tenant?.slug ?? '',
      plan: tenant?.plan ?? 'FREE',
      provisioningStatus: (settings.provisioningStatus as string) ?? 'ACTIVE',
      trialEndsAt: settings.trialEndsAt ? new Date(settings.trialEndsAt as string) : null,
      memberCount: 0,
      createdAt: tenant?.created_at ?? new Date(),
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
  async revokeInvitation(
    @Args('id') id: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.invitationService.revokeInvitation(id, tenantCtx);
  }

  @Query('orgInvitations')
  async getOrgInvitations(
    @Args('status') status: string | undefined,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.invitationService.getInvitations(tenantCtx, status);
  }

  @Query('orgMembers')
  async getOrgMembers(
    @Args('limit') _limit: number,
    @Args('offset') _offset: number,
    @Context() ctx: GqlContext
  ) {
    requireAuth(ctx);
    // TODO: Wire to member listing service
    return [];
  }

  @Mutation('updateMemberRole')
  async updateMemberRole(
    @Args('userId') _userId: string,
    @Args('role') _role: string,
    @Context() ctx: GqlContext
  ) {
    requireAuth(ctx);
    // TODO: Wire to Keycloak role update
    return { id: _userId, email: '', name: null, role: _role, joinedAt: new Date(), lastActiveAt: null };
  }

  @Mutation('removeMember')
  async removeMember(
    @Args('userId') _userId: string,
    @Context() ctx: GqlContext
  ) {
    requireAuth(ctx);
    // TODO: Wire to Keycloak group removal
    return true;
  }

  // ─── API Keys ─────────────────────────────────────────────

  @Mutation('createApiKey')
  async createApiKey(
    @Args('input') input: {
      name: string;
      scopes: string[];
      rateLimitPerMinute?: number;
      expiresAt?: string;
    },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.apiKeyService.createKey(
      {
        ...input,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      },
      tenantCtx
    );
  }

  @Mutation('revokeApiKey')
  async revokeApiKey(
    @Args('id') id: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.apiKeyService.revokeKey(id, tenantCtx);
  }

  @Query('apiKeys')
  async getApiKeys(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.apiKeyService.listKeys(tenantCtx);
  }

  // ─── Webhooks ─────────────────────────────────────────────

  @Mutation('createWebhook')
  async createWebhook(
    @Args('input') input: { url: string; events: string[] },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.webhookService.createWebhook(input, tenantCtx);
  }

  @Mutation('updateWebhook')
  async updateWebhook(
    @Args('id') id: string,
    @Args('input') input: { url?: string; events?: string[]; isActive?: boolean },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.webhookService.updateWebhook(id, input, tenantCtx);
  }

  @Mutation('deleteWebhook')
  async deleteWebhook(
    @Args('id') id: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.webhookService.deleteWebhook(id, tenantCtx);
  }

  @Mutation('testWebhook')
  async testWebhook(
    @Args('id') id: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.webhookService.testWebhook(id, tenantCtx);
  }

  @Query('webhooks')
  async getWebhooks(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.webhookService.listWebhooks(tenantCtx);
  }

  @Query('webhookDeliveries')
  async getWebhookDeliveries(
    @Args('webhookId') webhookId: string,
    @Args('limit') limit: number,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.webhookService.getDeliveries(webhookId, tenantCtx, limit);
  }

  // ─── Custom Domains (F-03) ───────────────────────────────

  @Query('customDomains')
  async getCustomDomains(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.domainProvisioningService.listCustomDomains(tenantCtx);
  }

  @Mutation('requestDomainVerification')
  async requestDomainVerification(
    @Args('domain') domain: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.domainProvisioningService.requestCustomDomain(domain, tenantCtx);
  }

  @Mutation('checkDomainVerification')
  async checkDomainVerification(
    @Args('domain') domain: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.domainProvisioningService.checkCustomDomain(domain, tenantCtx);
  }

  @Mutation('removeCustomDomain')
  async removeCustomDomain(
    @Args('domainId') domainId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.domainProvisioningService.removeCustomDomain(domainId, tenantCtx);
  }

  // ─── Licensing ────────────────────────────────────────────

  @Mutation('licenseCourse')
  async licenseCourse(
    @Args('input') input: {
      courseId: string;
      licenseType: string;
      maxSeats?: number;
      durationMonths?: number;
    },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.licensingService.licenseCourse(input, tenantCtx);
  }

  @Mutation('revokeCourseLicense')
  async revokeCourseLicense(
    @Args('id') id: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.licensingService.revokeLicense(id, tenantCtx);
  }

  @Query('courseLicenses')
  async getCourseLicenses(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.licensingService.listLicenses(tenantCtx);
  }

  // ─── Gamification Config ──────────────────────────────────

  @Query('gamificationConfig')
  async getGamificationConfig(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.gamificationService.getConfig(tenantCtx);
  }

  @Mutation('updateGamificationConfig')
  async updateGamificationConfig(
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GqlContext
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
      name: string;
      description?: string;
      iconUrl?: string;
      xpRequired: number;
      autoAwardCriteria?: unknown;
    },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.orgBadgeService.createBadge(
      tenantCtx,
      input as CreateOrgBadgeInput
    );
  }

  @Mutation('updateOrgBadge')
  async updateOrgBadge(
    @Args('id') id: string,
    @Args('input') input: Record<string, unknown>,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.orgBadgeService.updateBadge(tenantCtx, id, input);
  }

  @Mutation('deleteOrgBadge')
  async deleteOrgBadge(
    @Args('id') id: string,
    @Context() ctx: GqlContext
  ) {
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
      from: new Date(dateRange.from),
      to: new Date(dateRange.to),
    });
  }

  @Query('atRiskLearners')
  async getAtRiskLearners(
    @Args('limit') limit: number,
    @Args('offset') offset: number,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.atRiskService.getAtRiskLearners(tenantCtx, limit ?? 20, offset ?? 0);
  }

  @Query('learnerDetail')
  async getLearnerDetail(
    @Args('userId') userId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.atRiskService.getLearnerDetail(tenantCtx, userId);
  }

  @Mutation('exportAnalytics')
  async exportAnalytics(
    @Args('input') input: {
      format: string;
      dateRange: { from: string; to: string };
    },
    @Context() ctx: GqlContext
  ) {
    requireAuth(ctx);
    // TODO: Wire to export service (MinIO upload + signed URL)
    return {
      downloadUrl: `https://cdn.edusphere.com/exports/placeholder.${input.format.toLowerCase()}`,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
      format: input.format,
    };
  }
}
