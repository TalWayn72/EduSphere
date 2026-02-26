import { Module } from '@nestjs/common';
import { AgentResolver } from './agent.resolver';
import { AgentService } from './agent.service';
import { AIService } from '../ai/ai.service';
import { LangGraphService } from '../ai/langgraph.service';
import { AiLanggraphRunnerService } from '../ai/ai-langgraph-runner.service';
import { AiLegacyRunnerService } from '../ai/ai-legacy-runner.service';

@Module({
  providers: [
    AgentResolver,
    AgentService,
    AIService,
    LangGraphService,
    AiLanggraphRunnerService,
    AiLegacyRunnerService,
  ],
  exports: [AgentService, AIService],
})
export class AgentModule {}
