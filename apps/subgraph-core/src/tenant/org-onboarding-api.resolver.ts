/**
 * OrgOnboarding sub-resolver: API Keys, Webhooks, Custom Domains, Licensing
 * Split from OrgOnboardingResolver for file-size compliance.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import type { TenantContext } from '@edusphere/db';
import { ApiKeyService } from '../api-keys/api-key.service';
import { WebhookService } from '../webhooks/webhook.service';
import { OrgLicensingService } from './org-licensing.service';
import { DomainProvisioningService } from './domain-provisioning.service';
import { requireAuth, type GqlContext } from './org-onboarding.helpers.js';

@Resolver('Organization')
export class OrgOnboardingApiResolver {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly webhookService: WebhookService,
    private readonly licensingService: OrgLicensingService,
    private readonly domainProvisioningService: DomainProvisioningService
  ) {}

  // ─── API Keys ─────────────────────────────────────────────

  @Mutation('createApiKey')
  async createApiKey(
    @Args('input') input: {
      name: string; scopes: string[];
      rateLimitPerMinute?: number; expiresAt?: string;
    },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.apiKeyService.createKey({
      ...input, expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    }, tenantCtx);
  }

  @Mutation('revokeApiKey')
  async revokeApiKey(@Args('id') id: string, @Context() ctx: GqlContext) {
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
  async deleteWebhook(@Args('id') id: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.webhookService.deleteWebhook(id, tenantCtx);
  }

  @Mutation('testWebhook')
  async testWebhook(@Args('id') id: string, @Context() ctx: GqlContext) {
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
  async requestDomainVerification(@Args('domain') domain: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.domainProvisioningService.requestCustomDomain(domain, tenantCtx);
  }

  @Mutation('checkDomainVerification')
  async checkDomainVerification(@Args('domain') domain: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.domainProvisioningService.checkCustomDomain(domain, tenantCtx);
  }

  @Mutation('removeCustomDomain')
  async removeCustomDomain(@Args('domainId') domainId: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.domainProvisioningService.removeCustomDomain(domainId, tenantCtx);
  }

  // ─── Licensing ────────────────────────────────────────────

  @Mutation('licenseCourse')
  async licenseCourse(
    @Args('input') input: {
      courseId: string; licenseType: string;
      maxSeats?: number; durationMonths?: number;
    },
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.licensingService.licenseCourse(input, tenantCtx);
  }

  @Mutation('revokeCourseLicense')
  async revokeCourseLicense(@Args('id') id: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.licensingService.revokeLicense(id, tenantCtx);
  }

  @Query('courseLicenses')
  async getCourseLicenses(@Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.licensingService.listLicenses(tenantCtx);
  }
}
