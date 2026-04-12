/**
 * ExamItemResolver — Thin GraphQL resolver delegating to ExamItemService
 *
 * Queries: examItemBank
 * Mutations: createExamItem, updateExamItem, retireExamItem, generateExamItems
 * Note: examItemStatistics moved to PsychometricsResolver for live CTT analysis.
 */
import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import {
  UnauthorizedException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import type { GraphQLContext } from '../auth/auth.middleware';
import type { TenantContext } from '@edusphere/db';
import { ExamItemService } from './exam-item.service';
import { generateExamItemsSchema } from './exam-item.schemas';

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
    const { tenantId, userId } = this.extractAuth(ctx);
    const parsed = generateExamItemsSchema.safeParse(input);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const { courseId, domainTag, bloomLevels, count } = parsed.data;
    this.logger.log(
      { tenantId, userId, courseId, domainTag, count },
      'generateExamItems'
    );

    const hasAI = Boolean(
      process.env['OPENAI_API_KEY'] ||
      process.env['ANTHROPIC_API_KEY'] ||
      process.env['OLLAMA_URL']
    );

    if (!hasAI) {
      throw new BadRequestException(
        'AI generation is unavailable: no AI provider configured. ' +
          'Set OLLAMA_URL, OPENAI_API_KEY, or ANTHROPIC_API_KEY to enable AI exam generation.'
      );
    }

    try {
      const ollamaUrl = process.env['OLLAMA_URL'] ?? 'http://localhost:11434';
      const ollama = createOllama({ baseURL: ollamaUrl + '/api' });
      const model = ollama(
        process.env['OLLAMA_MODEL'] ?? 'llama3.2'
      ) as ReturnType<typeof ollama>;

      const prompt = `Generate ${count} multiple-choice exam questions for the topic "${domainTag}" in course ${courseId}.
Bloom's taxonomy levels required: ${bloomLevels.join(', ')}.
Return a JSON array with objects: { "stem": string, "options": string[4], "correctIndex": number, "bloomLevel": string }.
Output ONLY the JSON array, no markdown fences.`;

      const { text } = await generateText({
        model: model as unknown as Parameters<typeof generateText>[0]['model'],
        messages: [{ role: 'user', content: prompt }],
        maxOutputTokens: 2000,
      });

      let items: Array<{
        stem: string;
        options: string[];
        correctIndex: number;
        bloomLevel: string;
      }> = [];
      try {
        items = JSON.parse(text.trim()) as typeof items;
      } catch {
        this.logger.warn(
          { tenantId },
          'generateExamItems: AI response not valid JSON'
        );
      }

      const validItems = items.filter(
        (item) =>
          item?.stem && Array.isArray(item.options) && item.options.length === 4
      );

      return {
        generatedCount: items.length,
        validCount: validItems.length,
        items: validItems.map((item, idx) => ({
          id: `generated-${idx}`,
          courseId,
          stem: item.stem,
          options: item.options.map((text, i) => ({
            id: `opt-${idx}-${i}`,
            text,
            isCorrect: i === item.correctIndex,
          })),
          itemType: 'MCQ',
          bloomLevel: item.bloomLevel ?? bloomLevels[0],
          difficultyEstimate: parsed.data.targetDifficulty ?? 0.5,
          discriminationEstimate: 0,
          status: 'DRAFT',
        })),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        { tenantId, err: msg },
        'generateExamItems AI call failed'
      );
      throw new BadRequestException(`AI generation failed: ${msg}`);
    }
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
