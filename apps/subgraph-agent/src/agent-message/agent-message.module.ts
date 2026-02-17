import { Module } from '@nestjs/common';
import { AgentMessageResolver } from './agent-message.resolver';
import { AgentMessageService } from './agent-message.service';

@Module({
  providers: [AgentMessageResolver, AgentMessageService],
  exports: [AgentMessageService],
})
export class AgentMessageModule {}
