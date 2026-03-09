import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { SkillService } from './skill.service';
import { SkillGapService } from './skill-gap.service';
import type { AuthContext } from '@edusphere/auth';
import type { Skill } from '@edusphere/db';

@Resolver('Skill')
export class SkillResolver {
  constructor(
    private readonly skillService: SkillService,
    private readonly skillGapService: SkillGapService
  ) {}

  // ── Queries ──────────────────────────────────────────────────────────────

  @Query('skills')
  async listSkills(
    @Args('category') category?: string,
    @Args('limit') limit?: number,
    @Args('offset') offset?: number
  ) {
    return this.skillService.listSkills(category, limit, offset);
  }

  @Query('skill')
  async getSkill(@Args('id') id: string) {
    return this.skillService.getSkill(id);
  }

  @Query('skillPaths')
  async listSkillPaths(
    @Context() context: unknown,
    @Args('limit') limit?: number,
    @Args('offset') offset?: number
  ) {
    const auth = extractAuthContext(context);
    return this.skillService.listSkillPaths(auth, limit, offset);
  }

  @Query('mySkillProgress')
  async mySkillProgress(@Context() context: unknown) {
    const auth = extractAuthContext(context);
    return this.skillService.getMySkillProgress(auth);
  }

  @Query('skillGapAnalysis')
  async skillGapAnalysis(
    @Args('pathId') pathId: string,
    @Context() context: unknown
  ) {
    const auth = extractAuthContext(context);
    const result = await this.skillGapService.getSkillGapAnalysis(
      auth,
      pathId,
      this.skillService.listSkillPaths.bind(this.skillService),
      this.skillService.getMySkillProgress.bind(this.skillService)
    );
    if (!result) {
      throw new Error(`SkillPath ${pathId} not found`);
    }
    return result;
  }

  // ── Mutations ────────────────────────────────────────────────────────────

  @Mutation('createSkillPath')
  async createSkillPath(
    @Args('input') input: unknown,
    @Context() context: unknown
  ) {
    const auth = extractAuthContext(context);
    return this.skillService.createSkillPath(
      auth,
      input as Parameters<SkillService['createSkillPath']>[1]
    );
  }

  @Mutation('updateMySkillProgress')
  async updateMySkillProgress(
    @Args('skillId') skillId: string,
    @Args('masteryLevel') masteryLevel: string,
    @Context() context: unknown
  ) {
    const auth = extractAuthContext(context);
    return this.skillService.updateMySkillProgress(auth, skillId, masteryLevel);
  }

  // ── Field resolvers ──────────────────────────────────────────────────────

  @ResolveField('prerequisites')
  async prerequisites(@Parent() skill: Skill) {
    return this.skillService.getSkillPrerequisites(skill.id);
  }
}

function extractAuthContext(context: unknown): AuthContext {
  const ctx = context as { authContext?: AuthContext };
  if (!ctx.authContext) {
    throw new UnauthorizedException('Authentication required');
  }
  return ctx.authContext;
}
