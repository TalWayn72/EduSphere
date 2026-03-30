/**
 * billing.module.ts — NestJS module wiring billing services + resolvers.
 */
import { Module } from '@nestjs/common';
import { YauCounterService } from './yau-counter.service.js';
import { YauEnforcementService } from './yau-enforcement.service.js';
import { SubscriptionService } from './subscription.service.js';
import { PilotService } from './pilot.service.js';
import { PilotApprovalService } from './pilot-approval.service.js';
import { TenantUsageService } from './tenant-usage.service.js';
import { PlatformStatsService } from './platform-stats.service.js';
import { StripeInvoiceService } from './stripe-invoice.service.js';
import { BillingQueryResolver, BillingMutationResolver } from './billing.resolver.js';

@Module({
  providers: [
    YauCounterService,
    YauEnforcementService,
    SubscriptionService,
    PilotService,
    PilotApprovalService,
    TenantUsageService,
    PlatformStatsService,
    StripeInvoiceService,
    BillingQueryResolver,
    BillingMutationResolver,
  ],
  exports: [YauCounterService, YauEnforcementService, SubscriptionService, StripeInvoiceService],
})
export class BillingModule {}
