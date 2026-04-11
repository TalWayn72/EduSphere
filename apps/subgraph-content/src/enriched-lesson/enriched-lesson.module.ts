import { Module } from '@nestjs/common';
import { ContentImportModule } from '../content-import/content-import.module';
import { EnrichedLessonService } from './enriched-lesson.service';
import { EnrichedLessonBlocksService } from './enriched-lesson-blocks.service';
import { TranscriptReadyConsumer } from './transcript-ready.consumer';
import {
  EnrichedLessonResolver,
  EnrichedTranscriptBlockResolver,
} from './enriched-lesson.resolver';

@Module({
  imports: [ContentImportModule],
  providers: [
    EnrichedLessonService,
    EnrichedLessonBlocksService,
    TranscriptReadyConsumer,
    EnrichedLessonResolver,
    EnrichedTranscriptBlockResolver,
  ],
  exports: [EnrichedLessonService, EnrichedLessonBlocksService],
})
export class EnrichedLessonModule {}
