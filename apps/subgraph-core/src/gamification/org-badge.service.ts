/**
 * OrgBadgeService — CRUD for per-org customizable badges (F-12).
 *
 * All queries scoped via withTenantContext (RLS enforced).
 * Zod validation on create/update inputs.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  schema,
  eq,
  and,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { z } from 'zod';

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const autoAwardCriteriaSchema = z.object({
  type: z.enum(['COURSE_COMPLETE', 'XP_THRESHOLD', 'STREAK_DAYS', 'QUIZ_SCORE']),
  courseId: z.string().uuid().optional(),
  amount: z.number().int().min(0).optional(),
  count: z.number().int().min(1).optional(),
  minScore: z.number().min(0).max(100).optional(),
}).optional().nullable();

export const CreateOrgBadgeSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional().nullable(),
  iconUrl: z.string().url().optional().nullable().or(z.literal('')),
  xpRequired: z.number().int().min(0),
  autoAwardCriteria: autoAwardCriteriaSchema,
});

export const UpdateOrgBadgeSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  iconUrl: z.string().url().optional().nullable().or(z.literal('')),
  xpRequired: z.number().int().min(0).optional(),
  autoAwardCriteria: autoAwardCriteriaSchema,
  isActive: z.boolean().optional(),
});

export type CreateOrgBadgeInput = z.infer<typeof CreateOrgBadgeSchema>;
export type UpdateOrgBadgeInput = z.infer<typeof UpdateOrgBadgeSchema>;

@Injectable()
export class OrgBadgeService implements OnModuleDestroy {
  private readonly logger = new Logger(OrgBadgeService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[OrgBadgeService] onModuleDestroy: cleaned up');
  }

  async createBadge(
    ctx: TenantContext,
    input: CreateOrgBadgeInput
  ): Promise<typeof schema.orgBadges.$inferSelect> {
    const validated = CreateOrgBadgeSchema.parse(input);
    return withTenantContext(this.db, ctx, async (tx) => {
      const [badge] = await tx
        .insert(schema.orgBadges)
        .values({
          tenantId: ctx.tenantId,
          name: validated.name,
          description: validated.description ?? null,
          iconUrl: validated.iconUrl || null,
          xpRequired: validated.xpRequired,
          autoAwardCriteria: validated.autoAwardCriteria ?? null,
        })
        .returning();
      if (!badge) {
        throw new InternalServerErrorException('Org badge insert failed');
      }
      this.logger.log(
        { tenantId: ctx.tenantId, badgeId: badge.id },
        '[OrgBadgeService] Badge created'
      );
      return badge;
    });
  }

  async listBadges(
    ctx: TenantContext
  ): Promise<(typeof schema.orgBadges.$inferSelect)[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .select()
        .from(schema.orgBadges)
        .where(eq(schema.orgBadges.tenantId, ctx.tenantId))
        .orderBy(schema.orgBadges.createdAt);
    });
  }

  async getBadge(
    ctx: TenantContext,
    id: string
  ): Promise<typeof schema.orgBadges.$inferSelect> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const [badge] = await tx
        .select()
        .from(schema.orgBadges)
        .where(
          and(
            eq(schema.orgBadges.id, id),
            eq(schema.orgBadges.tenantId, ctx.tenantId)
          )
        );
      if (!badge) throw new NotFoundException('Org badge not found');
      return badge;
    });
  }

  async updateBadge(
    ctx: TenantContext,
    id: string,
    input: UpdateOrgBadgeInput
  ): Promise<typeof schema.orgBadges.$inferSelect> {
    const validated = UpdateOrgBadgeSchema.parse(input);
    return withTenantContext(this.db, ctx, async (tx) => {
      // Build update object from provided fields only
      const updateData: Record<string, unknown> = {};
      if (validated.name !== undefined) updateData.name = validated.name;
      if (validated.description !== undefined) updateData.description = validated.description;
      if (validated.iconUrl !== undefined) updateData.iconUrl = validated.iconUrl || null;
      if (validated.xpRequired !== undefined) updateData.xpRequired = validated.xpRequired;
      if (validated.autoAwardCriteria !== undefined) {
        updateData.autoAwardCriteria = validated.autoAwardCriteria;
      }
      if (validated.isActive !== undefined) updateData.isActive = validated.isActive;

      const [badge] = await tx
        .update(schema.orgBadges)
        .set(updateData)
        .where(
          and(
            eq(schema.orgBadges.id, id),
            eq(schema.orgBadges.tenantId, ctx.tenantId)
          )
        )
        .returning();
      if (!badge) throw new NotFoundException('Org badge not found');
      this.logger.log(
        { tenantId: ctx.tenantId, badgeId: id },
        '[OrgBadgeService] Badge updated'
      );
      return badge;
    });
  }

  async deleteBadge(ctx: TenantContext, id: string): Promise<boolean> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx
        .delete(schema.orgBadges)
        .where(
          and(
            eq(schema.orgBadges.id, id),
            eq(schema.orgBadges.tenantId, ctx.tenantId)
          )
        )
        .returning({ id: schema.orgBadges.id });
      if (result.length === 0) throw new NotFoundException('Org badge not found');
      this.logger.log(
        { tenantId: ctx.tenantId, badgeId: id },
        '[OrgBadgeService] Badge deleted'
      );
      return true;
    });
  }
}
