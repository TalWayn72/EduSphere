/**
 * MarketplaceService — F-031 Instructor Marketplace + Revenue Sharing
 *
 * Handles course listings, Stripe payments, webhook processing,
 * earnings calculation, and instructor payouts.
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
  and,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { StripeClient } from './stripe.client.js';
import { MarketplaceEarningsService } from './marketplace.earnings.service.js';
import type {
  PurchaseResult,
  EarningsSummary,
  CourseListing,
  Purchase,
  InstructorPayout,
} from './marketplace.types.js';

const COURSE_ENROLLED_SUBJECT = 'EDUSPHERE.course.enrolled';

@Injectable()
export class MarketplaceService implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;

  constructor(
    private readonly stripeClient: StripeClient,
    private readonly earningsService: MarketplaceEarningsService
  ) {}

  async onModuleDestroy(): Promise<void> {
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
    this.logger.log('MarketplaceService destroyed - connections closed');
  }

  private async getNatsConnection(): Promise<NatsConnection> {
    if (!this.nc) {
      this.nc = await connect(buildNatsOptions());
    }
    return this.nc;
  }

  async createListing(
    courseId: string,
    priceCents: number,
    currency: string,
    revenueSplitPercent: number,
    tenantId: string
  ): Promise<CourseListing> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };
    const validCurrency = (currency as 'USD' | 'EUR' | 'ILS') ?? 'USD';
    const split = Math.min(100, Math.max(0, revenueSplitPercent));

    const [listing] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .insert(schema.courseListings)
        .values({
          courseId,
          tenantId,
          priceCents,
          currency: validCurrency,
          revenueSplitPercent: split,
        })
        .returning()
    );
    this.logger.log(
      { courseId, priceCents, currency, tenantId },
      'Course listing created'
    );
    return listing!;
  }

  async publishListing(courseId: string, tenantId: string): Promise<void> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.courseListings)
        .set({ isPublished: true })
        .where(
          and(
            eq(schema.courseListings.courseId, courseId),
            eq(schema.courseListings.tenantId, tenantId)
          )
        )
    );
    this.logger.log({ courseId, tenantId }, 'Course listing published');
  }

  async purchaseCourse(
    courseId: string,
    userId: string,
    tenantId: string,
    userEmail: string,
    userName: string
  ): Promise<PurchaseResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    // Check if already purchased (idempotency guard)
    const existing = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.purchases)
        .where(
          and(
            eq(schema.purchases.userId, userId),
            eq(schema.purchases.courseId, courseId),
            eq(schema.purchases.tenantId, tenantId),
            sql`${schema.purchases.status} = 'COMPLETE'`
          )
        )
    );
    if (existing.length > 0) {
      throw new BadRequestException('Course already purchased');
    }

    // Get listing
    const [listing] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.courseListings)
        .where(
          and(
            eq(schema.courseListings.courseId, courseId),
            eq(schema.courseListings.tenantId, tenantId),
            eq(schema.courseListings.isPublished, true)
          )
        )
    );
    if (!listing)
      throw new BadRequestException(
        'Course listing not found or not published'
      );

    const stripeCustomer = await this.getOrCreateStripeCustomer(
      userId,
      tenantId,
      userEmail,
      userName
    );
    const intent = await this.stripeClient.createPaymentIntent(
      listing.priceCents,
      listing.currency,
      stripeCustomer
    );

    await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.purchases).values({
        userId,
        courseId,
        tenantId,
        stripePaymentIntentId: intent.id,
        amountCents: listing.priceCents,
        status: 'PENDING',
      })
    );

    this.logger.log(
      { courseId, userId, tenantId, intentId: intent.id },
      'Purchase initiated'
    );
    return {
      clientSecret: intent.client_secret ?? '',
      paymentIntentId: intent.id,
    };
  }

  private async getOrCreateStripeCustomer(
    userId: string,
    tenantId: string,
    email: string,
    name: string
  ): Promise<string> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const [existing] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.stripeCustomers)
        .where(
          and(
            eq(schema.stripeCustomers.userId, userId),
            eq(schema.stripeCustomers.tenantId, tenantId)
          )
        )
    );
    if (existing) return existing.stripeCustomerId;

    const customer = await this.stripeClient.createCustomer(email, name);
    await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .insert(schema.stripeCustomers)
        .values({ userId, tenantId, stripeCustomerId: customer.id })
    );
    return customer.id;
  }

  async processWebhook(event: Stripe.Event, tenantId: string): Promise<void> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await withTenantContext(this.db, ctx, async (tx) =>
        tx
          .update(schema.purchases)
          .set({ status: 'COMPLETE' })
          .where(eq(schema.purchases.stripePaymentIntentId, intent.id))
      );
      await this.publishEnrollmentEvent(intent.id, tenantId, ctx);
      this.logger.log(
        { intentId: intent.id, tenantId },
        'Purchase marked COMPLETE'
      );
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await withTenantContext(this.db, ctx, async (tx) =>
        tx
          .update(schema.purchases)
          .set({ status: 'FAILED' })
          .where(eq(schema.purchases.stripePaymentIntentId, intent.id))
      );
      this.logger.warn(
        { intentId: intent.id, tenantId },
        'Purchase marked FAILED'
      );
    }
  }

  private async publishEnrollmentEvent(
    paymentIntentId: string,
    tenantId: string,
    ctx: TenantContext
  ): Promise<void> {
    const [purchase] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.purchases)
        .where(eq(schema.purchases.stripePaymentIntentId, paymentIntentId))
    );
    if (!purchase) return;

    try {
      const nc = await this.getNatsConnection();
      const payload = {
        courseId: purchase.courseId,
        userId: purchase.userId,
        tenantId: purchase.tenantId,
        purchaseId: purchase.id,
        timestamp: new Date().toISOString(),
      };
      nc.publish(
        COURSE_ENROLLED_SUBJECT,
        this.sc.encode(JSON.stringify(payload))
      );
      this.logger.log(
        { courseId: purchase.courseId, userId: purchase.userId },
        'Enrollment event published'
      );
    } catch (err) {
      this.logger.error({ err }, 'Failed to publish enrollment NATS event');
    }
  }

  async getListings(tenantId: string): Promise<CourseListing[]> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };
    return withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.courseListings)
        .where(
          and(
            eq(schema.courseListings.tenantId, tenantId),
            eq(schema.courseListings.isPublished, true)
          )
        )
    );
  }

  async getUserPurchases(
    userId: string,
    tenantId: string
  ): Promise<Purchase[]> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.purchases)
        .where(
          and(
            eq(schema.purchases.userId, userId),
            eq(schema.purchases.tenantId, tenantId)
          )
        )
    );
  }

  async getInstructorEarnings(
    instructorId: string,
    tenantId: string
  ): Promise<EarningsSummary> {
    return this.earningsService.getInstructorEarnings(instructorId, tenantId);
  }

  async requestPayout(
    instructorId: string,
    tenantId: string
  ): Promise<InstructorPayout> {
    return this.earningsService.requestPayout(
      instructorId,
      tenantId,
      this.stripeClient
    );
  }
}
