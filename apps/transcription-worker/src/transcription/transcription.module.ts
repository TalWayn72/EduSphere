import { Module } from '@nestjs/common';
import { WhisperClient } from './whisper.client';
import { MinioClient } from './minio.client';
import { TranscriptionService } from './transcription.service';
import { TranscriptionHelpersService } from './transcription-helpers.service';
import { TranscriptionWorker } from './transcription.worker';
import { NatsModule } from '../nats/nats.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { HlsModule } from '../hls/hls.module';
import { TranslationModule } from '../translation/translation.module';

@Module({
  imports: [NatsModule, KnowledgeModule, HlsModule, TranslationModule],
  providers: [
    WhisperClient,
    MinioClient,
    TranscriptionService,
    TranscriptionHelpersService,
    TranscriptionWorker,
  ],
  exports: [TranscriptionService],
})
export class TranscriptionModule {}
