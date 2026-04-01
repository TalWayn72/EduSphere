/**
 * MarketplacePurchaseService — Purchase flow and webhook processing.
 *
 * Handles course purchases, Stripe payment intents, webhook processing,
 * and enrollment event publishing via NATS.
 */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { schema, eq, and, withTenantContext } from '@edusphere/db';
import type { TenantContext, Database } from '@edusphere/db';
import { StringCodec, type NatsConnection } from 'nats';
import { sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { StripeClient } from './stripe.client.js';
import type { PurchaseResult, Purchase } from './marketplace.types.js';

const COURSE_ENROLLED_SUBJECT = 'EDUSPHERE.course.enrolled';

@Injectable()
export class MarketplacePurchaseService {
  private readonly logger = new Logger(MarketplacePurchaseService.name);
  private readonly sc = StringCodec();

  constructor(private readonly stripeClient: StripeClient) {}

  async purchaseCourse(
    db: Database,
    courseId: string,
    userId: string,
    tenantId: string,
    userEmail: string,
    userName: string
  ): Promise<PurchaseResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const existing = await withTenantContext(db, ctx, async (tx) =>
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

    const [listing] = await withTenantContext(db, ctx, async (tx) =>
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
      db,
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

    await withTenantContext(db, ctx, async (tx) =>
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
    db: Database,
    userId: string,
    tenantId: string,
    email: string,
    name: string
  ): Promise<string> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const [existing] = await withTenantContext(db, ctx, async (tx) =>
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
    await withTenantContext(db, ctx, async (tx) =>
      tx
        .insert(schema.stripeCustomers)
        .values({ userId, tenantId, stripeCustomerId: customer.id })
    );
    return customer.id;
  }

  async processWebhook(
    db: Database,
    event: Stripe.Event,
    tenantId: string,
    getNatsConnection: () => Promise<NatsConnection>
  ): Promise<void> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await withTenantContext(db, ctx, async (tx) =>
        tx
          .update(schema.purchases)
          .set({ status: 'COMPLETE' })
          .where(eq(schema.purchases.stripePaymentIntentId, intent.id))
      );
      await this.publishEnrollmentEvent(
        db,
        intent.id,
        tenantId,
        ctx,
        getNatsConnection
      );
      this.logger.log(
        { intentId: intent.id, tenantId },
        'Purchase marked COMPLETE'
      );
    } else if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await withTenantContext(db, ctx, async (tx) =>
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
    db: Database,
    paymentIntentId: string,
    tenantId: string,
    ctx: TenantContext,
    getNatsConnection: () => Promise<NatsConnection>
  ): Promise<void> {
    const [purchase] = await withTenantContext(db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.purchases)
        .where(eq(schema.purchases.stripePaymentIntentId, paymentIntentId))
    );
    if (!purchase) return;

    try {
      const nc = await getNatsConnection();
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

  async getUserPurchases(
    db: Database,
    userId: string,
    tenantId: string
  ): Promise<Purchase[]> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(db, ctx, async (tx) =>
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
}
