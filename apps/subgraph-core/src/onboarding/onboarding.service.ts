import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  withTenantContext,
  closeAllPools,
  sql,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';

export interface OnboardingStateData {
  userId: string;
  tenantId: string;
  role: string;
  currentStep: number;
  totalSteps: number;
  completed: boolean;
  skipped: boolean;
  data: Record<string, unknown>;
}

type OnboardingRow = {
  user_id: string;
  tenant_id: string;
  role: string;
  current_step: number;
  total_steps: number;
  completed: boolean;
  skipped: boolean;
  data: Record<string, unknown>;
};

function getTotalSteps(role: string): number {
  return role === 'instructor' ? 4 : 5;
}

function rowToState(r: OnboardingRow): OnboardingStateData {
  return {
    userId: r.user_id,
    tenantId: r.tenant_id,
    role: r.role,
    currentStep: r.current_step,
    totalSteps: r.total_steps,
    completed: r.completed,
    skipped: r.skipped,
    data: (r.data as Record<string, unknown>) ?? {},
  };
}

@Injectable()
export class OnboardingService implements OnModuleDestroy {
  private readonly logger = new Logger(OnboardingService.name);
  private readonly db = createDatabaseConnection();

  async getState(userId: string, tenantId: string, role: string): Promise<OnboardingStateData> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = (await tx.execute(sql`
        SELECT user_id, tenant_id, role, current_step, total_steps, completed, skipped, data
        FROM onboarding_state
        WHERE user_id = ${userId}::uuid
        LIMIT 1
      `)) as unknown as OnboardingRow[];

      if (rows.length === 0) {
        return this.createInitialState(userId, tenantId, role, tx);
      }
      return rowToState(rows[0]!);
    });
  }

  private async createInitialState(
    userId: string,
    tenantId: string,
    role: string,
    tx: ReturnType<typeof createDatabaseConnection>,
  ): Promise<OnboardingStateData> {
    const totalSteps = getTotalSteps(role);
    await tx.execute(sql`
      INSERT INTO onboarding_state (user_id, tenant_id, role, current_step, total_steps, completed, skipped, data, updated_at)
      VALUES (${userId}::uuid, ${tenantId}::uuid, ${role}, 1, ${totalSteps}, false, false, '{}', NOW())
      ON CONFLICT (user_id) DO NOTHING
    `);
    return { userId, tenantId, role, currentStep: 1, totalSteps, completed: false, skipped: false, data: {} };
  }

  async updateStep(
    userId: string,
    tenantId: string,
    role: string,
    step: number,
    stepData: Record<string, unknown>,
  ): Promise<OnboardingStateData> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = (await tx.execute(sql`
        INSERT INTO onboarding_state (user_id, tenant_id, role, current_step, total_steps, data, updated_at)
        VALUES (${userId}::uuid, ${tenantId}::uuid, ${role}, ${step}, ${getTotalSteps(role)}, ${JSON.stringify(stepData)}::jsonb, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET
          current_step = ${step},
          data = onboarding_state.data || ${JSON.stringify(stepData)}::jsonb,
          updated_at = NOW()
        RETURNING user_id, tenant_id, role, current_step, total_steps, completed, skipped, data
      `)) as unknown as OnboardingRow[];
      return rowToState(rows[0]!);
    });
  }

  async completeOnboarding(userId: string, tenantId: string, role: string): Promise<OnboardingStateData> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const totalSteps = getTotalSteps(role);
      const rows = (await tx.execute(sql`
        INSERT INTO onboarding_state (user_id, tenant_id, role, current_step, total_steps, completed, updated_at)
        VALUES (${userId}::uuid, ${tenantId}::uuid, ${role}, ${totalSteps}, ${totalSteps}, true, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET completed = true, current_step = ${totalSteps}, updated_at = NOW()
        RETURNING user_id, tenant_id, role, current_step, total_steps, completed, skipped, data
      `)) as unknown as OnboardingRow[];
      this.logger.log({ userId, tenantId }, '[OnboardingService] User completed onboarding');
      return rowToState(rows[0]!);
    });
  }

  async skipOnboarding(userId: string, tenantId: string, role: string): Promise<OnboardingStateData> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = (await tx.execute(sql`
        INSERT INTO onboarding_state (user_id, tenant_id, role, skipped, updated_at)
        VALUES (${userId}::uuid, ${tenantId}::uuid, ${role}, true, NOW())
        ON CONFLICT (user_id)
        DO UPDATE SET skipped = true, updated_at = NOW()
        RETURNING user_id, tenant_id, role, current_step, total_steps, completed, skipped, data
      `)) as unknown as OnboardingRow[];
      return rowToState(rows[0]!);
    });
  }

  onModuleDestroy(): void {
    void closeAllPools();
  }
}
