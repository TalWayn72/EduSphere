/**
 * HrisSyncCron — Nightly HRIS sync scheduler (Phase 56).
 *
 * Runs at 3:00 AM daily for each tenant with an active HRIS config.
 * Uses setInterval timed to next 3AM rather than @nestjs/schedule
 * (schedule package not installed — avoids extra dep for a single cron).
 *
 * Memory safety: interval handle cleared in onModuleDestroy().
 * HRIS_SYNC_ENABLED env var guard — disabled by default in dev.
 */
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { HrisIntegrationService } from './hris-integration.service.js';
import type { HrisConfig } from './hris-adapter.interface.js';

/** Active tenant HRIS configs — in production this would query the DB. */
const ACTIVE_HRIS_CONFIGS: HrisConfig[] = [];

function msUntil3Am(): number {
  const now = new Date();
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

@Injectable()
export class HrisSyncCron implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HrisSyncCron.name);
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private initTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly hrisService: HrisIntegrationService) {}

  onModuleInit(): void {
    if (process.env['HRIS_SYNC_ENABLED'] !== 'true') {
      this.logger.log('HRIS_SYNC_ENABLED not set — nightly sync disabled');
      return;
    }
    const delayMs = msUntil3Am();
    this.logger.log(`HRIS nightly sync scheduled in ${Math.round(delayMs / 60000)} min`);
    this.initTimeout = setTimeout(() => {
      this.initTimeout = null;
      void this.runSync();
      // Re-schedule every 24h after first run
      this.intervalHandle = setInterval(() => { void this.runSync(); }, 24 * 60 * 60 * 1000);
    }, delayMs);
  }

  onModuleDestroy(): void {
    if (this.initTimeout) {
      clearTimeout(this.initTimeout);
      this.initTimeout = null;
    }
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.logger.log('HrisSyncCron destroyed — timer cleared');
  }

  async runSync(): Promise<void> {
    const configs = ACTIVE_HRIS_CONFIGS;
    this.logger.log({ count: configs.length }, 'HRIS nightly sync started');
    for (const config of configs) {
      try {
        const result = await this.hrisService.syncTenant(config);
        this.logger.log({ tenantId: config.tenantId, result }, 'HRIS tenant sync complete');
      } catch (err) {
        this.logger.error({ tenantId: config.tenantId, err }, 'HRIS tenant sync failed');
      }
    }
    this.logger.log('HRIS nightly sync finished');
  }
}
