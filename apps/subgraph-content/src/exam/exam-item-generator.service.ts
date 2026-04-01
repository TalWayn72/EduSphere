/**
 * ExamItemGeneratorService — content-side handler for AI-generated exam items.
 *
 * Receives NATS event `content.exam.items_generated` and stores items
 * in the exam_items table with status=DRAFT, source=AI_GENERATED.
 *
 * Memory safety: implements OnModuleDestroy.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  withTenantContext,
  bloomLevelEnum,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { detectItemWritingFlaws } from './exam-iwf-detector';

interface GeneratedItemPayload {
  question: string;
  options: Array<{ text: string; isCorrect: boolean; explanation?: string }>;
  bloomLevel: string;
  domainTag: string;
  difficulty: string;
  iwfFlags: string[];
  verified: boolean;
}

export interface StoreGeneratedItemsInput {
  courseId: string;
  moduleId?: string;
  items: GeneratedItemPayload[];
  tenantId: string;
  userId: string;
}

@Injectable()
export class ExamItemGeneratorService implements OnModuleDestroy {
  private readonly logger = new Logger(ExamItemGeneratorService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('ExamItemGeneratorService destroyed — connections closed');
  }

  /**
   * Store AI-generated items in the item bank as DRAFT.
   * Re-runs IWF detection server-side for safety.
   */
  async storeGeneratedItems(input: StoreGeneratedItemsInput): Promise<number> {
    const ctx: TenantContext = {
      tenantId: input.tenantId,
      userId: input.userId,
      userRole: 'INSTRUCTOR',
    };

    let storedCount = 0;

    for (const item of input.items) {
      // Re-validate IWF server-side (defense in depth)
      const iwfFlags = detectItemWritingFlaws({
        question: item.question,
        options: item.options,
      });

      if (iwfFlags.length >= 2) {
        this.logger.warn(
          {
            question: item.question.slice(0, 50),
            iwfFlags,
            tenantId: input.tenantId,
          },
          '[ExamItemGeneratorService] item rejected — too many IWF flags'
        );
        continue;
      }

      const questionData = {
        question: item.question,
        options: item.options,
        difficulty: item.difficulty,
        iwfFlags,
        verified: item.verified,
      };

      try {
        await withTenantContext(this.db, ctx, async (tx) =>
          tx.insert(schema.examItems).values({
            tenantId: input.tenantId,
            courseId: input.courseId,
            moduleId: input.moduleId ?? null,
            domainTag: item.domainTag,
            bloomLevel:
              item.bloomLevel as (typeof bloomLevelEnum.enumValues)[number],
            questionData,
            source: 'AI_GENERATED',
            createdBy: input.userId,
          })
        );
        storedCount++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(
          { tenantId: input.tenantId, err: msg },
          '[ExamItemGeneratorService] failed to store item'
        );
      }
    }

    this.logger.log(
      { storedCount, totalItems: input.items.length, tenantId: input.tenantId },
      '[ExamItemGeneratorService] batch store complete'
    );

    return storedCount;
  }
}
