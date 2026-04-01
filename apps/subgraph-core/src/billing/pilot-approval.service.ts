/**
 * PilotApprovalService — approval/rejection logic for B2B pilot requests.
 *
 * Extracted from PilotService to keep each file under 300 lines.
 * Memory safety: OnModuleDestroy drains NATS + closes DB pools.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
} from '@edusphere/db';
import type { Database, PilotRequest, TenantContext } from '@edusphere/db';
import { connect } from 'nats';
import type { NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { RejectPilotSchema } from './billing.schemas.js';
import { SubscriptionService } from './subscription.service.js';

const SUBJ_APPROVED = 'EDUSPHERE.pilot.approved';
const SUBJ_REJECTED = 'EDUSPHERE.pilot.rejected';
const PILOT_DURATION_DAYS = 90;

@Injectable()
export class PilotApprovalService implements OnModuleDestroy {
  private readonly logger = new Logger(PilotApprovalService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;

  constructor(private readonly subscriptionService: SubscriptionService) {
    this.db = createDatabaseConnection();
    this.initNats().catch((err) =>
      this.logger.warn(
        { err },
        '[PilotApprovalService] NATS init skipped (non-fatal)'
      )
    );
  }

  private async initNats(): Promise<void> {
    this.nats = await connect(buildNatsOptions());
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.nats && !this.nats.isClosed()) {
        await this.nats.drain();
      }
    } catch (err) {
      this.logger.warn(
        { err },
        '[PilotApprovalService] NATS drain error on destroy'
      );
    }
    await closeAllPools();
  }

  async approvePilotRequest(
    requestId: string,
    approvedByUserId: string,
    ctx: TenantContext
  ): Promise<void> {
    if (ctx.userRole !== 'SUPER_ADMIN') {
      throw new UnauthorizedException(
        'Only SUPER_ADMIN can approve pilot requests'
      );
    }

    const [request] = await this.db
      .select()
      .from(schema.pilotRequests)
      .where(eq(schema.pilotRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new NotFoundException(`Pilot request ${requestId} not found`);
    }
    if (request.status !== 'pending') {
      throw new BadRequestException(
        `Pilot request is already ${request.status}`
      );
    }

    if (ctx.tenantId && request.tenantId && ctx.tenantId === request.tenantId) {
      throw new BadRequestException(
        "Self-approval of own organization's pilot request is not permitted"
      );
    }

    const tenantSlug = request.orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 63);

    const [newTenant] = await this.db
      .insert(schema.tenants)
      .values({
        name: request.orgName,
        slug: `${tenantSlug}-${Date.now()}`,
        plan: 'STARTER',
      })
      .returning();

    if (!newTenant) {
      throw new InternalServerErrorException(
        '[PilotApprovalService] Failed to provision tenant'
      );
    }

    const [pilotPlan] = await this.db
      .select()
      .from(schema.subscriptionPlans)
      .where(eq(schema.subscriptionPlans.isActive, true))
      .limit(1);

    if (!pilotPlan) {
      throw new InternalServerErrorException(
        '[PilotApprovalService] No active subscription plan found'
      );
    }

    const pilotEndsAt = new Date();
    pilotEndsAt.setDate(pilotEndsAt.getDate() + PILOT_DURATION_DAYS);

    const superCtx: TenantContext = {
      tenantId: newTenant.id,
      userId: approvedByUserId,
      userRole: 'SUPER_ADMIN',
    };

    await this.subscriptionService.createPilotSubscription(
      newTenant.id,
      pilotPlan.id,
      pilotEndsAt,
      superCtx
    );

    await this.db
      .update(schema.pilotRequests)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        tenantId: newTenant.id,
        pilotEndsAt,
      })
      .where(eq(schema.pilotRequests.id, requestId));

    this.publish(SUBJ_APPROVED, {
      requestId,
      tenantId: newTenant.id,
      orgName: request.orgName,
      contactEmail: request.contactEmail,
      pilotEndsAt: pilotEndsAt.toISOString(),
      approvedByUserId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      { requestId, tenantId: newTenant.id },
      '[PilotApprovalService] Pilot request approved and tenant provisioned'
    );
  }

  async rejectPilotRequest(
    requestId: string,
    reason: string | undefined,
    ctx: TenantContext
  ): Promise<void> {
    if (ctx.userRole !== 'SUPER_ADMIN') {
      throw new UnauthorizedException(
        'Only SUPER_ADMIN can reject pilot requests'
      );
    }

    const validated = RejectPilotSchema.safeParse({ requestId, reason });
    if (!validated.success) {
      throw new BadRequestException(validated.error.message);
    }

    const [request] = await this.db
      .select({
        id: schema.pilotRequests.id,
        status: schema.pilotRequests.status,
      })
      .from(schema.pilotRequests)
      .where(eq(schema.pilotRequests.id, requestId))
      .limit(1);

    if (!request) {
      throw new NotFoundException(`Pilot request ${requestId} not found`);
    }
    if (request.status !== 'pending') {
      throw new BadRequestException(
        `Pilot request is already ${request.status}`
      );
    }

    await this.db
      .update(schema.pilotRequests)
      .set({ status: 'rejected', notes: reason })
      .where(eq(schema.pilotRequests.id, requestId));

    this.publish(SUBJ_REJECTED, {
      requestId,
      reason: reason ?? null,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      { requestId },
      '[PilotApprovalService] Pilot request rejected'
    );
  }

  async listPilotRequests(status?: string): Promise<PilotRequest[]> {
    if (status) {
      return this.db
        .select()
        .from(schema.pilotRequests)
        .where(eq(schema.pilotRequests.status, status))
        .orderBy(schema.pilotRequests.created_at);
    }
    return this.db
      .select()
      .from(schema.pilotRequests)
      .orderBy(schema.pilotRequests.created_at);
  }

  private publish(subject: string, payload: Record<string, unknown>): void {
    if (!this.nats || this.nats.isClosed()) return;
    try {
      this.nats.publish(
        subject,
        new TextEncoder().encode(JSON.stringify(payload))
      );
    } catch (err) {
      this.logger.warn(
        { err, subject },
        '[PilotApprovalService] NATS publish failed'
      );
    }
  }
}
