/**
 * billing.module.ts — NestJS module wiring billing services + resolvers.
 */
import { Module } from '@nestjs/common';
import { YauCounterService } from './yau-counter.service.js';
import { SubscriptionService } from './subscription.service.js';
import { PilotService } from './pilot.service.js';
import { TenantUsageService } from './tenant-usage.service.js';
import { PlatformStatsService } from './platform-stats.service.js';
import { StripeInvoiceService } from './stripe-invoice.service.js';
import { BillingQueryResolver, BillingMutationResolver } from './billing.resolver.js';

@Module({
  providers: [
    YauCounterService,
    SubscriptionService,
    PilotService,
    TenantUsageService,
    PlatformStatsService,
    StripeInvoiceService,
    BillingQueryResolver,
    BillingMutationResolver,
  ],
  exports: [YauCounterService, SubscriptionService, StripeInvoiceService],
})
export class BillingModule {}
