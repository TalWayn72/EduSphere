/**
 * WebhookService — Webhook endpoint management and event dispatch.
 *
 * Features:
 *   - Endpoint registration with event type filtering
 *   - HMAC-SHA256 payload signing
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
import { createHmac, randomBytes } from 'crypto';

export interface CreateWebhookInput {
  url: string;
  events: string[];
}

export interface UpdateWebhookInput {
  url?: string;
  events?: string[];
  isActive?: boolean;
}

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

const VALID_EVENTS = [
  'course.completed',
  'course.enrolled',
  'badge.issued',
  'user.invited',
  'user.joined',
  'org.provisioned',
  'license.activated',
];

const MAX_WEBHOOKS_PER_ORG = 10;
const MAX_RETRIES = 3;
const AUTO_DISABLE_THRESHOLD = 10;
const WEBHOOK_TIMEOUT_MS = 10_000;

// SSRF protection: block private IP ranges
const PRIVATE_IP_PATTERNS = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^0\./,
  /localhost/i,
  /\[::1\]/,
];

@Injectable()
export class WebhookService implements OnModuleDestroy {
  private readonly logger = new Logger(WebhookService.name);
  private readonly db: Database;

  constructor() {
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
    this.validateUrl(input.url);
    this.validateEvents(input.events);

    const secret = randomBytes(32).toString('hex');

    return withTenantContext(this.db, ctx, async (tx) => {
      // Check max webhooks per org
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
    if (input.url) this.validateUrl(input.url);
    if (input.events) this.validateEvents(input.events);

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

  async testWebhook(
    id: string,
    ctx: TenantContext
  ): Promise<WebhookDelivery> {
    const webhooks = await this.listWebhooks(ctx);
    const webhook = webhooks.find((w) => w.id === id);
    if (!webhook) throw new BadRequestException('Webhook not found');

    const testPayload = {
      event: 'test',
      data: { message: 'Webhook test from EduSphere' },
      timestamp: new Date().toISOString(),
      webhookId: id,
    };

    return this.dispatchToWebhook(webhook, 'test', testPayload, ctx);
  }

  async dispatchToWebhook(
    webhook: Webhook,
    eventType: string,
    payload: Record<string, unknown>,
    ctx: TenantContext,
    attempt = 1
  ): Promise<WebhookDelivery> {
    // Get webhook secret
    const secretResult = await withTenantContext(this.db, ctx, async (tx) =>
      tx.execute<{ secret: string }>(sql`
        SELECT secret FROM webhooks
        WHERE id = ${webhook.id}::uuid
      `)
    );
    const secret = secretResult.rows[0]?.secret ?? '';

    // Sign payload with HMAC-SHA256
    const payloadStr = JSON.stringify(payload);
    const signature = createHmac('sha256', secret)
      .update(payloadStr)
      .digest('hex');

    const deliveryId = randomBytes(16).toString('hex');

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        WEBHOOK_TIMEOUT_MS
      );

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

      // Record delivery
      return this.recordDelivery(
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
        '[WebhookService] Delivery failed'
      );

      if (attempt < MAX_RETRIES) {
        const delay = [0, 60_000, 300_000][attempt] ?? 300_000;
        // Schedule retry (in production this would be via NATS delayed message)
        setTimeout(() => {
          this.dispatchToWebhook(webhook, eventType, payload, ctx, attempt + 1)
            .catch((e) =>
              this.logger.error({ err: e }, '[WebhookService] Retry failed')
            );
        }, delay);
      }

      return this.recordDelivery(
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

  private async recordDelivery(
    webhookId: string,
    ctx: TenantContext,
    eventType: string,
    payload: Record<string, unknown>,
    responseStatus: number | null,
    attempt: number,
    status: string
  ): Promise<WebhookDelivery> {
    const result = await withTenantContext(this.db, ctx, async (tx) => {
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

      // Update webhook last_triggered_at and failure_count
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

  private validateUrl(url: string): void {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') {
        throw new BadRequestException('Webhook URL must use HTTPS');
      }
      for (const pattern of PRIVATE_IP_PATTERNS) {
        if (pattern.test(parsed.hostname)) {
          throw new BadRequestException('Webhook URL cannot target private IPs');
        }
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException('Invalid webhook URL');
    }
  }

  private validateEvents(events: string[]): void {
    const invalid = events.filter((e) => !VALID_EVENTS.includes(e));
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Invalid events: ${invalid.join(', ')}`
      );
    }
  }
}
