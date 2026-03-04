import { Module } from '@nestjs/common';
import { LessonResolver } from './lesson.resolver';
import { LessonService } from './lesson.service';
import { LessonAssetService } from './lesson-asset.service';
import { LessonPipelineService } from './lesson-pipeline.service';
import { LessonPipelineOrchestratorService } from './lesson-pipeline-orchestrator.service';
import {
  LessonPipelineFieldResolver,
  LessonPipelineRunFieldResolver,
} from './lesson-pipeline.resolver';

@Module({
  providers: [
    LessonResolver,
    LessonPipelineFieldResolver,
    LessonPipelineRunFieldResolver,
    LessonService,
    LessonAssetService,
    LessonPipelineService,
    LessonPipelineOrchestratorService,
  ],
  exports: [LessonService, LessonAssetService, LessonPipelineService],
})
export class LessonModule {}
