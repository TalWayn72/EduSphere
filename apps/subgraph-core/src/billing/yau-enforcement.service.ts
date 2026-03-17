/**
 * yau-enforcement.service.ts — YAU (Yearly Active Users) quota enforcement.
 *
 * Daily cron at 2 AM counts distinct active users per tenant per year.
 * - Soft warning at 80% of tier limit (Pino log + NATS event).
 * - Hard block at 100% (new logins rejected with QUOTA_EXCEEDED).
 * - Tier limits from tenantSubscriptions.maxYau (DB) or YAU_LIMIT env fallback.
 *
 * Memory safety: OnModuleDestroy clears timer + drains NATS + closes DB pools.
 * SI-9 enforced: all DB reads via Drizzle (no raw SQL).
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  count,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';
import { connect } from 'nats';
import type { NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';

const YAU_WARN_SUBJECT = 'EDUSPHERE.billing.yau_soft_warning';
const YAU_BLOCK_SUBJECT = 'EDUSPHERE.billing.yau_hard_block';
const SOFT_WARN_PCT = 0.8;
const HARD_BLOCK_PCT = 1.0;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_YAU_LIMIT = 500;

export interface YauEnforcementResult {
  tenantId: string;
  currentYau: number;
  maxYau: number;
  utilizationPct: number;
  blocked: boolean;
}

/** Error thrown when a tenant exceeds their YAU quota. */
export class QuotaExceededError extends Error {
  readonly code = 'QUOTA_EXCEEDED';
  constructor(tenantId: string, current: number, max: number) {
    super(`Tenant ${tenantId} exceeded YAU quota: ${current}/${max}`);
    this.name = 'QuotaExceededError';
  }
}

function msUntil2Am(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(2, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

@Injectable()
export class YauEnforcementService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(YauEnforcementService.name);
  private readonly db: Database;
  private nats: NatsConnection | null = null;
  private initTimeout: ReturnType<typeof setTimeout> | null = null;
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.db = createDatabaseConnection();
    this.initNats().catch((err) =>
      this.logger.warn({ err }, '[YauEnforcementService] NATS init skipped')
    );
  }

  private async initNats(): Promise<void> {
    this.nats = await connect(buildNatsOptions());
  }

  onModuleInit(): void {
    if (process.env['YAU_ENFORCEMENT_ENABLED'] !== 'true') {
      this.logger.log('[YauEnforcementService] Disabled — YAU_ENFORCEMENT_ENABLED not set');
      return;
    }
    const delayMs = msUntil2Am();
    this.logger.log(`[YauEnforcementService] Daily check in ${Math.round(delayMs / 60000)} min`);
    this.initTimeout = setTimeout(() => {
      this.initTimeout = null;
      void this.checkAllTenants();
      this.intervalHandle = setInterval(() => { void this.checkAllTenants(); }, ONE_DAY_MS);
    }, delayMs);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.initTimeout) { clearTimeout(this.initTimeout); this.initTimeout = null; }
    if (this.intervalHandle) { clearInterval(this.intervalHandle); this.intervalHandle = null; }
    try {
      if (this.nats && !this.nats.isClosed()) await this.nats.drain();
    } catch (err) {
      this.logger.warn({ err }, '[YauEnforcementService] NATS drain error');
    }
    await closeAllPools();
    this.logger.log('[YauEnforcementService] Destroyed — timers cleared, pools closed');
  }

  /** Count distinct active users for a tenant in the given calendar year. */
  async getYauCount(tenantId: string, year: number): Promise<number> {
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
  }

  /** Fetch the max YAU limit for a tenant from DB or env fallback. */
  async getTenantLimit(tenantId: string): Promise<number> {
    const [sub] = await this.db
      .select({ maxYau: schema.tenantSubscriptions.maxYau })
      .from(schema.tenantSubscriptions)
      .where(eq(schema.tenantSubscriptions.tenantId, tenantId))
      .limit(1);
    const envLimit = parseInt(process.env['YAU_LIMIT'] ?? '', 10);
    return sub?.maxYau ?? (isNaN(envLimit) ? DEFAULT_YAU_LIMIT : envLimit);
  }

  /** Check enforcement for a single tenant. Throws QuotaExceededError if blocked. */
  async enforce(tenantId: string): Promise<YauEnforcementResult> {
    const year = new Date().getFullYear();
    const currentYau = await this.getYauCount(tenantId, year);
    const maxYau = await this.getTenantLimit(tenantId);
    const pct = maxYau > 0 ? currentYau / maxYau : 0;
    const blocked = pct >= HARD_BLOCK_PCT;

    if (pct >= SOFT_WARN_PCT && pct < HARD_BLOCK_PCT) {
      this.emitEvent(YAU_WARN_SUBJECT, { tenantId, currentYau, maxYau, pct });
      this.logger.warn({ tenantId, currentYau, maxYau }, '[YauEnforcementService] 80% warning');
    }
    if (blocked) {
      this.emitEvent(YAU_BLOCK_SUBJECT, { tenantId, currentYau, maxYau, pct });
      this.logger.error({ tenantId, currentYau, maxYau }, '[YauEnforcementService] BLOCKED');
      throw new QuotaExceededError(tenantId, currentYau, maxYau);
    }

    return { tenantId, currentYau, maxYau, utilizationPct: Math.round(pct * 100), blocked };
  }

  /** Daily cron: check all tenants with active subscriptions. */
  async checkAllTenants(): Promise<void> {
    try {
      const tenants = await this.db
        .select({ tenantId: schema.tenantSubscriptions.tenantId })
        .from(schema.tenantSubscriptions);

      for (const { tenantId } of tenants) {
        try {
          await this.enforce(tenantId);
        } catch (err) {
          if (err instanceof QuotaExceededError) continue; // expected for blocked tenants
          this.logger.error({ err, tenantId }, '[YauEnforcementService] check failed');
        }
      }
    } catch (err) {
      this.logger.error({ err }, '[YauEnforcementService] checkAllTenants failed');
    }
  }

  private emitEvent(subject: string, data: Record<string, unknown>): void {
    if (!this.nats || this.nats.isClosed()) return;
    const payload = JSON.stringify({ ...data, timestamp: new Date().toISOString() });
    this.nats.publish(subject, new TextEncoder().encode(payload));
  }
}
