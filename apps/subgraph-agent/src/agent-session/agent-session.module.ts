import { Module } from '@nestjs/common';
import { AgentSessionResolver } from './agent-session.resolver';
import { AgentSessionService } from './agent-session.service';
import { AgentMessageModule } from '../agent-message/agent-message.module';
import { NatsService } from '../nats/nats.service';

@Module({
  imports: [AgentMessageModule],
  providers: [AgentSessionResolver, AgentSessionService, NatsService],
  exports: [AgentSessionService],
})
export class AgentSessionModule {}
