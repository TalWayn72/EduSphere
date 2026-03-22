/**
 * Webhook Endpoints + Deliveries — FEAT-ORG-ONBOARDING Phase 1
 * Per-tenant webhook configuration and delivery audit log.
 *
 * RLS: tenant-scoped via `tenant_id`
 * SI-1: uses app.current_tenant (NOT app.current_user)
 * Security: HMAC secret stored encrypted, never returned in API
 */
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  text,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';

// ── Webhook endpoint definitions ────────────────────────────────────
export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    url: varchar('url', { length: 2048 }).notNull(),
    /** Event types to subscribe to, e.g. ['course.completed', 'user.enrolled'] */
    events: varchar('events', { length: 100 }).array().notNull().default([]),
    /** HMAC-SHA256 signing secret — stored encrypted */
    secret: varchar('secret', { length: 128 }).notNull(),
    isActive: boolean('is_active').notNull().default(true),
    failureCount: integer('failure_count').notNull().default(0),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_webhooks_tenant').on(t.tenantId),
    index('idx_webhooks_active').on(t.isActive),
    pgPolicy('webhooks_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;

// ── Webhook delivery audit log ──────────────────────────────────────
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    webhookId: uuid('webhook_id')
      .notNull()
      .references(() => webhooks.id),
    tenantId: uuid('tenant_id').notNull(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    payload: jsonb('payload').notNull(),
    responseStatus: integer('response_status'),
    responseBody: text('response_body'),
    attempt: integer('attempt').notNull().default(1),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),
    /** PENDING | DELIVERED | FAILED | RETRYING */
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_webhook_deliveries_webhook').on(t.webhookId),
    index('idx_webhook_deliveries_status').on(t.status, t.nextRetryAt),
    index('idx_webhook_deliveries_tenant').on(t.tenantId),
    pgPolicy('webhook_deliveries_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
