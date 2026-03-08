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
import { LessonPlanService } from './lesson-plan.service';
import { LessonPlanResolver } from './lesson-plan.resolver';

@Module({
  providers: [
    LessonResolver,
    LessonPipelineFieldResolver,
    LessonPipelineRunFieldResolver,
    LessonService,
    LessonAssetService,
    LessonPipelineService,
    LessonPipelineOrchestratorService,
    // Phase 36: WYSIWYG Course Lesson Builder
    LessonPlanService,
    LessonPlanResolver,
  ],
  exports: [LessonService, LessonAssetService, LessonPipelineService, LessonPlanService],
})
export class LessonModule {}
