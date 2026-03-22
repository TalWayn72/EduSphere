/**
 * MarketplaceCheckoutService — F-14 Content Marketplace Checkout
 *
 * Handles Stripe Checkout Sessions for course purchases and refunds.
 * Graceful degradation: returns mock session URL when STRIPE_SECRET_KEY is not set.
 *
 * Memory safety: implements OnModuleDestroy for DB pool cleanup.
 * RLS: all DB queries wrapped in withTenantContext (SI-9).
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
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
import { sql } from 'drizzle-orm';
import { StripeClient } from './stripe.client.js';

export interface CheckoutSessionResult {
  sessionUrl: string;
  sessionId: string;
}

const REFUND_WINDOW_DAYS = 14;

@Injectable()
export class MarketplaceCheckoutService implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceCheckoutService.name);
  private readonly db: Database;

  constructor(private readonly stripeClient: StripeClient) {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[MarketplaceCheckoutService] onModuleDestroy: cleaned up');
  }

  /**
   * Creates a Stripe Checkout Session for the given course listing.
   * Graceful degradation: returns mock URL if Stripe is not configured.
   */
  async createCheckoutSession(
    listingId: string,
    ctx: TenantContext
  ): Promise<CheckoutSessionResult> {
    // Lookup listing
    const [listing] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({
          id: schema.courseListings.id,
          courseId: schema.courseListings.courseId,
          priceCents: schema.courseListings.priceCents,
          currency: schema.courseListings.currency,
          isPublished: schema.courseListings.isPublished,
          revenueSplitPercent: schema.courseListings.revenueSplitPercent,
        })
        .from(schema.courseListings)
        .where(
          and(
            eq(schema.courseListings.id, listingId),
            eq(schema.courseListings.isPublished, true)
          )
        )
    );

    if (!listing) {
      throw new NotFoundException('Course listing not found or not published');
    }

    // Get course title for Stripe line item description
    const [course] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({ title: schema.courses.title })
        .from(schema.courses)
        .where(eq(schema.courses.id, listing.courseId))
    );

    const courseTitle = course?.title ?? 'Course';

    // Graceful degradation: mock session when Stripe is not configured
    if (!process.env['STRIPE_SECRET_KEY']) {
      this.logger.warn(
        { listingId, tenantId: ctx.tenantId },
        '[MarketplaceCheckoutService] STRIPE_SECRET_KEY not set — returning mock checkout session'
      );
      const mockSessionId = `mock_cs_${Date.now()}`;
      return {
        sessionUrl: `/admin/marketplace/success?session_id=${mockSessionId}`,
        sessionId: mockSessionId,
      };
    }

    const session = await this.stripeClient.createCheckoutSession({
      lineItems: [
        {
          name: courseTitle,
          amountCents: listing.priceCents,
          currency: listing.currency.toLowerCase(),
          quantity: 1,
        },
      ],
      metadata: {
        listingId,
        tenantId: ctx.tenantId,
        buyerUserId: ctx.userId,
        courseId: listing.courseId,
      },
      successUrl: `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/admin/marketplace/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env['FRONTEND_URL'] ?? 'http://localhost:5173'}/admin/marketplace`,
    });

    this.logger.log(
      { listingId, tenantId: ctx.tenantId, sessionId: session.id },
      '[MarketplaceCheckoutService] Checkout session created'
    );

    return {
      sessionUrl: session.url ?? '',
      sessionId: session.id,
    };
  }

  /**
   * Request a refund for a purchase within the 14-day refund window.
   */
  async requestRefund(
    purchaseId: string,
    ctx: TenantContext
  ): Promise<{
    id: string;
    listingId: string;
    courseTitle: string;
    price: number;
    status: string;
    createdAt: Date;
  }> {
    // Get purchase
    const [purchase] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.purchases)
        .where(
          and(
            eq(schema.purchases.id, purchaseId),
            eq(schema.purchases.tenantId, ctx.tenantId)
          )
        )
    );

    if (!purchase) {
      throw new NotFoundException('Purchase not found');
    }

    if (purchase.status === 'REFUNDED') {
      throw new BadRequestException('Purchase already refunded');
    }

    if (purchase.status !== 'COMPLETE') {
      throw new BadRequestException('Only completed purchases can be refunded');
    }

    // Check 14-day refund window
    const refundDeadline = new Date(purchase.purchasedAt);
    refundDeadline.setDate(refundDeadline.getDate() + REFUND_WINDOW_DAYS);
    if (new Date() > refundDeadline) {
      throw new BadRequestException(
        `Refund window of ${REFUND_WINDOW_DAYS} days has expired`
      );
    }

    // Call Stripe Refund API if configured
    if (process.env['STRIPE_SECRET_KEY'] && purchase.stripePaymentIntentId) {
      await this.stripeClient.createRefund(purchase.stripePaymentIntentId);
      this.logger.log(
        { purchaseId, paymentIntentId: purchase.stripePaymentIntentId },
        '[MarketplaceCheckoutService] Stripe refund created'
      );
    }

    // Update purchase status
    await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.purchases)
        .set({ status: 'REFUNDED' })
        .where(eq(schema.purchases.id, purchaseId))
    );

    // Get course title for response
    const [course] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({ title: schema.courses.title })
        .from(schema.courses)
        .where(eq(schema.courses.id, purchase.courseId))
    );

    this.logger.log(
      { purchaseId, tenantId: ctx.tenantId, userId: ctx.userId },
      '[MarketplaceCheckoutService] Purchase refunded'
    );

    return {
      id: purchase.id,
      listingId: purchase.courseId,
      courseTitle: course?.title ?? 'Course',
      price: purchase.amountCents / 100,
      status: 'REFUNDED',
      createdAt: purchase.purchasedAt,
    };
  }
}
