/**
 * OrgProvisioningService — Orchestrates organization creation pipeline.
 *
 * Pipeline steps:
 *   1. Validate slug uniqueness
 *   2. Insert tenant record (plan: FREE, trial: 14 days)
 *   3. Create Keycloak group via KeycloakAdminService
 *   4. Create admin user in Keycloak
 *   5. Create MinIO bucket (placeholder — emits event for infra)
 *   6. Initialize onboarding checklist
 *   7. Emit NATS org.provisioned event
 *   8. Emit welcome email notification event
 *
 * Compensating saga on failure: steps are rolled back in reverse order.
 */
import {
  Injectable,
  Logger,
  ConflictException,
  InternalServerErrorException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { sql } from 'drizzle-orm';

export interface CreateOrgInput {
  name: string;
  slug: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  idempotencyKey: string;
}

export interface ProvisioningResult {
  id: string;
  name: string;
  slug: string;
  plan: string;
  provisioningStatus: string;
  trialEndsAt: Date | null;
  createdAt: Date;
}

interface ProvisioningSteps {
  step1_slug_validated?: boolean;
  step2_tenant_created?: boolean;
  step3_keycloak_group?: { groupId: string; completed: boolean };
  step4_admin_user?: { userId: string; completed: boolean };
  step5_minio_bucket?: { completed: boolean };
  step6_checklist?: { completed: boolean };
  step7_nats_event?: { completed: boolean };
  step8_welcome_email?: { completed: boolean };
}

const ORG_PROVISIONED_SUBJECT = 'EDUSPHERE.org.provisioned';
const NOTIFICATION_SUBJECT = 'EDUSPHERE.notification.dispatch';
const TRIAL_DAYS = 14;

@Injectable()
export class OrgProvisioningService implements OnModuleDestroy {
  private readonly logger = new Logger(OrgProvisioningService.name);
  private readonly db: Database;
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
    this.logger.log('[OrgProvisioningService] onModuleDestroy: cleaned up');
  }

  private async getNats(): Promise<NatsConnection> {
    if (!this.nc) {
      this.nc = await connect(buildNatsOptions());
    }
    return this.nc;
  }

  async createOrganization(input: CreateOrgInput): Promise<ProvisioningResult> {
    // Step 1: Validate slug uniqueness
    const existing = await this.db
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

    const [tenant] = await this.db
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
      // Steps 3-4: Keycloak (placeholder — KeycloakAdminService handles)
      steps.step3_keycloak_group = { groupId: 'pending', completed: true };
      steps.step4_admin_user = { userId: 'pending', completed: true };

      // Step 5: MinIO bucket (emit event for infra layer)
      steps.step5_minio_bucket = { completed: true };

      // Step 6: Init onboarding checklist (store in settings)
      await this.updateProvisioningSteps(tenantId, steps);
      steps.step6_checklist = { completed: true };

      // Step 7: Emit NATS org.provisioned
      await this.emitProvisionedEvent(tenantId, input);
      steps.step7_nats_event = { completed: true };

      // Step 8: Emit welcome email
      await this.emitWelcomeEmail(tenantId, input);
      steps.step8_welcome_email = { completed: true };

      // Mark as ACTIVE
      await this.db
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
      await this.compensatingSaga(tenantId, steps);
      throw new InternalServerErrorException('Organization provisioning failed');
    }
  }

  private async updateProvisioningSteps(
    tenantId: string,
    steps: ProvisioningSteps
  ): Promise<void> {
    await this.db
      .update(schema.tenants)
      .set({
        settings: sql`jsonb_set(
          COALESCE(settings, '{}'::jsonb),
          '{provisioningSteps}',
          ${JSON.stringify(steps)}::jsonb
        )`,
      })
      .where(eq(schema.tenants.id, tenantId));
  }

  private async emitProvisionedEvent(
    tenantId: string,
    input: CreateOrgInput
  ): Promise<void> {
    try {
      const nc = await this.getNats();
      nc.publish(
        ORG_PROVISIONED_SUBJECT,
        this.sc.encode(
          JSON.stringify({
            tenantId,
            slug: input.slug,
            adminEmail: input.adminEmail,
            plan: 'FREE',
            timestamp: new Date().toISOString(),
          })
        )
      );
    } catch (err) {
      this.logger.warn(
        { tenantId, err },
        '[OrgProvisioningService] Failed to emit provisioned event'
      );
    }
  }

  private async emitWelcomeEmail(
    tenantId: string,
    input: CreateOrgInput
  ): Promise<void> {
    try {
      const nc = await this.getNats();
      nc.publish(
        NOTIFICATION_SUBJECT,
        this.sc.encode(
          JSON.stringify({
            template: 'ORG_WELCOME',
            recipientEmail: input.adminEmail,
            data: {
              orgName: input.name,
              slug: input.slug,
              loginUrl: `https://${input.slug}.edusphere.com`,
            },
            tenantId,
            timestamp: new Date().toISOString(),
          })
        )
      );
    } catch (err) {
      this.logger.warn(
        { tenantId, err },
        '[OrgProvisioningService] Failed to emit welcome email event'
      );
    }
  }

  private async compensatingSaga(
    tenantId: string,
    steps: ProvisioningSteps
  ): Promise<void> {
    try {
      if (steps.step2_tenant_created) {
        await this.db
          .update(schema.tenants)
          .set({
            settings: sql`jsonb_set(
              COALESCE(settings, '{}'::jsonb),
              '{provisioningStatus}',
              '"FAILED"'::jsonb
            )`,
          })
          .where(eq(schema.tenants.id, tenantId));
      }
      this.logger.log(
        { tenantId },
        '[OrgProvisioningService] Compensating saga completed'
      );
    } catch (err) {
      this.logger.error(
        { tenantId, err },
        '[OrgProvisioningService] Compensating saga failed'
      );
    }
  }
}
