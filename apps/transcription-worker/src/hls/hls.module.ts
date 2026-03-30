import { Module } from '@nestjs/common';
import { HlsService } from './hls.service';
import { HlsManifestService } from './hls-manifest.service';

@Module({
  providers: [HlsService, HlsManifestService],
  exports: [HlsService],
})
export class HlsModule {}
