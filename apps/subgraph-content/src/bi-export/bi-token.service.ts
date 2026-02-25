/**
 * BiTokenService — manages BI API bearer tokens for Power BI / Tableau authentication.
 * Raw tokens are NEVER stored; only SHA-256 hash is persisted.
 * Memory safety: OnModuleDestroy calls closeAllPools().
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  createDatabaseConnection, closeAllPools, schema, withTenantContext, eq, and,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface BiTokenMetadata {
  id: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
}

const MAX_TOKEN_CACHE_SIZE = 500;
/** In-memory LRU cache for validated tokens: tokenHash → tenantId */
const tokenCache = new Map<string, string>();

@Injectable()
export class BiTokenService implements OnModuleDestroy {
  private readonly logger = new Logger(BiTokenService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    tokenCache.clear();
    await closeAllPools();
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  async generateToken(tenantId: string, description: string): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.biApiTokens)
        .values({ tenantId, tokenHash, description, isActive: true })
        .returning(),
    );
    if (!rows[0]) throw new Error('Failed to create BI API token');
    this.logger.log({ tenantId, description }, 'BI API token generated');
    return rawToken;
  }

  async validateToken(rawToken: string): Promise<string | null> {
    const hash = this.hashToken(rawToken);
    const cached = tokenCache.get(hash);
    if (cached) return cached;

    // Full DB lookup — no tenant context since token IS the auth mechanism
    const rows = await this.db
      .select()
      .from(schema.biApiTokens)
      .where(eq(schema.biApiTokens.tokenHash, hash))
      .limit(1);

    const row = rows[0];
    if (!row || !row.isActive) return null;

    // Update last_used_at async (non-blocking)
    void this.db
      .update(schema.biApiTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.biApiTokens.id, row.id));

    if (tokenCache.size >= MAX_TOKEN_CACHE_SIZE) {
      const firstKey = tokenCache.keys().next().value;
      if (firstKey) tokenCache.delete(firstKey);
    }
    tokenCache.set(hash, row.tenantId);
    return row.tenantId;
  }

  async listTokens(tenantId: string): Promise<BiTokenMetadata[]> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.biApiTokens).where(eq(schema.biApiTokens.tenantId, tenantId)),
    );
    return rows.map((r) => ({
      id: r.id,
      description: r.description,
      isActive: r.isActive,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt ?? null,
    }));
  }

  async revokeToken(tokenId: string, tenantId: string): Promise<void> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.update(schema.biApiTokens)
        .set({ isActive: false })
        .where(and(eq(schema.biApiTokens.id, tokenId), eq(schema.biApiTokens.tenantId, tenantId))),
    );
    // Invalidate all cache entries for this token (by tenantId match is not unique enough — clear hash-matched entries)
    for (const [k, v] of tokenCache) {
      if (v === tenantId) { tokenCache.delete(k); }
    }
    this.logger.log({ tenantId, tokenId }, 'BI API token revoked');
  }
}
