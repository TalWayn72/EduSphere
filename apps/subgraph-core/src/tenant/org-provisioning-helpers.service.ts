/**
 * OrgProvisioningHelpersService — NATS events, saga compensation, and
 * provisioning step tracking for organization creation pipeline.
 * Extracted from OrgProvisioningService to keep files under 300 lines.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
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
import type {
  CreateOrgInput,
  ProvisioningSteps,
} from './org-provisioning.types';

const ORG_PROVISIONED_SUBJECT = 'EDUSPHERE.org.provisioned';
const NOTIFICATION_SUBJECT = 'EDUSPHERE.notification.dispatch';

@Injectable()
export class OrgProvisioningHelpersService implements OnModuleDestroy {
  private readonly logger = new Logger(OrgProvisioningHelpersService.name);
  readonly db: Database;
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
    this.logger.log(
      '[OrgProvisioningHelpersService] onModuleDestroy: cleaned up'
    );
  }

  private async getNats(): Promise<NatsConnection> {
    if (!this.nc) {
      this.nc = await connect(buildNatsOptions());
    }
    return this.nc;
  }

  async updateProvisioningSteps(
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

  async emitProvisionedEvent(
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
        '[OrgProvisioningHelpersService] Failed to emit provisioned event'
      );
    }
  }

  async emitWelcomeEmail(
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
        '[OrgProvisioningHelpersService] Failed to emit welcome email event'
      );
    }
  }

  async compensatingSaga(
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
        '[OrgProvisioningHelpersService] Compensating saga completed'
      );
    } catch (err) {
      this.logger.error(
        { tenantId, err },
        '[OrgProvisioningHelpersService] Compensating saga failed'
      );
    }
  }
}
