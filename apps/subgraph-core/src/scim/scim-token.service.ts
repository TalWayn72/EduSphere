/**
 * ScimTokenService — manages SCIM bearer tokens for HRIS system authentication.
 * Raw tokens are NEVER stored; only SHA-256 hash is persisted.
 * Memory safety: OnModuleDestroy calls closeAllPools().
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { createDatabaseConnection, closeAllPools, schema, withTenantContext, eq, and } from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface TokenMetadata {
  id: string;
  description: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ValidatedToken {
  tenantId: string;
  tokenId: string;
}

const MAX_TOKEN_MAP_SIZE = 500;
/** In-memory LRU cache for validated tokens: tokenHash → ValidatedToken */
const tokenCache = new Map<string, ValidatedToken>();

@Injectable()
export class ScimTokenService implements OnModuleDestroy {
  private readonly logger = new Logger(ScimTokenService.name);
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

  async generateToken(
    tenantId: string,
    userId: string,
    description: string,
    expiresInDays?: number,
  ): Promise<{ token: TokenMetadata; rawToken: string }> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 86_400_000)
      : null;

    const ctx: TenantContext = { tenantId, userId, userRole: 'ORG_ADMIN' };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.scimTokens)
        .values({ tenantId, tokenHash, description, createdByUserId: userId, expiresAt, isActive: true })
        .returning(),
    );

    const row = rows[0];
    if (!row) throw new Error('Failed to create SCIM token');
    this.logger.log({ tenantId, description }, 'SCIM token generated');
    return {
      rawToken,
      token: this.toMetadata(row),
    };
  }

  async validateToken(rawToken: string): Promise<ValidatedToken | null> {
    const hash = this.hashToken(rawToken);
    const cached = tokenCache.get(hash);
    if (cached) return cached;

    // Full DB lookup — no tenant context since token IS the auth mechanism
    const rows = await this.db
      .select()
      .from(schema.scimTokens)
      .where(eq(schema.scimTokens.tokenHash, hash))
      .limit(1);

    const row = rows[0];
    if (!row || !row.isActive) return null;
    if (row.expiresAt && row.expiresAt < new Date()) return null;

    // Update last_used_at async (non-blocking)
    void this.db
      .update(schema.scimTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.scimTokens.id, row.id));

    const result: ValidatedToken = { tenantId: row.tenantId, tokenId: row.id };
    if (tokenCache.size >= MAX_TOKEN_MAP_SIZE) {
      // Evict oldest entry (insertion-order)
      const firstKey = tokenCache.keys().next().value;
      if (firstKey) tokenCache.delete(firstKey);
    }
    tokenCache.set(hash, result);
    return result;
  }

  async revokeToken(tenantId: string, tokenId: string): Promise<boolean> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.update(schema.scimTokens)
        .set({ isActive: false })
        .where(and(eq(schema.scimTokens.id, tokenId), eq(schema.scimTokens.tenantId, tenantId))),
    );
    // Invalidate cache entry with this tokenId
    for (const [k, v] of tokenCache) {
      if (v.tokenId === tokenId) { tokenCache.delete(k); break; }
    }
    this.logger.log({ tenantId, tokenId }, 'SCIM token revoked');
    return true;
  }

  async listTokens(tenantId: string): Promise<TokenMetadata[]> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.scimTokens).where(eq(schema.scimTokens.tenantId, tenantId)),
    );
    return rows.map((r) => this.toMetadata(r));
  }

  private toMetadata(row: typeof schema.scimTokens.$inferSelect): TokenMetadata {
    return {
      id: row.id,
      description: row.description,
      lastUsedAt: row.lastUsedAt ?? null,
      expiresAt: row.expiresAt ?? null,
      isActive: row.isActive,
      createdAt: row.createdAt,
    };
  }
}
