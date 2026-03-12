/**
 * PartnerModule — NestJS module for B2B2C Partner Portal.
 * Registers PartnerService, PartnerController, and PartnerTierService.
 */
import { Module } from '@nestjs/common';
import { PartnerService } from './partner.service.js';
import { PartnerController } from './partner.controller.js';
import { PartnerTierService } from './partner-tier.service.js';

@Module({
  controllers: [PartnerController],
  providers: [PartnerService, PartnerTierService],
  exports: [PartnerService, PartnerTierService],
})
export class PartnerModule {}
