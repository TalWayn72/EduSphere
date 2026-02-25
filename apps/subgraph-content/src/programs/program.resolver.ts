import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { ProgramService } from './program.service.js';
import type { GraphQLContext } from '../auth/auth.middleware.js';

@Resolver()
export class ProgramResolver {
  private readonly logger = new Logger(ProgramResolver.name);

  constructor(private readonly programService: ProgramService) {}

  @Query('programs')
  async programs(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.tenantId || !auth?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(`programs: tenantId=${auth.tenantId}`);
    return this.programService.listPrograms(auth.tenantId, auth.userId);
  }

  @Query('program')
  async program(@Args('id') id: string, @Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.tenantId || !auth?.userId) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(`program: id=${id} tenantId=${auth.tenantId}`);
    return this.programService.getProgram(id, auth.tenantId, auth.userId);
  }

  @Query('myProgramEnrollments')
  async myProgramEnrollments(@Context() ctx: GraphQLContext) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(`myProgramEnrollments: userId=${auth.userId}`);
    return this.programService.getUserEnrollments(auth.userId, auth.tenantId);
  }

  @Query('programProgress')
  async programProgress(
    @Args('programId') programId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(`programProgress: programId=${programId} userId=${auth.userId}`);
    return this.programService.getProgramProgress(programId, auth.userId, auth.tenantId);
  }

  @Mutation('createProgram')
  async createProgram(
    @Args('title') title: string,
    @Args('description') description: string,
    @Args('requiredCourseIds') requiredCourseIds: string[],
    @Args('badgeEmoji') badgeEmoji: string | undefined,
    @Args('totalHours') totalHours: number | undefined,
    @Context() ctx: GraphQLContext,
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(`createProgram: title="${title}" tenantId=${auth.tenantId}`);
    return this.programService.createProgram(
      { title, description, requiredCourseIds, badgeEmoji, totalHours },
      auth.tenantId,
      auth.userId,
    );
  }

  @Mutation('updateProgram')
  async updateProgram(
    @Args('id') id: string,
    @Args('title') title: string | undefined,
    @Args('description') description: string | undefined,
    @Args('published') published: boolean | undefined,
    @Context() ctx: GraphQLContext,
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(`updateProgram: id=${id} tenantId=${auth.tenantId}`);
    return this.programService.updateProgram(id, { title, description, published }, auth.tenantId, auth.userId);
  }

  @Mutation('enrollInProgram')
  async enrollInProgram(
    @Args('programId') programId: string,
    @Context() ctx: GraphQLContext,
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    this.logger.log(`enrollInProgram: programId=${programId} userId=${auth.userId}`);
    return this.programService.enrollInProgram(programId, auth.userId, auth.tenantId);
  }
}
