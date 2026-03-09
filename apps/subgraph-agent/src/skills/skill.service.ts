import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  skills,
  skillPrerequisites,
  skillPaths,
  learnerSkillProgress,
  eq,
  and,
  inArray,
  sql,
  type DrizzleDB,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';

function toTenantContext(auth: AuthContext): TenantContext {
  return {
    tenantId: auth.tenantId ?? '',
    userId: auth.userId,
    userRole: auth.roles[0] ?? 'STUDENT',
  };
}

export interface CreateSkillPathInput {
  title: string;
  description?: string;
  targetRole?: string;
  skillIds: string[];
  estimatedHours?: number;
}

@Injectable()
export class SkillService implements OnModuleDestroy {
  private readonly db: DrizzleDB = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async listSkills(category?: string, limit = 50, offset = 0) {
    const conditions = category ? [eq(skills.category, category)] : [];
    return this.db
      .select()
      .from(skills)
      .where(conditions.length ? and(...conditions) : undefined)
      .limit(limit)
      .offset(offset);
  }

  async getSkill(id: string) {
    const rows = await this.db
      .select()
      .from(skills)
      .where(eq(skills.id, id));
    return rows[0] ?? null;
  }

  async getSkillPrerequisites(skillId: string) {
    const prereqRows = await this.db
      .select({ prerequisiteSkillId: skillPrerequisites.prerequisiteSkillId })
      .from(skillPrerequisites)
      .where(eq(skillPrerequisites.skillId, skillId));
    if (!prereqRows.length) return [];
    const ids = prereqRows.map((r) => r.prerequisiteSkillId);
    return this.db.select().from(skills).where(inArray(skills.id, ids));
  }

  async listSkillPaths(auth: AuthContext, limit = 20, offset = 0) {
    const ctx = toTenantContext(auth);
    return withTenantContext(this.db, ctx, (tx) =>
      tx
        .select()
        .from(skillPaths)
        .where(eq(skillPaths.tenantId, ctx.tenantId))
        .limit(limit)
        .offset(offset)
    );
  }

  async createSkillPath(auth: AuthContext, input: CreateSkillPathInput) {
    const ctx = toTenantContext(auth);
    return withTenantContext(this.db, ctx, (tx) =>
      tx
        .insert(skillPaths)
        .values({
          tenantId: ctx.tenantId,
          title: input.title,
          description: input.description,
          targetRole: input.targetRole,
          skillIds: input.skillIds,
          estimatedHours: input.estimatedHours,
          createdBy: ctx.userId,
        })
        .returning()
        .then((rows) => rows[0])
    );
  }

  async getMySkillProgress(auth: AuthContext) {
    const ctx = toTenantContext(auth);
    return withTenantContext(this.db, ctx, (tx) =>
      tx
        .select()
        .from(learnerSkillProgress)
        .where(
          and(
            eq(learnerSkillProgress.tenantId, ctx.tenantId),
            eq(learnerSkillProgress.userId, ctx.userId)
          )
        )
    );
  }

  async updateMySkillProgress(
    auth: AuthContext,
    skillId: string,
    masteryLevel: string
  ) {
    const ctx = toTenantContext(auth);
    return withTenantContext(this.db, ctx, (tx) =>
      tx
        .insert(learnerSkillProgress)
        .values({
          tenantId: ctx.tenantId,
          userId: ctx.userId,
          skillId,
          masteryLevel,
        })
        .onConflictDoUpdate({
          target: [
            learnerSkillProgress.tenantId,
            learnerSkillProgress.userId,
            learnerSkillProgress.skillId,
          ],
          set: {
            masteryLevel,
            evidenceCount: sql`${learnerSkillProgress.evidenceCount} + 1`,
            lastActivityAt: new Date(),
            updatedAt: new Date(),
          },
        })
        .returning()
        .then((rows) => rows[0])
    );
  }
}
