import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import { parsePreferences } from './user-preferences.service';

@Injectable()
export class UserService implements OnModuleDestroy {
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  private toTenantContext(authContext: AuthContext): TenantContext {
    return {
      tenantId: authContext.tenantId || '',
      userId: authContext.userId,
      userRole: authContext.roles[0] || 'STUDENT',
    };
  }

  private mapUser(user: Record<string, unknown> | null | undefined) {
    if (!user) return null;
    const displayName = (user['display_name'] as string) || '';
    const parts = displayName.split(' ');
    return {
      ...user,
      firstName:   (user['first_name'] as string) || parts[0] || '',
      lastName:    (user['last_name']  as string) || parts.slice(1).join(' ') || '',
      tenantId:    (user['tenant_id']  as string) || '',
      preferences: parsePreferences(user['preferences']),
    };
  }

  async findById(id: string, authContext?: AuthContext) {
    if (authContext && authContext.tenantId) {
      const tenantCtx = this.toTenantContext(authContext);
      return withTenantContext(this.db, tenantCtx, async (tx) => {
        const [user] = await tx
          .select()
          .from(schema.users)
          .where(eq(schema.users.id, id))
          .limit(1);
        return this.mapUser(user) || null;
      });
    }

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return this.mapUser(user) || null;
  }

  async findAll(limit: number, offset: number, authContext?: AuthContext) {
    if (authContext && authContext.tenantId) {
      const tenantCtx = this.toTenantContext(authContext);
      return withTenantContext(this.db, tenantCtx, async (tx) => {
        const rows = await tx.select().from(schema.users).limit(limit).offset(offset);
        return rows.map((u) => this.mapUser(u));
      });
    }

    const rows = await this.db.select().from(schema.users).limit(limit).offset(offset);
    return rows.map((u) => this.mapUser(u));
  }

  async create(input: any, authContext: AuthContext) {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const displayName = `${input.firstName || ''} ${input.lastName || ''}`.trim();
      const values: any = {
        tenant_id: input.tenantId || authContext.tenantId || '',
        email: input.email,
        first_name: input.firstName || '',
        last_name: input.lastName || '',
        display_name: displayName,
      };

      if (input.role) {
        values.role = input.role;
      }

      const [user] = await tx.insert(schema.users).values(values).returning();
      return this.mapUser(user);
    });
  }

  async update(id: string, input: any, authContext: AuthContext) {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const updateData: any = {};

      if (input.firstName !== undefined) {
        updateData.first_name = input.firstName;
      }
      if (input.lastName !== undefined) {
        updateData.last_name = input.lastName;
      }
      if (input.firstName || input.lastName) {
        updateData.display_name =
          `${input.firstName || ''} ${input.lastName || ''}`.trim();
      }

      if (input.role) {
        updateData.role = input.role;
      }

      const [user] = await tx
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, id))
        .returning();

      if (!user) {
        throw new Error('User not found');
      }

      return this.mapUser(user);
    });
  }
}
