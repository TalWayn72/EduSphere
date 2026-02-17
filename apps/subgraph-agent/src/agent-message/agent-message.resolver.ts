import { Resolver, Query, Mutation, Subscription, Args, ResolveReference } from '@nestjs/graphql';
import { AgentMessageService } from './agent-message.service';
import { PubSub } from 'graphql-subscriptions';

const AGENT_MESSAGE_CREATED = 'agentMessageCreated';

@Resolver('AgentMessage')
export class AgentMessageResolver {
  private pubsub: PubSub;

  constructor(private readonly agentMessageService: AgentMessageService) {
    this.pubsub = new PubSub();
  }

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
    const message = await this.agentMessageService.create(input);
    this.pubsub.publish(AGENT_MESSAGE_CREATED, { agentMessageCreated: message, sessionId: input.sessionId });
    return message;
  }

  @Mutation('deleteAgentMessage')
  async deleteAgentMessage(@Args('id') id: string) {
    return this.agentMessageService.delete(id);
  }

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.agentMessageService.findById(reference.id);
  }

  @Subscription('agentMessageCreated', {
    filter: (payload, variables) => payload.sessionId === variables.sessionId,
  })
  agentMessageCreatedSubscription(@Args('sessionId') sessionId: string) {
    return this.pubsub.asyncIterator(AGENT_MESSAGE_CREATED);
  }
}
