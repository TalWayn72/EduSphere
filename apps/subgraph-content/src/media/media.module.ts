import { Module } from '@nestjs/common';
import { MediaResolver } from './media.resolver';
import { MediaService } from './media.service';
import { AltTextGeneratorService } from './alt-text-generator.service';

@Module({
  providers: [MediaResolver, MediaService, AltTextGeneratorService],
  exports: [MediaService],
})
export class MediaModule {}
