/**
 * WebhookService — Webhook endpoint management and event dispatch.
 *
 * Features:
 *   - Endpoint registration with event type filtering
 *   - HMAC-SHA256 payload signing (via WebhookDeliveryService)
 *   - Retry with exponential backoff (3 attempts)
 *   - Auto-disable after 10 consecutive failures
 *   - Delivery audit log
 *   - URL validation (no private IPs — SSRF protection)
 *   - All queries scoped via withTenantContext (RLS enforced)
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { randomBytes } from 'crypto';
import {
  validateWebhookUrl,
  validateWebhookEvents,
  MAX_WEBHOOKS_PER_ORG,
} from './webhook-validation';
import { WebhookDeliveryService } from './webhook-delivery.service';
import type { Webhook, WebhookDelivery } from './webhook-delivery.service';

export type { Webhook, WebhookDelivery };

export interface CreateWebhookInput {
  url: string;
  events: string[];
}

export interface UpdateWebhookInput {
  url?: string;
  events?: string[];
  isActive?: boolean;
}

@Injectable()
export class WebhookService implements OnModuleDestroy {
  private readonly logger = new Logger(WebhookService.name);
  private readonly db: Database;

  constructor(private readonly deliveryService: WebhookDeliveryService) {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[WebhookService] onModuleDestroy: cleaned up');
  }

  async createWebhook(
    input: CreateWebhookInput,
    ctx: TenantContext
  ): Promise<Webhook> {
    validateWebhookUrl(input.url);
    validateWebhookEvents(input.events);

    const secret = randomBytes(32).toString('hex');

    return withTenantContext(this.db, ctx, async (tx) => {
      const countResult = await tx.execute<{ cnt: string }>(sql`
        SELECT COUNT(*)::text AS cnt FROM webhooks
        WHERE tenant_id = ${ctx.tenantId}::uuid
      `);
      const count = Number(countResult.rows[0]?.cnt ?? 0);
      if (count >= MAX_WEBHOOKS_PER_ORG) {
        throw new BadRequestException(
          `Maximum ${MAX_WEBHOOKS_PER_ORG} webhooks per organization`
        );
      }

      const result = await tx.execute<{
        id: string;
        url: string;
        events: string[];
        is_active: boolean;
        failure_count: number;
        last_triggered_at: Date | null;
        created_at: Date;
      }>(sql`
        INSERT INTO webhooks (tenant_id, url, events, secret, is_active)
        VALUES (
          ${ctx.tenantId}::uuid,
          ${input.url},
          ${sql.raw(`ARRAY[${input.events.map((e) => `'${e}'`).join(',')}]::text[]`)},
          ${secret},
          true
        )
        RETURNING id, url, events, is_active, failure_count,
                  last_triggered_at, created_at
      `);

      const row = result.rows[0]!;
      this.logger.log(
        { tenantId: ctx.tenantId, webhookId: row.id, url: input.url },
        '[WebhookService] Webhook created'
      );

      return {
        id: row.id,
        url: row.url,
        events: row.events,
        isActive: row.is_active,
        failureCount: row.failure_count,
        lastTriggeredAt: row.last_triggered_at,
        createdAt: row.created_at,
      };
    });
  }

  async updateWebhook(
    id: string,
    input: UpdateWebhookInput,
    ctx: TenantContext
  ): Promise<Webhook> {
    if (input.url) validateWebhookUrl(input.url);
    if (input.events) validateWebhookEvents(input.events);

    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        id: string;
        url: string;
        events: string[];
        is_active: boolean;
        failure_count: number;
        last_triggered_at: Date | null;
        created_at: Date;
      }>(sql`
        UPDATE webhooks SET
          url = COALESCE(${input.url ?? null}, url),
          events = CASE
            WHEN ${input.events ? 'true' : 'false'}::boolean
            THEN ${input.events ? sql.raw(`ARRAY[${input.events.map((e) => `'${e}'`).join(',')}]::text[]`) : sql`events`}
            ELSE events
          END,
          is_active = COALESCE(${input.isActive ?? null}::boolean, is_active),
          updated_at = NOW()
        WHERE id = ${id}::uuid
          AND tenant_id = ${ctx.tenantId}::uuid
        RETURNING id, url, events, is_active, failure_count,
                  last_triggered_at, created_at
      `);

      const row = result.rows[0];
      if (!row) throw new BadRequestException('Webhook not found');

      return {
        id: row.id,
        url: row.url,
        events: row.events,
        isActive: row.is_active,
        failureCount: row.failure_count,
        lastTriggeredAt: row.last_triggered_at,
        createdAt: row.created_at,
      };
    });
  }

  async deleteWebhook(id: string, ctx: TenantContext): Promise<boolean> {
    await withTenantContext(this.db, ctx, async (tx) => {
      await tx.execute(sql`
        DELETE FROM webhooks
        WHERE id = ${id}::uuid AND tenant_id = ${ctx.tenantId}::uuid
      `);
    });
    this.logger.log(
      { tenantId: ctx.tenantId, webhookId: id },
      '[WebhookService] Webhook deleted'
    );
    return true;
  }

  async listWebhooks(ctx: TenantContext): Promise<Webhook[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        id: string;
        url: string;
        events: string[];
        is_active: boolean;
        failure_count: number;
        last_triggered_at: Date | null;
        created_at: Date;
      }>(sql`
        SELECT id, url, events, is_active, failure_count,
               last_triggered_at, created_at
        FROM webhooks
        WHERE tenant_id = ${ctx.tenantId}::uuid
        ORDER BY created_at DESC
      `);

      return result.rows.map((r) => ({
        id: r.id,
        url: r.url,
        events: r.events,
        isActive: r.is_active,
        failureCount: r.failure_count,
        lastTriggeredAt: r.last_triggered_at,
        createdAt: r.created_at,
      }));
    });
  }

  async getDeliveries(
    webhookId: string,
    ctx: TenantContext,
    limit = 20
  ): Promise<WebhookDelivery[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        id: string;
        event_type: string;
        response_status: number | null;
        attempt: number;
        status: string;
        delivered_at: Date | null;
        created_at: Date;
      }>(sql`
        SELECT id, event_type, response_status, attempt,
               status, delivered_at, created_at
        FROM webhook_deliveries
        WHERE webhook_id = ${webhookId}::uuid
          AND tenant_id = ${ctx.tenantId}::uuid
        ORDER BY created_at DESC
        LIMIT ${Math.min(limit, 100)}
      `);

      return result.rows.map((r) => ({
        id: r.id,
        eventType: r.event_type,
        responseStatus: r.response_status,
        attempt: r.attempt,
        status: r.status,
        deliveredAt: r.delivered_at,
        createdAt: r.created_at,
      }));
    });
  }

  async testWebhook(id: string, ctx: TenantContext): Promise<WebhookDelivery> {
    const webhooks = await this.listWebhooks(ctx);
    const webhook = webhooks.find((w) => w.id === id);
    if (!webhook) throw new BadRequestException('Webhook not found');

    const testPayload = {
      event: 'test',
      data: { message: 'Webhook test from EduSphere' },
      timestamp: new Date().toISOString(),
      webhookId: id,
    };

    return this.deliveryService.dispatchToWebhook(
      this.db,
      webhook,
      'test',
      testPayload,
      ctx
    );
  }

  async dispatchToWebhook(
    webhook: Webhook,
    eventType: string,
    payload: Record<string, unknown>,
    ctx: TenantContext,
    attempt = 1
  ): Promise<WebhookDelivery> {
    return this.deliveryService.dispatchToWebhook(
      this.db,
      webhook,
      eventType,
      payload,
      ctx,
      attempt
    );
  }
}
