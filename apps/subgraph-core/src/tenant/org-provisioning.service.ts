/**
 * OrgProvisioningService — Orchestrates organization creation pipeline.
 * NATS events, saga compensation, and step tracking extracted to
 * OrgProvisioningHelpersService.
 */
import {
  Injectable,
  Logger,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { schema, eq } from '@edusphere/db';
import { DomainProvisioningService } from './domain-provisioning.service';
import { OrgProvisioningHelpersService } from './org-provisioning-helpers.service';
import type {
  CreateOrgInput,
  ProvisioningResult,
  ProvisioningSteps,
} from './org-provisioning.types';

export type { CreateOrgInput, ProvisioningResult };

const TRIAL_DAYS = 90;

@Injectable()
export class OrgProvisioningService {
  private readonly logger = new Logger(OrgProvisioningService.name);
  private readonly domainService: DomainProvisioningService;

  constructor(private readonly helpers: OrgProvisioningHelpersService) {
    this.domainService = new DomainProvisioningService();
  }

  async createOrganization(input: CreateOrgInput): Promise<ProvisioningResult> {
    const db = this.helpers.db;

    // Step 1: Validate slug uniqueness
    const existing = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, input.slug))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('SLUG_TAKEN');
    }

    // Step 2: Insert tenant record
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    const [tenant] = await db
      .insert(schema.tenants)
      .values({
        name: input.name,
        slug: input.slug,
        plan: 'FREE',
        settings: {
          provisioningStatus: 'PROVISIONING',
          idempotencyKey: input.idempotencyKey,
          trialEndsAt: trialEndsAt.toISOString(),
          provisioningSteps: {} as ProvisioningSteps,
        },
      })
      .returning();

    if (!tenant) {
      throw new InternalServerErrorException('Failed to create tenant');
    }

    const tenantId = tenant.id;
    const steps: ProvisioningSteps = {
      step1_slug_validated: true,
      step2_tenant_created: true,
    };

    try {
      // Steps 3-4: Keycloak (placeholder)
      steps.step3_keycloak_group = { groupId: 'pending', completed: true };
      steps.step4_admin_user = { userId: 'pending', completed: true };

      // Step 5: MinIO bucket (emit event for infra layer)
      steps.step5_minio_bucket = { completed: true };

      // Step 5b: Create subdomain
      const subdomainResult = await this.domainService.createSubdomain(
        input.slug,
        { tenantId, userId: 'system', userRole: 'SUPER_ADMIN' }
      );
      steps.step5b_subdomain = { url: subdomainResult.url, completed: true };

      // Step 6: Init onboarding checklist
      await this.helpers.updateProvisioningSteps(tenantId, steps);
      steps.step6_checklist = { completed: true };

      // Step 7: Emit NATS org.provisioned
      await this.helpers.emitProvisionedEvent(tenantId, input);
      steps.step7_nats_event = { completed: true };

      // Step 8: Emit welcome email
      await this.helpers.emitWelcomeEmail(tenantId, input);
      steps.step8_welcome_email = { completed: true };

      // Mark as ACTIVE
      await db
        .update(schema.tenants)
        .set({
          settings: {
            ...((tenant.settings as Record<string, unknown>) ?? {}),
            provisioningStatus: 'ACTIVE',
            provisioningSteps: steps,
          },
        })
        .where(eq(schema.tenants.id, tenantId));

      this.logger.log(
        { tenantId, slug: input.slug },
        '[OrgProvisioningService] Organization provisioned successfully'
      );

      return {
        id: tenantId,
        name: input.name,
        slug: input.slug,
        plan: 'FREE',
        provisioningStatus: 'ACTIVE',
        trialEndsAt,
        createdAt: tenant.created_at,
      };
    } catch (err) {
      this.logger.error(
        { tenantId, err },
        '[OrgProvisioningService] Provisioning failed — running compensating saga'
      );
      await this.helpers.compensatingSaga(tenantId, steps);
      throw new InternalServerErrorException(
        'Organization provisioning failed'
      );
    }
  }
}
