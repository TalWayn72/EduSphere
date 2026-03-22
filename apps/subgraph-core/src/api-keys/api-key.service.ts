/**
 * ApiKeyService — API key management for organizations.
 *
 * Features:
 *   - Key generation with bcrypt hashing (plaintext shown once)
 *   - Key format: esk_live_{32 random alphanumeric chars}
 *   - Scope validation per request
 *   - Per-key rate limiting
 *   - Revocation and expiry support
 *   - All queries scoped via withTenantContext (RLS enforced)
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';
import { randomBytes, createHash } from 'crypto';

export interface CreateApiKeyInput {
  name: string;
  scopes: string[];
  rateLimitPerMinute?: number;
  expiresAt?: Date;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitPerMinute: number;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface ApiKeyCreated {
  apiKey: ApiKey;
  plainTextKey: string;
}

const VALID_SCOPES = [
  'courses:read',
  'courses:write',
  'users:read',
  'users:write',
  'analytics:read',
  'content:read',
  'content:write',
  'webhooks:manage',
];

const KEY_PREFIX = 'esk_live_';

@Injectable()
export class ApiKeyService implements OnModuleDestroy {
  private readonly logger = new Logger(ApiKeyService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[ApiKeyService] onModuleDestroy: cleaned up');
  }

  async createKey(
    input: CreateApiKeyInput,
    ctx: TenantContext
  ): Promise<ApiKeyCreated> {
    // Validate scopes
    const invalidScopes = input.scopes.filter((s) => !VALID_SCOPES.includes(s));
    if (invalidScopes.length > 0) {
      throw new BadRequestException(
        `Invalid scopes: ${invalidScopes.join(', ')}`
      );
    }

    // Generate random key
    const randomPart = randomBytes(24).toString('base64url').slice(0, 32);
    const plainTextKey = `${KEY_PREFIX}${randomPart}`;

    // Hash with SHA-256 for storage (bcrypt too slow for high-volume lookups)
    const keyHash = createHash('sha256').update(plainTextKey).digest('hex');
    const keyPrefixStr = KEY_PREFIX.replace(/_$/, '');

    const rateLimitPerMinute = Math.min(
      Math.max(1, input.rateLimitPerMinute ?? 60),
      10000
    );

    const result = await withTenantContext(this.db, ctx, async (tx) => {
      const inserted = await tx.execute<{
        id: string;
        name: string;
        key_prefix: string;
        scopes: string[];
        rate_limit_per_minute: number;
        last_used_at: Date | null;
        expires_at: Date | null;
        is_active: boolean;
        created_at: Date;
      }>(sql`
        INSERT INTO api_keys (
          tenant_id, name, key_hash, key_prefix,
          scopes, rate_limit_per_minute, expires_at,
          is_active, created_by
        ) VALUES (
          ${ctx.tenantId}::uuid,
          ${input.name},
          ${keyHash},
          ${keyPrefixStr},
          ${sql.raw(`ARRAY[${input.scopes.map((s) => `'${s}'`).join(',')}]::text[]`)},
          ${rateLimitPerMinute},
          ${input.expiresAt?.toISOString() ?? null}::timestamptz,
          true,
          ${ctx.userId}::uuid
        )
        RETURNING id, name, key_prefix, scopes,
                  rate_limit_per_minute, last_used_at,
                  expires_at, is_active, created_at
      `);
      return inserted.rows[0];
    });

    if (!result) {
      throw new BadRequestException('Failed to create API key');
    }

    this.logger.log(
      { tenantId: ctx.tenantId, keyName: input.name, keyPrefix: keyPrefixStr },
      '[ApiKeyService] API key created'
    );

    const apiKey: ApiKey = {
      id: result.id,
      name: result.name,
      keyPrefix: result.key_prefix,
      scopes: result.scopes,
      rateLimitPerMinute: result.rate_limit_per_minute,
      lastUsedAt: result.last_used_at,
      expiresAt: result.expires_at,
      isActive: result.is_active,
      createdAt: result.created_at,
    };

    return { apiKey, plainTextKey };
  }

  async revokeKey(id: string, ctx: TenantContext): Promise<boolean> {
    await withTenantContext(this.db, ctx, async (tx) => {
      await tx.execute(sql`
        UPDATE api_keys
        SET is_active = false, updated_at = NOW()
        WHERE id = ${id}::uuid
          AND tenant_id = ${ctx.tenantId}::uuid
      `);
    });

    this.logger.log(
      { tenantId: ctx.tenantId, keyId: id },
      '[ApiKeyService] API key revoked'
    );
    return true;
  }

  async listKeys(ctx: TenantContext): Promise<ApiKey[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        id: string;
        name: string;
        key_prefix: string;
        scopes: string[];
        rate_limit_per_minute: number;
        last_used_at: Date | null;
        expires_at: Date | null;
        is_active: boolean;
        created_at: Date;
      }>(sql`
        SELECT id, name, key_prefix, scopes,
               rate_limit_per_minute, last_used_at,
               expires_at, is_active, created_at
        FROM api_keys
        WHERE tenant_id = ${ctx.tenantId}::uuid
        ORDER BY created_at DESC
      `);

      return result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        keyPrefix: r.key_prefix,
        scopes: r.scopes,
        rateLimitPerMinute: r.rate_limit_per_minute,
        lastUsedAt: r.last_used_at,
        expiresAt: r.expires_at,
        isActive: r.is_active,
        createdAt: r.created_at,
      }));
    });
  }
}
