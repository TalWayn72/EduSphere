import { Resolver, Query, Mutation, Subscription, Args } from '@nestjs/graphql';
import { AgentService } from './agent.service';
import { PubSub } from 'graphql-subscriptions';

const pubSub = new PubSub();

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
  async startAgentExecution(@Args('input') input: any) {
    const execution = await this.agentService.startExecution(input);
    pubSub.publish('EXECUTION_STATUS_CHANGED', { 
      executionStatusChanged: execution 
    });
    return execution;
  }

  @Mutation('cancelAgentExecution')
  async cancelAgentExecution(@Args('id') id: string) {
    const execution = await this.agentService.cancelExecution(id);
    pubSub.publish('EXECUTION_STATUS_CHANGED', { 
      executionStatusChanged: execution 
    });
    return execution;
  }

  @Subscription('executionStatusChanged', {
    filter: (payload, variables) => {
      return payload.executionStatusChanged.id === variables.executionId;
    },
  })
  executionStatusChanged() {
    return pubSub.asyncIterableIterator('EXECUTION_STATUS_CHANGED');
  }
}
