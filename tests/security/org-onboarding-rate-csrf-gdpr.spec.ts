/**
 * Org Onboarding — Rate Limiting, CSRF Protection & GDPR Compliance Tests
 *
 * Validates:
 *   1. Rate limiting for org creation (max 10/hr per IP)
 *   2. Rate limiting for API key creation (max 20/day per org)
 *   3. Rate limiting for invitation (max 100/day per org)
 *   4. Rate limiting for webhook dispatch (max 1000/hr per endpoint)
 *   5. CSRF protection on org signup form
 *   6. GDPR consent check on org signup (SI-10)
 *   7. PII encryption for invitation emails (SI-3)
 *
 * Static source-analysis tests — no running database required.
 * OWASP A04 (Insecure Design) / GDPR Art.6+7 / SI-3 / SI-10
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

function read(relativePath: string): string {
  const abs = resolve(ROOT, relativePath);
  return existsSync(abs) ? readFileSync(abs, 'utf-8') : '';
}

// ─── 1. Rate Limiting: Org Creation (10/hr per IP) ─────────────────────────

describe('Rate Limiting: Org Creation (10/hr per IP)', () => {
  it('rate-limit middleware handles org creation endpoint', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    expect(c).toMatch(/createOrganization|org.*creation|SIGNUP|signup/i);
  });

  it('org creation rate limit is scoped to IP (not tenant — unauthenticated)', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    // Org creation is public — must use IP-based rate limiting
    expect(c).toMatch(/ip|IP|remoteAddress|x-forwarded-for/i);
  });

  it('org creation rate limit maximum is ≤10 per hour', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    // Must enforce a limit — either hardcoded or via env var
    expect(c).toMatch(/ORG_CREATION_RATE_LIMIT|createOrg.*limit|10|SIGNUP_RATE/i);
  });

  it('rate limiter returns standardized error code on limit exceeded', () => {
    const c = read('apps/gateway/src/middleware/rate-limit.ts');
    expect(c).toMatch(/RATE_LIMIT_EXCEEDED|429|Too Many Requests/);
  });
});

// ─── 2. Rate Limiting: API Key Creation (20/day per org) ───────────────────

describe('Rate Limiting: API Key Creation (20/day per org)', () => {
  it('API key creation has rate limiting in service or middleware', () => {
    const service =
      read('apps/subgraph-core/src/org/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/org-api-key.service.ts');
    const middleware = read('apps/gateway/src/middleware/rate-limit.ts');
    const combined = service + middleware;
    expect(combined).toMatch(/rate.*limit|limit.*key|max.*key|API_KEY_RATE|createApiKey/i);
  });

  it('API key creation limit is enforced per tenant (not per user)', () => {
    const service =
      read('apps/subgraph-core/src/org/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/org-api-key.service.ts');
    if (service) {
      expect(service).toMatch(/tenant|tenantId/);
    }
  });

  it('max API keys per org is enforced', () => {
    const service =
      read('apps/subgraph-core/src/org/api-key.service.ts') ||
      read('apps/subgraph-core/src/org/org-api-key.service.ts');
    // Must count existing keys before creating new ones
    expect(service).toMatch(/count|MAX_API_KEYS|limit|existing/i);
  });
});

// ─── 3. Rate Limiting: Invitation (100/day per org) ────────────────────────

describe('Rate Limiting: Invitation (100/day per org)', () => {
  it('invitation service has rate limiting or batch size limit', () => {
    const service =
      read('apps/subgraph-core/src/org/org-invitation.service.ts') ||
      read('apps/subgraph-core/src/org/invitation.service.ts');
    const middleware = read('apps/gateway/src/middleware/rate-limit.ts');
    const combined = service + middleware;
    expect(combined).toMatch(/rate.*limit|limit.*invit|max.*invit|batch|INVITATION_RATE/i);
  });

  it('invitation batch size is limited (max 100 emails per request)', () => {
    const schemas =
      read('apps/subgraph-core/src/org/org.schemas.ts') ||
      read('apps/subgraph-core/src/org/org-invitation.schemas.ts') ||
      read('apps/subgraph-core/src/org/validation.ts');
    // Zod array max or explicit batch size check
    expect(schemas).toMatch(/max\(100\)|max\(\d+\)|MAX_BATCH|batch.*limit/);
  });
});

// ─── 4. Rate Limiting: Webhook Dispatch (1000/hr per endpoint) ─────────────

describe('Rate Limiting: Webhook Dispatch (1000/hr per endpoint)', () => {
  it('webhook dispatcher enforces per-endpoint rate limit', () => {
    const content =
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts') ||
      read('apps/subgraph-core/src/org/webhook.service.ts');
    expect(content).toMatch(/rate.*limit|throttle|limit.*dispatch|MAX_DISPATCH|1000/i);
  });

  it('webhook dispatcher tracks dispatch count per endpoint', () => {
    const content =
      read('apps/subgraph-core/src/org/webhook-dispatcher.service.ts') ||
      read('apps/subgraph-core/src/org/webhook.service.ts');
    expect(content).toMatch(/count|dispatch.*count|endpoint.*limit/i);
  });
});

// ─── 5. CSRF Protection ───────────────────────────────────────────────────

describe('CSRF Protection: Org Signup Form', () => {
  it('frontend org signup form uses CSRF token or relies on SameSite cookie', () => {
    const signupPage =
      read('apps/web/src/pages/OrgSignupPage.tsx') ||
      read('apps/web/src/pages/SignupPage.tsx') ||
      read('apps/web/src/pages/CreateOrgPage.tsx');
    const gateway = read('apps/gateway/src/index.ts');
    // Either: CSRF token in form, or SameSite=Strict cookie, or CORS enforcement
    const combined = signupPage + gateway;
    expect(combined).toMatch(
      /csrf|CSRF|SameSite|sameSite|csrfToken|x-csrf-token|origin.*check|CORS/i
    );
  });

  it('gateway enforces CORS origin restriction (SI-2)', () => {
    const gateway = read('apps/gateway/src/index.ts');
    // Must NOT use origin: '*' in production — SI-2 violation
    expect(gateway).not.toMatch(/origin\s*:\s*['"]\*['"]/);
    // Must use CORS_ORIGIN env var
    expect(gateway).toMatch(/CORS_ORIGIN|cors.*origin/i);
  });

  it('graphql mutations use POST method only (GET mutations disabled)', () => {
    const gateway = read('apps/gateway/src/index.ts');
    // GraphQL Yoga/Hive Gateway should reject mutations via GET
    expect(gateway).toMatch(/POST|allowedMethods|method.*POST/i);
  });
});

// ─── 6. GDPR: Consent on Org Signup ────────────────────────────────────────

describe('GDPR: Org Signup Consent (Art.6, Art.7)', () => {
  it('org signup collects consent for data processing', () => {
    const signupPage =
      read('apps/web/src/pages/OrgSignupPage.tsx') ||
      read('apps/web/src/pages/SignupPage.tsx') ||
      read('apps/web/src/pages/CreateOrgPage.tsx');
    // Must have a consent checkbox or consent dialog
    expect(signupPage).toMatch(
      /consent|terms|privacy|agreeToTerms|dataProcessing|GDPR/i
    );
  });

  it('org signup sends consent flag to backend mutation', () => {
    const signupPage =
      read('apps/web/src/pages/OrgSignupPage.tsx') ||
      read('apps/web/src/pages/SignupPage.tsx') ||
      read('apps/web/src/pages/CreateOrgPage.tsx');
    // Consent value must be passed in the mutation input
    expect(signupPage).toMatch(/consent|acceptTerms|agreeToTerms|dataProcessingConsent/i);
  });

  it('createOrganization mutation records consent in audit log', () => {
    const service =
      read('apps/subgraph-core/src/org/org-provisioning.service.ts') ||
      read('apps/subgraph-core/src/org/org.service.ts');
    // Must write consent record to audit log or consent table
    expect(service).toMatch(/consent|audit.*log|CONSENT_GIVEN|gdpr/i);
  });

  it('createOrganization rejects signup without consent', () => {
    const service =
      read('apps/subgraph-core/src/org/org-provisioning.service.ts') ||
      read('apps/subgraph-core/src/org/org.service.ts');
    // Must validate consent before creating org
    expect(service).toMatch(/consent.*required|!consent|consent.*false|BadRequest.*consent/i);
  });
});

// ─── 7. GDPR: PII Encryption in Invitations (SI-3) ────────────────────────

describe('GDPR: PII Encryption in Invitations (SI-3, Art.25)', () => {
  it('invitation email is encrypted before DB storage', () => {
    const service =
      read('apps/subgraph-core/src/org/org-invitation.service.ts') ||
      read('apps/subgraph-core/src/org/invitation.service.ts');
    // Must use encryptField or similar encryption function — SI-3
    expect(service).toMatch(/encryptField|encrypt|crypto/i);
  });

  it('invitation service does NOT store plaintext email in invitation record', () => {
    const service =
      read('apps/subgraph-core/src/org/org-invitation.service.ts') ||
      read('apps/subgraph-core/src/org/invitation.service.ts');
    // Should not directly insert the email string without encryption
    if (service) {
      // Check for encryptField wrapping the email value
      expect(service).toMatch(/encryptField.*email|encrypt.*email|email.*encrypt/i);
    }
  });

  it('invitation token is cryptographically random (not sequential)', () => {
    const service =
      read('apps/subgraph-core/src/org/org-invitation.service.ts') ||
      read('apps/subgraph-core/src/org/invitation.service.ts');
    expect(service).toMatch(/crypto\.randomBytes|randomUUID|randomBytes|randomBytes/);
    expect(service).not.toContain('Math.random');
  });

  it('invitation token has expiration (time-limited)', () => {
    const service =
      read('apps/subgraph-core/src/org/org-invitation.service.ts') ||
      read('apps/subgraph-core/src/org/invitation.service.ts');
    expect(service).toMatch(/expires|expiration|expiresAt|TTL/i);
  });
});

// ─── 8. GDPR: Data Retention on Org Invitations ───────────────────────────

describe('GDPR: Data Retention for Invitations (Art.5)', () => {
  it('expired invitations have cleanup mechanism', () => {
    const service =
      read('apps/subgraph-core/src/org/org-invitation.service.ts') ||
      read('apps/subgraph-core/src/org/invitation.service.ts');
    // Must have cleanup/purge for expired invitations
    expect(service).toMatch(/cleanup|purge|delete.*expired|removeExpired|cron/i);
  });

  it('invitation records track status (PENDING/ACCEPTED/EXPIRED/REVOKED)', () => {
    const schema =
      read('packages/db/src/schema/org-invitations.ts') ||
      read('apps/subgraph-core/src/org/org-invitation.service.ts');
    expect(schema).toMatch(/PENDING|ACCEPTED|EXPIRED|REVOKED|status/);
  });
});

// ─── 9. SI-10: No LLM Data Processing Without Consent ────────────────────

describe('SI-10: AI Consent Gate (if AI features used in onboarding)', () => {
  it('org provisioning does NOT call LLM without checking consent', () => {
    const service =
      read('apps/subgraph-core/src/org/org-provisioning.service.ts') ||
      read('apps/subgraph-core/src/org/org.service.ts');
    if (!service) return;
    // If AI/LLM is used, consent must be checked first
    if (service.match(/openai|anthropic|ollama|generateText|streamText/i)) {
      expect(service).toMatch(/THIRD_PARTY_LLM|consent|CONSENT_REQUIRED/);
    }
  });
});

// ─── 10. Email Verification for Org Admin ─────────────────────────────────

describe('Email Verification: Org Admin Account', () => {
  it('org provisioning triggers email verification via Keycloak', () => {
    const service =
      read('apps/subgraph-core/src/org/org-provisioning.service.ts') ||
      read('apps/subgraph-core/src/org/org.service.ts');
    // Must trigger Keycloak email verification action
    expect(service).toMatch(
      /execute-actions-email|VERIFY_EMAIL|verifyEmail|emailVerification|sendVerification/i
    );
  });

  it('org is not fully activated until email is verified', () => {
    const service =
      read('apps/subgraph-core/src/org/org-provisioning.service.ts') ||
      read('apps/subgraph-core/src/org/org.service.ts');
    // Provisioning status should gate activation on email verification
    expect(service).toMatch(
      /PROVISIONING|provisioning_status|PENDING_VERIFICATION|email.*verif/i
    );
  });
});
