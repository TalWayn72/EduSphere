/**
 * ExamItemService — Item Bank CRUD for Certification Exam System
 *
 * Manages IRT-calibrated exam items per-tenant, per-course.
 * All queries use withTenantContext() for RLS enforcement.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  isNull,
  count,
  desc,
  gt,
  withTenantContext,
  decodeCursor,
  buildRelayConnection,
} from '@edusphere/db';
import type { TenantContext, RelayConnection } from '@edusphere/db';
import type { ExamItem } from '@edusphere/db';
import {
  createExamItemSchema,
  updateExamItemSchema,
  type CreateExamItemInput,
  type UpdateExamItemInput,
  type ExamItemFilter,
} from './exam-item.schemas';

const DEFAULT_PAGE_SIZE = 20;

@Injectable()
export class ExamItemService implements OnModuleDestroy {
  private readonly logger = new Logger(ExamItemService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('ExamItemService destroyed — connections closed');
  }

  async createItem(
    input: CreateExamItemInput,
    tenantId: string,
    userId: string
  ): Promise<ExamItem> {
    const validated = createExamItemSchema.parse(input);
    const ctx = this.buildCtx(tenantId, userId, 'INSTRUCTOR');

    const [item] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .insert(schema.examItems)
        .values({
          tenantId,
          courseId: validated.courseId,
          moduleId: validated.moduleId ?? null,
          domainTag: validated.domainTag,
          bloomLevel: validated.bloomLevel,
          questionData: validated.questionData,
          source: validated.source,
          createdBy: userId,
        })
        .returning()
    );
    this.logger.log({ itemId: item!.id, tenantId }, 'Exam item created');
    return item!;
  }

  async updateItem(
    id: string,
    input: UpdateExamItemInput,
    tenantId: string,
    userId: string
  ): Promise<ExamItem> {
    const validated = updateExamItemSchema.parse(input);
    const ctx = this.buildCtx(tenantId, userId, 'INSTRUCTOR');

    const [updated] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.examItems)
        .set(validated)
        .where(
          and(
            eq(schema.examItems.id, id),
            eq(schema.examItems.tenantId, tenantId),
            isNull(schema.examItems.deletedAt)
          )
        )
        .returning()
    );
    if (!updated) throw new NotFoundException(`Exam item ${id} not found`);
    this.logger.log({ itemId: id, tenantId }, 'Exam item updated');
    return updated;
  }

  async retireItem(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<ExamItem> {
    const ctx = this.buildCtx(tenantId, userId, 'INSTRUCTOR');

    const [retired] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.examItems)
        .set({ calibrationStatus: 'RETIRED' })
        .where(
          and(
            eq(schema.examItems.id, id),
            eq(schema.examItems.tenantId, tenantId),
            isNull(schema.examItems.deletedAt)
          )
        )
        .returning()
    );
    if (!retired) throw new NotFoundException(`Exam item ${id} not found`);
    this.logger.log({ itemId: id, tenantId }, 'Exam item retired');
    return retired;
  }

  async getItemBank(
    courseId: string,
    filters: ExamItemFilter | undefined,
    first: number | undefined,
    after: string | undefined,
    tenantId: string,
    userId: string
  ): Promise<RelayConnection<ExamItem>> {
    const limit = first ?? DEFAULT_PAGE_SIZE;
    const ctx = this.buildCtx(tenantId, userId, 'INSTRUCTOR');
    const cursor = after ? decodeCursor(after) : null;

    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      const conditions = [
        eq(schema.examItems.courseId, courseId),
        eq(schema.examItems.tenantId, tenantId),
        isNull(schema.examItems.deletedAt),
      ];

      if (filters?.domainTag) {
        conditions.push(eq(schema.examItems.domainTag, filters.domainTag));
      }
      if (filters?.bloomLevel) {
        conditions.push(eq(schema.examItems.bloomLevel, filters.bloomLevel));
      }
      if (filters?.calibrationStatus) {
        conditions.push(
          eq(schema.examItems.calibrationStatus, filters.calibrationStatus)
        );
      }
      if (filters?.source) {
        conditions.push(eq(schema.examItems.source, filters.source));
      }
      if (cursor) {
        conditions.push(gt(schema.examItems.id, cursor.id));
      }

      return tx
        .select()
        .from(schema.examItems)
        .where(and(...conditions))
        .orderBy(desc(schema.examItems.createdAt))
        .limit(limit + 1);
    });

    const totalCount = await this.getItemCount(courseId, tenantId, userId);
    return buildRelayConnection(rows, limit, totalCount, after);
  }

  async getItem(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<ExamItem> {
    const ctx = this.buildCtx(tenantId, userId, 'INSTRUCTOR');

    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.examItems)
        .where(
          and(
            eq(schema.examItems.id, id),
            eq(schema.examItems.tenantId, tenantId),
            isNull(schema.examItems.deletedAt)
          )
        )
        .limit(1)
    );
    if (!rows[0]) throw new NotFoundException(`Exam item ${id} not found`);
    return rows[0];
  }

  async getItemCount(
    courseId: string,
    tenantId: string,
    userId: string
  ): Promise<number> {
    const ctx = this.buildCtx(tenantId, userId, 'INSTRUCTOR');

    const [row] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({ value: count() })
        .from(schema.examItems)
        .where(
          and(
            eq(schema.examItems.courseId, courseId),
            eq(schema.examItems.tenantId, tenantId),
            isNull(schema.examItems.deletedAt)
          )
        )
    );
    return row?.value ?? 0;
  }

  /** Fetch items eligible for exam assembly (CALIBRATED + PILOT, not retired/DIF) */
  async getAssemblableItems(
    courseId: string,
    tenantId: string,
    userId: string
  ): Promise<ExamItem[]> {
    const ctx = this.buildCtx(tenantId, userId, 'INSTRUCTOR');

    return withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.examItems)
        .where(
          and(
            eq(schema.examItems.courseId, courseId),
            eq(schema.examItems.tenantId, tenantId),
            isNull(schema.examItems.deletedAt),
            eq(schema.examItems.difFlagged, false)
          )
        )
    );
  }

  private buildCtx(
    tenantId: string,
    userId: string,
    role: TenantContext['userRole']
  ): TenantContext {
    return { tenantId, userId, userRole: role };
  }
}
