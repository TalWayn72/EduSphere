import { Module } from '@nestjs/common';
import { XapiTokenService } from './xapi-token.service.js';
import { XapiStatementService } from './xapi-statement.service.js';
import { XapiExportService } from './xapi-export.service.js';
import { XapiResolver } from './xapi.resolver.js';
import { LrsController } from './lrs.controller.js';
import { XapiNatsBridgeService } from './xapi-nats-bridge.service.js';

@Module({
  controllers: [LrsController],
  providers: [XapiTokenService, XapiStatementService, XapiExportService, XapiResolver, XapiNatsBridgeService],
  exports: [XapiTokenService, XapiStatementService, XapiExportService],
})
export class XapiModule {}
