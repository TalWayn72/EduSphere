import { Resolver, Query, Mutation, Args, ResolveField, Parent, ResolveReference } from '@nestjs/graphql';
import { AgentSessionService } from './agent-session.service';

@Resolver('AgentSession')
export class AgentSessionResolver {
  constructor(private readonly agentSessionService: AgentSessionService) {}

  @Query('agentSession')
  async getAgentSession(@Args('id') id: string) {
    return this.agentSessionService.findById(id);
  }

  @Query('agentSessionsByUser')
  async getAgentSessionsByUser(
    @Args('userId') userId: string,
    @Args('limit') limit: number = 20,
  ) {
    return this.agentSessionService.findByUser(userId, limit);
  }

  @Query('activeAgentSessions')
  async getActiveAgentSessions(@Args('userId') userId: string) {
    return this.agentSessionService.findActiveByUser(userId);
  }

  @Mutation('createAgentSession')
  async createAgentSession(@Args('input') input: any) {
    return this.agentSessionService.create(input);
  }

  @Mutation('updateAgentSession')
  async updateAgentSession(@Args('id') id: string, @Args('input') input: any) {
    return this.agentSessionService.update(id, input);
  }

  @Mutation('completeAgentSession')
  async completeAgentSession(@Args('id') id: string) {
    return this.agentSessionService.complete(id);
  }

  @Mutation('cancelAgentSession')
  async cancelAgentSession(@Args('id') id: string) {
    return this.agentSessionService.cancel(id);
  }

  @ResolveField('messages')
  async getMessages(@Parent() session: any) {
    // Will be resolved by AgentMessage resolver
    return [];
  }

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }) {
    return this.agentSessionService.findById(reference.id);
  }
}
