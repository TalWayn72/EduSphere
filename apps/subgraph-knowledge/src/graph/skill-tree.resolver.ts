/**
 * SkillTreeResolver — handles skillTree query and updateMasteryLevel mutation.
 * Kept separate from graph.resolver.ts to respect the 150-line guideline.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UnauthorizedException, Logger } from '@nestjs/common';
import { SkillTreeService, MasteryLevel } from './skill-tree.service';
import type { GraphQLContext } from '../auth/auth.middleware';

const VALID_MASTERY = new Set<MasteryLevel>([
  'NONE',
  'ATTEMPTED',
  'FAMILIAR',
  'PROFICIENT',
  'MASTERED',
]);

@Resolver()
export class SkillTreeResolver {
  private readonly logger = new Logger(SkillTreeResolver.name);

  constructor(private readonly skillTreeService: SkillTreeService) {}

  private getAuthContext(context: GraphQLContext) {
    if (!context.authContext?.userId || !context.authContext?.tenantId) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      tenantId: context.authContext.tenantId,
      userId: context.authContext.userId,
      role: context.authContext.roles?.[0] ?? 'STUDENT',
    };
  }

  @Query('skillTree')
  async skillTree(
    @Args('courseId') courseId: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    this.logger.debug(
      { courseId, tenantId, userId },
      '[SkillTreeResolver] skillTree query'
    );
    return this.skillTreeService.getSkillTree(courseId, tenantId, userId, role);
  }

  @Query('myTopMasteryTopics')
  async myTopMasteryTopics(
    @Args('limit') limit: number = 5,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);
    this.logger.debug(
      { limit, tenantId, userId },
      '[SkillTreeResolver] myTopMasteryTopics query'
    );
    return this.skillTreeService.getTopMasteryTopics(tenantId, userId, role, limit);
  }

  @Mutation('updateMasteryLevel')
  async updateMasteryLevel(
    @Args('nodeId') nodeId: string,
    @Args('level') level: string,
    @Context() context: GraphQLContext
  ) {
    const { tenantId, userId, role } = this.getAuthContext(context);

    const masteryLevel = VALID_MASTERY.has(level as MasteryLevel)
      ? (level as MasteryLevel)
      : 'NONE';

    this.logger.log(
      { nodeId, masteryLevel, tenantId, userId },
      '[SkillTreeResolver] updateMasteryLevel mutation'
    );

    return this.skillTreeService.updateMasteryLevel(
      nodeId,
      masteryLevel,
      tenantId,
      userId,
      role
    );
  }
}
