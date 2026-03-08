import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  totalXp: number;
  level: number;
}

interface CacheEntry {
  data: LeaderboardEntry[];
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_CACHE_ENTRIES = 500;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 min

@Injectable()
export class LeaderboardService implements OnModuleDestroy {
  private readonly logger = new Logger(LeaderboardService.name);
  private readonly db: Database;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cleanupHandle: ReturnType<typeof setInterval>;

  constructor() {
    this.db = createDatabaseConnection();
    this.cleanupHandle = setInterval(() => this.evictExpiredEntries(), CLEANUP_INTERVAL_MS);
  }

  async getLeaderboard(tenantId: string, limit = 10): Promise<LeaderboardEntry[]> {
    const cacheKey = `${tenantId}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    const data = await withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        user_id: string;
        display_name: string | null;
        total_xp: number;
        level: number;
      }>(sql`
        SELECT xp.user_id::text, u.display_name, xp.total_xp, xp.level
        FROM user_xp_totals xp
        LEFT JOIN users u ON u.id = xp.user_id
        WHERE xp.tenant_id = ${tenantId}::uuid
        ORDER BY xp.total_xp DESC
        LIMIT ${limit}
      `);

      return result.rows.map((r, idx) => ({
        rank: idx + 1,
        userId: r.user_id,
        displayName: r.display_name ?? 'Anonymous',
        totalXp: Number(r.total_xp),
        level: Number(r.level),
      }));
    });

    // LRU eviction when at capacity
    if (this.cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
    return data;
  }

  invalidateCache(tenantId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  private evictExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    clearInterval(this.cleanupHandle);
    this.cache.clear();
    await closeAllPools();
  }
}
