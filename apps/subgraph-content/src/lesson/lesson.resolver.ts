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
import type { AuthContext } from '@edusphere/auth';
import type { TenantContext } from '@edusphere/db';
import { LessonService } from './lesson.service';
import type { CreateLessonInput, UpdateLessonInput } from './lesson.service';
import { LessonAssetService } from './lesson-asset.service';
import type { AddLessonAssetInput } from './lesson-asset.service';
import { LessonPipelineService } from './lesson-pipeline.service';
import type { SaveLessonPipelineInput } from './lesson-pipeline.service';

interface GqlContext {
  authContext?: AuthContext;
}

interface LessonParent {
  id: string;
  courseId?: string;
}

function requireAuth(ctx: GqlContext): TenantContext {
  const auth = ctx.authContext;
  if (!auth || !auth.tenantId || !auth.userId) {
    throw new UnauthorizedException('Authentication required');
  }
  return {
    tenantId: auth.tenantId,
    userId: auth.userId,
    userRole: auth.roles[0] ?? 'STUDENT',
  };
}

@Resolver('Lesson')
export class LessonResolver {
  constructor(
    private readonly lessonService: LessonService,
    private readonly assetService: LessonAssetService,
    private readonly pipelineService: LessonPipelineService
  ) {}

  @Query('lesson')
  async getLesson(@Args('id') id: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.lessonService.findById(id, tenantCtx);
  }

  @Query('lessonsByCourse')
  async getLessonsByCourse(
    @Args('courseId') courseId: string,
    @Args('limit') limit: number = 20,
    @Args('offset') offset: number = 0,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.lessonService.findByCourse(courseId, tenantCtx, limit, offset);
  }

  @Query('lessonPipelineRun')
  async getLessonPipelineRun(
    @Args('runId') runId: string,
    @Context() ctx: GqlContext
  ) {
    requireAuth(ctx);
    return this.pipelineService.findRunById(runId);
  }

  @Mutation('createLesson')
  async createLesson(
    @Args('input') input: CreateLessonInput,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.lessonService.create(input, tenantCtx);
  }

  @Mutation('updateLesson')
  async updateLesson(
    @Args('id') id: string,
    @Args('input') input: UpdateLessonInput,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.lessonService.update(id, input, tenantCtx);
  }

  @Mutation('deleteLesson')
  async deleteLesson(@Args('id') id: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.lessonService.delete(id, tenantCtx);
  }

  @Mutation('addLessonAsset')
  async addLessonAsset(
    @Args('lessonId') lessonId: string,
    @Args('input') input: AddLessonAssetInput,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.assetService.addAsset(lessonId, input, tenantCtx);
  }

  @Mutation('saveLessonPipeline')
  async saveLessonPipeline(
    @Args('lessonId') lessonId: string,
    @Args('input') input: SaveLessonPipelineInput,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.pipelineService.savePipeline(lessonId, input, tenantCtx);
  }

  @Mutation('startLessonPipelineRun')
  async startLessonPipelineRun(
    @Args('pipelineId') pipelineId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.pipelineService.startRun(pipelineId, tenantCtx);
  }

  @Mutation('cancelLessonPipelineRun')
  async cancelLessonPipelineRun(
    @Args('runId') runId: string,
    @Context() ctx: GqlContext
  ) {
    const tenantCtx = requireAuth(ctx);
    return this.pipelineService.cancelRun(runId, tenantCtx);
  }

  @Mutation('publishLesson')
  async publishLesson(@Args('id') id: string, @Context() ctx: GqlContext) {
    const tenantCtx = requireAuth(ctx);
    return this.lessonService.publish(id, tenantCtx);
  }

  // ── Field Resolvers ──────────────────────────────────────────

  @ResolveField('assets')
  async getAssets(@Parent() lesson: LessonParent) {
    return this.assetService.findByLesson(lesson.id);
  }

  @ResolveField('pipeline')
  async getPipeline(@Parent() lesson: LessonParent) {
    return this.pipelineService.findByLesson(lesson.id);
  }

  @ResolveField('citations')
  async getCitations(@Parent() _lesson: LessonParent) {
    // Citations populated by CitationVerifierWorkflow via pipeline results
    return [];
  }
}
