/**
 * UserService — Core user CRUD + facade for admin operations.
 * Admin logic lives in UserAdminService; this file delegates to it.
 * File-size compliance: <300 lines.
 */
import {
  Injectable,
  OnModuleDestroy,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import type { RelayConnection } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import { parsePreferences } from './user-preferences.service';
import type { UserAdminService } from './user-admin.service';

export type MappedUser = ReturnType<UserService['mapUser']>;
type UserRole = (typeof schema.users.$inferInsert)['role'];

@Injectable()
export class UserService implements OnModuleDestroy {
  private readonly logger = new Logger(UserService.name);
  private db: Database;
  private adminService!: UserAdminService;

  constructor() {
    this.db = createDatabaseConnection();
  }

  /** Called by UserAdminService after construction to wire circular dep */
  setAdminService(admin: UserAdminService): void {
    this.adminService = admin;
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  getDb(): Database {
    return this.db;
  }

  private toTenantContext(authContext: AuthContext): TenantContext {
    return {
      tenantId: authContext.tenantId || '',
      userId: authContext.userId,
      userRole: authContext.roles[0] || 'STUDENT',
    };
  }

  mapUser(user: Record<string, unknown> | null | undefined) {
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
      if (!user) throw new NotFoundException('User not found');
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

  // --- Delegated admin methods (preserve API for resolver) ---

  async resetUserPassword(
    userId: string,
    authContext: AuthContext
  ): Promise<boolean> {
    return this.adminService.resetUserPassword(userId, authContext);
  }

  async bulkImportUsers(csvData: string, authContext: AuthContext) {
    return this.adminService.bulkImportUsers(csvData, authContext);
  }

  async listUsers(
    opts: {
      page?: number;
      limit?: number;
      search?: string;
      role?: string;
      after?: string | null;
    },
    authContext: AuthContext
  ): Promise<RelayConnection<NonNullable<MappedUser>>> {
    return this.adminService.listUsers(opts, authContext);
  }

  async suspendUser(
    userId: string,
    suspended: boolean,
    authContext: AuthContext
  ) {
    return this.adminService.suspendUser(userId, suspended, authContext);
  }

  async adminUsers(
    opts: { limit: number; offset: number; search?: string; role?: string },
    authContext: AuthContext
  ) {
    return this.adminService.adminUsers(opts, authContext);
  }
}
