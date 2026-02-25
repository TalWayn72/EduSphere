/**
 * SkillGapService — compares learner mastery against a skill profile (F-006).
 * Uses Drizzle for skill_profiles CRUD; delegates recommendations to SkillGapRecommendations.
 */
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  db,
  sql,
  withTenantContext,
  skillProfiles,
  eq,
  and,
} from '@edusphere/db';
import { SkillGapRecommendations } from './skill-gap.recommendations';
import { toUserRole } from './graph-types';

export interface SkillGapItem {
  conceptName: string;
  isMastered: boolean;
  recommendedContentItems: string[];
  recommendedContentTitles: string[];
  relevanceScore: number;
}

export interface SkillGapReport {
  roleId: string;
  roleName: string;
  totalRequired: number;
  mastered: number;
  gapCount: number;
  completionPercentage: number;
  gaps: SkillGapItem[];
}

export interface SkillProfileDto {
  id: string;
  roleName: string;
  description: string | null;
  requiredConceptsCount: number;
}

const MAX_GAP_CONCEPTS = 10;

@Injectable()
export class SkillGapService {
  private readonly logger = new Logger(SkillGapService.name);

  constructor(private readonly recommendations: SkillGapRecommendations) {}

  async analyzeSkillGap(
    userId: string,
    tenantId: string,
    role: string,
    roleId: string,
  ): Promise<SkillGapReport> {
    const ctx = { tenantId, userId, userRole: toUserRole(role) };

    const profile = await withTenantContext(db, ctx, async (tx) => {
      const [row] = await tx
        .select()
        .from(skillProfiles)
        .where(and(eq(skillProfiles.id, roleId), eq(skillProfiles.tenantId, tenantId)))
        .limit(1);
      return row ?? null;
    });

    if (!profile) throw new NotFoundException(`Skill profile ${roleId} not found`);

    const requiredConcepts: string[] = profile.requiredConcepts ?? [];
    const masteredSet = await this.getMasteredConceptSet(userId, tenantId, role);

    const gapConcepts = requiredConcepts
      .filter((c) => !masteredSet.has(c.toLowerCase()))
      .slice(0, MAX_GAP_CONCEPTS);

    const masteredCount = requiredConcepts.filter((c) =>
      masteredSet.has(c.toLowerCase()),
    ).length;

    const total = requiredConcepts.length;
    const gaps = await this.recommendations.buildGapItems(gapConcepts, tenantId);

    this.logger.debug(
      { userId, roleId, total, masteredCount, gaps: gapConcepts.length },
      'skillGapAnalysis complete',
    );

    return {
      roleId: profile.id,
      roleName: profile.roleName,
      totalRequired: total,
      mastered: masteredCount,
      gapCount: gapConcepts.length,
      completionPercentage: total === 0 ? 100 : Math.round((masteredCount / total) * 100),
      gaps,
    };
  }

  async createSkillProfile(
    tenantId: string,
    createdBy: string,
    role: string,
    roleName: string,
    description: string | null,
    requiredConcepts: string[],
  ): Promise<SkillProfileDto> {
    const ctx = { tenantId, userId: createdBy, userRole: toUserRole(role) };

    return withTenantContext(db, ctx, async (tx) => {
      const [row] = await tx
        .insert(skillProfiles)
        .values({ tenantId, createdBy, roleName, description, requiredConcepts })
        .returning();

      this.logger.log({ tenantId, createdBy, roleName }, 'skill profile created');
      return this.toDto(row!);
    });
  }

  async listSkillProfiles(
    tenantId: string,
    userId: string,
    role: string,
  ): Promise<SkillProfileDto[]> {
    const ctx = { tenantId, userId, userRole: toUserRole(role) };

    return withTenantContext(db, ctx, async (tx) => {
      const rows = await tx
        .select()
        .from(skillProfiles)
        .where(eq(skillProfiles.tenantId, tenantId))
        .orderBy(skillProfiles.createdAt);

      return rows.map((r) => this.toDto(r));
    });
  }

  async getMasteredConceptSet(
    userId: string,
    tenantId: string,
    role: string,
  ): Promise<Set<string>> {
    const ctx = { tenantId, userId, userRole: toUserRole(role) };

    const rows = await withTenantContext(db, ctx, async (tx) => {
      const result = await tx.execute(sql`
        SELECT DISTINCT ci.title AS concept_name
        FROM user_progress up
        JOIN content_items ci ON ci.id = up.content_item_id
        WHERE up.user_id = ${userId}::uuid
          AND up.is_completed = TRUE
      `);
      return (result.rows ?? result) as { concept_name: string }[];
    });

    const names = rows.map((r) => r.concept_name?.toLowerCase()).filter(Boolean);
    return new Set(names);
  }

  private toDto(row: typeof skillProfiles.$inferSelect): SkillProfileDto {
    return {
      id: row.id,
      roleName: row.roleName,
      description: row.description ?? null,
      requiredConceptsCount: (row.requiredConcepts ?? []).length,
    };
  }
}
