import { Module } from '@nestjs/common';
import { ComplianceService } from './compliance.service.js';
import { CompliancePdfService } from './compliance-pdf.service.js';
import { ComplianceResolver } from './compliance.resolver.js';

@Module({
  providers: [CompliancePdfService, ComplianceService, ComplianceResolver],
  exports: [ComplianceService],
})
export class ComplianceModule {}
