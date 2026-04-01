/**
 * UserAdminService — Admin operations: bulk import, list, suspend, password reset.
 * Extracted from UserService for file-size compliance (<300 lines).
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  schema,
  eq,
  sql,
  withTenantContext,
  buildRelayConnection,
} from '@edusphere/db';
import type { TenantContext, RelayConnection } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import { keycloakConfig } from '@edusphere/config';
import { UserService } from './user.service';
import type { MappedUser } from './user.service';

type UserRole = (typeof schema.users.$inferInsert)['role'];

@Injectable()
export class UserAdminService implements OnModuleInit {
  private readonly logger = new Logger(UserAdminService.name);

  constructor(private readonly userService: UserService) {}

  onModuleInit(): void {
    this.userService.setAdminService(this);
  }

  private toTenantContext(authContext: AuthContext): TenantContext {
    return {
      tenantId: authContext.tenantId || '',
      userId: authContext.userId,
      userRole: authContext.roles[0] || 'STUDENT',
    };
  }

  async resetUserPassword(
    userId: string,
    authContext: AuthContext
  ): Promise<boolean> {
    const adminSecret = process.env['KEYCLOAK_ADMIN_CLIENT_SECRET'];
    if (!adminSecret) {
      this.logger.warn(
        { userId, tenantId: authContext.tenantId },
        '[UserAdminService] KEYCLOAK_ADMIN_CLIENT_SECRET not set — skipping password reset (dev mode)'
      );
      return true;
    }

    const adminClientId =
      process.env['KEYCLOAK_ADMIN_CLIENT_ID'] ?? 'admin-cli';

    try {
      const tokenUrl = `${keycloakConfig.url}/realms/master/protocol/openid-connect/token`;
      const tokenRes = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: adminClientId,
          client_secret: adminSecret,
        }),
      });

      if (!tokenRes.ok) {
        this.logger.error(
          { userId, status: tokenRes.status, tenantId: authContext.tenantId },
          '[UserAdminService] Failed to obtain Keycloak admin token'
        );
        return false;
      }

      const tokenData = (await tokenRes.json()) as { access_token: string };

      const actionsUrl =
        `${keycloakConfig.url}/admin/realms/${keycloakConfig.realm}` +
        `/users/${userId}/execute-actions-email`;
      const actionsRes = await fetch(actionsUrl, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['UPDATE_PASSWORD']),
      });

      if (!actionsRes.ok) {
        this.logger.error(
          { userId, status: actionsRes.status, tenantId: authContext.tenantId },
          '[UserAdminService] Keycloak execute-actions-email failed'
        );
        return false;
      }

      this.logger.log(
        { userId, tenantId: authContext.tenantId },
        '[UserAdminService] Password reset email sent via Keycloak'
      );
      return true;
    } catch (err) {
      this.logger.error(
        { userId, tenantId: authContext.tenantId, error: String(err) },
        '[UserAdminService] resetUserPassword failed'
      );
      return false;
    }
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
        await this.userService.create(
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
    const limit = opts.limit ?? 20;
    const page = opts.page ?? 0;
    const offset = opts.after ? 0 : page * limit;
    const result = await this.adminUsers(
      { limit: limit + 1, offset, search: opts.search, role: opts.role },
      authContext
    );
    const cursorSignal = opts.after ?? (offset > 0 ? '__page__' : null);
    return buildRelayConnection(
      result.users as (NonNullable<MappedUser> & {
        id: string;
        createdAt?: string;
      })[],
      limit,
      result.total,
      cursorSignal
    );
  }

  async suspendUser(
    userId: string,
    suspended: boolean,
    authContext: AuthContext
  ): Promise<NonNullable<MappedUser>> {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(
      this.userService.getDb(),
      tenantCtx,
      async (tx) => {
        const [user] = await tx
          .update(schema.users)
          .set({
            deleted_at: suspended ? new Date() : null,
            updated_at: new Date(),
          })
          .where(eq(schema.users.id, userId))
          .returning();
        if (!user) throw new NotFoundException('User not found');
        this.logger.log(
          { userId, suspended, tenantId: tenantCtx.tenantId },
          '[UserAdminService] suspendUser applied'
        );
        return this.userService.mapUser(user) as NonNullable<MappedUser>;
      }
    );
  }

  async adminUsers(
    opts: { limit: number; offset: number; search?: string; role?: string },
    authContext: AuthContext
  ): Promise<{ users: NonNullable<MappedUser>[]; total: number }> {
    const tenantCtx = this.toTenantContext(authContext);
    return withTenantContext(
      this.userService.getDb(),
      tenantCtx,
      async (tx) => {
        const rows = await (opts.role
          ? tx
              .select()
              .from(schema.users)
              .where(eq(schema.users.role, opts.role as UserRole))
              .limit(opts.limit)
              .offset(opts.offset)
          : tx
              .select()
              .from(schema.users)
              .limit(opts.limit)
              .offset(opts.offset));
        const countQuery = tx
          .select({ total: sql<number>`cast(count(*) as integer)` })
          .from(schema.users);
        const [countResult] = opts.role
          ? await countQuery.where(eq(schema.users.role, opts.role as UserRole))
          : await countQuery;
        return {
          users: rows
            .map((u) => this.userService.mapUser(u))
            .filter((u): u is NonNullable<MappedUser> => u !== null),
          total: countResult?.total ?? 0,
        };
      }
    );
  }
}
