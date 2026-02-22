import { Module } from '@nestjs/common';
import { AgentResolver } from './agent.resolver';
import { AgentService } from './agent.service';
import { AIService } from '../ai/ai.service';
import { LangGraphService } from '../ai/langgraph.service';

@Module({
  providers: [AgentResolver, AgentService, AIService, LangGraphService],
  exports: [AgentService, AIService],
})
export class AgentModule {}
