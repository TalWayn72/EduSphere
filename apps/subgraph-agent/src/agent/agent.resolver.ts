import { Resolver, Query, Mutation, Subscription, Args } from '@nestjs/graphql';
import { createPubSub } from 'graphql-yoga';
import { AgentService } from './agent.service';

interface ExecutionPayload {
  id: string;
  [key: string]: unknown;
}

const pubSub = createPubSub<{
  [key: `executionStatus_${string}`]: [
    { executionStatusChanged: ExecutionPayload },
  ];
}>();

@Resolver('AgentExecution')
export class AgentResolver {
  constructor(private readonly agentService: AgentService) {}

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
    const execution = await this.agentService.startExecution(input);
    pubSub.publish(`executionStatus_${(execution as ExecutionPayload).id}`, {
      executionStatusChanged: execution as ExecutionPayload,
    });
    return execution;
  }

  @Mutation('cancelAgentExecution')
  async cancelAgentExecution(@Args('id') id: string) {
    const execution = await this.agentService.cancelExecution(id);
    pubSub.publish(`executionStatus_${(execution as ExecutionPayload).id}`, {
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
    return pubSub.subscribe(`executionStatus_${executionId}`);
  }
}
