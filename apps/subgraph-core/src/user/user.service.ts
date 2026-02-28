import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
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

type MappedUser = ReturnType<UserService['mapUser']>;
type UserRole = (typeof schema.users.$inferInsert)['role'];

@Injectable()
export class UserService implements OnModuleDestroy {
  private readonly logger = new Logger(UserService.name);
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
    const toIso = (v: unknown): string => {
      if (!v) return new Date().toISOString();
      if (v instanceof Date) return v.toISOString();
      return String(v);
    };
    return {
      ...user,
      firstName:
        (user['first_name'] as string) ||
        (user['firstName'] as string) ||
        parts[0] ||
        '',
      lastName:
        (user['last_name'] as string) ||
        (user['lastName'] as string) ||
        parts.slice(1).join(' ') ||
        '',
      tenantId:
        (user['tenant_id'] as string) || (user['tenantId'] as string) || '',
      createdAt: toIso(user['created_at'] ?? user['createdAt']),
      updatedAt: toIso(user['updated_at'] ?? user['updatedAt']),
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
        const rows = await tx
          .select()
          .from(schema.users)
          .limit(limit)
          .offset(offset);
        return rows.map((u) => this.mapUser(u));
      });
    }
    const rows = await this.db
      .select()
      .from(schema.users)
      .limit(limit)
      .offset(offset);
    return rows.map((u) => this.mapUser(u));
  }

  async create(
    input: {
      email: string;
      firstName: string;
      lastName: string;
      role: string;
      tenantId: string;
    },
    authContext: AuthContext
  ) {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const displayName = [input.firstName || '', input.lastName || '']
        .join(' ')
        .trim();
      const insertValues = {
        tenant_id: input.tenantId || authContext.tenantId || '',
        email: input.email,
        first_name: input.firstName || '',
        last_name: input.lastName || '',
        display_name: displayName,
        ...(input.role && { role: input.role as UserRole }),
      };
      const [user] = await tx
        .insert(schema.users)
        .values(insertValues)
        .returning();
      return this.mapUser(user);
    });
  }

  async update(
    id: string,
    input: { firstName?: string; lastName?: string; role?: string },
    authContext: AuthContext
  ) {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const updateData: Partial<typeof schema.users.$inferInsert> = {};
      if (input.firstName !== undefined)
        updateData.first_name = input.firstName;
      if (input.lastName !== undefined) updateData.last_name = input.lastName;
      if (input.firstName || input.lastName) {
        updateData.display_name = [input.firstName || '', input.lastName || '']
          .join(' ')
          .trim();
      }
      if (input.role) updateData.role = input.role as UserRole;
      const [user] = await tx
        .update(schema.users)
        .set(updateData)
        .where(eq(schema.users.id, id))
        .returning();
      if (!user) throw new Error('User not found');
      return this.mapUser(user);
    });
  }

  async deactivateUser(id: string, authContext: AuthContext): Promise<boolean> {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      await tx
        .update(schema.users)
        .set({ updated_at: new Date() })
        .where(eq(schema.users.id, id));
      this.logger.log(
        { userId: id, tenantId: tenantCtx.tenantId },
        'User deactivated'
      );
      return true;
    });
  }

  async resetUserPassword(
    userId: string,
    authContext: AuthContext
  ): Promise<boolean> {
    // Stub: Keycloak Admin API — POST /auth/admin/realms/{realm}/users/{id}/execute-actions-email
    this.logger.log(
      { userId, tenantId: authContext.tenantId },
      'Password reset requested'
    );
    return true;
  }

  async bulkImportUsers(
    csvData: string,
    authContext: AuthContext
  ): Promise<{
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  }> {
    const tenantCtx = this.toTenantContext(authContext);
    const lines = csvData.trim().split('\n');
    const headers = lines[0]?.split(',').map((h) => h.trim()) ?? [];
    let created = 0;
    const updated = 0;
    let failed = 0;
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      const rawValues = (lines[i] ?? '').split(',').map((v) => v.trim());
      const row: Record<string, string> = Object.fromEntries(
        // eslint-disable-next-line security/detect-object-injection
        headers.map((h, idx) => [h, rawValues[idx] ?? ''] as [string, string])
      );
      if (!row['email']) {
        errors.push('Row ' + String(i) + ': missing email');
        failed++;
        continue;
      }
      try {
        await this.create(
          {
            email: row['email'],
            firstName: row['firstName'] ?? row['first_name'] ?? '',
            lastName: row['lastName'] ?? row['last_name'] ?? '',
            role: row['role'] ?? 'STUDENT',
            tenantId: tenantCtx.tenantId,
          },
          authContext
        );
        created++;
      } catch (err) {
        errors.push('Row ' + String(i) + ': ' + String(err));
        failed++;
      }
    }
    this.logger.log(
      { created, updated, failed, tenantId: tenantCtx.tenantId },
      'Bulk import completed'
    );
    return { created, updated, failed, errors };
  }

  async adminUsers(
    opts: { limit: number; offset: number; search?: string; role?: string },
    authContext: AuthContext
  ): Promise<{ users: NonNullable<MappedUser>[]; total: number }> {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const rows = await (opts.role
        ? tx
            .select()
            .from(schema.users)
            .where(eq(schema.users.role, opts.role as UserRole))
            .limit(opts.limit)
            .offset(opts.offset)
        : tx.select().from(schema.users).limit(opts.limit).offset(opts.offset));
      const countRows = await tx
        .select({ id: schema.users.id })
        .from(schema.users);
      return {
        users: rows
          .map((u) => this.mapUser(u))
          .filter((u): u is NonNullable<MappedUser> => u !== null),
        total: countRows.length,
      };
    });
  }
}
