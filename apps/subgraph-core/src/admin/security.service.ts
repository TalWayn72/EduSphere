import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { db, securitySettings } from '@edusphere/db';
import { eq } from 'drizzle-orm';

export interface SecuritySettingsData {
  mfaRequired: boolean;
  mfaRequiredForAdmins: boolean;
  sessionTimeoutMinutes: number;
  maxConcurrentSessions: number;
  loginAttemptLockoutThreshold: number;
  passwordMinLength: number;
  passwordRequireSpecialChars: boolean;
  passwordExpiryDays: number | null;
  ipAllowlist: string[];
}

type UpdateInput = Partial<
  Omit<SecuritySettingsData, 'ipAllowlist'> & { ipAllowlist: string[] | null }
>;

function mapRow(
  row: typeof securitySettings.$inferSelect
): SecuritySettingsData {
  return {
    mfaRequired: row.mfaRequired,
    mfaRequiredForAdmins: row.mfaRequiredForAdmins,
    sessionTimeoutMinutes: row.sessionTimeoutMinutes,
    maxConcurrentSessions: row.maxConcurrentSessions,
    loginAttemptLockoutThreshold: row.loginAttemptLockoutThreshold,
    passwordMinLength: row.passwordMinLength,
    passwordRequireSpecialChars: row.passwordRequireSpecialChars,
    passwordExpiryDays: row.passwordExpiryDays ?? null,
    ipAllowlist: Array.isArray(row.ipAllowlist)
      ? (row.ipAllowlist as string[])
      : [],
  };
}

const DEFAULTS: SecuritySettingsData = {
  mfaRequired: false,
  mfaRequiredForAdmins: true,
  sessionTimeoutMinutes: 480,
  maxConcurrentSessions: 5,
  loginAttemptLockoutThreshold: 5,
  passwordMinLength: 8,
  passwordRequireSpecialChars: false,
  passwordExpiryDays: null,
  ipAllowlist: [],
};

@Injectable()
export class SecurityService implements OnModuleDestroy {
  private readonly logger = new Logger(SecurityService.name);

  onModuleDestroy(): void {
    // No resources to clean up
  }

  async getSettings(tenantId: string): Promise<SecuritySettingsData> {
    try {
      const rows = await db
        .select()
        .from(securitySettings)
        .where(eq(securitySettings.tenantId, tenantId))
        .limit(1);
      if (rows[0]) return mapRow(rows[0]);
      const [created] = await db
        .insert(securitySettings)
        .values({ tenantId })
        .onConflictDoNothing()
        .returning();
      return created ? mapRow(created) : { ...DEFAULTS };
    } catch (err) {
      this.logger.error({ tenantId, err }, 'Failed to get security settings');
      return { ...DEFAULTS };
    }
  }

  async updateSettings(
    tenantId: string,
    input: UpdateInput
  ): Promise<SecuritySettingsData> {
    const patch: Partial<typeof securitySettings.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.mfaRequired != null) patch.mfaRequired = input.mfaRequired;
    if (input.mfaRequiredForAdmins != null)
      patch.mfaRequiredForAdmins = input.mfaRequiredForAdmins;
    if (input.sessionTimeoutMinutes != null)
      patch.sessionTimeoutMinutes = input.sessionTimeoutMinutes;
    if (input.maxConcurrentSessions != null)
      patch.maxConcurrentSessions = input.maxConcurrentSessions;
    if (input.loginAttemptLockoutThreshold != null)
      patch.loginAttemptLockoutThreshold = input.loginAttemptLockoutThreshold;
    if (input.passwordMinLength != null)
      patch.passwordMinLength = input.passwordMinLength;
    if (input.passwordRequireSpecialChars != null)
      patch.passwordRequireSpecialChars = input.passwordRequireSpecialChars;
    if (input.passwordExpiryDays !== undefined)
      patch.passwordExpiryDays = input.passwordExpiryDays ?? null;
    if (input.ipAllowlist !== undefined)
      patch.ipAllowlist = input.ipAllowlist ?? [];

    const [row] = await db
      .insert(securitySettings)
      .values({ tenantId, ...patch })
      .onConflictDoUpdate({ target: securitySettings.tenantId, set: patch })
      .returning();
    return mapRow(row);
  }
}
