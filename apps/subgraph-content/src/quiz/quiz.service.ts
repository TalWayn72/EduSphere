import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  closeAllPools,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import {
  QuizGraderService,
  QuizAnswers,
  GradeResult,
} from './quiz-grader.service';
import { QuizContentSchema, QuizContent } from './quiz-schemas';

export interface QuizResultMapped {
  id: string;
  score: number;
  passed: boolean;
  itemResults: GradeResult['itemResults'];
  submittedAt: string;
}

@Injectable()
export class QuizService implements OnModuleDestroy {
  private readonly logger = new Logger(QuizService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly grader: QuizGraderService) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async gradeAndSave(
    contentItemId: string,
    userId: string,
    ctx: TenantContext,
    answers: QuizAnswers
  ): Promise<QuizResultMapped> {
    const quizContent = await this.loadQuizContent(contentItemId, ctx);

    const gradeResult = this.grader.grade(quizContent, answers);

    const saved = await withTenantContext(this.db, ctx, async (tx) => {
      const [row] = await tx
        .insert(schema.quizResults)
        .values({
          userId,
          contentItemId,
          tenantId: ctx.tenantId,
          score: gradeResult.score,
          passed: gradeResult.passed,
          answers: answers as Record<string, unknown>,
          itemResults: gradeResult.itemResults as unknown as Record<
            string,
            unknown
          >[],
        })
        .returning();
      return row;
    });

    if (!saved) {
      throw new Error('Failed to save quiz result');
    }

    this.logger.log(
      `Quiz submitted: user=${userId} content=${contentItemId} score=${gradeResult.score}`
    );

    return this.mapResult(saved);
  }

  async getMyResults(
    userId: string,
    ctx: TenantContext,
    contentItemId?: string
  ): Promise<QuizResultMapped[]> {
    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      const conditions = contentItemId
        ? and(
            eq(schema.quizResults.userId, userId),
            eq(schema.quizResults.contentItemId, contentItemId)
          )
        : eq(schema.quizResults.userId, userId);

      return tx
        .select()
        .from(schema.quizResults)
        .where(conditions)
        .orderBy(schema.quizResults.submittedAt);
    });

    return rows.map((r) => this.mapResult(r));
  }

  private async loadQuizContent(
    contentItemId: string,
    ctx: TenantContext
  ): Promise<QuizContent> {
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, contentItemId))
        .limit(1)
    );

    const item = rows[0];
    if (!item) {
      throw new NotFoundException(`ContentItem ${contentItemId} not found`);
    }
    if (item.type !== 'QUIZ') {
      throw new BadRequestException(
        `ContentItem ${contentItemId} is not a QUIZ`
      );
    }
    if (!item.content) {
      throw new BadRequestException(
        `ContentItem ${contentItemId} has no quiz content`
      );
    }

    let raw: unknown;
    try {
      raw = JSON.parse(item.content);
    } catch {
      throw new BadRequestException('Quiz content is not valid JSON');
    }

    const parsed = QuizContentSchema.safeParse(raw);
    if (!parsed.success) {
      this.logger.error(
        `Invalid quiz content for ${contentItemId}: ${parsed.error.message}`
      );
      throw new BadRequestException('Quiz content failed schema validation');
    }

    return parsed.data;
  }

  private mapResult(
    row: typeof schema.quizResults.$inferSelect
  ): QuizResultMapped {
    return {
      id: row.id,
      score: row.score,
      passed: row.passed,
      itemResults: row.itemResults as GradeResult['itemResults'],
      submittedAt: row.submittedAt.toISOString(),
    };
  }
}
