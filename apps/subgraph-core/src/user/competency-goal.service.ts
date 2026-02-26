import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

@Injectable()
export class CompetencyGoalService implements OnModuleDestroy {
  private readonly logger = new Logger(CompetencyGoalService.name);
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  private ctx(userId: string, tenantId: string): TenantContext {
    return { tenantId, userId, userRole: 'STUDENT' };
  }

  private mapGoal(row: typeof schema.userCompetencyGoals.$inferSelect) {
    return {
      id: row.id,
      targetConceptName: row.targetConceptName,
      currentLevel: row.currentLevel ?? null,
      targetLevel: row.targetLevel ?? null,
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
    };
  }

  async addGoal(
    userId: string,
    tenantId: string,
    targetConceptName: string,
    targetLevel?: string | null
  ) {
    return withTenantContext(
      this.db,
      this.ctx(userId, tenantId),
      async (tx) => {
        const [row] = await tx
          .insert(schema.userCompetencyGoals)
          .values({
            userId,
            tenantId,
            targetConceptName,
            targetLevel: targetLevel ?? null,
          })
          .returning();
        this.logger.debug(
          { userId, tenantId, targetConceptName },
          'competency goal added'
        );
        return this.mapGoal(row!);
      }
    );
  }

  async removeGoal(
    goalId: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    return withTenantContext(
      this.db,
      this.ctx(userId, tenantId),
      async (tx) => {
        const [existing] = await tx
          .select()
          .from(schema.userCompetencyGoals)
          .where(
            and(
              eq(schema.userCompetencyGoals.id, goalId),
              eq(schema.userCompetencyGoals.userId, userId)
            )
          )
          .limit(1);

        if (!existing) {
          throw new NotFoundException(`CompetencyGoal ${goalId} not found`);
        }

        await tx
          .delete(schema.userCompetencyGoals)
          .where(eq(schema.userCompetencyGoals.id, goalId));

        this.logger.debug({ goalId, userId }, 'competency goal removed');
        return true;
      }
    );
  }

  async getMyGoals(userId: string, tenantId: string) {
    return withTenantContext(
      this.db,
      this.ctx(userId, tenantId),
      async (tx) => {
        const rows = await tx
          .select()
          .from(schema.userCompetencyGoals)
          .where(
            and(
              eq(schema.userCompetencyGoals.userId, userId),
              eq(schema.userCompetencyGoals.tenantId, tenantId)
            )
          )
          .orderBy(schema.userCompetencyGoals.createdAt);
        return rows.map((r) => this.mapGoal(r));
      }
    );
  }
}
