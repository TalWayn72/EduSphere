import { Resolver, Query, Mutation, Args, ResolveReference } from '@nestjs/graphql';
import { AgentMessageService } from './agent-message.service';

@Resolver('AgentMessage')
export class AgentMessageResolver {
  constructor(private readonly agentMessageService: AgentMessageService) {}

  @Query('agentMessage')
  async getAgentMessage(@Args('id') id: string) {
    return this.agentMessageService.findById(id);
  }

  @Query('agentMessagesBySession')
  async getAgentMessagesBySession(@Args('sessionId') sessionId: string) {
    return this.agentMessageService.findBySession(sessionId);
  }

  @Mutation('createAgentMessage')
  async createAgentMessage(@Args('input') input: any) {
    return this.agentMessageService.create(input);
  }

  @Mutation('deleteAgentMessage')
  async deleteAgentMessage(@Args('id') id: string) {
    return this.agentMessageService.delete(id);
  }

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.agentMessageService.findById(reference.id);
  }
}
