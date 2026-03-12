/**
 * pilot.service.ts — B2B pilot request workflow.
 *
 * submitPilotRequest: public endpoint — validates input, inserts pilot_requests,
 *   emits 'pilot.request_submitted' NATS event.
 * approvePilotRequest: SUPER_ADMIN — creates tenant + pilot subscription,
 *   updates pilot_request status, emits 'pilot.approved'.
 * rejectPilotRequest: SUPER_ADMIN — marks request rejected.
 * listPilotRequests: SUPER_ADMIN — paginated list by status.
 *
 * Memory safety: OnModuleDestroy drains NATS + closes DB pools.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
} from '@edusphere/db';
import type { Database, PilotRequest, TenantContext } from '@edusphere/db';
import { connect } from 'nats';
import type { NatsConnection } from 'nats';
import { PilotRequestSchema, RejectPilotSchema } from './billing.schemas.js';
import { SubscriptionService } from './subscription.service.js';

const SUBJ_SUBMITTED = 'EDUSPHERE.pilot.request_submitted';
const SUBJ_APPROVED = 'EDUSPHERE.pilot.approved';
const SUBJ_REJECTED = 'EDUSPHERE.pilot.rejected';

const PILOT_DURATION_DAYS = 90;

@Injectable()
export class PilotService implements OnModuleDestroy {
  private readonly logger = new Logger(PilotService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;

  constructor(private readonly subscriptionService: SubscriptionService) {
    this.db = createDatabaseConnection();
    this.initNats().catch((err) =>
      this.logger.warn({ err }, '[PilotService] NATS init skipped (non-fatal)')
    );
  }

  private async initNats(): Promise<void> {
    const natsUrl = process.env['NATS_URL'] ?? 'nats://localhost:4222';
    this.nats = await connect({ servers: natsUrl });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.nats && !this.nats.isClosed()) {
        await this.nats.drain();
      }
    } catch (err) {
      this.logger.warn({ err }, '[PilotService] NATS drain error on destroy');
    }
    await closeAllPools();
  }

  /**
   * Public: submit a pilot request (no auth required).
   */
  async submitPilotRequest(input: unknown): Promise<PilotRequest> {
    const validated = PilotRequestSchema.safeParse(input);
    if (!validated.success) {
      throw new BadRequestException(
        `Invalid pilot request: ${validated.error.message}`
      );
    }
    const data = validated.data;

    const [existing] = await this.db
      .select({ id: schema.pilotRequests.id })
      .from(schema.pilotRequests)
      .where(
        and(
          eq(schema.pilotRequests.contactEmail, data.contactEmail),
          eq(schema.pilotRequests.status, 'pending')
        )
      )
      .limit(1);

    if (existing) {
      // SC-07 (T-12): Prevent email enumeration — return the same success path
      // regardless of whether the email already has a pending request.
      // Log server-side only; never expose "already exists" to the caller.
      this.logger.log(
        { contactEmail: data.contactEmail },
        '[PilotService] Duplicate pilot request suppressed (email enumeration prevention)'
      );
      // Return a stable PENDING_APPROVAL response without exposing the duplicate
      return {
        id: existing.id,
        orgName: data.orgName,
        orgType: data.orgType.toLowerCase(),
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone ?? null,
        estimatedUsers: data.estimatedUsers,
        useCase: data.useCase,
        status: 'pending',
        approvedAt: null,
        tenantId: null,
        pilotEndsAt: null,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
      } as unknown as PilotRequest;
    }

    const [created] = await this.db
      .insert(schema.pilotRequests)
      .values({
        orgName: data.orgName,
        orgType: data.orgType.toLowerCase(),
        contactName: data.contactName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
        estimatedUsers: data.estimatedUsers,
        useCase: data.useCase,
        status: 'pending',
      })
      .returning();

    if (!created) {
      throw new Error('[PilotService] Failed to insert pilot_request row');
    }

    this.publish(SUBJ_SUBMITTED, {
      requestId: created.id,
      orgName: created.orgName,
      contactEmail: created.contactEmail,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(
      { requestId: created.id, orgName: created.orgName },
      // SC-07: Always log as PENDING_APPROVAL (generic status for audit trail)
      '[PilotService] Pilot request submitted — status: PENDING_APPROVAL'
    );

    return created;
  }

  /**
   * SUPER_ADMIN: approve a pilot request, provision tenant + subscription.
   */
  async approvePilotRequest(
    requestId: string,
    approvedByUserId: string,
    ctx: TenantContext
  ): Promise<void> {
    if (ctx.userRole !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Only SUPER_ADMIN can approve pilot requests');
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

    // SC-04 (T-04): Self-approval prevention — approver's tenantId must not match
    // the target tenant. SUPER_ADMIN accounts on the platform have a platform tenantId;
    // if somehow a SUPER_ADMIN has the same tenantId as the org being approved,
    // that would be a conflict of interest (self-approval of pilot).
    if (ctx.tenantId && request.tenantId && ctx.tenantId === request.tenantId) {
      throw new BadRequestException(
        'Self-approval of own organization\'s pilot request is not permitted'
      );
    }

    // Provision new tenant
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
      throw new Error('[PilotService] Failed to provision tenant');
    }

    // Find or fallback to first active plan for pilot
    const [pilotPlan] = await this.db
      .select()
      .from(schema.subscriptionPlans)
      .where(eq(schema.subscriptionPlans.isActive, true))
      .limit(1);

    if (!pilotPlan) {
      throw new Error('[PilotService] No active subscription plan found');
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

    // Update pilot request status
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
      '[PilotService] Pilot request approved and tenant provisioned'
    );
  }

  /**
   * SUPER_ADMIN: reject a pilot request.
   */
  async rejectPilotRequest(
    requestId: string,
    reason: string | undefined,
    ctx: TenantContext
  ): Promise<void> {
    if (ctx.userRole !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Only SUPER_ADMIN can reject pilot requests');
    }

    const validated = RejectPilotSchema.safeParse({ requestId, reason });
    if (!validated.success) {
      throw new BadRequestException(validated.error.message);
    }

    const [request] = await this.db
      .select({ id: schema.pilotRequests.id, status: schema.pilotRequests.status })
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

    this.logger.log({ requestId }, '[PilotService] Pilot request rejected');
  }

  /**
   * SUPER_ADMIN: list pilot requests optionally filtered by status.
   */
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
      this.logger.warn({ err, subject }, '[PilotService] NATS publish failed');
    }
  }
}
