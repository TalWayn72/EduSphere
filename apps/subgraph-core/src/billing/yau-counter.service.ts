/**
 * yau-counter.service.ts — Yearly Active User counting service.
 *
 * Tracks one yau_events row per (tenant, user, calendar-year).
 * Emits a NATS event when a tenant approaches their YAU limit (≥ 90 %).
 *
 * Memory safety: OnModuleDestroy closes all DB pools.
 * SI-9 enforced: every DB write uses withTenantContext().
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  schema,
  eq,
  and,
  count,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { connect } from 'nats';
import type { NatsConnection } from 'nats';

const YAU_ALERT_SUBJECT = 'EDUSPHERE.billing.yau_limit_approached';
const YAU_LIMIT_THRESHOLD_PCT = 0.9;

export interface UsageSnapshotResult {
  tenantId: string;
  yauCount: number;
  activeUsersCount: number;
  coursesCount: number;
  storageGb: number;
  computedAt: Date;
}

@Injectable()
export class YauCounterService implements OnModuleDestroy {
  private readonly logger = new Logger(YauCounterService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;

  constructor() {
    this.db = createDatabaseConnection();
    this.initNats().catch((err) =>
      this.logger.warn({ err }, '[YauCounterService] NATS init skipped (non-fatal)')
    );
  }

  private async initNats(): Promise<void> {
    const natsUrl = process.env['NATS_URL'] ?? 'nats://localhost:4222';
    this.nats = await connect({ servers: natsUrl });
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.nats && !this.nats.isClosed()) {
        await this.nats.drain();
      }
    } catch (err) {
      this.logger.warn({ err }, '[YauCounterService] NATS drain error on destroy');
    }
    await closeAllPools();
  }

  /**
   * Record user activity for the current calendar year.
   * Upserts yau_events row; emits NATS alert if limit is approached.
   */
  async trackActivity(
    tenantId: string,
    userId: string,
    userRole: TenantContext['userRole'] = 'STUDENT'
  ): Promise<void> {
    const year = new Date().getFullYear();
    const ctx: TenantContext = { tenantId, userId, userRole };

    try {
      await withTenantContext(this.db, ctx, async (tx) => {
        // Upsert yau_events row
        await tx
          .insert(schema.yauEvents)
          .values({
            tenantId,
            userId,
            year,
            firstActiveAt: new Date(),
            lastActiveAt: new Date(),
            isCounted: true,
          })
          .onConflictDoUpdate({
            target: [
              schema.yauEvents.tenantId,
              schema.yauEvents.userId,
              schema.yauEvents.year,
            ],
            set: {
              lastActiveAt: new Date(),
              isCounted: true,
            },
          });
      });

      // Check YAU limit asynchronously (non-blocking, best-effort)
      void this.checkYauLimit(tenantId, year).catch((err) =>
        this.logger.warn({ err, tenantId }, '[YauCounterService] YAU limit check failed')
      );
    } catch (err) {
      this.logger.error(
        { err, tenantId, userId },
        '[YauCounterService] trackActivity failed'
      );
    }
  }

  /**
   * Count active users for a tenant in a given calendar year.
   */
  async getYauCount(tenantId: string, year: number): Promise<number> {
    try {
      const [result] = await this.db
        .select({ value: count() })
        .from(schema.yauEvents)
        .where(
          and(
            eq(schema.yauEvents.tenantId, tenantId),
            eq(schema.yauEvents.year, year),
            eq(schema.yauEvents.isCounted, true)
          )
        );
      return result?.value ?? 0;
    } catch (err) {
      this.logger.error(
        { err, tenantId, year },
        '[YauCounterService] getYauCount failed'
      );
      return 0;
    }
  }

  /**
   * Build a usage snapshot for billing dashboard display.
   */
  async getMonthlyUsageSnapshot(tenantId: string): Promise<UsageSnapshotResult> {
    const year = new Date().getFullYear();
    try {
      const [yauResult, userResult] = await Promise.all([
        this.db
          .select({ value: count() })
          .from(schema.yauEvents)
          .where(
            and(
              eq(schema.yauEvents.tenantId, tenantId),
              eq(schema.yauEvents.year, year),
              eq(schema.yauEvents.isCounted, true)
            )
          ),
        this.db
          .select({ value: count() })
          .from(schema.users)
          .where(eq(schema.users.tenant_id, tenantId)),
      ]);

      return {
        tenantId,
        yauCount: yauResult[0]?.value ?? 0,
        activeUsersCount: userResult[0]?.value ?? 0,
        coursesCount: 0,
        storageGb: 0,
        computedAt: new Date(),
      };
    } catch (err) {
      this.logger.error(
        { err, tenantId },
        '[YauCounterService] getMonthlyUsageSnapshot failed'
      );
      return {
        tenantId,
        yauCount: 0,
        activeUsersCount: 0,
        coursesCount: 0,
        storageGb: 0,
        computedAt: new Date(),
      };
    }
  }

  private async checkYauLimit(tenantId: string, year: number): Promise<void> {
    const [subResult] = await this.db
      .select({ maxYau: schema.tenantSubscriptions.maxYau })
      .from(schema.tenantSubscriptions)
      .where(eq(schema.tenantSubscriptions.tenantId, tenantId))
      .limit(1);

    if (!subResult?.maxYau) return;

    const currentYau = await this.getYauCount(tenantId, year);
    const pct = currentYau / subResult.maxYau;

    if (pct >= YAU_LIMIT_THRESHOLD_PCT && this.nats && !this.nats.isClosed()) {
      const payload = JSON.stringify({
        tenantId,
        year,
        currentYau,
        maxYau: subResult.maxYau,
        utilizationPct: Math.round(pct * 100),
        timestamp: new Date().toISOString(),
      });
      this.nats.publish(YAU_ALERT_SUBJECT, new TextEncoder().encode(payload));
      this.logger.warn(
        { tenantId, currentYau, maxYau: subResult.maxYau },
        '[YauCounterService] YAU limit threshold reached — NATS event emitted'
      );
    }
  }
}
