/**
 * ExamSessionResolver — Thin resolver for exam delivery mutations/queries.
 */
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
} from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import type { GraphQLContext } from '../auth/auth.middleware';
import type { TenantContext } from '@edusphere/db';
import { ExamDeliveryService } from './exam-delivery.service';
import { submitExamAnswerSchema } from './exam-item.schemas';

@Resolver('ExamSession')
export class ExamSessionResolver {
  private readonly logger = new Logger(ExamSessionResolver.name);

  constructor(private readonly deliveryService: ExamDeliveryService) {}

  @Query('myExamSessions')
  async myExamSessions(
    @Args('blueprintId') blueprintId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const tc = this.extractAuth(ctx);
    return this.deliveryService.listUserSessions(
      blueprintId, tc.userId, tc.tenantId,
    );
  }

  @Query('examSession')
  async examSession(@Args('id') id: string, @Context() ctx: GraphQLContext) {
    const tc = this.extractAuth(ctx);
    return this.deliveryService.getSession(id, tc.userId, tc.tenantId);
  }

  @Mutation('startExamSession')
  async startExamSession(
    @Args('blueprintId') blueprintId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const tc = this.extractAuth(ctx);
    return this.deliveryService.startSession(
      blueprintId, tc.userId, tc.tenantId,
    );
  }

  @Mutation('submitExamAnswer')
  async submitExamAnswer(
    @Args('sessionId') sessionId: string,
    @Args('itemId') itemId: string,
    @Args('answer') answer: unknown,
    @Context() ctx: GraphQLContext,
  ) {
    const tc = this.extractAuth(ctx);
    submitExamAnswerSchema.parse({ sessionId, itemId, answer });
    return this.deliveryService.submitAnswer(
      sessionId, itemId, answer, tc.userId, tc.tenantId,
    );
  }

  @Mutation('flagExamQuestion')
  async flagExamQuestion(
    @Args('sessionId') sessionId: string,
    @Args('itemId') itemId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const tc = this.extractAuth(ctx);
    return this.deliveryService.flagQuestion(
      sessionId, itemId, tc.userId, tc.tenantId,
    );
  }

  @Mutation('submitExam')
  async submitExam(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const tc = this.extractAuth(ctx);
    return this.deliveryService.submitExam(
      sessionId, tc.userId, tc.tenantId,
    );
  }

  @Mutation('voidExamSession')
  async voidExamSession(
    @Args('sessionId') sessionId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const tc = this.extractAuth(ctx);
    return this.deliveryService.voidSession(sessionId, tc.tenantId);
  }

  private extractAuth(ctx: GraphQLContext): TenantContext {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: (auth.roles?.[0] ?? 'STUDENT') as TenantContext['userRole'],
    };
  }
}
