import { Module } from '@nestjs/common';
import { AeoController } from './aeo.controller';
import { AeoContentService } from './aeo-content.service';
import { AeoService } from './aeo.service';
import { OgImageService } from './og-image.service';

@Module({
  controllers: [AeoController],
  providers: [AeoContentService, AeoService, OgImageService],
})
export class AeoModule {}
