import { Injectable } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';

@Injectable()
export class UserService {
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  private toTenantContext(authContext: AuthContext): TenantContext {
    return {
      tenantId: authContext.tenantId || '',
      userId: authContext.userId,
      userRole: authContext.roles[0] || 'STUDENT',
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
        return user || null;
      });
    }

    const [user] = await this.db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return user || null;
  }

  async findAll(limit: number, offset: number, authContext?: AuthContext) {
    if (authContext && authContext.tenantId) {
      const tenantCtx = this.toTenantContext(authContext);
      return withTenantContext(this.db, tenantCtx, async (tx) => {
        return tx.select().from(schema.users).limit(limit).offset(offset);
      });
    }

    return this.db.select().from(schema.users).limit(limit).offset(offset);
  }

  async create(input: any, authContext: AuthContext) {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const values: any = {
        tenant_id: input.tenantId || authContext.tenantId || '',
        email: input.email,
        display_name: `${input.firstName || ''} ${input.lastName || ''}`.trim(),
      };

      if (input.role) {
        values.role = input.role;
      }

      const [user] = await tx.insert(schema.users).values(values).returning();
      return user;
    });
  }

  async update(id: string, input: any, authContext: AuthContext) {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const updateData: any = {};

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

      return user;
    });
  }
}
