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
import {
  Controller,
  Post,
  Req,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MarketplaceService } from './marketplace.service.js';
import { StripeClient } from './stripe.client.js';

@Controller('webhooks')
export class MarketplaceController {
  private readonly logger = new Logger(MarketplaceController.name);

  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly stripeClient: StripeClient,
  ) {}

  /**
   * POST /webhooks/stripe
   *
   * Stripe sends events here. We verify the signature using the raw request body
   * (req.rawBody — available when NestJS is created with `rawBody: true`).
   * Tenant is identified via PLATFORM_TENANT_ID env var (platform-level webhook).
   */
  @Post('stripe')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
  ): Promise<void> {
    const signature = req.headers['stripe-signature'];
    const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

    if (!signature || typeof signature !== 'string') {
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing Stripe-Signature header' });
      return;
    }
    if (!webhookSecret) {
      this.logger.error('STRIPE_WEBHOOK_SECRET is not configured');
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Webhook secret not configured' });
      return;
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Raw body unavailable — ensure rawBody: true in NestFactory.create()' });
      return;
    }

    try {
      const event = await this.stripeClient.constructWebhookEvent(
        rawBody.toString('utf-8'),
        signature,
        webhookSecret,
      );

      // Use PLATFORM_TENANT_ID for platform-level webhooks.
      // For per-tenant Stripe accounts, pass tenant_id via event metadata.
      // Cast through unknown first to avoid Stripe union type overlap error.
      const obj = event.data.object as unknown as Record<string, unknown>;
      const metadata = obj['metadata'] as Record<string, string> | undefined;
      const tenantId = (typeof metadata?.['tenant_id'] === 'string')
        ? metadata['tenant_id']
        : (process.env['PLATFORM_TENANT_ID'] ?? 'platform');

      await this.marketplaceService.processWebhook(event, tenantId);
      res.status(HttpStatus.OK).json({ received: true });
    } catch (err) {
      this.logger.error({ err }, 'Stripe webhook processing failed');
      res.status(HttpStatus.BAD_REQUEST).json({ error: 'Webhook verification failed' });
    }
  }
}
