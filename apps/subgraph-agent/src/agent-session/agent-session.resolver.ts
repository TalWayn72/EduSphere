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
import { Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { createPubSub } from 'graphql-yoga';
import { AgentSessionService } from './agent-session.service';
import { AgentMessageService } from '../agent-message/agent-message.service';
import { AIService } from '../ai/ai.service';
import {
  StartAgentSessionSchema,
  SendMessageSchema,
} from './agent-session.schemas';

interface AgentMessagePayload {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
}

const pubSub = createPubSub<{
  [key: `messageStream_${string}`]: [{ messageStream: AgentMessagePayload }];
}>();

const tracer = trace.getTracer('subgraph-agent');

@Resolver('AgentSession')
export class AgentSessionResolver {
  private readonly logger = new Logger(AgentSessionResolver.name);

  constructor(
    private readonly agentSessionService: AgentSessionService,
    private readonly agentMessageService: AgentMessageService,
    private readonly aiService: AIService
  ) {}

  @Query('agentSession')
  async getAgentSession(@Args('id') id: string, @Context() context: unknown) {
    const authContext = this.extractAuthContext(context);
    return this.agentSessionService.findById(id, authContext);
  }

  @Query('myAgentSessions')
  async getMyAgentSessions(@Context() context: unknown) {
    const authContext = this.extractAuthContext(context);
    return this.agentSessionService.findByUser(authContext.userId, authContext);
  }

  @Query('agentTemplates')
  async getAgentTemplates() {
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
    @Args('context') contextData: unknown,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);

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
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);

    const validationResult = SendMessageSchema.safeParse({ sessionId, content });
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.errors);
    }

    const span = tracer.startSpan('agent.sendMessage', {
      attributes: {
        'session.id': sessionId,
        'user.id': authContext.userId,
        'message.length': content.length,
      },
    });

    try {
      // Persist user message
      const userMessage = await this.agentMessageService.create(
        { sessionId, role: 'USER', content },
        authContext
      );

      pubSub.publish(`messageStream_${sessionId}`, {
        messageStream: userMessage as AgentMessagePayload,
      });

      // Resolve agent type from session, then invoke LangGraph via AIService.
      let agentReply = `Echo: ${content}`;
      let templateType = 'EXPLAIN';
      try {
        const session = await this.agentSessionService.findById(sessionId, authContext);
        templateType =
          (session as Record<string, unknown>)['agentType'] as string ?? 'EXPLAIN';
        const sessionContext =
          (session as Record<string, unknown>)['metadata'] as Record<string, unknown> ?? {};

        span.setAttribute('template.type', templateType);

        const aiResult = await this.aiService.continueSession(
          sessionId,
          content,
          templateType,
          sessionContext
        );
        agentReply = aiResult.text;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'AI error';
        this.logger.error(`sendMessage AI error: ${msg}`);
        // Fall back to echo so the mutation always succeeds.
      }

      const assistantMessage = await this.agentMessageService.create(
        { sessionId, role: 'ASSISTANT', content: agentReply },
        authContext
      );

      pubSub.publish(`messageStream_${sessionId}`, {
        messageStream: assistantMessage as AgentMessagePayload,
      });

      this.logger.debug(
        `sendMessage: session=${sessionId} user=${authContext.userId}`
      );

      span.setStatus({ code: SpanStatusCode.OK });
      return assistantMessage;
    } catch (err) {
      span.recordException(err instanceof Error ? err : new Error(String(err)));
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  }

  @Mutation('endSession')
  async endSession(
    @Args('sessionId') id: string,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    await this.agentSessionService.complete(id, authContext);
    return true;
  }

  @Subscription('messageStream', {
    filter: (
      payload: { messageStream: AgentMessagePayload },
      variables: { sessionId: string }
    ) => payload.messageStream.sessionId === variables.sessionId,
  })
  subscribeToMessageStream(@Args('sessionId') sessionId: string) {
    return pubSub.subscribe(`messageStream_${sessionId}`);
  }

  @ResolveField('messages')
  async getMessages(
    @Parent() session: { id: string },
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    return this.agentMessageService.findBySession(session.id, authContext);
  }

  @ResolveReference()
  async resolveReference(
    reference: { __typename: string; id: string },
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);
    return this.agentSessionService.findById(reference.id, authContext);
  }

  private extractAuthContext(context: unknown) {
    const ctx = context as { authContext?: { userId: string } };
    if (!ctx.authContext) {
      throw new UnauthorizedException('Authentication required');
    }
    return ctx.authContext;
  }
}
