import { Module } from '@nestjs/common';
import { SrsService } from './srs.service';
import { SrsSchedulingService } from './srs-scheduling.service';
import { SrsResolver } from './srs.resolver';

@Module({
  providers: [SrsService, SrsSchedulingService, SrsResolver],
  exports: [SrsService, SrsSchedulingService],
})
export class SrsModule {}
