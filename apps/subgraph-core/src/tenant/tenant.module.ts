import { Module } from '@nestjs/common';
import { TenantResolver } from './tenant.resolver';
import { TenantService } from './tenant.service';
import { TenantLanguageService } from './tenant-language.service';
import { TenantBrandingService } from './tenant-branding.service';
import { OrgProvisioningService } from './org-provisioning.service';
import { OrgInvitationService } from './org-invitation.service';
import { TrialService } from './trial.service';
import { OrgLicensingService } from './org-licensing.service';
import { DomainProvisioningService } from './domain-provisioning.service';
import { OrgOnboardingResolver } from './org-onboarding.resolver';
import { OrgAnalyticsService } from '../analytics/org-analytics.service';
import { AtRiskLearnerService } from '../analytics/at-risk-learner.service';
import { OrgGamificationService } from '../gamification/org-gamification.service';
import { OrgBadgeService } from '../gamification/org-badge.service';
import { ApiKeyService } from '../api-keys/api-key.service';
import { WebhookService } from '../webhooks/webhook.service';
import { KeycloakAdminService } from '../auth/keycloak-admin.service';

@Module({
  providers: [
    TenantResolver,
    TenantService,
    TenantLanguageService,
    TenantBrandingService,
    OrgProvisioningService,
    OrgInvitationService,
    TrialService,
    OrgLicensingService,
    DomainProvisioningService,
    OrgOnboardingResolver,
    OrgAnalyticsService,
    AtRiskLearnerService,
    OrgGamificationService,
    OrgBadgeService,
    ApiKeyService,
    WebhookService,
    KeycloakAdminService,
  ],
  exports: [
    TenantService,
    TenantLanguageService,
    TenantBrandingService,
    OrgProvisioningService,
    OrgInvitationService,
    TrialService,
    OrgLicensingService,
    DomainProvisioningService,
    OrgAnalyticsService,
    AtRiskLearnerService,
    OrgGamificationService,
    OrgBadgeService,
    ApiKeyService,
    WebhookService,
    KeycloakAdminService,
  ],
})
export class TenantModule {}
