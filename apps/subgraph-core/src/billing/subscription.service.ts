/**
 * subscription.service.ts — Tenant subscription lifecycle management.
 *
 * Reads/writes tenant_subscriptions + subscription_plans tables.
 * SI-9: all tenant-scoped queries use withTenantContext().
 * Memory safety: OnModuleDestroy closes all DB pools.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  schema,
  eq,
} from '@edusphere/db';
import type {
  Database,
  TenantContext,
  TenantSubscription,
  SubscriptionPlan,
} from '@edusphere/db';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'PILOT';

export interface SubscriptionWithPlan extends TenantSubscription {
  plan: SubscriptionPlan;
}

@Injectable()
export class SubscriptionService implements OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[SubscriptionService] onModuleDestroy: DB pools closed');
  }

  /**
   * Return the active subscription + plan for a tenant.
   * Throws NotFoundException if no subscription found.
   */
  async getTenantSubscription(
    tenantId: string,
    ctx: TenantContext
  ): Promise<SubscriptionWithPlan> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const [row] = await tx
        .select({
          sub: schema.tenantSubscriptions,
          plan: schema.subscriptionPlans,
        })
        .from(schema.tenantSubscriptions)
        .leftJoin(
          schema.subscriptionPlans,
          eq(schema.tenantSubscriptions.planId, schema.subscriptionPlans.id)
        )
        .where(eq(schema.tenantSubscriptions.tenantId, tenantId))
        .limit(1);

      if (!row?.sub) {
        throw new NotFoundException(
          `No subscription found for tenant ${tenantId}`
        );
      }

      return {
        ...row.sub,
        plan: row.plan as SubscriptionPlan,
      };
    });
  }

  /**
   * Return subscription status normalised to GraphQL enum value.
   */
  async getSubscriptionStatus(
    tenantId: string,
    ctx: TenantContext
  ): Promise<SubscriptionStatus> {
    try {
      const sub = await this.getTenantSubscription(tenantId, ctx);
      return sub.status.toUpperCase() as SubscriptionStatus;
    } catch {
      return 'TRIALING';
    }
  }

  /**
   * Check whether a tenant has an active pilot subscription.
   */
  async isPilotActive(tenantId: string, ctx: TenantContext): Promise<boolean> {
    try {
      const sub = await this.getTenantSubscription(tenantId, ctx);
      if (sub.status !== 'pilot') return false;
      if (!sub.pilotEndsAt) return false;
      return sub.pilotEndsAt > new Date();
    } catch {
      return false;
    }
  }

  /**
   * Check whether a pilot subscription has expired.
   */
  async isPilotExpired(tenantId: string, ctx: TenantContext): Promise<boolean> {
    try {
      const sub = await this.getTenantSubscription(tenantId, ctx);
      if (sub.status !== 'pilot') return false;
      if (!sub.pilotEndsAt) return false;
      return sub.pilotEndsAt <= new Date();
    } catch {
      return false;
    }
  }

  /**
   * Create a pilot subscription for a newly provisioned tenant.
   * Called by PilotService after approving a pilot request.
   */
  async createPilotSubscription(
    tenantId: string,
    planId: string,
    pilotEndsAt: Date,
    ctx: TenantContext
  ): Promise<TenantSubscription> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const now = new Date();
      const [created] = await tx
        .insert(schema.tenantSubscriptions)
        .values({
          tenantId,
          planId,
          status: 'pilot',
          pilotEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: pilotEndsAt,
        })
        .returning();

      if (!created) {
        throw new Error(
          `[SubscriptionService] Failed to create pilot subscription for ${tenantId}`
        );
      }

      this.logger.log(
        { tenantId, planId, pilotEndsAt },
        '[SubscriptionService] Pilot subscription created'
      );

      return created;
    });
  }

  /**
   * SC-04 (T-04): Guard against self-approval of pilot by an approver who belongs
   * to the same tenant as the target.  SUPER_ADMIN accounts must use the platform
   * tenant ID (not a regular org tenantId).  If approver tenantId === targetTenantId
   * it is a conflict of interest and the operation must be rejected.
   *
   * @param approverTenantId  - tenantId of the SUPER_ADMIN approving the pilot
   * @param targetTenantId    - tenantId of the org whose pilot is being approved
   */
  guardSelfApproval(approverTenantId: string, targetTenantId: string): void {
    // Self-Approval check: approver.tenantId must not equal targetTenantId
    if (approverTenantId === targetTenantId) {
      throw new ForbiddenException('Self-approval of pilot is not permitted');
    }
  }

  /**
   * List all tenant subscriptions — SUPER_ADMIN only.
   * Uses bypassRLS equivalent via SUPER_ADMIN role context.
   */
  async listAllSubscriptions(
    _ctx: TenantContext
  ): Promise<SubscriptionWithPlan[]> {
    const rows = await this.db
      .select({
        sub: schema.tenantSubscriptions,
        plan: schema.subscriptionPlans,
      })
      .from(schema.tenantSubscriptions)
      .leftJoin(
        schema.subscriptionPlans,
        eq(schema.tenantSubscriptions.planId, schema.subscriptionPlans.id)
      )
      .orderBy(schema.tenantSubscriptions.created_at);

    return rows.map((r) => ({
      ...r.sub,
      plan: r.plan as SubscriptionPlan,
    }));
  }
}
