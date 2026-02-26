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
import {
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { createPubSub } from 'graphql-yoga';
import type { AuthContext } from '@edusphere/auth';
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

const tracer = trace.getTracer('subgraph-agent');

@Resolver('AgentSession')
export class AgentSessionResolver {
  private readonly logger = new Logger(AgentSessionResolver.name);
  private readonly pubSub =
    createPubSub<Record<string, [{ messageStream: AgentMessagePayload }]>>();

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
    @Args('locale') locale: unknown,
    @Context() context: unknown
  ) {
    const authContext = this.extractAuthContext(context);

    const validationResult = StartAgentSessionSchema.safeParse({
      templateType,
      context: contextData,
      locale: locale ?? 'en',
    });

    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.issues);
    }

    const resolvedLocale = validationResult.data.locale ?? 'en';
    const existingMeta =
      contextData !== null && typeof contextData === 'object'
        ? (contextData as Record<string, unknown>)
        : {};

    return this.agentSessionService.create(
      {
        userId: authContext.userId,
        agentType: templateType,
        metadata: { ...existingMeta, locale: resolvedLocale },
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

    const validationResult = SendMessageSchema.safeParse({
      sessionId,
      content,
    });
    if (!validationResult.success) {
      throw new BadRequestException(validationResult.error.issues);
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

      this.pubSub.publish(`messageStream_${sessionId}`, {
        messageStream: userMessage as unknown as AgentMessagePayload,
      });

      // Resolve agent type and locale from session, then invoke AIService.
      let agentReply = `Echo: ${content}`;
      let templateType = 'EXPLAIN';
      try {
        const session = await this.agentSessionService.findById(
          sessionId,
          authContext
        );
        templateType =
          ((session as Record<string, unknown>)['agentType'] as string) ??
          'EXPLAIN';
        const sessionMeta =
          ((session as Record<string, unknown>)['metadata'] as Record<
            string,
            unknown
          >) ?? {};
        const sessionLocale =
          typeof sessionMeta['locale'] === 'string'
            ? sessionMeta['locale']
            : 'en';

        span.setAttribute('template.type', templateType);
        span.setAttribute('session.locale', sessionLocale);

        const aiResult = await this.aiService.continueSession(
          sessionId,
          content,
          templateType,
          sessionMeta,
          sessionLocale
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

      this.pubSub.publish(`messageStream_${sessionId}`, {
        messageStream: assistantMessage as unknown as AgentMessagePayload,
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
  async endSession(@Args('sessionId') id: string, @Context() context: unknown) {
    const authContext = this.extractAuthContext(context);
    await this.agentSessionService.complete(id, authContext);
    // Signal subscribers that the stream is done
    this.pubSub.publish('messageStream_' + id, {
      messageStream: {
        id: '__end__',
        sessionId: id,
        role: 'SYSTEM' as const,
        content: '',
        createdAt: new Date().toISOString(),
      },
    });
    return true;
  }

  @Subscription('messageStream', {
    filter: (
      payload: { messageStream: AgentMessagePayload },
      variables: { sessionId: string }
    ) => payload.messageStream.sessionId === variables.sessionId,
  })
  subscribeToMessageStream(@Args('sessionId') sessionId: string) {
    return this.pubSub.subscribe(`messageStream_${sessionId}`);
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

  private extractAuthContext(context: unknown): AuthContext {
    const ctx = context as { authContext?: AuthContext };
    if (!ctx.authContext) {
      throw new UnauthorizedException('Authentication required');
    }
    return ctx.authContext;
  }
}
