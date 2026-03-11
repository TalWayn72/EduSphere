import { Module } from '@nestjs/common';
import { AeoController } from './aeo.controller';
import { AeoService } from './aeo.service';

@Module({
  controllers: [AeoController],
  providers: [AeoService],
})
export class AeoModule {}
