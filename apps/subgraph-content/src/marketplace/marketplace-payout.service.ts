/**
 * MarketplacePayoutService — F-14 Revenue Split & Payout
 *
 * On purchase completion: calculates instructor share based on listing revenueSplitPercent.
 * Creates instructor_payouts record with status PENDING.
 * processPayouts(): monthly batch job to create Stripe Transfers for PENDING payouts.
 *
 * Memory safety: implements OnModuleDestroy for DB pool cleanup.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
// sql import available for future raw queries
// import { sql } from 'drizzle-orm';
import { StripeClient } from './stripe.client.js';

@Injectable()
export class MarketplacePayoutService implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplacePayoutService.name);
  private readonly db: Database;

  constructor(private readonly stripeClient: StripeClient) {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[MarketplacePayoutService] onModuleDestroy: cleaned up');
  }

  /**
   * Record revenue split for a completed purchase.
   * Called after checkout.session.completed webhook.
   */
  async recordRevenueSplit(
    purchaseId: string,
    courseId: string,
    instructorId: string,
    amountCents: number,
    revenueSplitPercent: number,
    tenantId: string
  ): Promise<void> {
    const instructorShare = Math.round(
      amountCents * (revenueSplitPercent / 100)
    );

    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };

    const periodEnd = new Date();
    const periodStart = new Date(
      periodEnd.getFullYear(),
      periodEnd.getMonth(),
      1
    );

    await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.instructorPayouts).values({
        instructorId,
        tenantId,
        amountCents: instructorShare,
        periodStart,
        periodEnd,
        status: 'PENDING',
      })
    );

    this.logger.log(
      {
        purchaseId,
        courseId,
        instructorId,
        instructorShare,
        tenantId,
      },
      '[MarketplacePayoutService] Revenue split recorded'
    );
  }

  /**
   * Batch job: process all PENDING payouts by creating Stripe Transfers.
   * Intended to run monthly via cron or manual trigger.
   */
  async processPayouts(tenantId: string): Promise<number> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };

    const pendingPayouts = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.instructorPayouts)
        .where(
          and(
            eq(schema.instructorPayouts.tenantId, tenantId),
            eq(schema.instructorPayouts.status, 'PENDING')
          )
        )
    );

    let processed = 0;

    for (const payout of pendingPayouts) {
      const stripeAccountId =
        process.env[`INSTRUCTOR_STRIPE_ACCOUNT_${payout.instructorId}`];

      if (!stripeAccountId) {
        this.logger.warn(
          { instructorId: payout.instructorId, payoutId: payout.id },
          '[MarketplacePayoutService] No Stripe account for instructor — skipping'
        );
        continue;
      }

      try {
        const transfer = await this.stripeClient.createTransfer(
          payout.amountCents,
          stripeAccountId,
          `EduSphere marketplace payout ${payout.id}`
        );

        await withTenantContext(this.db, ctx, async (tx) =>
          tx
            .update(schema.instructorPayouts)
            .set({
              status: 'PAID',
              stripeTransferId: transfer.id,
            })
            .where(eq(schema.instructorPayouts.id, payout.id))
        );

        processed++;
        this.logger.log(
          { payoutId: payout.id, transferId: transfer.id },
          '[MarketplacePayoutService] Payout transferred'
        );
      } catch (err) {
        this.logger.error(
          { err, payoutId: payout.id },
          '[MarketplacePayoutService] Stripe transfer failed'
        );

        await withTenantContext(this.db, ctx, async (tx) =>
          tx
            .update(schema.instructorPayouts)
            .set({ status: 'FAILED' })
            .where(eq(schema.instructorPayouts.id, payout.id))
        );
      }
    }

    this.logger.log(
      { tenantId, total: pendingPayouts.length, processed },
      '[MarketplacePayoutService] Batch payout processing complete'
    );
    return processed;
  }
}
