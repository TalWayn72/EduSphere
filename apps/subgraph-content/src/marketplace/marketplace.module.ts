import { Module } from '@nestjs/common';
import { StripeClient } from './stripe.client.js';
import { MarketplaceEarningsService } from './marketplace.earnings.service.js';
import { MarketplaceService } from './marketplace.service.js';
import { MarketplaceController } from './marketplace.controller.js';
import { MarketplaceResolver } from './marketplace.resolver.js';
import { InstructorPayoutService } from './instructor-payout.service.js';
import { MarketplaceOrgService } from './marketplace-org.service.js';
import { MarketplaceOrgResolver } from './marketplace-org.resolver.js';
import { MarketplaceCheckoutService } from './marketplace-checkout.service.js';
import { MarketplacePayoutService } from './marketplace-payout.service.js';
import { CourseCopyService } from './course-copy.service.js';

@Module({
  controllers: [MarketplaceController],
  providers: [
    StripeClient,
    MarketplaceEarningsService,
    MarketplaceService,
    MarketplaceResolver,
    InstructorPayoutService,
    MarketplaceOrgService,
    MarketplaceOrgResolver,
    MarketplaceCheckoutService,
    MarketplacePayoutService,
    CourseCopyService,
  ],
  exports: [
    MarketplaceService,
    InstructorPayoutService,
    MarketplaceOrgService,
    MarketplaceCheckoutService,
    MarketplacePayoutService,
  ],
})
export class MarketplaceModule {}
