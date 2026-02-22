import { Module } from '@nestjs/common';
import { AgentSessionResolver } from './agent-session.resolver';
import { AgentSessionService } from './agent-session.service';
import { AgentMessageModule } from '../agent-message/agent-message.module';
import { NatsService } from '../nats/nats.service';
import { AIService } from '../ai/ai.service';
import { SessionCleanupService } from './session-cleanup.service';
import { LangGraphService } from '../ai/langgraph.service';

@Module({
  imports: [AgentMessageModule],
  providers: [AgentSessionResolver, AgentSessionService, NatsService, AIService, LangGraphService, SessionCleanupService],
  exports: [AgentSessionService],
})
export class AgentSessionModule {}
