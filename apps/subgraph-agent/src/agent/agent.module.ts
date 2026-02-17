import { Module } from '@nestjs/common';
import { AgentResolver } from './agent.resolver';
import { AgentService } from './agent.service';
import { AIService } from '../ai/ai.service';

@Module({
  providers: [AgentResolver, AgentService, AIService],
  exports: [AgentService, AIService],
})
export class AgentModule {}
