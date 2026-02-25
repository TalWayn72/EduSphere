/**
 * RoleplayService — catalog management (list + create scenarios, seed built-ins).
 * Session lifecycle is in RoleplaySessionService.
 *
 * SI-10: Consent checked in RoleplaySessionService.startSession.
 * Memory safety: implements OnModuleDestroy + closes DB pool.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  scenario_templates,
  type NewScenarioTemplate,
} from '@edusphere/db';
import { and, eq } from 'drizzle-orm';
import { BUILT_IN_SCENARIOS } from './scenario-seeds.js';

@Injectable()
export class RoleplayService implements OnModuleDestroy {
  private readonly logger = new Logger(RoleplayService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async listScenarios(tenantId: string) {
    return this.db
      .select()
      .from(scenario_templates)
      .where(
        and(
          eq(scenario_templates.tenant_id, tenantId),
          eq(scenario_templates.is_active, true),
        ),
      );
  }

  async createScenario(
    tenantId: string,
    createdBy: string,
    data: Omit<NewScenarioTemplate, 'id' | 'tenant_id' | 'created_by' | 'is_builtin'>,
  ) {
    const [row] = await this.db
      .insert(scenario_templates)
      .values({ ...data, tenant_id: tenantId, created_by: createdBy, is_builtin: false })
      .returning();
    if (!row) throw new Error('Failed to create scenario template');
    this.logger.log({ tenantId, title: data.title }, 'Scenario template created');
    return row;
  }

  async seedBuiltInsForTenant(tenantId: string, createdBy: string): Promise<void> {
    for (const seed of BUILT_IN_SCENARIOS) {
      await this.db
        .insert(scenario_templates)
        .values({
          tenant_id: tenantId,
          created_by: createdBy,
          title: seed.title,
          domain: seed.domain,
          difficulty_level: seed.difficultyLevel,
          character_persona: seed.characterPersona,
          scene_description: seed.sceneDescription,
          evaluation_rubric: seed.evaluationRubric,
          max_turns: seed.maxTurns,
          is_builtin: true,
        })
        .onConflictDoNothing();
    }
    this.logger.log({ tenantId }, 'Built-in scenarios seeded');
  }
}
