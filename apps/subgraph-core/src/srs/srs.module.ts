import { Module } from '@nestjs/common';
import { SrsService } from './srs.service';
import { SrsResolver } from './srs.resolver';

@Module({
  providers: [SrsService, SrsResolver],
  exports: [SrsService],
})
export class SrsModule {}
