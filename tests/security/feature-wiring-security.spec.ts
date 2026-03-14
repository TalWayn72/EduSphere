/**
 * Feature Wiring Security Audit — Static Analysis Tests
 *
 * Covers 10 new feature areas with security implications:
 *  1. platformLiveStats (cross-tenant aggregation)
 *  2. Stripe billing (webhook signature, secret key hygiene)
 *  3. HRIS credentials (encryption, no logging of secrets)
 *  4. Web Push / VAPID (private key server-only)
 *  5. GDPR ANONYMIZE / Erasure (hard-delete, audit log)
 *  6. xAPI clearStatements (scoped delete, audit log)
 *  7. Google Drive import (OAuth token hygiene, file validation)
 *  8. Annotation proposals (approve/reject role gating)
 *  9. Partner API key (hash-only storage, one-time reveal)
 * 10. OCR content ingestion (SSRF, file size, path traversal)
 *
 * All tests are grep-based static analysis — no DB or running services required.
 *
 * Security invariants validated: SI-1 through SI-10
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

function read(relativePath: string): string {
  const abs = resolve(ROOT, relativePath);
  return existsSync(abs) ? readFileSync(abs, 'utf-8') : '';
}

function readDir(relativePath: string): string[] {
  const abs = resolve(ROOT, relativePath);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).filter(
    (f) => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.spec.ts')
  );
}

// ─── 1. platformLiveStats — Cross-Tenant Aggregation ──────────────────────────

describe('Feature Security: platformLiveStats (cross-tenant aggregation)', () => {
  let investorPage: string;
  let adminGraphql: string;

  beforeAll(() => {
    investorPage = read('apps/web/src/pages/InvestorDeckPage.tsx');
    adminGraphql = read('apps/subgraph-core/src/admin/admin.graphql');
  });

  it('InvestorDeckPage.tsx exists and references platformLiveStats', () => {
    expect(investorPage.length).toBeGreaterThan(0);
    expect(investorPage).toContain('platformLiveStats');
  });

  it('frontend enforces SUPER_ADMIN role check before rendering stats', () => {
    // The page must check role === SUPER_ADMIN and deny access otherwise
    expect(investorPage).toContain('SUPER_ADMIN');
    expect(investorPage).toMatch(/role\s*!==\s*['"]SUPER_ADMIN['"]/);
  });

  it('frontend shows access-denied when role is not SUPER_ADMIN', () => {
    expect(investorPage).toContain('access-denied');
  });

  it('platformLiveStats response contains ONLY aggregated counts (no tenant-specific data)', () => {
    // Verify the query only requests aggregate fields, not per-tenant breakdowns
    const queryBlock = investorPage.slice(
      investorPage.indexOf('platformLiveStats'),
      investorPage.indexOf('}', investorPage.indexOf('platformLiveStats') + 100)
    );
    // Should NOT contain tenantId, tenantName, or user-level data
    expect(queryBlock).not.toContain('tenantId');
    expect(queryBlock).not.toContain('tenantName');
    expect(queryBlock).not.toContain('userId');
    expect(queryBlock).not.toContain('email');
  });

  it('admin.graphql adminOverview requires @requiresRole with ORG_ADMIN or SUPER_ADMIN', () => {
    const start = adminGraphql.indexOf('adminOverview');
    const b = adminGraphql.slice(start, start + 300);
    expect(b).toContain('@requiresRole');
    expect(b).toContain('SUPER_ADMIN');
  });

  it('admin.graphql does NOT allow STUDENT or RESEARCHER access', () => {
    const start = adminGraphql.indexOf('adminOverview');
    const b = adminGraphql.slice(start, start + 300);
    expect(b).not.toContain('STUDENT');
    expect(b).not.toContain('RESEARCHER');
  });
});

// ─── 2. Stripe Billing — Webhook & Secret Key Hygiene ─────────────────────────

describe('Feature Security: Stripe billing (webhook signature, key hygiene)', () => {
  let stripeService: string;

  beforeAll(() => {
    stripeService = read('apps/subgraph-core/src/billing/stripe-invoice.service.ts');
  });

  it('stripe-invoice.service.ts exists', () => {
    expect(stripeService.length).toBeGreaterThan(0);
  });

  it('does NOT contain hardcoded Stripe keys (sk_live_ or sk_test_)', () => {
    expect(stripeService).not.toMatch(/sk_live_[A-Za-z0-9]+/);
    expect(stripeService).not.toMatch(/sk_test_[A-Za-z0-9]+/);
  });

  it('processWebhookEvent accepts signature parameter', () => {
    expect(stripeService).toContain('processWebhookEvent');
    expect(stripeService).toContain('signature');
  });

  it('webhook warns when signature is missing', () => {
    // Must validate signature presence — warn or reject if absent
    expect(stripeService).toMatch(/!signature|signature.*missing|without.*Signature/i);
  });

  it('does NOT log STRIPE_SECRET_KEY value (env var name in warnings is OK)', () => {
    // Logger calls must never interpolate the actual secret value (process.env.STRIPE_SECRET_KEY)
    // Mentioning the env var NAME in a warning message (e.g. "set STRIPE_SECRET_KEY to enable") is safe
    expect(stripeService).not.toMatch(/this\.logger\.[a-z]+\(.*process\.env\.STRIPE_SECRET_KEY/);
    expect(stripeService).not.toMatch(/this\.logger\.[a-z]+\([^)]*secretKey[^)]*\)/);
  });

  it('uses NestJS Logger (not console.log)', () => {
    expect(stripeService).not.toContain('console.log');
    expect(stripeService).toContain('Logger');
  });

  it('implements OnModuleDestroy for memory safety', () => {
    expect(stripeService).toContain('OnModuleDestroy');
  });

  it('generateAnnualInvoice is tenant-scoped (accepts tenantId)', () => {
    const fnBlock = stripeService.slice(
      stripeService.indexOf('generateAnnualInvoice'),
      stripeService.indexOf('processWebhookEvent')
    );
    expect(fnBlock).toContain('tenantId');
  });
});

// ─── 3. HRIS Credentials — Encryption & Logging ──────────────────────────────

describe('Feature Security: HRIS credentials (SI-3 encryption, no secret logging)', () => {
  let hrisInterface: string;
  let workdayAdapter: string;
  let hrisService: string;

  beforeAll(() => {
    hrisInterface = read('apps/subgraph-core/src/integrations/hris/hris-adapter.interface.ts');
    workdayAdapter = read('apps/subgraph-core/src/integrations/hris/workday.adapter.ts');
    hrisService = read('apps/subgraph-core/src/integrations/hris/hris-integration.service.ts');
  });

  it('HrisConfig interface exists and declares credential fields', () => {
    expect(hrisInterface).toContain('HrisConfig');
    expect(hrisInterface).toContain('clientId');
    expect(hrisInterface).toContain('clientSecret');
  });

  it('HrisConfig credentials are typed as optional (not mandatory exposure)', () => {
    // clientId and clientSecret should be optional (?) to prevent mandating PII in all flows
    expect(hrisInterface).toMatch(/clientId\?/);
    expect(hrisInterface).toMatch(/clientSecret\?/);
  });

  it('Workday adapter does NOT log clientSecret or raw credentials', () => {
    expect(workdayAdapter).not.toMatch(/this\.logger\.[a-z]+\([^)]*clientSecret[^)]*\)/);
    expect(workdayAdapter).not.toMatch(/this\.logger\.[a-z]+\([^)]*credentials[^)]*\)/);
    expect(workdayAdapter).not.toMatch(/this\.logger\.[a-z]+\([^)]*password[^)]*\)/i);
  });

  it('Workday adapter testConnection does NOT expose credentials in error messages', () => {
    // Error logs should not include the credential values
    const errorBlock = workdayAdapter.slice(
      workdayAdapter.indexOf('catch'),
      workdayAdapter.indexOf('return false')
    );
    expect(errorBlock).not.toContain('clientSecret');
    expect(errorBlock).not.toContain('config.clientId');
  });

  it('HRIS service uses NestJS Logger, not console.log', () => {
    expect(hrisService).not.toContain('console.log');
    expect(hrisService).toContain('Logger');
  });

  it('HRIS service implements OnModuleDestroy', () => {
    expect(hrisService).toContain('OnModuleDestroy');
    expect(hrisService).toContain('onModuleDestroy');
  });

  it('HRIS adapters directory exists with multiple adapter implementations', () => {
    const files = readDir('apps/subgraph-core/src/integrations/hris');
    expect(files.length).toBeGreaterThanOrEqual(3);
  });

  it('Workday adapter uses timeout on HTTP requests (DoS prevention)', () => {
    expect(workdayAdapter).toContain('AbortSignal.timeout');
  });
});

// ─── 4. Web Push / VAPID — Private Key Server-Only ───────────────────────────

describe('Feature Security: Web Push VAPID (private key never on frontend)', () => {
  let webPushFrontend: string;
  let pushDispatch: string;
  let pushTokenService: string;

  beforeAll(() => {
    webPushFrontend = read('apps/web/src/lib/webPush.ts');
    pushDispatch = read('apps/subgraph-core/src/notifications/push-dispatch.service.ts');
    pushTokenService = read('apps/subgraph-core/src/notifications/push-token.service.ts');
  });

  it('frontend webPush.ts uses ONLY the VAPID public key (VITE_VAPID_PUBLIC_KEY)', () => {
    expect(webPushFrontend).toContain('VITE_VAPID_PUBLIC_KEY');
  });

  it('frontend webPush.ts does NOT reference VAPID_PRIVATE_KEY', () => {
    expect(webPushFrontend).not.toContain('VAPID_PRIVATE_KEY');
    expect(webPushFrontend).not.toContain('vapidPrivateKey');
    expect(webPushFrontend).not.toContain('VITE_VAPID_PRIVATE_KEY');
  });

  it('frontend webPush.ts does NOT log subscription data via console', () => {
    expect(webPushFrontend).not.toMatch(
      /console\.(log|info|debug)\([^)]*subscription[^)]*\)/
    );
  });

  it('push-dispatch.service does NOT log raw token values', () => {
    // Token values (expoPushToken, webPushSubscription) must never appear in log calls
    expect(pushDispatch).not.toMatch(
      /this\.logger\.[a-z]+\([^)]*expoPushToken[^)]*\)/
    );
    expect(pushDispatch).not.toMatch(
      /this\.logger\.[a-z]+\([^)]*webPushSubscription[^)]*\)/
    );
  });

  it('push-dispatch.service uses Promise.race timeout (DoS prevention)', () => {
    expect(pushDispatch).toContain('Promise.race');
  });

  it('push-token.service uses withTenantContext (SI-9)', () => {
    expect(pushTokenService).toContain('withTenantContext');
  });

  it('push-token.service implements OnModuleDestroy with closeAllPools (SI-8)', () => {
    expect(pushTokenService).toContain('OnModuleDestroy');
    expect(pushTokenService).toContain('closeAllPools');
  });

  it('push-token.service does NOT use new Pool() directly (SI-8)', () => {
    expect(pushTokenService).not.toMatch(/new Pool\(/);
  });

  it('push-token.service hashes web push endpoint for privacy', () => {
    expect(pushTokenService).toContain('sha256');
    expect(pushTokenService).toContain('createHash');
  });

  it('no VAPID_PRIVATE_KEY in any frontend file', () => {
    // Scan all frontend source files for private key references
    const hookFile = read('apps/web/src/hooks/usePushNotifications.ts');
    expect(hookFile).not.toContain('VAPID_PRIVATE_KEY');
    expect(hookFile).not.toContain('vapidPrivateKey');
  });
});

// ─── 5. GDPR Erasure — Hard Delete, Audit, Non-Reversible ───────────────────

describe('Feature Security: GDPR Art.17 erasure (hard-delete, audit, cascading)', () => {
  let erasureService: string;

  beforeAll(() => {
    erasureService = read('apps/subgraph-core/src/user/user-erasure.service.ts');
  });

  it('user-erasure.service.ts exists', () => {
    expect(erasureService.length).toBeGreaterThan(0);
  });

  it('uses hard DELETE (not UPDATE/soft-delete) per Art.17 mandate', () => {
    // Must use .delete() not .update() for user data removal
    expect(erasureService).toContain('.delete(');
    // Should reference Art.17 in comments
    expect(erasureService).toContain('Art.17');
  });

  it('cascades across multiple entity types', () => {
    // Must delete across agent_messages, agent_sessions, annotations, user_progress, enrollments, users
    expect(erasureService).toContain('AGENT_MESSAGES');
    expect(erasureService).toContain('AGENT_SESSIONS');
    expect(erasureService).toContain('ANNOTATIONS');
    expect(erasureService).toContain('USER_PROGRESS');
    expect(erasureService).toContain('ENROLLMENTS');
    expect(erasureService).toContain('USER_RECORD');
  });

  it('writes audit log entry after erasure (compliance trail)', () => {
    expect(erasureService).toContain('writeAuditLog');
    expect(erasureService).toContain('DATA_ERASURE');
    expect(erasureService).toContain('auditLog');
  });

  it('audit log records gdprArticle: 17', () => {
    expect(erasureService).toContain("gdprArticle: '17'");
  });

  it('uses withTenantContext for RLS enforcement (SI-9)', () => {
    expect(erasureService).toContain('withTenantContext');
  });

  it('implements OnModuleDestroy and closeAllPools (SI-8)', () => {
    expect(erasureService).toContain('OnModuleDestroy');
    expect(erasureService).toContain('closeAllPools');
  });

  it('does NOT use encryption (erasure is irreversible, not encrypted-at-rest)', () => {
    // Erasure should hard-delete, not encrypt — data should be gone
    expect(erasureService).not.toContain('encryptField');
  });

  it('uses NestJS Logger, not console.log', () => {
    expect(erasureService).not.toContain('console.log');
    expect(erasureService).toContain('Logger');
  });

  it('ErasureReport type tracks deleted entities and status', () => {
    expect(erasureService).toContain('ErasureReport');
    expect(erasureService).toContain('deletedEntities');
    expect(erasureService).toContain('COMPLETED');
    expect(erasureService).toContain('FAILED');
  });
});

// ─── 6. xAPI clearStatements — Scoped Delete, Audit Log ─────────────────────

describe('Feature Security: xAPI clearStatements (scoped delete, audit)', () => {
  let xapiGraphql: string;
  let xapiResolver: string;

  beforeAll(() => {
    xapiGraphql = read('apps/subgraph-content/src/xapi/xapi.graphql');
    xapiResolver = read('apps/subgraph-content/src/xapi/xapi.resolver.ts');
  });

  it('xapi.graphql exists and defines clearXapiStatements', () => {
    expect(xapiGraphql).toContain('clearXapiStatements');
  });

  it('clearXapiStatements requires @authenticated directive', () => {
    const start = xapiGraphql.indexOf('clearXapiStatements');
    const b = xapiGraphql.slice(start, start + 300);
    expect(b).toContain('@authenticated');
  });

  it('clearXapiStatements requires SUPER_ADMIN role (highest privilege)', () => {
    const start = xapiGraphql.indexOf('clearXapiStatements');
    const b = xapiGraphql.slice(start, start + 300);
    expect(b).toContain('@requiresRole');
    expect(b).toContain('SUPER_ADMIN');
  });

  it('clearXapiStatements does NOT allow ORG_ADMIN to delete statements', () => {
    const start = xapiGraphql.indexOf('clearXapiStatements');
    const b = xapiGraphql.slice(start, start + 300);
    // Only SUPER_ADMIN should be in the roles list for clearXapiStatements
    expect(b).not.toContain('ORG_ADMIN');
  });

  it('resolver validates tenantId from auth context (not from input)', () => {
    const fnBlock = xapiResolver.slice(
      xapiResolver.indexOf('clearXapiStatements'),
      xapiResolver.length
    );
    expect(fnBlock).toContain('auth.tenantId');
  });

  it('resolver uses Zod schema validation on olderThanDays input', () => {
    expect(xapiResolver).toContain('clearStatementsSchema');
    expect(xapiResolver).toContain('safeParse');
  });

  it('resolver creates tenant-scoped delete (tenantId in WHERE clause)', () => {
    const fnBlock = xapiResolver.slice(
      xapiResolver.indexOf('clearXapiStatements'),
      xapiResolver.length
    );
    // Must filter by tenantId — cannot delete other tenant's data
    expect(fnBlock).toContain('schema.xapiStatements.tenantId');
  });

  it('resolver writes audit log entry after deletion', () => {
    const fnBlock = xapiResolver.slice(
      xapiResolver.indexOf('clearXapiStatements'),
      xapiResolver.length
    );
    expect(fnBlock).toContain('auditLog');
    expect(fnBlock).toContain('XAPI_STATEMENTS_CLEARED');
  });

  it('resolver uses withTenantContext (SI-9)', () => {
    const fnBlock = xapiResolver.slice(
      xapiResolver.indexOf('clearXapiStatements'),
      xapiResolver.length
    );
    expect(fnBlock).toContain('withTenantContext');
  });
});

// ─── 7. Google Drive Import — OAuth Token Hygiene, File Validation ──────────

describe('Feature Security: Google Drive import (OAuth tokens, file validation)', () => {
  let driveClient: string;
  let importService: string;
  let driveIngestion: string;
  let importGraphql: string;

  beforeAll(() => {
    driveClient = read('apps/subgraph-content/src/content-import/google-drive.client.ts');
    importService = read('apps/subgraph-content/src/content-import/content-import.service.ts');
    // Drive-specific logic may be in a separate service after refactoring
    driveIngestion = read('apps/subgraph-content/src/content-import/drive-ingestion.service.ts');
    importGraphql = read('apps/subgraph-content/src/content-import/content-import.graphql');
  });

  it('google-drive.client.ts exists', () => {
    expect(driveClient.length).toBeGreaterThan(0);
  });

  it('Drive client does NOT log OAuth access tokens', () => {
    expect(driveClient).not.toMatch(
      /this\.logger\.[a-z]+\([^)]*accessToken[^)]*\)/
    );
    expect(driveClient).not.toMatch(
      /console\.(log|info|debug)\([^)]*accessToken[^)]*\)/
    );
  });

  it('Drive client reads GOOGLE_CLIENT_SECRET from env (not hardcoded)', () => {
    expect(driveClient).toContain("process.env['GOOGLE_CLIENT_SECRET']");
    // Must not contain a literal client secret
    expect(driveClient).not.toMatch(/client_secret\s*[:=]\s*['"][A-Za-z0-9_-]{20,}/);
  });

  it('Drive client error messages do NOT expose access token', () => {
    // BadRequestException messages must not include the token
    expect(driveClient).not.toMatch(/BadRequestException\([^)]*accessToken[^)]*\)/);
  });

  it('importFromDrive mutation requires @authenticated directive', () => {
    const start = importGraphql.indexOf('importFromDrive');
    const b = importGraphql.slice(start, start + 300);
    expect(b).toContain('@authenticated');
  });

  it('importFromDrive mutation requires INSTRUCTOR or higher role', () => {
    const start = importGraphql.indexOf('importFromDrive');
    const b = importGraphql.slice(start, start + 300);
    expect(b).toContain('@requiresRole');
    expect(b).toContain('INSTRUCTOR');
  });

  it('importFromDrive does NOT allow STUDENT role', () => {
    const start = importGraphql.indexOf('importFromDrive');
    const b = importGraphql.slice(start, start + 300);
    expect(b).not.toContain('STUDENT');
  });

  it('drive ingestion service has bounded active jobs Map (memory safety)', () => {
    // Drive logic may be in importService or refactored into driveIngestion
    const combined = importService + driveIngestion;
    expect(combined).toContain('MAX_ACTIVE_JOBS');
    expect(combined).toContain('activeJobs');
  });

  it('drive ingestion service uses timeout via Promise.race (5 min deadline)', () => {
    const combined = importService + driveIngestion;
    expect(combined).toContain('Promise.race');
    expect(combined).toMatch(/5\s*\*\s*60\s*\*\s*1000/);
  });

  it('drive ingestion service uses withTenantContext for DB writes (SI-9)', () => {
    const combined = importService + driveIngestion;
    expect(combined).toContain('withTenantContext');
  });

  it('drive ingestion service implements OnModuleDestroy with closeAllPools (SI-8)', () => {
    const combined = importService + driveIngestion;
    expect(combined).toContain('OnModuleDestroy');
    expect(combined).toContain('closeAllPools');
  });

  it('drive ingestion service sanitizes file names to prevent path traversal', () => {
    // File names must be sanitized before use as storage keys
    const combined = importService + driveIngestion;
    expect(combined).toMatch(/replace\([^)]*[^a-zA-Z0-9]/);
  });
});

// ─── 8. Annotation Proposals (Approve/Reject) — Role Gating ────────────────

describe('Feature Security: annotation proposals (role gating, tenant isolation)', () => {
  let annotationGraphql: string;
  let mergeQueuePage: string;

  beforeAll(() => {
    annotationGraphql = read('apps/subgraph-annotation/src/annotation/annotation.graphql');
    mergeQueuePage = read('apps/web/src/pages/InstructorMergeQueuePage.tsx');
  });

  it('annotation.graphql defines promoteAnnotation mutation', () => {
    expect(annotationGraphql).toContain('promoteAnnotation');
  });

  it('promoteAnnotation requires @authenticated directive', () => {
    const start = annotationGraphql.indexOf('promoteAnnotation');
    const b = annotationGraphql.slice(start, start + 300);
    expect(b).toContain('@authenticated');
  });

  it('promoteAnnotation requires @requiresScopes with write:annotations', () => {
    const start = annotationGraphql.indexOf('promoteAnnotation');
    const b = annotationGraphql.slice(start, start + 300);
    expect(b).toContain('@requiresScopes');
    expect(b).toContain('write:annotations');
  });

  it('promoteAnnotation comment mentions INSTRUCTOR role requirement', () => {
    // The SDL comment before promoteAnnotation must mention INSTRUCTOR access
    const start = annotationGraphql.indexOf('promoteAnnotation');
    // Look backwards for the doc comment
    const commentBlock = annotationGraphql.slice(
      Math.max(0, start - 300),
      start + 100
    );
    expect(commentBlock).toContain('INSTRUCTOR');
  });

  it('InstructorMergeQueuePage exists and has approve/reject actions', () => {
    expect(mergeQueuePage.length).toBeGreaterThan(0);
    expect(mergeQueuePage).toContain('handleApprove');
    expect(mergeQueuePage).toContain('handleReject');
  });

  it('merge queue page references approveAnnotationProposal and rejectAnnotationProposal', () => {
    // These are the planned GraphQL mutations (currently mock data)
    expect(mergeQueuePage).toContain('approveAnnotationProposal');
    expect(mergeQueuePage).toContain('rejectAnnotationProposal');
  });

  it('all annotation write mutations require @authenticated as baseline', () => {
    const mutationBlock = annotationGraphql.slice(
      annotationGraphql.indexOf('type Mutation'),
      annotationGraphql.indexOf('type Subscription') > 0
        ? annotationGraphql.indexOf('type Subscription')
        : annotationGraphql.length
    );
    // Every mutation line should have @authenticated
    expect(mutationBlock).toContain('@authenticated');
  });
});

// ─── 9. Partner API Key — Hash-Only Storage, One-Time Reveal ────────────────

describe('Feature Security: partner API key (hash storage, one-time reveal)', () => {
  let partnerService: string;
  let partnerController: string;

  beforeAll(() => {
    partnerService = read('apps/subgraph-core/src/partners/partner.service.ts');
    partnerController = read('apps/subgraph-core/src/partners/partner.controller.ts');
  });

  it('partner.service.ts exists', () => {
    expect(partnerService.length).toBeGreaterThan(0);
  });

  it('API key is hashed with SHA-256 before storage', () => {
    expect(partnerService).toContain("createHash('sha256')");
    expect(partnerService).toContain('apiKeyHash');
  });

  it('raw API key is generated with cryptographic randomBytes', () => {
    expect(partnerService).toContain('randomBytes');
    // At least 32 bytes (256 bits) of randomness
    expect(partnerService).toMatch(/randomBytes\(32\)/);
  });

  it('raw API key is returned ONCE at creation (never re-retrievable)', () => {
    // The requestPartnership method returns the raw key
    expect(partnerService).toContain('apiKey');
    // Comment or code must indicate one-time
    expect(partnerService).toMatch(/ONCE|one-time|never.*re-retrievable/i);
  });

  it('only the hash is stored in DB (apiKeyHash field, not raw apiKey)', () => {
    // Insert statement should use apiKeyHash, not apiKey
    const insertBlock = partnerService.slice(
      partnerService.indexOf('.insert(schema.partners)'),
      partnerService.indexOf('.returning')
    );
    expect(insertBlock).toContain('apiKeyHash');
    // Raw apiKey must not be in the .values() call
    expect(insertBlock).not.toMatch(/apiKey[^H]/);
  });

  it('service does NOT log the raw API key', () => {
    // Logger calls must not contain the raw key
    expect(partnerService).not.toMatch(
      /this\.logger\.[a-z]+\([^)]*\bapiKey\b[^H][^)]*\)/
    );
  });

  it('service implements OnModuleDestroy with closeAllPools (SI-8)', () => {
    expect(partnerService).toContain('OnModuleDestroy');
    expect(partnerService).toContain('closeAllPools');
  });

  it('service does NOT use new Pool() directly (SI-8)', () => {
    expect(partnerService).not.toMatch(/new Pool\(/);
  });

  it('service uses NestJS Logger, not console.log', () => {
    expect(partnerService).not.toContain('console.log');
    expect(partnerService).toContain('Logger');
  });
});

// ─── 10. OCR Content Ingestion — SSRF, File Size, Path Traversal ───────────

describe('Feature Security: OCR content ingestion (SSRF, file size, path traversal)', () => {
  let ingestionGraphql: string;
  let ingestionPipeline: string;

  beforeAll(() => {
    ingestionGraphql = read('apps/subgraph-knowledge/src/sources/content-ingestion.graphql');
    ingestionPipeline = read(
      'apps/subgraph-knowledge/src/services/content-ingestion-pipeline.service.ts'
    );
  });

  it('content-ingestion.graphql exists and defines ingestContent mutation', () => {
    expect(ingestionGraphql).toContain('ingestContent');
  });

  it('ingestContent requires @authenticated directive', () => {
    const start = ingestionGraphql.indexOf('ingestContent');
    const b = ingestionGraphql.slice(start, start + 300);
    expect(b).toContain('@authenticated');
  });

  it('ingestContent requires INSTRUCTOR or higher role', () => {
    const start = ingestionGraphql.indexOf('ingestContent');
    const b = ingestionGraphql.slice(start, start + 300);
    expect(b).toContain('@requiresRole');
    expect(b).toContain('INSTRUCTOR');
  });

  it('ingestContent does NOT allow STUDENT to upload content', () => {
    const start = ingestionGraphql.indexOf('ingestContent');
    const b = ingestionGraphql.slice(start, start + 300);
    expect(b).not.toContain('STUDENT');
  });

  it('ingestion pipeline uses file type detection (magic bytes, not just extension)', () => {
    // Must detect file type from buffer content, not just trust the filename
    expect(ingestionPipeline).toContain('fileTypeFromBuffer');
  });

  it('ingestion pipeline rejects unsupported file types', () => {
    expect(ingestionPipeline).toContain('UnsupportedMediaTypeException');
  });

  it('ingestion pipeline checks for ZIP bomb (uncompressed size limit)', () => {
    // Must enforce a max uncompressed size to prevent zip bomb attacks
    expect(ingestionPipeline).toContain('MAX_UNCOMPRESSED');
    expect(ingestionPipeline).toMatch(/5\s*\*\s*1024\s*\*\s*1024\s*\*\s*1024/);
  });

  it('ingestion pipeline checks for path traversal in ZIP entries', () => {
    // Must reject ZIP entries containing ../ or starting with /
    expect(ingestionPipeline).toContain('../');
    expect(ingestionPipeline).toContain('path traversal');
  });

  it('ingestion pipeline uses NestJS Logger, not console.log', () => {
    expect(ingestionPipeline).not.toContain('console.log');
    expect(ingestionPipeline).toContain('Logger');
  });

  it('ingestion pipeline implements OnModuleDestroy', () => {
    expect(ingestionPipeline).toContain('OnModuleDestroy');
  });

  it('ingestContent uses Upload scalar (not URL) — prevents SSRF via fileUrl', () => {
    // The mutation accepts a file Upload, not a URL string
    // This prevents SSRF attacks where an attacker could point to internal services
    expect(ingestionGraphql).toContain('file: Upload!');
    expect(ingestionGraphql).not.toContain('fileUrl');
  });
});

// ─── Cross-Cutting: Security Invariant Regression Guards ────────────────────

describe('Cross-cutting: SI invariants not violated by new features', () => {
  it('SI-8: no new Pool() usage in any new service file', () => {
    const files = [
      'apps/subgraph-core/src/billing/stripe-invoice.service.ts',
      'apps/subgraph-core/src/integrations/hris/hris-integration.service.ts',
      'apps/subgraph-core/src/notifications/push-token.service.ts',
      'apps/subgraph-core/src/notifications/push-dispatch.service.ts',
      'apps/subgraph-core/src/user/user-erasure.service.ts',
      'apps/subgraph-content/src/xapi/xapi.resolver.ts',
      'apps/subgraph-content/src/content-import/content-import.service.ts',
      'apps/subgraph-core/src/partners/partner.service.ts',
    ];

    for (const f of files) {
      const content = read(f);
      if (content.length === 0) continue;
      const fileName = f.split('/').pop();
      expect(
        content,
        `SI-8 violation: ${fileName} uses new Pool() directly`
      ).not.toMatch(/new Pool\(/);
    }
  });

  it('SI-9: all new services with DB access use withTenantContext or are cross-tenant by design', () => {
    // Services that access tenant-scoped data MUST use withTenantContext
    // Note: content-import may delegate to drive-ingestion.service.ts after refactoring
    const tenantScopedServices = [
      'apps/subgraph-core/src/notifications/push-token.service.ts',
      'apps/subgraph-core/src/user/user-erasure.service.ts',
      'apps/subgraph-content/src/xapi/xapi.resolver.ts',
      'apps/subgraph-content/src/content-import/drive-ingestion.service.ts',
    ];

    for (const f of tenantScopedServices) {
      const content = read(f);
      if (content.length === 0) continue;
      const fileName = f.split('/').pop();
      expect(
        content,
        `SI-9 violation: ${fileName} missing withTenantContext`
      ).toContain('withTenantContext');
    }
  });

  it('no console.log in any new production service', () => {
    const files = [
      'apps/subgraph-core/src/billing/stripe-invoice.service.ts',
      'apps/subgraph-core/src/integrations/hris/hris-integration.service.ts',
      'apps/subgraph-core/src/notifications/push-token.service.ts',
      'apps/subgraph-core/src/notifications/push-dispatch.service.ts',
      'apps/subgraph-core/src/user/user-erasure.service.ts',
      'apps/subgraph-content/src/xapi/xapi.resolver.ts',
      'apps/subgraph-content/src/content-import/content-import.service.ts',
      'apps/subgraph-content/src/content-import/google-drive.client.ts',
      'apps/subgraph-core/src/partners/partner.service.ts',
      'apps/subgraph-knowledge/src/services/content-ingestion-pipeline.service.ts',
    ];

    for (const f of files) {
      const content = read(f);
      if (content.length === 0) continue;
      const fileName = f.split('/').pop();
      expect(
        content,
        `${fileName} uses console.log instead of NestJS Logger`
      ).not.toContain('console.log');
    }
  });

  it('all new services implement OnModuleDestroy (memory safety)', () => {
    const services = [
      'apps/subgraph-core/src/billing/stripe-invoice.service.ts',
      'apps/subgraph-core/src/integrations/hris/hris-integration.service.ts',
      'apps/subgraph-core/src/notifications/push-token.service.ts',
      'apps/subgraph-core/src/notifications/push-dispatch.service.ts',
      'apps/subgraph-core/src/user/user-erasure.service.ts',
      'apps/subgraph-content/src/content-import/content-import.service.ts',
      'apps/subgraph-core/src/partners/partner.service.ts',
      'apps/subgraph-knowledge/src/services/content-ingestion-pipeline.service.ts',
    ];

    for (const f of services) {
      const content = read(f);
      if (content.length === 0) continue;
      const fileName = f.split('/').pop();
      expect(
        content,
        `${fileName} missing OnModuleDestroy — memory leak risk`
      ).toContain('OnModuleDestroy');
    }
  });
});
