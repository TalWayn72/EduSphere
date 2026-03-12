import { Module } from '@nestjs/common';
import { AgentResolver } from './agent.resolver';
import { AgentService } from './agent.service';
import { AIService } from '../ai/ai.service';
import { LangGraphService } from '../ai/langgraph.service';
import { AiLanggraphRunnerService } from '../ai/ai-langgraph-runner.service';
import { AiLegacyRunnerService } from '../ai/ai-legacy-runner.service';
import { CourseGeneratorResolver } from './course-generator.resolver.js';
import { CourseGeneratorService } from '../ai/course-generator.service.js';
import { LessonPipelineResolver } from './lesson-pipeline.resolver.js';

@Module({
  providers: [
    AgentResolver,
    AgentService,
    AIService,
    LangGraphService,
    AiLanggraphRunnerService,
    AiLegacyRunnerService,
    CourseGeneratorResolver,
    CourseGeneratorService,
    LessonPipelineResolver,
  ],
  exports: [AgentService, AIService, CourseGeneratorService],
})
export class AgentModule {}
