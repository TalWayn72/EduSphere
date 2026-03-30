import { Module } from '@nestjs/common';
import { AgentResolver } from './agent.resolver';
import { AgentService } from './agent.service';
import { AIService } from '../ai/ai.service';
import { LangGraphService } from '../ai/langgraph.service';
import { AiLanggraphRunnerService } from '../ai/ai-langgraph-runner.service';
import { AiLegacyRunnerService } from '../ai/ai-legacy-runner.service';
import { CourseGeneratorResolver } from './course-generator.resolver.js';
import { CourseGeneratorService } from '../ai/course-generator.service.js';
import { LlmConsentGuard } from '../ai/llm-consent.guard.js';
import { LessonPipelineResolver } from './lesson-pipeline.resolver.js';
import { ExecutionPubSubProvider } from './execution-pubsub.provider.js';
import { AgentSandboxService } from '../sandbox/agent-sandbox.service.js';

@Module({
  providers: [
    ExecutionPubSubProvider,
    AgentResolver,
    AgentService,
    AIService,
    LangGraphService,
    AiLanggraphRunnerService,
    AiLegacyRunnerService,
    CourseGeneratorResolver,
    CourseGeneratorService,
    LlmConsentGuard,
    LessonPipelineResolver,
    AgentSandboxService,
  ],
  exports: [AgentService, AIService, CourseGeneratorService, AgentSandboxService],
})
export class AgentModule {}
