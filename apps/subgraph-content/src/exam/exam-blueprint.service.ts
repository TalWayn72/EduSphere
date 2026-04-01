/**
 * ExamBlueprintService — Blueprint CRUD for Certification Exam System
 *
 * Manages exam specifications: time limits, passing criteria, domain/bloom
 * distributions. All queries use withTenantContext() for RLS enforcement.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type { ExamBlueprint } from '@edusphere/db';
import {
  createExamBlueprintSchema,
  updateExamBlueprintSchema,
  type CreateExamBlueprintInput,
  type UpdateExamBlueprintInput,
} from './exam-blueprint.schemas';
import { ExamItemService } from './exam-item.service';

@Injectable()
export class ExamBlueprintService implements OnModuleDestroy {
  private readonly logger = new Logger(ExamBlueprintService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly itemService: ExamItemService) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('ExamBlueprintService destroyed — connections closed');
  }

  async createBlueprint(
    input: CreateExamBlueprintInput,
    tenantId: string,
    userId: string
  ): Promise<ExamBlueprint> {
    const validated = createExamBlueprintSchema.parse(input);
    const ctx = this.buildCtx(tenantId, userId, 'INSTRUCTOR');

    const [blueprint] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .insert(schema.examBlueprints)
        .values({
          tenantId,
          courseId: validated.courseId,
          title: validated.title,
          description: validated.description ?? null,
          timeLimitMinutes: validated.timeLimitMinutes,
          totalQuestions: validated.totalQuestions,
          passingScore: validated.passingScore,
          passingMethod: validated.passingMethod,
          domainDistribution: validated.domainDistribution,
          bloomDistribution: validated.bloomDistribution,
          shuffleQuestions: validated.shuffleQuestions,
          shuffleAnswers: validated.shuffleAnswers,
          maxRetakes: validated.maxRetakes,
          retakeCooldownHours: validated.retakeCooldownHours,
          isAdaptive: validated.isAdaptive,
          catMinItems: validated.catMinItems ?? null,
          catMaxItems: validated.catMaxItems ?? null,
          createdBy: userId,
        })
        .returning()
    );
    this.logger.log(
      { blueprintId: blueprint!.id, tenantId },
      'Exam blueprint created'
    );
    return blueprint!;
  }

  async updateBlueprint(
    id: string,
    input: UpdateExamBlueprintInput,
    tenantId: string,
    userId: string
  ): Promise<ExamBlueprint> {
    const validated = updateExamBlueprintSchema.parse(input);
    const ctx = this.buildCtx(tenantId, userId, 'INSTRUCTOR');

    const [updated] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.examBlueprints)
        .set(validated)
        .where(
          and(
            eq(schema.examBlueprints.id, id),
            eq(schema.examBlueprints.tenantId, tenantId)
          )
        )
        .returning()
    );
    if (!updated) {
      throw new NotFoundException(`Blueprint ${id} not found`);
    }
    this.logger.log({ blueprintId: id, tenantId }, 'Exam blueprint updated');
    return updated;
  }

  async getBlueprints(
    courseId: string,
    tenantId: string,
    userId: string,
    role: TenantContext['userRole']
  ): Promise<ExamBlueprint[]> {
    const ctx = this.buildCtx(tenantId, userId, role);

    return withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.examBlueprints)
        .where(
          and(
            eq(schema.examBlueprints.courseId, courseId),
            eq(schema.examBlueprints.tenantId, tenantId)
          )
        )
    );
  }

  async getBlueprint(
    id: string,
    tenantId: string,
    userId: string,
    role: TenantContext['userRole']
  ): Promise<ExamBlueprint> {
    const ctx = this.buildCtx(tenantId, userId, role);

    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.examBlueprints)
        .where(
          and(
            eq(schema.examBlueprints.id, id),
            eq(schema.examBlueprints.tenantId, tenantId)
          )
        )
        .limit(1)
    );
    if (!rows[0]) throw new NotFoundException(`Blueprint ${id} not found`);
    return rows[0];
  }

  async activateBlueprint(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<ExamBlueprint> {
    const blueprint = await this.getBlueprint(
      id,
      tenantId,
      userId,
      'INSTRUCTOR'
    );
    const itemCount = await this.itemService.getItemCount(
      blueprint.courseId,
      tenantId,
      userId
    );

    if (itemCount < blueprint.totalQuestions) {
      throw new BadRequestException(
        `Not enough items in bank (${itemCount}) for blueprint requiring ${blueprint.totalQuestions} questions`
      );
    }

    return this.updateBlueprint(id, { status: 'ACTIVE' }, tenantId, userId);
  }

  async archiveBlueprint(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<ExamBlueprint> {
    return this.updateBlueprint(id, { status: 'ARCHIVED' }, tenantId, userId);
  }

  private buildCtx(
    tenantId: string,
    userId: string,
    role: TenantContext['userRole']
  ): TenantContext {
    return { tenantId, userId, userRole: role };
  }
}
