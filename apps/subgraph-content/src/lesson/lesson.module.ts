import { Module } from '@nestjs/common';
import { LessonResolver } from './lesson.resolver';
import { LessonService } from './lesson.service';
import { LessonAssetService } from './lesson-asset.service';
import { LessonPipelineService } from './lesson-pipeline.service';
import { LessonPipelineOrchestratorService } from './lesson-pipeline-orchestrator.service';

@Module({
  providers: [
    LessonResolver,
    LessonService,
    LessonAssetService,
    LessonPipelineService,
    LessonPipelineOrchestratorService,
  ],
  exports: [LessonService, LessonAssetService, LessonPipelineService],
})
export class LessonModule {}
