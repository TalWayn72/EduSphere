import { Module } from '@nestjs/common';
import { SalesforceClient } from './salesforce.client.js';
import { CrmEncryptionService } from './crm-encryption.service.js';
import { CrmService } from './crm.service.js';
import { CrmController } from './crm.controller.js';
import { CrmResolver } from './crm.resolver.js';

@Module({
  controllers: [CrmController],
  providers: [SalesforceClient, CrmEncryptionService, CrmService, CrmResolver],
  exports: [CrmService],
})
export class CrmModule {}
