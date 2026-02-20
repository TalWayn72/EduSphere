import { Module } from '@nestjs/common';
import { AgentSessionResolver } from './agent-session.resolver';
import { AgentSessionService } from './agent-session.service';
import { AgentMessageModule } from '../agent-message/agent-message.module';
import { NatsService } from '../nats/nats.service';
import { AIService } from '../ai/ai.service';

@Module({
  imports: [AgentMessageModule],
  providers: [AgentSessionResolver, AgentSessionService, NatsService, AIService],
  exports: [AgentSessionService],
})
export class AgentSessionModule {}
