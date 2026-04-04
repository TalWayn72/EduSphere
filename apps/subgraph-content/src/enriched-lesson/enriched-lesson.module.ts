import { Module } from '@nestjs/common';
import { ContentImportModule } from '../content-import/content-import.module';
import { EnrichedLessonService } from './enriched-lesson.service';
import {
  EnrichedLessonResolver,
  EnrichedTranscriptBlockResolver,
} from './enriched-lesson.resolver';

@Module({
  imports: [ContentImportModule],
  providers: [
    EnrichedLessonService,
    EnrichedLessonResolver,
    EnrichedTranscriptBlockResolver,
  ],
  exports: [EnrichedLessonService],
})
export class EnrichedLessonModule {}
