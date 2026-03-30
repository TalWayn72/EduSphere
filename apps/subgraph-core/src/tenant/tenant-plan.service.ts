/**
 * TenantPlanService — Handles tenant plan updates (SUPER_ADMIN only).
 * Uses withTenantContext for RLS compliance (SI-9).
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
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { withTenantContext } from '@edusphere/db';

@Injectable()
export class TenantPlanService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantPlanService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[TenantPlanService] onModuleDestroy: cleaned up');
  }

  /**
   * Update a tenant's subscription plan.
   * Only SUPER_ADMIN may call this (enforced by GraphQL directive).
   */
  async updatePlan(
    tenantId: string,
    plan: string,
    _effectiveDate: string | undefined,
    tenantCtx: TenantContext
  ): Promise<{
    id: string;
    name: string;
    slug: string;
    plan: string;
    createdAt: Date;
    updatedAt: Date;
  }> {
    this.logger.log(
      { tenantId, plan },
      '[TenantPlanService] updatePlan'
    );

    const rows = await withTenantContext(
      this.db,
      tenantCtx,
      async (db) => {
        return db
          .update(schema.tenants)
          .set({ plan: plan as 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE', updated_at: new Date() })
          .where(eq(schema.tenants.id, tenantId))
          .returning();
      }
    );

    const updated = rows[0];
    if (!updated) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      plan: updated.plan,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }
}
