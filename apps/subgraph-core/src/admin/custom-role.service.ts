/**
 * CustomRoleService — F-113 Sub-Admin Delegation.
 * CRUD for custom roles + delegation assignment/revoke per tenant.
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
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';

export interface RoleData {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  userCount: number;
}

export interface DelegationData {
  id: string;
  userId: string;
  roleId: string;
  delegatedBy: string;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
}

@Injectable()
export class CustomRoleService implements OnModuleDestroy {
  private readonly logger = new Logger(CustomRoleService.name);
  private db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async listRoles(tenantCtx: TenantContext): Promise<RoleData[]> {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const rows = await tx
        .select()
        .from(schema.customRoles)
        .where(eq(schema.customRoles.tenantId, tenantCtx.tenantId))
        .orderBy(schema.customRoles.createdAt);
      return rows.map((r) => this.mapRole(r, 0));
    });
  }

  async getRole(id: string, tenantCtx: TenantContext): Promise<RoleData> {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [row] = await tx
        .select()
        .from(schema.customRoles)
        .where(
          and(
            eq(schema.customRoles.id, id),
            eq(schema.customRoles.tenantId, tenantCtx.tenantId),
          ),
        )
        .limit(1);
      if (!row) throw new NotFoundException(`Role ${id} not found`);
      return this.mapRole(row, 0);
    });
  }

  async createRole(
    input: { name: string; description?: string; permissions: string[] },
    tenantCtx: TenantContext,
  ): Promise<RoleData> {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [created] = await tx
        .insert(schema.customRoles)
        .values({
          tenantId: tenantCtx.tenantId,
          name: input.name,
          description: input.description ?? '',
          permissions: input.permissions,
          isSystem: false,
          createdBy: tenantCtx.userId,
        })
        .returning();
      if (!created) throw new Error('Role insert failed');
      this.logger.log(`Created custom role "${input.name}" in tenant ${tenantCtx.tenantId}`);
      return this.mapRole(created, 0);
    });
  }

  async updateRole(
    id: string,
    input: { name?: string; description?: string; permissions?: string[] },
    tenantCtx: TenantContext,
  ): Promise<RoleData> {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.customRoles)
        .where(
          and(
            eq(schema.customRoles.id, id),
            eq(schema.customRoles.tenantId, tenantCtx.tenantId),
          ),
        )
        .limit(1);
      if (!existing) throw new NotFoundException(`Role ${id} not found`);
      if (existing.isSystem) throw new BadRequestException('System roles cannot be modified');

      const [updated] = await tx
        .update(schema.customRoles)
        .set({
          ...(input.name !== undefined && { name: input.name }),
          ...(input.description !== undefined && { description: input.description }),
          ...(input.permissions !== undefined && { permissions: input.permissions }),
          updatedAt: new Date(),
        })
        .where(eq(schema.customRoles.id, id))
        .returning();
      if (!updated) throw new Error('Role update failed');
      this.logger.log(`Updated custom role ${id}`);
      return this.mapRole(updated, 0);
    });
  }

  async deleteRole(id: string, tenantCtx: TenantContext): Promise<boolean> {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [existing] = await tx
        .select()
        .from(schema.customRoles)
        .where(
          and(
            eq(schema.customRoles.id, id),
            eq(schema.customRoles.tenantId, tenantCtx.tenantId),
          ),
        )
        .limit(1);
      if (!existing) throw new NotFoundException(`Role ${id} not found`);
      if (existing.isSystem) throw new BadRequestException('System roles cannot be deleted');

      // Revoke all active delegations first
      await tx
        .update(schema.userRoleDelegations)
        .set({ isActive: false })
        .where(eq(schema.userRoleDelegations.roleId, id));

      await tx.delete(schema.customRoles).where(eq(schema.customRoles.id, id));
      this.logger.log(`Deleted custom role ${id}`);
      return true;
    });
  }

  async delegateRole(
    userId: string,
    roleId: string,
    validUntil: string | null,
    tenantCtx: TenantContext,
  ): Promise<DelegationData> {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [role] = await tx
        .select()
        .from(schema.customRoles)
        .where(
          and(
            eq(schema.customRoles.id, roleId),
            eq(schema.customRoles.tenantId, tenantCtx.tenantId),
          ),
        )
        .limit(1);
      if (!role) throw new NotFoundException(`Role ${roleId} not found`);

      const [delegation] = await tx
        .insert(schema.userRoleDelegations)
        .values({
          tenantId: tenantCtx.tenantId,
          userId,
          roleId,
          delegatedBy: tenantCtx.userId,
          validUntil: validUntil ? new Date(validUntil) : null,
          isActive: true,
        })
        .returning();
      if (!delegation) throw new Error('Delegation insert failed');
      this.logger.log(`Delegated role ${roleId} to user ${userId}`);
      return this.mapDelegation(delegation);
    });
  }

  async revokeDelegation(delegationId: string, tenantCtx: TenantContext): Promise<boolean> {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [updated] = await tx
        .update(schema.userRoleDelegations)
        .set({ isActive: false })
        .where(
          and(
            eq(schema.userRoleDelegations.id, delegationId),
            eq(schema.userRoleDelegations.tenantId, tenantCtx.tenantId),
          ),
        )
        .returning();
      if (!updated) throw new NotFoundException(`Delegation ${delegationId} not found`);
      this.logger.log(`Revoked delegation ${delegationId}`);
      return true;
    });
  }

  async getUserDelegations(userId: string, tenantCtx: TenantContext): Promise<DelegationData[]> {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const rows = await tx
        .select()
        .from(schema.userRoleDelegations)
        .where(
          and(
            eq(schema.userRoleDelegations.userId, userId),
            eq(schema.userRoleDelegations.tenantId, tenantCtx.tenantId),
            eq(schema.userRoleDelegations.isActive, true),
          ),
        );
      return rows.map((r) => this.mapDelegation(r));
    });
  }

  private mapRole(
    row: {
      id: string; tenantId: string; name: string; description: string;
      permissions: string[] | null; isSystem: boolean; createdBy: string;
      createdAt: Date; updatedAt: Date;
    },
    userCount: number,
  ): RoleData {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      permissions: row.permissions ?? [],
      isSystem: row.isSystem,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      userCount,
    };
  }

  private mapDelegation(row: {
    id: string; userId: string; roleId: string; delegatedBy: string;
    validUntil: Date | null; isActive: boolean; createdAt: Date;
  }): DelegationData {
    return {
      id: row.id,
      userId: row.userId,
      roleId: row.roleId,
      delegatedBy: row.delegatedBy,
      validUntil: row.validUntil ? row.validUntil.toISOString() : null,
      isActive: row.isActive,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
