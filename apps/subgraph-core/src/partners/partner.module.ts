/**
 * PartnerModule — NestJS module for B2B2C Partner Portal.
 * Registers PartnerService, PartnerController, PartnerTierService,
 * PartnerDashboardService, and GraphQL resolvers.
 */
import { Module } from '@nestjs/common';
import { PartnerService } from './partner.service.js';
import { PartnerController } from './partner.controller.js';
import { PartnerTierService } from './partner-tier.service.js';
import { PartnerDashboardService } from './partner-dashboard.service.js';
import {
  PartnerQueryResolver,
  PartnerMutationResolver,
} from './partner.resolver.js';

@Module({
  controllers: [PartnerController],
  providers: [
    PartnerService,
    PartnerTierService,
    PartnerDashboardService,
    PartnerQueryResolver,
    PartnerMutationResolver,
  ],
  exports: [PartnerService, PartnerTierService, PartnerDashboardService],
})
export class PartnerModule {}
