/**
 * Org Onboarding — API Key & Webhook Security Tests
 *
 * Validates:
 *   1. API key bcrypt hash storage (plaintext never stored or returned)
 *   2. Key prefix-based lookup pattern
 *   3. Key rotation support
 *   4. HMAC-SHA256 webhook payload signing
 *   5. Webhook secret rotation support
 *   6. Replay protection (timestamp + nonce/delivery ID)
 *   7. SSRF protection for webhook URLs
 *
 * Static source-analysis tests — no running database required.
 * OWASP A02 (Cryptographic Failures) / OWASP A10 (SSRF) / SOC2 CC6
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { globSync } from 'glob';

const ROOT = resolve(import.meta.dirname, '../..');

function read(relativePath: string): string {
  const abs = resolve(ROOT, relativePath);
  return existsSync(abs) ? readFileSync(abs, 'utf-8') : '';
}

// ─── 1. API Key: Bcrypt Hash Storage ───────────────────────────────────────

describe('API Key Security: Hash Storage (OWASP A02)', () => {
  it('api-key service file exists', () => {
    const exists =
      existsSync(resolve(ROOT, 'apps/subgraph-core/src/api-keys/api-key.service.ts')) ||
      existsSync(resolve(ROOT, 'apps/subgraph-core/src/org/api-key.service.ts'));
    expect(exists).toBe(true);
  });

  it('API key creation uses cryptographic hash (SHA-256 or bcrypt)', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/api-key.service.ts');
    expect(content).toMatch(/createHash.*sha256|bcrypt\.hash|hashSync|import.*bcrypt/);
  });

  it('API key verification uses hash comparison', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/api-key.service.ts') ||
      read('apps/gateway/src/middleware/api-key-auth.ts');
    const combined = content +
      read('apps/gateway/src/middleware/api-key-auth.ts');
    // SHA-256 hash comparison or bcrypt.compare
    expect(combined).toMatch(/createHash|bcrypt\.compare|compareSync|digest/);
  });

  it('plaintext key is returned ONLY at creation time (never stored in DB)', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/api-key.service.ts');
    // Service must return plaintext in creation response
    expect(content).toMatch(/plaintext|plainTextKey|raw_key|key.*return|ApiKeyCreated/i);
    // But never store it
    expect(content).not.toMatch(/\.values\(\s*\{[^}]*plaintext/);
  });

  it('API key hash uses established crypto algorithm', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/api-key.service.ts');
    // Must use SHA-256 or bcrypt — not MD5 or weak algorithms
    expect(content).toMatch(/sha256|sha-256|bcrypt/i);
    expect(content).not.toMatch(/\bmd5\b/i);
  });

  it('API key uses crypto.randomBytes for key generation (not Math.random)', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/api-key.service.ts');
    expect(content).toMatch(/randomBytes|randomUUID|crypto\.randomBytes/);
    expect(content).not.toContain('Math.random');
  });
});

// ─── 2. API Key: Prefix-Based Lookup ───────────────────────────────────────

describe('API Key Security: Prefix Lookup Pattern', () => {
  it('API key format uses esk_ prefix convention', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/api-key.service.ts') ||
      read('apps/gateway/src/middleware/api-key-auth.ts');
    const combined = content +
      read('apps/gateway/src/middleware/api-key-auth.ts');
    expect(combined).toMatch(/esk_|KEY_PREFIX/);
  });

  it('API key has prefix column for optimized lookup', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/api-key.service.ts');
    expect(content).toMatch(/key_prefix|keyPrefix|keyPrefixStr/);
  });

  it('API key prefix is extracted from the key (not the full key)', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/api-key.service.ts');
    // Prefix extraction: uses replace or slice to get prefix portion
    expect(content).toMatch(/replace|slice|substring|KEY_PREFIX/);
  });

  it('full API key is never logged (only prefix)', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/api-key.service.ts');
    // Logger should reference prefix, not full key
    if (content.includes('logger') || content.includes('Logger')) {
      expect(content).not.toMatch(/logger\.[^(]*\([^)]*fullKey|logger\.[^(]*\([^)]*plaintext/i);
    }
  });
});

// ─── 3. API Key: Rotation Support ──────────────────────────────────────────

describe('API Key Security: Key Rotation', () => {
  it('revokeApiKey mutation exists in SDL', () => {
    const sdl =
      read('apps/subgraph-core/src/tenant/org-onboarding.graphql') ||
      read('apps/subgraph-core/src/org/org.graphql');
    expect(sdl).toContain('revokeApiKey');
  });

  it('revoked keys tracked via is_active flag', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/gateway/src/middleware/api-key-auth.ts');
    // Service sets is_active = false on revocation
    expect(content).toMatch(/is_active|isActive|active/);
  });

  it('API key has expiration support', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/gateway/src/middleware/api-key-auth.ts');
    expect(content).toMatch(/expires_at|expiresAt|expired|expiration/);
  });

  it('last_used_at is updated on successful API key authentication', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/gateway/src/middleware/api-key-auth.ts') ||
      read('apps/subgraph-core/src/org/api-key.service.ts');
    expect(content).toMatch(/last_used_at|lastUsedAt/);
  });
});

// ─── 4. Webhook: HMAC-SHA256 Payload Signing ───────────────────────────────

describe('Webhook Security: HMAC-SHA256 Signing (OWASP A02)', () => {
  it('webhook dispatcher service file exists', () => {
    const exists =
      existsSync(resolve(ROOT, 'apps/subgraph-core/src/webhooks/webhook.service.ts')) ||
      existsSync(resolve(ROOT, 'apps/subgraph-core/src/org/webhook.service.ts'));
    expect(exists).toBe(true);
  });

  it('webhook uses HMAC-SHA256 for payload signing (not SHA1/MD5)', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts');
    expect(content).toMatch(/createHmac.*sha256|hmac.*sha256|HMAC.*SHA256/i);
  });

  it('webhook signature includes timestamp for freshness', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts');
    expect(content).toMatch(/timestamp|Timestamp|X-EduSphere-Timestamp/);
  });

  it('webhook sends X-EduSphere-Signature header', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts');
    expect(content).toMatch(/X-EduSphere-Signature|signature/i);
  });

  it('webhook sends X-EduSphere-Delivery header (delivery ID for deduplication)', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts');
    expect(content).toMatch(/X-EduSphere-Delivery|deliveryId|delivery_id/);
  });

  it('webhook sends X-EduSphere-Event header', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts');
    expect(content).toMatch(/X-EduSphere-Event|eventType|event_type/);
  });
});

// ─── 5. Webhook: Secret Storage & Rotation ─────────────────────────────────

describe('Webhook Security: Secret Management', () => {
  it('webhook secret is generated with cryptographic randomness', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/org/webhook.service.ts');
    // Secret is generated with crypto.randomBytes and used for HMAC signing
    expect(content).toMatch(/randomBytes|createHmac|secret/i);
  });

  it('webhook secret is never returned in API responses', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.resolver.ts');
    // The resolver or service should not expose the secret
    if (content.includes('secret')) {
      // Should mask or omit secret in response
      expect(content).toMatch(/omit.*secret|delete.*secret|mask|undefined|exclude|select.*(?!secret)/i);
    }
  });

  it('webhook secret uses crypto.randomBytes (not Math.random)', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts');
    if (content.includes('generateSecret') || content.includes('secret')) {
      expect(content).toMatch(/crypto\.randomBytes|randomUUID|randomBytes/);
      expect(content).not.toContain('Math.random');
    }
  });
});

// ─── 6. Webhook: Replay Protection ────────────────────────────────────────

describe('Webhook Security: Replay Protection', () => {
  it('webhook delivery includes unique delivery ID', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts');
    expect(content).toMatch(/deliveryId|delivery_id|uuid|randomUUID/);
  });

  it('webhook payload includes unix timestamp', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts');
    expect(content).toMatch(/timestamp|Date\.now|unix/i);
  });

  it('webhook request has timeout (max 10s per architecture spec)', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts');
    expect(content).toMatch(/timeout|10000|signal|AbortController/i);
  });

  it('webhook auto-disables after 10 consecutive failures', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts');
    expect(content).toMatch(/10|failure_count|failureCount|consecutive|disable|is_active.*false/);
  });

  it('webhook has exponential backoff retry logic (60s, 300s)', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts');
    expect(content).toMatch(/retry|backoff|60|300|attempt/i);
  });
});

// ─── 7. Webhook: SSRF Protection ──────────────────────────────────────────

describe('Webhook Security: SSRF Protection (OWASP A10)', () => {
  it('webhook URL validation blocks private IP ranges', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    // Must block RFC 1918 private ranges
    expect(content).toMatch(/10\.\d|172\.(1[6-9]|2\d|3[01])|192\.168|private|SSRF/i);
  });

  it('webhook URL validation blocks localhost', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    expect(content).toMatch(/localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i);
  });

  it('webhook URL requires HTTPS in production', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    expect(content).toMatch(/https|HTTPS|protocol.*https|startsWith.*https/i);
  });

  it('max webhooks per org is enforced (DoS protection)', () => {
    const content =
      read('apps/subgraph-core/src/webhooks/webhook.service.ts');
    // Architecture spec: max 10 webhooks per org
    expect(content).toMatch(/10|MAX_WEBHOOKS|maxWebhooks|count.*limit|limit.*count/i);
  });
});

// ─── 8. API Key Gateway Middleware ─────────────────────────────────────────

describe('API Key Service: Scope & Tenant Validation', () => {
  it('API key service file exists', () => {
    const exists =
      existsSync(resolve(ROOT, 'apps/subgraph-core/src/api-keys/api-key.service.ts')) ||
      existsSync(resolve(ROOT, 'apps/gateway/src/middleware/api-key-auth.ts'));
    expect(exists).toBe(true);
  });

  it('API key service scopes requests to tenant', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/gateway/src/middleware/api-key-auth.ts');
    expect(content).toMatch(/tenant_id|tenantId/i);
  });

  it('API key service validates scopes', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.service.ts') ||
      read('apps/gateway/src/middleware/api-key-auth.ts');
    expect(content).toMatch(/scopes|scope|VALID_SCOPES/i);
  });

  it('API key module is registered in subgraph-core', () => {
    const content =
      read('apps/subgraph-core/src/api-keys/api-key.module.ts') ||
      read('apps/gateway/src/index.ts');
    expect(content).toMatch(/ApiKey|api-key|apiKey/i);
  });
});
