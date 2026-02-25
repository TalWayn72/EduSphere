/**
 * XapiTokenService — manages LRS bearer tokens for xAPI 1.0.3 authentication.
 * Raw tokens are NEVER stored; only SHA-256 hash is persisted.
 * Memory safety: OnModuleDestroy clears the LRU cache and calls closeAllPools().
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  createDatabaseConnection, closeAllPools, schema, withTenantContext, eq, and,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface XapiTokenMetadata {
  id: string;
  description: string;
  lrsEndpoint: string | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ValidatedXapiToken {
  tenantId: string;
  tokenId: string;
  lrsEndpoint: string | null;
}

const MAX_CACHE_SIZE = 500;
/** In-memory LRU cache: tokenHash → ValidatedXapiToken */
const tokenCache = new Map<string, ValidatedXapiToken>();

@Injectable()
export class XapiTokenService implements OnModuleDestroy {
  private readonly logger = new Logger(XapiTokenService.name);
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
    description: string,
    lrsEndpoint?: string,
  ): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.xapiTokens)
        .values({ tenantId, tokenHash, description, lrsEndpoint: lrsEndpoint ?? null, isActive: true })
        .returning(),
    );
    this.logger.log({ tenantId, description }, 'xAPI token generated');
    return rawToken;
  }

  async validateToken(rawToken: string): Promise<ValidatedXapiToken | null> {
    const hash = this.hashToken(rawToken);
    const cached = tokenCache.get(hash);
    if (cached) return cached;

    const rows = await this.db
      .select()
      .from(schema.xapiTokens)
      .where(eq(schema.xapiTokens.tokenHash, hash))
      .limit(1);

    const row = rows[0];
    if (!row || !row.isActive) return null;

    const result: ValidatedXapiToken = {
      tenantId: row.tenantId,
      tokenId: row.id,
      lrsEndpoint: row.lrsEndpoint ?? null,
    };
    if (tokenCache.size >= MAX_CACHE_SIZE) {
      const firstKey = tokenCache.keys().next().value;
      if (firstKey) tokenCache.delete(firstKey);
    }
    tokenCache.set(hash, result);
    return result;
  }

  async listTokens(tenantId: string): Promise<XapiTokenMetadata[]> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.xapiTokens).where(eq(schema.xapiTokens.tenantId, tenantId)),
    );
    return rows.map((r) => ({
      id: r.id,
      description: r.description,
      lrsEndpoint: r.lrsEndpoint ?? null,
      isActive: r.isActive,
      createdAt: r.createdAt,
    }));
  }

  async revokeToken(tokenId: string, tenantId: string): Promise<boolean> {
    const ctx: TenantContext = { tenantId, userId: 'system', userRole: 'ORG_ADMIN' };
    await withTenantContext(this.db, ctx, async (tx) =>
      tx.update(schema.xapiTokens)
        .set({ isActive: false })
        .where(and(eq(schema.xapiTokens.id, tokenId), eq(schema.xapiTokens.tenantId, tenantId))),
    );
    for (const [k, v] of tokenCache) {
      if (v.tokenId === tokenId) { tokenCache.delete(k); break; }
    }
    this.logger.log({ tenantId, tokenId }, 'xAPI token revoked');
    return true;
  }
}
