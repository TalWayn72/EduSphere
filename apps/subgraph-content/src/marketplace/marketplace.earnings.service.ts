/**
 * MarketplaceEarningsService — earnings calculation and payout processing
 * Split from MarketplaceService to keep files under 150 lines.
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { sql } from 'drizzle-orm';
import type { StripeClient } from './stripe.client.js';
import type {
  EarningsSummary,
  InstructorPayout,
  Purchase,
} from './marketplace.types.js';

@Injectable()
export class MarketplaceEarningsService {
  private readonly logger = new Logger(MarketplaceEarningsService.name);
  private readonly db = createDatabaseConnection();

  async getInstructorEarnings(
    instructorId: string,
    tenantId: string
  ): Promise<EarningsSummary> {
    const ctx: TenantContext = {
      tenantId,
      userId: instructorId,
      userRole: 'INSTRUCTOR',
    };

    // Get all courses owned by this instructor with their listings and purchases
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({
          purchaseId: schema.purchases.id,
          courseId: schema.purchases.courseId,
          amountCents: schema.purchases.amountCents,
          status: schema.purchases.status,
          purchasedAt: schema.purchases.purchasedAt,
          userId: schema.purchases.userId,
          tenantId: schema.purchases.tenantId,
          stripePaymentIntentId: schema.purchases.stripePaymentIntentId,
          revenueSplitPercent: schema.courseListings.revenueSplitPercent,
        })
        .from(schema.purchases)
        .innerJoin(
          schema.courseListings,
          and(
            eq(schema.purchases.courseId, schema.courseListings.courseId),
            eq(schema.purchases.tenantId, schema.courseListings.tenantId)
          )
        )
        .innerJoin(
          schema.courses,
          and(
            eq(schema.purchases.courseId, schema.courses.id),
            sql`${schema.courses.instructor_id}::text = ${instructorId}`
          )
        )
        .where(
          and(
            eq(schema.purchases.tenantId, tenantId),
            sql`${schema.purchases.status} = 'COMPLETE'`
          )
        )
    );

    // Calculate payout totals
    const payouts = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.instructorPayouts)
        .where(
          and(
            eq(schema.instructorPayouts.instructorId, instructorId),
            eq(schema.instructorPayouts.tenantId, tenantId)
          )
        )
    );

    const paidOutCents = payouts
      .filter((p) => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amountCents, 0);

    const totalEarnedCents = rows.reduce((sum, r) => {
      const split = r.revenueSplitPercent ?? 70;
      return sum + Math.floor((r.amountCents * split) / 100);
    }, 0);

    const pendingPayoutCents = Math.max(0, totalEarnedCents - paidOutCents);

    const purchases: Purchase[] = rows.map((r) => ({
      id: r.purchaseId,
      courseId: r.courseId,
      userId: r.userId,
      tenantId: r.tenantId,
      stripePaymentIntentId: r.stripePaymentIntentId,
      amountCents: r.amountCents,
      status: r.status,
      purchasedAt: r.purchasedAt,
    }));

    return { totalEarnedCents, pendingPayoutCents, paidOutCents, purchases };
  }

  async requestPayout(
    instructorId: string,
    tenantId: string,
    stripeClient: StripeClient
  ): Promise<InstructorPayout> {
    const ctx: TenantContext = {
      tenantId,
      userId: instructorId,
      userRole: 'INSTRUCTOR',
    };
    const earnings = await this.getInstructorEarnings(instructorId, tenantId);

    if (earnings.pendingPayoutCents <= 0) {
      throw new BadRequestException('No pending earnings available for payout');
    }

    const instructorStripeAccountId =
      process.env['INSTRUCTOR_STRIPE_ACCOUNT_' + instructorId];
    let stripeTransferId: string | undefined;

    if (instructorStripeAccountId) {
      const transfer = await stripeClient.createTransfer(
        earnings.pendingPayoutCents,
        instructorStripeAccountId,
        `EduSphere payout for instructor ${instructorId}`
      );
      stripeTransferId = transfer.id;
    } else {
      this.logger.warn(
        { instructorId },
        'No Stripe account ID found for instructor — payout recorded without transfer'
      );
    }

    const periodEnd = new Date();
    const periodStart = new Date(
      periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000
    );

    const [payout] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .insert(schema.instructorPayouts)
        .values({
          instructorId,
          tenantId,
          stripeTransferId: stripeTransferId ?? null,
          amountCents: earnings.pendingPayoutCents,
          periodStart,
          periodEnd,
          status: stripeTransferId ? 'PAID' : 'PENDING',
        })
        .returning()
    );

    this.logger.log(
      {
        instructorId,
        amountCents: earnings.pendingPayoutCents,
        stripeTransferId,
      },
      'Instructor payout created'
    );
    return payout!;
  }
}
