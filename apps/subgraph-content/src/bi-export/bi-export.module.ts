import { Module } from '@nestjs/common';
import { BiTokenService } from './bi-token.service.js';
import { BiExportService } from './bi-export.service.js';
import { BiExportController } from './bi-export.controller.js';
import { BiExportResolver } from './bi-export.resolver.js';

@Module({
  controllers: [BiExportController],
  providers: [BiTokenService, BiExportService, BiExportResolver],
  exports: [BiTokenService],
})
export class BiExportModule {}
