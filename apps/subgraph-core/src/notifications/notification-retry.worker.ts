/**
 * NotificationRetryWorker — Phase 65.
 * Polls for failed deliveries and retries with exponential backoff.
 * Memory safety: interval handle stored and cleared in OnModuleDestroy.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  lte,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { EmailChannelService } from './channels/email-channel.service';
import { WhatsAppChannelService } from './channels/whatsapp-channel.service';

/** Backoff delays in ms: retry 0→1min, 1→5min, 2→30min. */
const BACKOFF_MS = [60_000, 300_000, 1_800_000] as const;
const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 60_000;

@Injectable()
export class NotificationRetryWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationRetryWorker.name);
  private readonly db: Database;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly emailChannel: EmailChannelService,
    private readonly whatsAppChannel: WhatsAppChannelService
  ) {
    this.db = createDatabaseConnection();
  }

  onModuleInit(): void {
    this.intervalHandle = setInterval(() => {
      void this.pollAndRetry();
    }, POLL_INTERVAL_MS);
    this.logger.log('[NotificationRetryWorker] Started polling every 60s');
  }

  async onModuleDestroy(): Promise<void> {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    await closeAllPools();
    this.logger.log('[NotificationRetryWorker] Stopped and DB pools closed');
  }

  private async pollAndRetry(): Promise<void> {
    try {
      // Use ORG_ADMIN role to read across users within tenant context.
      const ctx: TenantContext = { tenantId: 'system', userId: 'system', userRole: 'SUPER_ADMIN' };

      const failedRows = await withTenantContext(this.db, ctx, async (tx) => {
        return tx
          .select()
          .from(schema.notificationDeliveries)
          .where(
            and(
              eq(schema.notificationDeliveries.status, 'failed'),
              lte(schema.notificationDeliveries.retryCount, MAX_RETRIES - 1),
              lte(schema.notificationDeliveries.nextRetryAt, new Date())
            )
          )
          .limit(50);
      });

      if (failedRows.length === 0) return;

      this.logger.log(
        `[NotificationRetryWorker] Found ${failedRows.length.toString()} failed deliveries to retry`
      );

      for (const row of failedRows) {
        await this.retryDelivery(row);
      }
    } catch (err) {
      this.logger.error('[NotificationRetryWorker] Poll error', err);
    }
  }

  private async retryDelivery(
    row: typeof schema.notificationDeliveries.$inferSelect
  ): Promise<void> {
    try {
      let success = false;

      if (row.channel === 'email') {
        const result = await this.emailChannel.send(row.userId, row.title, row.body);
        success = !!result;
      } else if (row.channel === 'whatsapp') {
        const result = await this.whatsAppChannel.sendTemplate(row.userId, 'notification_generic', [row.title]);
        success = !!result;
      }

      const newRetryCount = row.retryCount + 1;
      const ctx: TenantContext = { tenantId: row.tenantId, userId: row.userId, userRole: 'STUDENT' };

      if (success) {
        await withTenantContext(this.db, ctx, async (tx) => {
          await tx
            .update(schema.notificationDeliveries)
            .set({ status: 'sent', sentAt: new Date(), retryCount: newRetryCount })
            .where(eq(schema.notificationDeliveries.id, row.id));
        });
      } else if (newRetryCount >= MAX_RETRIES) {
        await withTenantContext(this.db, ctx, async (tx) => {
          await tx
            .update(schema.notificationDeliveries)
            .set({ status: 'bounced', retryCount: newRetryCount })
            .where(eq(schema.notificationDeliveries.id, row.id));
        });
        this.logger.warn(
          `[NotificationRetryWorker] Delivery bounced after ${MAX_RETRIES.toString()} retries — id=${row.id}`
        );
      } else {
        const nextDelay = BACKOFF_MS[newRetryCount] ?? BACKOFF_MS[BACKOFF_MS.length - 1];
        const nextRetryAt = new Date(Date.now() + nextDelay);
        await withTenantContext(this.db, ctx, async (tx) => {
          await tx
            .update(schema.notificationDeliveries)
            .set({ retryCount: newRetryCount, nextRetryAt })
            .where(eq(schema.notificationDeliveries.id, row.id));
        });
      }
    } catch (err) {
      this.logger.error(
        `[NotificationRetryWorker] Retry error — deliveryId=${row.id}`,
        err
      );
    }
  }
}
