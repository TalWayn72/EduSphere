/**
 * AnalyticsExportController — REST endpoint for BI export.
 *
 * GET /api/v1/analytics/export
 *   - Validates API key from Authorization header (SHA-256 hash lookup)
 *   - Query params: format=csv|json, dateFrom, dateTo, metrics
 *   - Returns analytics data in requested format
 *   - Rate limited per api_keys.rate_limit_per_minute
 */
import {
  Controller,
  Get,
  Query,
  Headers,
  Res,
  Logger,
  UnauthorizedException,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import type { Response } from 'express';
import { createHash } from 'crypto';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const MAX_RATE_LIMIT_MAP_SIZE = 10_000;

@Controller('api/v1/analytics')
export class AnalyticsExportController implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsExportController.name);
  private readonly db: Database;
  private readonly rateLimitMap = new Map<string, RateLimitEntry>();

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[AnalyticsExportController] onModuleDestroy: cleaned up');
  }

  @Get('export')
  async exportAnalytics(
    @Headers('authorization') authHeader: string | undefined,
    @Query('format') format: string | undefined,
    @Query('dateFrom') dateFrom: string | undefined,
    @Query('dateTo') dateTo: string | undefined,
    @Res() res: Response
  ): Promise<void> {
    const apiKey = this.extractApiKey(authHeader);
    const keyRecord = await this.validateApiKey(apiKey);

    this.checkRateLimit(keyRecord.id, keyRecord.rateLimitPerMinute);

    if (!keyRecord.scopes.includes('analytics:read')) {
      throw new UnauthorizedException('API key missing analytics:read scope');
    }

    const exportFormat = (format ?? 'json').toLowerCase();
    if (exportFormat !== 'csv' && exportFormat !== 'json') {
      throw new BadRequestException('format must be csv or json');
    }

    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = dateTo ? new Date(dateTo) : new Date();

    const ctx: TenantContext = {
      tenantId: keyRecord.tenantId,
      userId: 'api-key',
      userRole: 'ORG_ADMIN',
    };

    const data = await this.fetchAnalyticsData(ctx, from, to);

    await this.updateLastUsed(keyRecord.id);

    if (exportFormat === 'csv') {
      const csv = this.toCsv(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=analytics-export.csv'
      );
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.json({ data, exportedAt: new Date().toISOString() });
    }
  }

  private extractApiKey(authHeader: string | undefined): string {
    if (!authHeader) {
      throw new UnauthorizedException('Authorization header required');
    }
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException(
        'Authorization header must be: Bearer <api_key>'
      );
    }
    return parts[1] as string;
  }

  private async validateApiKey(plainTextKey: string): Promise<{
    id: string;
    tenantId: string;
    scopes: string[];
    rateLimitPerMinute: number;
  }> {
    const keyHash = createHash('sha256').update(plainTextKey).digest('hex');

    const result = await this.db.execute<{
      id: string;
      tenant_id: string;
      scopes: string[];
      rate_limit_per_minute: number;
      is_active: boolean;
      expires_at: Date | null;
    }>(sql`
      SELECT id, tenant_id, scopes, rate_limit_per_minute, is_active, expires_at
      FROM api_keys
      WHERE key_hash = ${keyHash}
      LIMIT 1
    `);

    const row = result.rows[0];
    if (!row) {
      this.logger.warn('[AnalyticsExportController] Invalid API key attempt');
      throw new UnauthorizedException('Invalid API key');
    }

    if (!row.is_active) {
      throw new UnauthorizedException('API key has been revoked');
    }

    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    return {
      id: row.id,
      tenantId: row.tenant_id,
      scopes: row.scopes,
      rateLimitPerMinute: row.rate_limit_per_minute,
    };
  }

  private checkRateLimit(keyId: string, limitPerMinute: number): void {
    const now = Date.now();
    const windowMs = 60_000;
    const entry = this.rateLimitMap.get(keyId);

    if (!entry || now - entry.windowStart > windowMs) {
      this.rateLimitMap.set(keyId, { count: 1, windowStart: now });
      this.evictRateLimitMap();
      return;
    }

    entry.count++;
    if (entry.count > limitPerMinute) {
      throw new BadRequestException(
        `Rate limit exceeded: ${limitPerMinute} requests per minute`
      );
    }
  }

  private evictRateLimitMap(): void {
    if (this.rateLimitMap.size > MAX_RATE_LIMIT_MAP_SIZE) {
      const keysToDelete = Array.from(this.rateLimitMap.keys()).slice(
        0,
        this.rateLimitMap.size - MAX_RATE_LIMIT_MAP_SIZE
      );
      for (const key of keysToDelete) {
        this.rateLimitMap.delete(key);
      }
    }
  }

  private async fetchAnalyticsData(
    ctx: TenantContext,
    from: Date,
    to: Date
  ): Promise<Array<Record<string, unknown>>> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        snapshot_date: string;
        active_learners: number;
        completions: number;
        new_enrollments: number;
        total_learning_minutes: number;
        avg_completion_rate: number;
      }>(sql`
        SELECT
          snapshot_date::text,
          active_learners,
          completions,
          new_enrollments,
          total_learning_minutes,
          avg_completion_rate
        FROM tenant_analytics_snapshots
        WHERE tenant_id = ${ctx.tenantId}::uuid
          AND snapshot_date >= ${from.toISOString()}::date
          AND snapshot_date <= ${to.toISOString()}::date
          AND snapshot_type = 'daily'
        ORDER BY snapshot_date ASC
      `);
      return result.rows.map((r) => ({
        date: r.snapshot_date,
        activeLearners: r.active_learners,
        completions: r.completions,
        newEnrollments: r.new_enrollments,
        totalLearningMinutes: r.total_learning_minutes,
        avgCompletionRate: r.avg_completion_rate,
      }));
    });
  }

  private toCsv(data: Array<Record<string, unknown>>): string {
    if (data.length === 0) return '';
    const headers = Object.keys(data[0] as Record<string, unknown>);
    const rows = data.map((row) =>
      headers.map((h) => {
        const value = Object.prototype.hasOwnProperty.call(row, h)
          ? row[h as keyof typeof row]
          : '';
        return String(value ?? '');
      }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  private async updateLastUsed(keyId: string): Promise<void> {
    try {
      await this.db.execute(sql`
        UPDATE api_keys SET last_used_at = NOW() WHERE id = ${keyId}::uuid
      `);
    } catch (err) {
      this.logger.warn(
        `[AnalyticsExportController] Failed to update last_used_at for key=${keyId}: ${String(err)}`
      );
    }
  }
}
