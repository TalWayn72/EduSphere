import { Module } from '@nestjs/common';
import { XapiTokenService } from './xapi-token.service.js';
import { XapiStatementService } from './xapi-statement.service.js';
import { XapiResolver } from './xapi.resolver.js';
import { LrsController } from './lrs.controller.js';

@Module({
  controllers: [LrsController],
  providers: [XapiTokenService, XapiStatementService, XapiResolver],
  exports: [XapiTokenService, XapiStatementService],
})
export class XapiModule {}
