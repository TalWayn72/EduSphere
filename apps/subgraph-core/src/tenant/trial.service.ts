/**
 * TrialService — Manages trial lifecycle for organizations.
 *
 * Features:
 *   - Check trial status (active, expiring soon, expired)
 *   - Grace period management (7 days after trial ends)
 *   - Plan downgrade on trial expiry (FREE plan, features restricted)
 *   - Trial extension (admin action)
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  sql,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';

export interface TrialStatus {
  isTrialing: boolean;
  trialEndsAt: Date | null;
  daysRemaining: number;
  isInGracePeriod: boolean;
  gracePeriodEndsAt: Date | null;
}

const GRACE_PERIOD_DAYS = 7;

@Injectable()
export class TrialService implements OnModuleDestroy {
  private readonly logger = new Logger(TrialService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[TrialService] onModuleDestroy: cleaned up');
  }

  async getTrialStatus(tenantId: string): Promise<TrialStatus> {
    const [tenant] = await this.db
      .select({
        id: schema.tenants.id,
        settings: schema.tenants.settings,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const settings = tenant.settings as Record<string, unknown> | null;
    const trialEndsAtStr = settings?.trialEndsAt as string | undefined;

    if (!trialEndsAtStr) {
      return {
        isTrialing: false,
        trialEndsAt: null,
        daysRemaining: 0,
        isInGracePeriod: false,
        gracePeriodEndsAt: null,
      };
    }

    const trialEndsAt = new Date(trialEndsAtStr);
    const now = new Date();
    const diffMs = trialEndsAt.getTime() - now.getTime();
    const daysRemaining = Math.max(
      0,
      Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    );

    const gracePeriodEndsAt = new Date(trialEndsAt);
    gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + GRACE_PERIOD_DAYS);

    const isTrialing = now < trialEndsAt;
    const isInGracePeriod = !isTrialing && now < gracePeriodEndsAt;

    return {
      isTrialing,
      trialEndsAt,
      daysRemaining,
      isInGracePeriod,
      gracePeriodEndsAt: isInGracePeriod ? gracePeriodEndsAt : null,
    };
  }

  async extendTrial(
    tenantId: string,
    additionalDays: number
  ): Promise<TrialStatus> {
    if (additionalDays < 1 || additionalDays > 90) {
      throw new BadRequestException('Extension must be between 1 and 90 days');
    }

    const [tenant] = await this.db
      .select({ settings: schema.tenants.settings })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);

    if (!tenant) {
      throw new BadRequestException('Tenant not found');
    }

    const settings = (tenant.settings as Record<string, unknown>) ?? {};
    const currentTrialEnd = settings.trialEndsAt
      ? new Date(settings.trialEndsAt as string)
      : new Date();

    const newTrialEnd = new Date(
      Math.max(currentTrialEnd.getTime(), Date.now())
    );
    newTrialEnd.setDate(newTrialEnd.getDate() + additionalDays);

    await this.db
      .update(schema.tenants)
      .set({
        settings: sql`jsonb_set(
          COALESCE(settings, '{}'::jsonb),
          '{trialEndsAt}',
          ${JSON.stringify(newTrialEnd.toISOString())}::jsonb
        )`,
      })
      .where(eq(schema.tenants.id, tenantId));

    this.logger.log(
      { tenantId, additionalDays, newTrialEnd: newTrialEnd.toISOString() },
      '[TrialService] Trial extended'
    );

    return this.getTrialStatus(tenantId);
  }

  async expireTrial(tenantId: string): Promise<void> {
    await this.db
      .update(schema.tenants)
      .set({ plan: 'FREE' })
      .where(eq(schema.tenants.id, tenantId));

    this.logger.log(
      { tenantId },
      '[TrialService] Trial expired — downgraded to FREE'
    );
  }
}
