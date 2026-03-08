import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { createHash } from 'crypto';

export interface PushTokenDto {
  id: string;
  platform: 'web' | 'ios' | 'android';
  createdAt: string;
}

/**
 * PushTokenService manages push notification token registration.
 *
 * Memory safety: implements OnModuleDestroy to close DB pools.
 * Privacy: token values are NEVER logged — only IDs and platforms.
 */
@Injectable()
export class PushTokenService implements OnModuleDestroy {
  private readonly logger = new Logger(PushTokenService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /**
   * Register or update a push token for a user/platform combination.
   * Uses upsert (INSERT … ON CONFLICT) so re-registration refreshes last_seen_at.
   */
  async registerToken(
    userId: string,
    tenantId: string,
    platform: 'WEB' | 'IOS' | 'ANDROID',
    expoPushToken?: string,
    webPushSubscription?: string
  ): Promise<PushTokenDto> {
    const dbPlatform = platform.toLowerCase() as 'web' | 'ios' | 'android';
    const token = this.deriveTokenKey(
      dbPlatform,
      expoPushToken,
      webPushSubscription
    );

    const ctx: TenantContext = {
      tenantId,
      userId,
      userRole: 'STUDENT',
    };

    const [row] = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .insert(schema.pushNotificationTokens)
        .values({
          userId,
          tenantId,
          platform: dbPlatform,
          token,
          expoPushToken: expoPushToken ?? null,
          webPushSubscription: webPushSubscription
            ? (JSON.parse(webPushSubscription) as Record<string, unknown>)
            : null,
          lastSeenAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            schema.pushNotificationTokens.userId,
            schema.pushNotificationTokens.token,
          ],
          set: { lastSeenAt: new Date() },
        })
        .returning({
          id: schema.pushNotificationTokens.id,
          platform: schema.pushNotificationTokens.platform,
          createdAt: schema.pushNotificationTokens.createdAt,
        });
    });

    if (!row) {
      throw new Error('Failed to register push token');
    }

    this.logger.log(
      `[PushTokenService] Registered push token — userId=${userId} platform=${dbPlatform}`
    );

    return {
      id: row.id,
      platform: row.platform,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /**
   * Remove all tokens for a user/platform combination.
   */
  async unregisterToken(
    userId: string,
    tenantId: string,
    platform: string
  ): Promise<boolean> {
    const dbPlatform = platform.toLowerCase() as 'web' | 'ios' | 'android';
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    await withTenantContext(this.db, ctx, async (tx) => {
      await tx
        .delete(schema.pushNotificationTokens)
        .where(
          and(
            eq(schema.pushNotificationTokens.userId, userId),
            eq(schema.pushNotificationTokens.platform, dbPlatform)
          )
        );
    });

    this.logger.log(
      `[PushTokenService] Unregistered push tokens — userId=${userId} platform=${dbPlatform}`
    );
    return true;
  }

  /**
   * Return all active tokens for a user.
   * Token values are returned for dispatch use only — never log them.
   */
  async getTokensForUser(
    userId: string,
    tenantId: string
  ): Promise<
    Array<{
      platform: string;
      expoPushToken?: string;
      webPushSubscription?: string;
    }>
  > {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .select({
          platform: schema.pushNotificationTokens.platform,
          expoPushToken: schema.pushNotificationTokens.expoPushToken,
          webPushSubscription: schema.pushNotificationTokens.webPushSubscription,
        })
        .from(schema.pushNotificationTokens)
        .where(eq(schema.pushNotificationTokens.userId, userId));
    });

    return rows.map((r) => ({
      platform: r.platform,
      expoPushToken: r.expoPushToken ?? undefined,
      webPushSubscription: r.webPushSubscription
        ? JSON.stringify(r.webPushSubscription)
        : undefined,
    }));
  }

  /**
   * Batch-fetch tokens for multiple users (for broadcast scenarios).
   */
  async getTokensByUserIds(
    userIds: string[],
    tenantId: string
  ): Promise<
    Map<
      string,
      Array<{
        platform: string;
        expoPushToken?: string;
        webPushSubscription?: string;
      }>
    >
  > {
    const result = new Map<
      string,
      Array<{
        platform: string;
        expoPushToken?: string;
        webPushSubscription?: string;
      }>
    >();

    for (const userId of userIds) {
      const tokens = await this.getTokensForUser(userId, tenantId);
      result.set(userId, tokens);
    }

    return result;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Derive a stable token key for the unique index.
   * For web, hash the subscription endpoint to avoid storing PII in the unique key.
   * PRIVACY: this value is never logged.
   */
  private deriveTokenKey(
    platform: 'web' | 'ios' | 'android',
    expoPushToken?: string,
    webPushSubscription?: string
  ): string {
    if (platform === 'web' && webPushSubscription) {
      const sub = JSON.parse(webPushSubscription) as { endpoint?: string };
      return createHash('sha256')
        .update(sub.endpoint ?? webPushSubscription)
        .digest('hex');
    }
    if ((platform === 'ios' || platform === 'android') && expoPushToken) {
      return expoPushToken;
    }
    throw new Error(
      `Missing token data for platform ${platform}: provide expoPushToken or webPushSubscription`
    );
  }
}
