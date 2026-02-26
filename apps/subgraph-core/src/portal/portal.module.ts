import { Module } from '@nestjs/common';
import { PortalService } from './portal.service.js';
import { PortalResolver } from './portal.resolver.js';

@Module({
  providers: [PortalService, PortalResolver],
  exports: [PortalService],
})
export class PortalModule {}
