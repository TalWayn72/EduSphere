/**
 * ExamBlueprintResolver — Thin GraphQL resolver delegating to ExamBlueprintService
 *
 * Queries: examBlueprints, examBlueprint
 * Mutations: createExamBlueprint, updateExamBlueprint
 *
 * Note: examBlueprintAnalytics query lives in ExamResultResolver (has access to result aggregation).
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import type { GraphQLContext } from '../auth/auth.middleware';
import type { TenantContext } from '@edusphere/db';
import { ExamBlueprintService } from './exam-blueprint.service';

@Resolver()
export class ExamBlueprintResolver {
  private readonly logger = new Logger(ExamBlueprintResolver.name);

  constructor(
    private readonly blueprintService: ExamBlueprintService,
  ) {}

  @Query('examBlueprints')
  async examBlueprints(
    @Args('courseId') courseId: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.extractAuth(ctx);
    this.logger.log({ courseId, tenantId }, 'examBlueprints query');
    return this.blueprintService.getBlueprints(
      courseId,
      tenantId,
      userId,
      role
    );
  }

  @Query('examBlueprint')
  async examBlueprint(
    @Args('id') id: string,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.extractAuth(ctx);
    this.logger.log({ blueprintId: id, tenantId }, 'examBlueprint query');
    return this.blueprintService.getBlueprint(id, tenantId, userId, role);
  }

  @Mutation('createExamBlueprint')
  async createExamBlueprint(
    @Args('input') input: unknown,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId, userId } = this.extractAuth(ctx);
    this.logger.log({ tenantId, userId }, 'createExamBlueprint mutation');
    return this.blueprintService.createBlueprint(
      input as Parameters<typeof this.blueprintService.createBlueprint>[0],
      tenantId,
      userId
    );
  }

  @Mutation('updateExamBlueprint')
  async updateExamBlueprint(
    @Args('id') id: string,
    @Args('input') input: unknown,
    @Context() ctx: GraphQLContext
  ) {
    const { tenantId, userId } = this.extractAuth(ctx);
    this.logger.log({ id, tenantId }, 'updateExamBlueprint mutation');
    return this.blueprintService.updateBlueprint(
      id,
      input as Parameters<typeof this.blueprintService.updateBlueprint>[1],
      tenantId,
      userId
    );
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
