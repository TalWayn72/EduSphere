/**
 * CourseGeneratorResolver — handles the generateCourseFromPrompt mutation.
 *
 * Delegates to CourseGeneratorService which enforces SI-10 consent before LLM call.
 */

import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { CourseGeneratorService } from '../ai/course-generator.service.js';
import type { GraphQLContext } from '@edusphere/auth';

interface GenerateCourseInputArgs {
  prompt: string;
  targetAudienceLevel?: string;
  estimatedHours?: number;
  language?: string;
}

@Resolver()
export class CourseGeneratorResolver {
  constructor(private readonly courseGenerator: CourseGeneratorService) {}

  @Mutation('generateCourseFromPrompt')
  async generateCourseFromPrompt(
    @Args('input') input: GenerateCourseInputArgs,
    @Context() ctx: GraphQLContext,
  ) {
    const auth = ctx.authContext;
    if (!auth?.userId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'UNAUTHORIZED' },
      });
    }

    const tenantId = auth.tenantId ?? 'default';
    const result = await this.courseGenerator.generateCourse(
      {
        prompt: input.prompt,
        targetAudienceLevel: input.targetAudienceLevel,
        estimatedHours: input.estimatedHours,
        language: input.language,
      },
      auth.userId,
      tenantId,
    );

    return {
      executionId: result.executionId,
      status: result.status,
      courseTitle: result.courseTitle ?? null,
      courseDescription: result.courseDescription ?? null,
      modules: result.modules,
      draftCourseId: result.draftCourseId ?? null,
    };
  }
}
