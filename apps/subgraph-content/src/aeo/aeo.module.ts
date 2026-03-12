import { Module } from '@nestjs/common';
import { AeoController } from './aeo.controller';
import { AeoService } from './aeo.service';
import { OgImageService } from './og-image.service';

@Module({
  controllers: [AeoController],
  providers: [AeoService, OgImageService],
})
export class AeoModule {}
