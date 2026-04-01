/**
 * ExamItemResolver — Thin GraphQL resolver delegating to ExamItemService
 *
 * Queries: examItemBank
 * Mutations: createExamItem, updateExamItem, retireExamItem, generateExamItems
 * Note: examItemStatistics moved to PsychometricsResolver for live CTT analysis.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import type { GraphQLContext } from '../auth/auth.middleware';
import type { TenantContext } from '@edusphere/db';
import { ExamItemService } from './exam-item.service';

@Resolver()
export class ExamItemResolver {
  private readonly logger = new Logger(ExamItemResolver.name);

  constructor(private readonly itemService: ExamItemService) {}

  @Query('examItemBank')
  async examItemBank(
    @Args('courseId') courseId: string,
    @Args('filters') filters: unknown,
    @Args('first') first: number | undefined,
    @Args('after') after: string | undefined,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId, userId } = this.extractAuth(ctx);
    this.logger.log({ courseId, tenantId, userId }, 'examItemBank query');
    return this.itemService.getItemBank(
      courseId,
      filters as Parameters<typeof this.itemService.getItemBank>[1],
      first,
      after,
      tenantId,
      userId
    );
  }

  @Mutation('createExamItem')
  async createExamItem(
    @Args('input') input: unknown,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId, userId } = this.extractAuth(ctx);
    this.logger.log({ tenantId, userId }, 'createExamItem mutation');
    return this.itemService.createItem(
      input as Parameters<typeof this.itemService.createItem>[0],
      tenantId,
      userId
    );
  }

  @Mutation('updateExamItem')
  async updateExamItem(
    @Args('id') id: string,
    @Args('input') input: unknown,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId, userId } = this.extractAuth(ctx);
    this.logger.log({ id, tenantId }, 'updateExamItem mutation');
    return this.itemService.updateItem(
      id,
      input as Parameters<typeof this.itemService.updateItem>[1],
      tenantId,
      userId
    );
  }

  @Mutation('retireExamItem')
  async retireExamItem(@Args('id') id: string, @Context() ctx: GraphQLContext) {
    const { tenantId, userId } = this.extractAuth(ctx);
    this.logger.log({ id, tenantId }, 'retireExamItem mutation');
    return this.itemService.retireItem(id, tenantId, userId);
  }

  @Mutation('generateExamItems')
  async generateExamItems(
    @Args('input') input: unknown,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId } = this.extractAuth(ctx);
    this.logger.log({ tenantId }, 'generateExamItems mutation (stub)');

    // AI generation is a stub — returns empty result for now.
    // Full implementation requires subgraph-agent integration.
    return { generatedCount: 0, validCount: 0, items: [] };
  }

  private extractAuth(ctx: GraphQLContext): {
    tenantId: string;
    userId: string;
    role: TenantContext['userRole'];
  } {
    const auth = ctx.authContext;
    if (!auth?.userId || !auth?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      tenantId: auth.tenantId,
      userId: auth.userId,
      role: (auth.roles?.[0] ?? 'STUDENT') as TenantContext['userRole'],
    };
  }
}
