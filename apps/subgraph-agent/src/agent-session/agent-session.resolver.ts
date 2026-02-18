import {
  Resolver,
  Query,
  Mutation,
  Subscription,
  Args,
  ResolveField,
  Parent,
  ResolveReference,
  Context,
} from '@nestjs/graphql';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AgentSessionService } from './agent-session.service';
import { AgentMessageService } from '../agent-message/agent-message.service';
import { PubSub } from 'graphql-subscriptions';
import {
  StartAgentSessionSchema,
  SendMessageSchema,
} from './agent-session.schemas';

const pubSub = new PubSub();

@Resolver('AgentSession')
export class AgentSessionResolver {
  constructor(
    private readonly agentSessionService: AgentSessionService,
    private readonly agentMessageService: AgentMessageService
  ) {}

  @Query('agentSession')
  async getAgentSession(@Args('id') id: string, @Context() context: any) {
    const authContext = this.extractAuthContext(context);
    return this.agentSessionService.findById(id, authContext);
  }

  @Query('myAgentSessions')
  async getMyAgentSessions(@Context() context: any) {
    const authContext = this.extractAuthContext(context);
    return this.agentSessionService.findByUser(authContext.userId, authContext);
  }

  @Query('agentTemplates')
  async getAgentTemplates() {
    // Return hardcoded templates for now
    return [
      {
        id: '1',
        name: 'Tutor',
        templateType: 'TUTOR',
        systemPrompt: 'You are a helpful tutor.',
        parameters: {},
      },
      {
        id: '2',
        name: 'Quiz Generator',
        templateType: 'QUIZ_GENERATOR',
        systemPrompt: 'You generate educational quizzes.',
        parameters: {},
      },
      {
        id: '3',
        name: 'Debate Facilitator',
        templateType: 'DEBATE_FACILITATOR',
        systemPrompt: 'You facilitate debates and discussions.',
        parameters: {},
      },
      {
        id: '4',
        name: 'Explanation Generator',
        templateType: 'EXPLANATION_GENERATOR',
        systemPrompt: 'You explain complex topics in simple terms.',
        parameters: {},
      },
    ];
  }

  @Mutation('startAgentSession')
  async startAgentSession(
    @Args('templateType') templateType: string,
    @Args('context') contextData: any,
    @Context() context: any
  ) {
    const authContext = this.extractAuthContext(context);

    // Validate input
    const validationResult = StartAgentSessionSchema.safeParse({
      templateType,
      context: contextData,
    });

    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.errors);
    }

    return this.agentSessionService.create(
      {
        userId: authContext.userId,
        agentType: templateType,
        metadata: contextData,
      },
      authContext
    );
  }

  @Mutation('sendMessage')
  async sendMessage(
    @Args('sessionId') sessionId: string,
    @Args('content') content: string,
    @Context() context: any
  ) {
    const authContext = this.extractAuthContext(context);

    // Validate input
    const validationResult = SendMessageSchema.safeParse({
      sessionId,
      content,
    });

    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.errors);
    }

    // Save user message
    const userMessage = await this.agentMessageService.create(
      {
        sessionId,
        role: 'USER',
        content,
      },
      authContext
    );

    // Publish to subscription
    pubSub.publish('MESSAGE_STREAM', {
      messageStream: userMessage,
    });

    // TODO: Get session and use agent type to generate AI response
    // For now, create a simple assistant message
    const assistantMessage = await this.agentMessageService.create(
      {
        sessionId,
        role: 'ASSISTANT',
        content: `Echo: ${content}`,
      },
      authContext
    );

    // Publish assistant message
    pubSub.publish('MESSAGE_STREAM', {
      messageStream: assistantMessage,
    });

    return assistantMessage;
  }

  @Mutation('endSession')
  async endSession(@Args('sessionId') id: string, @Context() context: any) {
    const authContext = this.extractAuthContext(context);
    await this.agentSessionService.complete(id, authContext);
    return true;
  }

  @Subscription('messageStream', {
    filter: (payload, variables) => {
      return payload.messageStream.sessionId === variables.sessionId;
    },
  })
  messageStream() {
    return pubSub.asyncIterableIterator('MESSAGE_STREAM');
  }

  @ResolveField('messages')
  async getMessages(@Parent() session: any, @Context() context: any) {
    const authContext = this.extractAuthContext(context);
    return this.agentMessageService.findBySession(session.id, authContext);
  }

  @ResolveReference()
  async resolveReference(
    reference: { __typename: string; id: string },
    @Context() context: any
  ) {
    const authContext = this.extractAuthContext(context);
    return this.agentSessionService.findById(reference.id, authContext);
  }

  private extractAuthContext(context: any) {
    if (!context.authContext) {
      throw new UnauthorizedException('Authentication required');
    }
    return context.authContext;
  }
}
