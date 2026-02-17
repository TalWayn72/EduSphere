import { Module } from '@nestjs/common';
import { AgentSessionResolver } from './agent-session.resolver';
import { AgentSessionService } from './agent-session.service';

@Module({
  providers: [AgentSessionResolver, AgentSessionService],
  exports: [AgentSessionService],
})
export class AgentSessionModule {}
