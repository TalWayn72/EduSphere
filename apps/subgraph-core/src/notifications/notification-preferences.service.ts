/**
 * NotificationPreferencesService — Phase 65.
 * CRUD for per-user notification channel preferences with tenant-level defaults.
 * RLS enforced via withTenantContext() on every query.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  closeAllPools,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

interface PreferenceDto {
  id: string;
  notificationType: string;
  channel: string;
  enabled: boolean;
}

@Injectable()
export class NotificationPreferencesService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationPreferencesService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[NotificationPreferencesService] DB pools closed');
  }

  /** Get all preferences for user, filling tenant defaults for missing entries. */
  async getPreferences(userId: string, tenantId: string): Promise<PreferenceDto[]> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const userPrefs = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .select()
        .from(schema.notificationPreferences)
        .where(eq(schema.notificationPreferences.userId, userId));
    });

    return userPrefs.map((p) => ({
      id: p.id,
      notificationType: p.notificationType,
      channel: p.channel,
      enabled: p.enabled,
    }));
  }

  /** Upsert a user preference for a specific type+channel. */
  async updatePreference(
    userId: string,
    tenantId: string,
    notificationType: string,
    channel: string,
    enabled: boolean
  ): Promise<PreferenceDto> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const channelVal = channel.toLowerCase() as typeof schema.notificationPreferences.$inferInsert['channel'];

    const [row] = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .insert(schema.notificationPreferences)
        .values({
          tenantId,
          userId,
          notificationType,
          channel: channelVal,
          enabled,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            schema.notificationPreferences.userId,
            schema.notificationPreferences.notificationType,
            schema.notificationPreferences.channel,
          ],
          set: { enabled, updatedAt: new Date() },
        })
        .returning();
    });

    this.logger.log(
      `[NotificationPreferencesService] Upserted pref — userId=${userId} type=${notificationType} channel=${channel}`
    );

    return {
      id: row.id,
      notificationType: row.notificationType,
      channel: row.channel,
      enabled: row.enabled,
    };
  }

  /** Check if a specific channel is enabled for a notification type. */
  async isChannelEnabled(
    userId: string,
    tenantId: string,
    notificationType: string,
    channel: string
  ): Promise<boolean> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const channelVal = channel.toLowerCase() as typeof schema.notificationPreferences.$inferInsert['channel'];

    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .select({ enabled: schema.notificationPreferences.enabled })
        .from(schema.notificationPreferences)
        .where(
          and(
            eq(schema.notificationPreferences.userId, userId),
            eq(schema.notificationPreferences.notificationType, notificationType),
            eq(schema.notificationPreferences.channel, channelVal)
          )
        );
    });

    if (rows.length > 0) return rows[0].enabled;

    // Fall back to tenant default
    return this.getTenantDefault(tenantId, notificationType, channel);
  }

  /** Get tenant default for a specific type+channel. */
  private async getTenantDefault(
    tenantId: string,
    notificationType: string,
    channel: string
  ): Promise<boolean> {
    const channelVal = channel.toLowerCase() as typeof schema.tenantNotificationDefaults.$inferInsert['channel'];
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };

    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .select({ enabled: schema.tenantNotificationDefaults.enabled })
        .from(schema.tenantNotificationDefaults)
        .where(
          and(
            eq(schema.tenantNotificationDefaults.tenantId, tenantId),
            eq(schema.tenantNotificationDefaults.notificationType, notificationType),
            eq(schema.tenantNotificationDefaults.channel, channelVal)
          )
        );
    });

    return rows.length > 0 ? rows[0].enabled : true;
  }
}
