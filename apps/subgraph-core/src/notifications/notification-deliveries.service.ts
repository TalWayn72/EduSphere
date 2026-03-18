/**
 * NotificationDeliveriesService — Phase 65.
 * Delivery history recording, paginated reads, mark-read, and analytics.
 * RLS enforced via withTenantContext() on every query.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  gte,
  lte,
  count,
  closeAllPools,
  withTenantContext,
  sql,
  isNull,
  desc,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

interface DeliveryDto {
  id: string;
  notificationType: string;
  channel: string;
  title: string;
  body: string;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

interface DeliveryConnection {
  edges: Array<{ cursor: string; node: DeliveryDto }>;
  pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null };
  totalCount: number;
}

@Injectable()
export class NotificationDeliveriesService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationDeliveriesService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /** Insert a new delivery record. */
  async recordDelivery(
    tenantId: string,
    userId: string,
    notificationType: string,
    channel: string,
    title: string,
    body: string,
    payload?: Record<string, unknown>
  ): Promise<string> {
    const channelVal = channel.toLowerCase() as typeof schema.notificationDeliveries.$inferInsert['channel'];
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const [row] = await withTenantContext(this.db, ctx, async (tx) => {
      return tx
        .insert(schema.notificationDeliveries)
        .values({ tenantId, userId, notificationType, channel: channelVal, title, body, payload: payload ?? null })
        .returning({ id: schema.notificationDeliveries.id });
    });

    return row.id;
  }

  /** Paginated delivery history (Relay cursor). */
  async getHistory(
    userId: string,
    tenantId: string,
    first: number,
    after?: string
  ): Promise<DeliveryConnection> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const limit = Math.min(first || 20, 100);

    const totalRows = await withTenantContext(this.db, ctx, async (tx) => {
      return tx.select({ value: count() }).from(schema.notificationDeliveries)
        .where(eq(schema.notificationDeliveries.userId, userId));
    });
    const totalCount = totalRows[0]?.value ?? 0;

    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      const conditions = [eq(schema.notificationDeliveries.userId, userId)];
      if (after) {
        const cursor = Buffer.from(after, 'base64').toString('utf-8');
        conditions.push(lte(schema.notificationDeliveries.createdAt, new Date(cursor)));
      }
      return tx.select().from(schema.notificationDeliveries)
        .where(and(...conditions))
        .orderBy(desc(schema.notificationDeliveries.createdAt))
        .limit(limit + 1);
    });

    const hasNextPage = rows.length > limit;
    const sliced = rows.slice(0, limit);

    return {
      edges: sliced.map((r) => ({
        cursor: Buffer.from(r.createdAt.toISOString()).toString('base64'),
        node: this.mapRow(r),
      })),
      pageInfo: {
        hasNextPage,
        hasPreviousPage: !!after,
        startCursor: sliced[0] ? Buffer.from(sliced[0].createdAt.toISOString()).toString('base64') : null,
        endCursor: sliced.length ? Buffer.from(sliced[sliced.length - 1].createdAt.toISOString()).toString('base64') : null,
      },
      totalCount,
    };
  }

  /** Mark a single delivery as read. */
  async markRead(id: string, userId: string, tenantId: string): Promise<DeliveryDto> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const [row] = await withTenantContext(this.db, ctx, async (tx) => {
      return tx.update(schema.notificationDeliveries)
        .set({ readAt: new Date() })
        .where(and(eq(schema.notificationDeliveries.id, id), eq(schema.notificationDeliveries.userId, userId)))
        .returning();
    });
    return this.mapRow(row);
  }

  /** Bulk mark all unread deliveries as read. */
  async markAllRead(userId: string, tenantId: string): Promise<number> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      return tx.update(schema.notificationDeliveries)
        .set({ readAt: new Date() })
        .where(and(eq(schema.notificationDeliveries.userId, userId), isNull(schema.notificationDeliveries.readAt)))
        .returning({ id: schema.notificationDeliveries.id });
    });
    return rows.length;
  }

  /** Analytics aggregation (admin only). */
  async getAnalytics(tenantId: string, startDate: Date, endDate: Date) {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    const rows = await withTenantContext(this.db, ctx, async (tx) => {
      return tx.select().from(schema.notificationDeliveries)
        .where(and(
          eq(schema.notificationDeliveries.tenantId, tenantId),
          gte(schema.notificationDeliveries.createdAt, startDate),
          lte(schema.notificationDeliveries.createdAt, endDate)
        ));
    });

    return this.aggregateAnalytics(rows);
  }

  private aggregateAnalytics(rows: Array<typeof schema.notificationDeliveries.$inferSelect>) {
    const byChannel = new Map<string, { sent: number; delivered: number; failed: number }>();
    const byType = new Map<string, { sent: number; delivered: number; failed: number }>();
    let totalSent = 0, totalDelivered = 0, totalFailed = 0;

    for (const r of rows) {
      totalSent++;
      if (r.status === 'delivered') totalDelivered++;
      if (r.status === 'failed' || r.status === 'bounced') totalFailed++;

      const ch = byChannel.get(r.channel) ?? { sent: 0, delivered: 0, failed: 0 };
      ch.sent++; if (r.status === 'delivered') ch.delivered++; if (r.status === 'failed' || r.status === 'bounced') ch.failed++;
      byChannel.set(r.channel, ch);

      const tp = byType.get(r.notificationType) ?? { sent: 0, delivered: 0, failed: 0 };
      tp.sent++; if (r.status === 'delivered') tp.delivered++; if (r.status === 'failed' || r.status === 'bounced') tp.failed++;
      byType.set(r.notificationType, tp);
    }

    return {
      totalSent, totalDelivered, totalFailed,
      byChannel: Array.from(byChannel.entries()).map(([channel, s]) => ({ channel, ...s })),
      byType: Array.from(byType.entries()).map(([notificationType, s]) => ({ notificationType, ...s })),
    };
  }

  private mapRow(r: typeof schema.notificationDeliveries.$inferSelect): DeliveryDto {
    return {
      id: r.id, notificationType: r.notificationType, channel: r.channel,
      title: r.title, body: r.body, status: r.status,
      sentAt: r.sentAt?.toISOString() ?? null, deliveredAt: r.deliveredAt?.toISOString() ?? null,
      readAt: r.readAt?.toISOString() ?? null, createdAt: r.createdAt.toISOString(),
    };
  }
}
