import { Module } from '@nestjs/common';
import { MediaResolver } from './media.resolver';
import { MediaService } from './media.service';
import { MediaQueriesService } from './media-queries.service';
import { AltTextGeneratorService } from './alt-text-generator.service';

@Module({
  providers: [MediaResolver, MediaService, MediaQueriesService, AltTextGeneratorService],
  exports: [MediaService],
})
export class MediaModule {}
