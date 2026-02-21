import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  withTenantContext,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';
import type { AuthContext } from '@edusphere/auth';
import type { UpdateUserPreferencesInput } from './user.schemas';

export interface UserPreferences {
  locale: string;
  theme: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export function parsePreferences(raw: unknown): UserPreferences {
  const r = (raw as Record<string, unknown>) ?? {};
  return {
    locale:             (r['locale']             as string)  ?? 'en',
    theme:              (r['theme']              as string)  ?? 'system',
    emailNotifications: (r['emailNotifications'] as boolean) ?? true,
    pushNotifications:  (r['pushNotifications']  as boolean) ?? true,
  };
}

@Injectable()
export class UserPreferencesService {
  private readonly logger = new Logger(UserPreferencesService.name);
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  private toTenantContext(authContext: AuthContext) {
    return {
      tenantId: authContext.tenantId || '',
      userId:   authContext.userId,
      userRole: authContext.roles[0] || 'STUDENT',
    };
  }

  async updatePreferences(
    id: string,
    input: UpdateUserPreferencesInput,
    authContext: AuthContext,
  ) {
    const tenantCtx = this.toTenantContext(authContext);

    return withTenantContext(this.db, tenantCtx, async (tx) => {
      // Fetch current preferences
      const [existing] = await tx
        .select({ preferences: schema.users.preferences })
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);

      if (!existing) {
        throw new NotFoundException(`User ${id} not found`);
      }

      const current = parsePreferences(existing.preferences);

      // PATCH semantics: only overwrite defined fields
      const merged: UserPreferences = {
        locale:             input.locale             ?? current.locale,
        theme:              input.theme              ?? current.theme,
        emailNotifications: input.emailNotifications ?? current.emailNotifications,
        pushNotifications:  input.pushNotifications  ?? current.pushNotifications,
      };

      const [updated] = await tx
        .update(schema.users)
        .set({ preferences: merged })
        .where(eq(schema.users.id, id))
        .returning();

      if (!updated) {
        throw new NotFoundException(`User ${id} not found`);
      }

      this.logger.debug(
        { userId: id, tenantId: authContext.tenantId, merged },
        'updatePreferences committed',
      );

      return updated;
    });
  }
}
