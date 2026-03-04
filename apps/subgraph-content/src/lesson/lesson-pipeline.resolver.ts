/**
 * lesson-pipeline.resolver.ts
 * Field resolvers for LessonPipeline and LessonPipelineRun GraphQL types.
 * Resolves currentRun on LessonPipeline and results on LessonPipelineRun.
 */
import { Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Logger } from '@nestjs/common';
import { LessonPipelineService } from './lesson-pipeline.service';

interface PipelineParent {
  id: string;
}

interface RunParent {
  id: string;
}

@Resolver('LessonPipeline')
export class LessonPipelineFieldResolver {
  private readonly logger = new Logger(LessonPipelineFieldResolver.name);

  constructor(private readonly pipelineService: LessonPipelineService) {}

  @ResolveField('currentRun')
  async getCurrentRun(@Parent() pipeline: PipelineParent) {
    try {
      return await this.pipelineService.findCurrentRunByPipeline(
        String(pipeline.id)
      );
    } catch (err) {
      this.logger.error(
        `Failed to resolve currentRun for pipeline ${pipeline.id}: ${String(err)}`
      );
      return null;
    }
  }
}

@Resolver('LessonPipelineRun')
export class LessonPipelineRunFieldResolver {
  private readonly logger = new Logger(LessonPipelineRunFieldResolver.name);

  constructor(private readonly pipelineService: LessonPipelineService) {}

  @ResolveField('results')
  async getResults(@Parent() run: RunParent) {
    try {
      return await this.pipelineService.findResultsByRunId(String(run.id));
    } catch (err) {
      this.logger.error(
        `Failed to resolve results for run ${run.id}: ${String(err)}`
      );
      return [];
    }
  }
}
