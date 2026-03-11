/**
 * billing.module.ts — NestJS module wiring billing services + resolvers.
 */
import { Module } from '@nestjs/common';
import { YauCounterService } from './yau-counter.service.js';
import { SubscriptionService } from './subscription.service.js';
import { PilotService } from './pilot.service.js';
import { BillingQueryResolver, BillingMutationResolver } from './billing.resolver.js';

@Module({
  providers: [
    YauCounterService,
    SubscriptionService,
    PilotService,
    BillingQueryResolver,
    BillingMutationResolver,
  ],
  exports: [YauCounterService, SubscriptionService],
})
export class BillingModule {}
