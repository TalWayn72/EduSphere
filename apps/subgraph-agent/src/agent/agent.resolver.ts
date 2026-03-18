import { Resolver, Query, Mutation, Subscription, Args } from '@nestjs/graphql';
import { Inject } from '@nestjs/common';
import { AgentService } from './agent.service';
import {
  EXECUTION_PUBSUB,
  executionPubSub,
  type ExecutionPayload,
} from './execution-pubsub.provider.js';

type PubSubType = typeof executionPubSub;

@Resolver('AgentExecution')
export class AgentResolver {
  constructor(
    private readonly agentService: AgentService,
    @Inject(EXECUTION_PUBSUB) private readonly pubSub: PubSubType,
  ) {}

  @Query('agentExecution')
  async getAgentExecution(@Args('id') id: string) {
    return this.agentService.findById(id);
  }

  @Query('agentExecutionsByUser')
  async getAgentExecutionsByUser(
    @Args('userId') userId: string,
    @Args('limit') limit: number
  ) {
    return this.agentService.findByUser(userId, limit);
  }

  @Query('agentExecutionsByAgent')
  async getAgentExecutionsByAgent(
    @Args('agentId') agentId: string,
    @Args('limit') limit: number
  ) {
    return this.agentService.findByAgent(agentId, limit);
  }

  @Query('runningExecutions')
  async getRunningExecutions(@Args('userId') userId: string) {
    return this.agentService.findRunning(userId);
  }

  @Mutation('startAgentExecution')
  async startAgentExecution(@Args('input') input: unknown) {
    const execution = await this.agentService.startExecution(
      input as { agentId: string; userId: string; input: Record<string, unknown>; metadata?: Record<string, unknown> }
    );
    this.pubSub.publish(`executionStatus_${(execution as ExecutionPayload).id}`, {
      executionStatusChanged: execution as ExecutionPayload,
    });
    return execution;
  }

  @Mutation('cancelAgentExecution')
  async cancelAgentExecution(@Args('id') id: string) {
    const execution = await this.agentService.cancelExecution(id);
    this.pubSub.publish(`executionStatus_${(execution as ExecutionPayload).id}`, {
      executionStatusChanged: execution as ExecutionPayload,
    });
    return execution;
  }

  @Subscription('executionStatusChanged', {
    filter: (
      payload: { executionStatusChanged: ExecutionPayload },
      variables: { executionId: string }
    ) => payload.executionStatusChanged.id === variables.executionId,
  })
  executionStatusChanged(@Args('executionId') executionId: string) {
    return this.pubSub.subscribe(`executionStatus_${executionId}`);
  }
}
