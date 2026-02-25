import { Module } from '@nestjs/common';
import { CpdExportService } from './cpd-export.service.js';
import { CpdService } from './cpd.service.js';
import { CpdResolver } from './cpd.resolver.js';

@Module({
  providers: [CpdExportService, CpdService, CpdResolver],
  exports: [CpdService],
})
export class CpdModule {}
