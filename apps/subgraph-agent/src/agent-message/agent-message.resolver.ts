import { Resolver, ResolveReference, Context } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { AgentMessageService } from './agent-message.service';

@Resolver('AgentMessage')
export class AgentMessageResolver {
  constructor(private readonly agentMessageService: AgentMessageService) {}

  @ResolveReference()
  async resolveReference(reference: { __typename: string; id: string }, @Context() context: any) {
    const authContext = this.extractAuthContext(context);
    return this.agentMessageService.findById(reference.id, authContext);
  }

  private extractAuthContext(context: any) {
    if (!context.authContext) {
      throw new UnauthorizedException('Authentication required');
    }
    return context.authContext;
  }
}
