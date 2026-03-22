/**
 * MarketplaceController — Stripe webhook endpoint
 *
 * IMPORTANT: Raw body preservation is REQUIRED for Stripe signature verification.
 * The NestJS app must be bootstrapped with rawBody: true (in main.ts),
 * or the global body parser must be disabled and re-applied with `verify` callback
 * so that req.rawBody is available.
 *
 * In main.ts add:
 *   const app = await NestFactory.create(AppModule, { rawBody: true });
 *
 * See: https://docs.nestjs.com/faq/raw-body
 */
import { Controller, Post, Req, Res, HttpStatus, Logger } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import type Stripe from 'stripe';
import { MarketplaceService } from './marketplace.service.js';
import { StripeClient } from './stripe.client.js';
import { MarketplaceCheckoutService } from './marketplace-checkout.service.js';
import { MarketplacePayoutService } from './marketplace-payout.service.js';

@Controller('webhooks')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly stripeClient: StripeClient,
    private readonly checkoutService: MarketplaceCheckoutService,
    private readonly payoutService: MarketplacePayoutService
  ) {}

  /**
   * POST /webhooks/stripe
   *
   * Handles payment_intent.succeeded, payment_intent.payment_failed (legacy),
   * checkout.session.completed (F-14), and charge.refunded (F-14).
   */
  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response
  ): Promise<void> {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

    if (!signature || typeof signature !== 'string') {
      res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Missing Stripe-Signature header' });
      return;
    }
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Webhook secret not configured' });
      return;
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      res.status(HttpStatus.BAD_REQUEST).json({
        error:
          'Raw body unavailable — ensure rawBody: true in NestFactory.create()',
      });
      return;
    }

    try {
      const event = await this.stripeClient.constructWebhookEvent(
        rawBody.toString('utf-8'),
        signature,
        webhookSecret
      );

      const obj = event.data.object as unknown as Record<string, unknown>;
      const metadata = obj['metadata'] as Record<string, string> | undefined;
      const tenantId =
        typeof metadata?.['tenantId'] === 'string'
          ? metadata['tenantId']
          : typeof metadata?.['tenant_id'] === 'string'
            ? metadata['tenant_id']
            : (process.env['PLATFORM_TENANT_ID'] ?? 'platform');

      await this.routeEvent(event, tenantId, metadata);
      res.status(HttpStatus.OK).json({ received: true });
    } catch (err) {
      this.logger.error({ err }, 'Stripe webhook processing failed');
      res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Webhook verification failed' });
    }
  }

  /**
   * POST /webhooks/stripe/marketplace
   *
   * Dedicated marketplace webhook endpoint for F-14.
   * Same verification logic, routes to marketplace-specific handlers.
   */
  @Post('stripe/marketplace')
  async handleMarketplaceWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response
  ): Promise<void> {
    // Delegate to the same handler — both endpoints accept the same events
    return this.handleStripeWebhook(req, res);
  }

  private async routeEvent(
    event: Stripe.Event,
    tenantId: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event, tenantId, metadata);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event, tenantId);
        break;
      case 'payment_intent.succeeded':
      case 'payment_intent.payment_failed':
        // Legacy payment intent flow
        await this.marketplaceService.processWebhook(event, tenantId);
        break;
      default:
        this.logger.log(
          { eventType: event.type },
          '[MarketplaceController] Unhandled event type'
        );
    }
  }

  private async handleCheckoutCompleted(
    event: Stripe.Event,
    tenantId: string,
    metadata?: Record<string, string>
  ): Promise<void> {
    const listingId = metadata?.['listingId'];
    const buyerUserId = metadata?.['buyerUserId'];
    const courseId = metadata?.['courseId'];

    if (!listingId || !buyerUserId || !courseId) {
      this.logger.warn(
        { metadata },
        '[MarketplaceController] checkout.session.completed missing metadata'
      );
      return;
    }

    const session = event.data.object as unknown as {
      payment_intent: string;
      amount_total: number;
    };

    // Idempotency: check if purchase already exists for this payment intent
    // The processWebhook in MarketplaceService already handles idempotency

    await this.marketplaceService.processWebhook(event, tenantId);

    this.logger.log(
      { listingId, tenantId, buyerUserId, courseId },
      '[MarketplaceController] Checkout session completed'
    );
  }

  private async handleChargeRefunded(
    event: Stripe.Event,
    tenantId: string
  ): Promise<void> {
    // Process refund via the existing webhook handler
    await this.marketplaceService.processWebhook(event, tenantId);

    this.logger.log(
      { tenantId, eventId: event.id },
      '[MarketplaceController] Charge refunded'
    );
  }
}
