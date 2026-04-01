import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { withTenantContext, sql } from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { createHmac, randomBytes } from 'crypto';
import {
  MAX_RETRIES,
  AUTO_DISABLE_THRESHOLD,
  WEBHOOK_TIMEOUT_MS,
} from './webhook-validation';

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastTriggeredAt: Date | null;
  createdAt: Date;
}

export interface WebhookDelivery {
  id: string;
  eventType: string;
  responseStatus: number | null;
  attempt: number;
  status: string;
  deliveredAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  async dispatchToWebhook(
    db: Database,
    webhook: Webhook,
    eventType: string,
    payload: Record<string, unknown>,
    ctx: TenantContext,
    attempt = 1
  ): Promise<WebhookDelivery> {
    const secretResult = await withTenantContext(db, ctx, async (tx) =>
      tx.execute<{ secret: string }>(sql`
        SELECT secret FROM webhooks
        WHERE id = ${webhook.id}::uuid
      `)
    );
    const secret = secretResult.rows[0]?.secret ?? '';

    const payloadStr = JSON.stringify(payload);
    const signature = createHmac('sha256', secret)
      .update(payloadStr)
      .digest('hex');

    const deliveryId = randomBytes(16).toString('hex');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EduSphere-Signature': `sha256=${signature}`,
          'X-EduSphere-Event': eventType,
          'X-EduSphere-Delivery': deliveryId,
          'X-EduSphere-Timestamp': String(Math.floor(Date.now() / 1000)),
        },
        body: payloadStr,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const status = res.ok ? 'DELIVERED' : 'FAILED';
      return this.recordDelivery(
        db,
        webhook.id,
        ctx,
        eventType,
        payload,
        res.status,
        attempt,
        status
      );
    } catch (err) {
      this.logger.warn(
        { webhookId: webhook.id, attempt, err },
        '[WebhookDeliveryService] Delivery failed'
      );

      if (attempt < MAX_RETRIES) {
        const delay = [0, 60_000, 300_000][attempt] ?? 300_000;
        setTimeout(() => {
          this.dispatchToWebhook(
            db,
            webhook,
            eventType,
            payload,
            ctx,
            attempt + 1
          ).catch((e) =>
            this.logger.error(
              { err: e },
              '[WebhookDeliveryService] Retry failed'
            )
          );
        }, delay);
      }

      return this.recordDelivery(
        db,
        webhook.id,
        ctx,
        eventType,
        payload,
        null,
        attempt,
        attempt >= MAX_RETRIES ? 'FAILED' : 'RETRYING'
      );
    }
  }

  async recordDelivery(
    db: Database,
    webhookId: string,
    ctx: TenantContext,
    eventType: string,
    payload: Record<string, unknown>,
    responseStatus: number | null,
    attempt: number,
    status: string
  ): Promise<WebhookDelivery> {
    const result = await withTenantContext(db, ctx, async (tx) => {
      const inserted = await tx.execute<{
        id: string;
        event_type: string;
        response_status: number | null;
        attempt: number;
        status: string;
        delivered_at: Date | null;
        created_at: Date;
      }>(sql`
        INSERT INTO webhook_deliveries (
          webhook_id, tenant_id, event_type, payload,
          response_status, attempt, status,
          delivered_at
        ) VALUES (
          ${webhookId}::uuid,
          ${ctx.tenantId}::uuid,
          ${eventType},
          ${JSON.stringify(payload)}::jsonb,
          ${responseStatus},
          ${attempt},
          ${status},
          ${status === 'DELIVERED' ? sql`NOW()` : sql`NULL`}
        )
        RETURNING id, event_type, response_status, attempt,
                  status, delivered_at, created_at
      `);

      if (status === 'FAILED') {
        await tx.execute(sql`
          UPDATE webhooks SET
            failure_count = failure_count + 1,
            last_failure_at = NOW(),
            last_triggered_at = NOW(),
            is_active = CASE
              WHEN failure_count + 1 >= ${AUTO_DISABLE_THRESHOLD}
              THEN false ELSE is_active
            END,
            updated_at = NOW()
          WHERE id = ${webhookId}::uuid
        `);
      } else if (status === 'DELIVERED') {
        await tx.execute(sql`
          UPDATE webhooks SET
            failure_count = 0,
            last_triggered_at = NOW(),
            updated_at = NOW()
          WHERE id = ${webhookId}::uuid
        `);
      }

      return inserted.rows[0];
    });

    if (!result) {
      throw new BadRequestException('Failed to record delivery');
    }

    return {
      id: result.id,
      eventType: result.event_type,
      responseStatus: result.response_status,
      attempt: result.attempt,
      status: result.status,
      deliveredAt: result.delivered_at,
      createdAt: result.created_at,
    };
  }
}
