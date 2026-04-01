import { Module } from '@nestjs/common';
import { LessonResolver } from './lesson.resolver';
import { LessonService } from './lesson.service';
import { LessonQueryService } from './lesson-query.service';
import { LessonAssetService } from './lesson-asset.service';
import { LessonPipelineService } from './lesson-pipeline.service';
import { LessonPipelineQueryService } from './lesson-pipeline-query.service';
import { LessonPipelineOrchestratorService } from './lesson-pipeline-orchestrator.service';
import { PipelineModuleExecutorService } from './pipeline-module-executor.service';
import { PipelineNatsService } from './pipeline-nats.service';
import { LessonPipelineSubscriptionService } from './lesson-pipeline-subscription.service';
import {
  LessonPipelineFieldResolver,
  LessonPipelineRunFieldResolver,
} from './lesson-pipeline.resolver';
import { LessonPlanService } from './lesson-plan.service';
import { LessonPlanResolver } from './lesson-plan.resolver';
import { LessonPublishService } from './lesson-publish.service';
import { LessonPipelineTemplateService } from './lesson-pipeline-template.service';
import { LessonPipelineTemplateResolver } from './lesson-pipeline-template.resolver';

@Module({
  providers: [
    LessonResolver,
    LessonPipelineFieldResolver,
    LessonPipelineRunFieldResolver,
    LessonService,
    LessonQueryService,
    LessonAssetService,
    LessonPipelineService,
    LessonPipelineQueryService,
    LessonPipelineOrchestratorService,
    PipelineModuleExecutorService,
    PipelineNatsService,
    // Phase 65: Publish service for PUBLISH_SHARE pipeline module
    LessonPublishService,
    // Phase 65: Real-time pipeline progress via NATS → GraphQL subscriptions
    LessonPipelineSubscriptionService,
    // Phase 36: WYSIWYG Course Lesson Builder
    LessonPlanService,
    LessonPlanResolver,
    // Phase 65: Pipeline Templates CRUD
    LessonPipelineTemplateService,
    LessonPipelineTemplateResolver,
  ],
  exports: [
    LessonService,
    LessonQueryService,
    LessonAssetService,
    LessonPipelineService,
    LessonPlanService,
    LessonPipelineTemplateService,
  ],
})
export class LessonModule {}
