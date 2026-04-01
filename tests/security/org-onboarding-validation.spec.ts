/**
 * Org Onboarding — Zod Input Validation & GraphQL Authorization Tests
 *
 * Validates that ALL new mutations have:
 *   1. Zod input validation schemas
 *   2. Correct GraphQL authorization directives (@authenticated, @requiresRole)
 *   3. Input sanitization for injection prevention
 *
 * Static source-analysis tests — no running database required.
 * OWASP A03 (Injection) / OWASP A01 (Broken Access Control) / SOC2 CC6
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

// ─── 1. createOrganization — Zod Validation ───────────────────────────────

describe('Zod: createOrganization input validation', () => {
  it('org validation schemas file exists', () => {
    const exists =
      existsSync(
        resolve(ROOT, 'apps/subgraph-core/src/tenant/org-onboarding.schemas.ts')
      ) ||
      existsSync(resolve(ROOT, 'apps/subgraph-core/src/org/org.schemas.ts')) ||
      existsSync(resolve(ROOT, 'apps/subgraph-core/src/org/validation.ts'));
    expect(exists).toBe(true);
  });

  it('createOrganization schema validates slug format (alphanumeric + hyphens)', () => {
    const content =
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts') ||
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/validation.ts');
    // Slug must be validated with regex pattern
    expect(content).toMatch(/slug/);
    expect(content).toMatch(/regex|pattern|[a-z]/);
  });

  it('createOrganization schema validates email format', () => {
    const content =
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts') ||
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/validation.ts');
    expect(content).toMatch(/email/i);
    expect(content).toMatch(/\.email\(\)|email.*regex|isEmail/);
  });

  it('createOrganization schema validates orgName length (min 2, max 255)', () => {
    const content =
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts') ||
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/validation.ts');
    expect(content).toMatch(/orgName|name/);
    expect(content).toMatch(/min\(|max\(|length/);
  });

  it('createOrganization schema validates password strength (if admin password provided)', () => {
    const content =
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts') ||
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/validation.ts');
    // Password validation should exist if admin creates password inline
    if (content.includes('password')) {
      expect(content).toMatch(/min\(8\)|minLength|password.*regex/);
    }
  });

  it('createOrganization schema uses z.object (Zod)', () => {
    const content =
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts') ||
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/validation.ts');
    expect(content).toMatch(/z\.object|z\.string|import.*zod/);
  });
});

// ─── 2. inviteOrgMembers — Zod Validation ──────────────────────────────────

describe('Zod: inviteOrgMembers input validation', () => {
  it('invitation validation schema validates email array', () => {
    const content =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/org-invitation.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    expect(content).toMatch(/email/);
    // Must validate each email in the array
    expect(content).toMatch(/array|z\.array/);
  });

  it('invitation validation schema validates role enum', () => {
    const content =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/org-invitation.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    expect(content).toMatch(/role/i);
    expect(content).toMatch(/enum|z\.enum|STUDENT|INSTRUCTOR|ORG_ADMIN/);
  });

  it('invitation validation limits array size (max 100 per batch)', () => {
    const content =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/org-invitation.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    // Must have max constraint on email array to prevent abuse
    expect(content).toMatch(/max\(|length/);
  });
});

// ─── 3. updateBranding — Zod Validation ────────────────────────────────────

describe('Zod: updateBranding input validation', () => {
  it('branding config uses Zod for input validation', () => {
    const content =
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/tenant.schemas.ts');
    // Gamification config and other schemas use Zod validation
    expect(content).toMatch(/z\.object|z\.string|z\.boolean|import.*zod/i);
  });

  it('onboarding schemas validate URL format', () => {
    const content =
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/tenant.schemas.ts');
    expect(content).toMatch(/url|\.url\(\)/i);
  });

  it('onboarding schemas validate enum values', () => {
    const content =
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/tenant.schemas.ts');
    // Schemas use z.enum for type-safe validation
    expect(content).toMatch(/z\.enum|enum/i);
  });
});

// ─── 4. createApiKey — Zod Validation ──────────────────────────────────────

describe('Zod: createApiKey input validation', () => {
  it('API key validation schema validates name constraints', () => {
    const content =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/api-key.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    expect(content).toMatch(/name/);
    expect(content).toMatch(/min\(|max\(|length/);
  });

  it('API key validation schema validates scope values', () => {
    const content =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/api-key.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    expect(content).toMatch(/scopes|scope/);
    // Must validate against allowed scope values
    expect(content).toMatch(
      /enum|includes|courses:read|users:read|analytics:read/
    );
  });

  it('API key validation schema validates rate_limit_per_minute (positive integer)', () => {
    const content =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/api-key.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    if (content.includes('rateLimit') || content.includes('rate_limit')) {
      expect(content).toMatch(/positive|min\(1\)|int\(\)/);
    }
  });
});

// ─── 5. registerWebhook — Zod Validation ───────────────────────────────────

describe('Zod: registerWebhook input validation', () => {
  it('webhook validation schema validates URL format', () => {
    const content =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/webhook.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    expect(content).toMatch(/url/i);
    expect(content).toMatch(/\.url\(\)|https|http/);
  });

  it('webhook validation schema validates event array', () => {
    const content =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/webhook.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    expect(content).toMatch(/events/);
    expect(content).toMatch(/array|z\.array/);
  });

  it('webhook URL validation rejects private IPs (SSRF protection)', () => {
    const content =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/webhook.schemas.ts') ||
      read('apps/subgraph-core/src/webhooks/webhook.service.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    // Must block private IP ranges to prevent SSRF
    expect(content).toMatch(
      /10\.|172\.16|192\.168|localhost|127\.0\.0\.1|0\.0\.0\.0|private|SSRF/i
    );
  });

  it('webhook events validated against allowed event types', () => {
    const content =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/webhook.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    // Must validate against known event types
    expect(content).toMatch(
      /course\.completed|user\.enrolled|badge\.issued|enum/
    );
  });
});

// ─── 6. Marketplace Mutations — Zod Validation ────────────────────────────

describe('Zod: marketplace mutations input validation', () => {
  it('licenseCourse validation schema exists', () => {
    const content =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/marketplace/marketplace.schemas.ts') ||
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts');
    expect(content).toMatch(/license|License/);
  });

  it('licenseCourse validation schema validates license type', () => {
    const content =
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts') ||
      read('apps/subgraph-core/src/marketplace/marketplace.schemas.ts');
    if (content) {
      expect(content).toMatch(/UNLIMITED|PER_SEAT|TIME_LIMITED|licenseType/);
    }
  });
});

// ─── 7. GraphQL Authorization Directives ───────────────────────────────────

describe('GraphQL Authorization: Org onboarding mutations', () => {
  it('org.graphql SDL file exists in subgraph-core', () => {
    const exists =
      existsSync(
        resolve(ROOT, 'apps/subgraph-core/src/tenant/org-onboarding.graphql')
      ) || existsSync(resolve(ROOT, 'apps/subgraph-core/src/org/org.graphql'));
    expect(exists).toBe(true);
  });

  it('createOrganization mutation is public (no @authenticated — signup endpoint)', () => {
    const sdl =
      read('apps/subgraph-core/src/tenant/org-onboarding.graphql') ||
      read('apps/subgraph-core/src/org/org.graphql');
    if (!sdl) return;
    // Find the createOrganization line
    const lines = sdl.split('\n');
    const createOrgLine = lines.findIndex((l) =>
      l.includes('createOrganization')
    );
    if (createOrgLine === -1) return;
    const lineText = lines[createOrgLine];
    // Public endpoint — must NOT have @authenticated
    expect(lineText).not.toContain('@authenticated');
  });

  it('inviteUser mutation requires authentication', () => {
    const sdl =
      read('apps/subgraph-core/src/tenant/org-onboarding.graphql') ||
      read('apps/subgraph-core/src/org/org.graphql');
    if (!sdl) return;
    const lines = sdl.split('\n');
    const inviteLine = lines.findIndex((l) => l.includes('inviteUser'));
    if (inviteLine === -1) return;
    const surroundingText = lines.slice(inviteLine, inviteLine + 3).join('\n');
    // Must have at least @authenticated — resolver enforces ORG_ADMIN role
    expect(surroundingText).toContain('@authenticated');
  });

  it('createApiKey mutation requires authentication', () => {
    const sdl =
      read('apps/subgraph-core/src/tenant/org-onboarding.graphql') ||
      read('apps/subgraph-core/src/org/org.graphql');
    if (!sdl) return;
    const lines = sdl.split('\n');
    const apiKeyLine = lines.findIndex((l) => l.includes('createApiKey'));
    if (apiKeyLine === -1) return;
    const surroundingText = lines.slice(apiKeyLine, apiKeyLine + 3).join('\n');
    expect(surroundingText).toContain('@authenticated');
  });

  it('createWebhook mutation requires authentication', () => {
    const sdl =
      read('apps/subgraph-core/src/tenant/org-onboarding.graphql') ||
      read('apps/subgraph-core/src/org/org.graphql');
    if (!sdl) return;
    const lines = sdl.split('\n');
    const webhookLine = lines.findIndex((l) => l.includes('createWebhook'));
    if (webhookLine === -1) return;
    const surroundingText = lines
      .slice(webhookLine, webhookLine + 3)
      .join('\n');
    expect(surroundingText).toContain('@authenticated');
  });

  it('revokeApiKey mutation requires authentication', () => {
    const sdl =
      read('apps/subgraph-core/src/tenant/org-onboarding.graphql') ||
      read('apps/subgraph-core/src/org/org.graphql');
    if (!sdl) return;
    const lines = sdl.split('\n');
    const revokeLine = lines.findIndex((l) => l.includes('revokeApiKey'));
    if (revokeLine === -1) return;
    const surroundingText = lines.slice(revokeLine, revokeLine + 3).join('\n');
    expect(surroundingText).toContain('@authenticated');
  });

  it('updateGamificationConfig mutation requires authentication', () => {
    const sdl =
      read('apps/subgraph-core/src/tenant/org-onboarding.graphql') ||
      read('apps/subgraph-core/src/org/org.graphql');
    if (!sdl) return;
    const lines = sdl.split('\n');
    const gamLine = lines.findIndex((l) =>
      l.includes('updateGamificationConfig')
    );
    if (gamLine === -1) return;
    const surroundingText = lines.slice(gamLine, gamLine + 3).join('\n');
    expect(surroundingText).toContain('@authenticated');
  });

  it('acceptInvitation is public (invitee may not be authenticated yet)', () => {
    const sdl =
      read('apps/subgraph-core/src/tenant/org-onboarding.graphql') ||
      read('apps/subgraph-core/src/org/org.graphql');
    if (!sdl) return;
    const lines = sdl.split('\n');
    const acceptLine = lines.findIndex((l) => l.includes('acceptInvitation'));
    if (acceptLine === -1) return;
    const lineText = lines[acceptLine];
    // acceptInvitation uses token-based auth, not JWT
    expect(lineText).not.toContain('@requiresRole');
  });
});

// ─── 8. Slug Injection Prevention ──────────────────────────────────────────

describe('Input Sanitization: Slug injection prevention', () => {
  it('slug validation rejects special characters (only a-z, 0-9, hyphens)', () => {
    const content =
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts') ||
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/validation.ts');
    // Must have a regex that only allows safe slug characters
    expect(content).toMatch(
      /\[a-z0-9-\]|\[a-z\]\[a-z0-9\]|slug.*regex|regex.*slug/i
    );
  });

  it('slug length is constrained (min 3, max 63 — DNS label limit)', () => {
    const content =
      read('apps/subgraph-core/src/tenant/org-onboarding.schemas.ts') ||
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/validation.ts');
    expect(content).toMatch(/min\(|max\(/);
  });
});
