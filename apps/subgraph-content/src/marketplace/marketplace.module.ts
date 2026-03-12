import { Module } from '@nestjs/common';
import { StripeClient } from './stripe.client.js';
import { MarketplaceEarningsService } from './marketplace.earnings.service.js';
import { MarketplaceService } from './marketplace.service.js';
import { MarketplaceController } from './marketplace.controller.js';
import { MarketplaceResolver } from './marketplace.resolver.js';
import { InstructorPayoutService } from './instructor-payout.service.js';

@Module({
  controllers: [MarketplaceController],
  providers: [
    StripeClient,
    MarketplaceEarningsService,
    MarketplaceService,
    MarketplaceResolver,
    InstructorPayoutService,
  ],
  exports: [MarketplaceService, InstructorPayoutService],
})
export class MarketplaceModule {}
