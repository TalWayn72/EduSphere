/**
 * LessonPipelineResolver — Phase 58.
 * Handles the generateLesson mutation.
 */
import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { GraphQLError } from 'graphql';
import { createOllama } from 'ollama-ai-provider';
import type { LanguageModel } from 'ai';
import { randomUUID } from 'crypto';
import { runLessonPipeline, type LessonPipelineInput } from '../workflows/lesson-pipeline.workflow.js';
import type { GraphQLContext } from '@edusphere/auth';

function getModel(): LanguageModel {
  const ollama = createOllama({ baseURL: process.env['OLLAMA_URL'] ?? 'http://localhost:11434' });
  return ollama('llama3') as unknown as LanguageModel;
}

@Resolver()
export class LessonPipelineResolver {
  @Mutation('generateLesson')
  async generateLesson(
    @Args('input') input: LessonPipelineInput,
    @Context() ctx: GraphQLContext
  ) {
    if (!ctx.authContext?.userId) {
      throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
    }

    const executionId = randomUUID();
    const model = getModel();
    return runLessonPipeline(input, model, executionId);
  }
}
