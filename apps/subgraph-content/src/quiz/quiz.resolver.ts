import { Resolver, Mutation, Query, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { QuizService } from './quiz.service';
import type { GraphQLContext } from '../auth/auth.middleware';

@Resolver()
export class QuizResolver {
  private readonly logger = new Logger(QuizResolver.name);

  constructor(private readonly quizService: QuizService) {}

  @Mutation('gradeQuizSubmission')
  async gradeQuizSubmission(
    @Args('contentItemId') contentItemId: string,
    @Args('answers') answers: Record<number, unknown>,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const tenantCtx = {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: (auth.roles?.[0] ?? 'STUDENT') as
        | 'SUPER_ADMIN'
        | 'ORG_ADMIN'
        | 'INSTRUCTOR'
        | 'STUDENT'
        | 'RESEARCHER',
    };

    this.logger.log(
      `gradeQuizSubmission: contentItemId=${contentItemId} userId=${auth.userId}`
    );

    return this.quizService.gradeAndSave(
      contentItemId,
      auth.userId,
      tenantCtx,
      answers
    );
  }

  @Query('myQuizResults')
  async myQuizResults(
    @Args('contentItemId') contentItemId: string,
    @Context() ctx: GraphQLContext
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }

    const tenantCtx = {
      tenantId: auth.tenantId,
      userId: auth.userId,
      userRole: (auth.roles?.[0] ?? 'STUDENT') as
        | 'SUPER_ADMIN'
        | 'ORG_ADMIN'
        | 'INSTRUCTOR'
        | 'STUDENT'
        | 'RESEARCHER',
    };

    return this.quizService.getMyResults(auth.userId, tenantCtx, contentItemId);
  }
}
