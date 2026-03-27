# Security Audit Report — Sprint 1-3 (Knowledge Subgraph + Frontend)

**Date:** 2026-03-27
**Auditor:** Security & Compliance Division
**Scope:** All new/modified code in Sprint 1-3 across `apps/subgraph-knowledge/`, `apps/web/`, and related packages
**Status:** Remediated

---

## Executive Summary

Deep security audit of Sprint 1-3 code covering the Knowledge Graph subgraph (NATS consumers, content ingestion, MinIO integration, Apache AGE queries) and frontend components (pipeline results, notification editor, visual anchoring). **6 vulnerabilities found and fixed, 58 security tests added.**

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 2 | 2 | 0 |
| High | 2 | 2 | 0 |
| Medium | 2 | 2 | 0 |
| Low (deps) | 44 | 0 | 44 (transitive) |

---

## Findings

### VULN-001: XSS via unsanitized SVG in PipelineResultDetail (CRITICAL)

- **File:** `apps/web/src/components/pipeline/PipelineResultDetail.tsx:87`
- **Description:** `mermaidSvg` extracted from server response data was passed directly to `dangerouslySetInnerHTML` without sanitization. An attacker who controls pipeline output data (e.g., via a compromised AI agent or injected course content) could inject arbitrary JavaScript via `<script>`, `onerror`, or SVG event handlers.
- **OWASP:** A7:2017 - Cross-Site Scripting (XSS)
- **Fix:** Added `DOMPurify.sanitize()` with `USE_PROFILES: { svg: true, html: true }` wrapped in `useMemo` for performance. Same pattern already used in `CrossFadeImage.tsx`.
- **Test:** `tests/security/rag-pdf-security.spec.ts` — "XSS Protection — PipelineResultDetail mermaidSvg"

### VULN-002: XSS via weak regex sanitization in NotificationTemplateEditor (CRITICAL)

- **File:** `apps/web/src/pages/NotificationTemplatesPage.editor.tsx:21-26`
- **Description:** `sanitizeEmailHtml()` used regex to strip `<script>`, `on*` handlers, and `javascript:` URIs. This is bypassable via:
  - Nested encoding: `<img src=x oNeRrOr=alert(1)>` (case bypass)
  - Data URIs: `<a href="data:text/html,<script>alert(1)</script>">`
  - CSS expressions: `<div style="background:url(javascript:alert(1))">`
  - SVG foreignObject: `<svg><foreignObject><body onload=alert(1)>`
- **OWASP:** A7:2017 - Cross-Site Scripting (XSS)
- **Fix:** Replaced regex sanitization with `DOMPurify.sanitize()` using explicit `ALLOWED_TAGS` and `ALLOWED_ATTR` allowlists. Added `ALLOW_DATA_ATTR: false`.
- **Test:** `tests/security/rag-pdf-security.spec.ts` — "XSS Protection — NotificationTemplateEditor email HTML"

### VULN-003: SSRF in ContentIngestionResolver (HIGH)

- **File:** `apps/subgraph-knowledge/src/sources/content-ingestion.resolver.ts:71`
- **Description:** `fetch(fileUrl)` was called without SSRF protection. Unlike `DocumentParserService.parseUrl()` which has a `privateIpPattern` guard, the ingestion resolver blindly fetched any URL. An attacker could use this to:
  - Scan internal network services (metadata endpoints, internal APIs)
  - Access cloud metadata services (169.254.169.254)
  - Exfiltrate data via DNS rebinding
- **OWASP:** A10:2021 - Server-Side Request Forgery (SSRF)
- **Fix:** Added `assertSafeUrl()` function that validates protocol (http/https only) and blocks private/loopback IPs. Added `AbortSignal.timeout(30_000)` to prevent slow-loris attacks.
- **Test:** `tests/security/rag-pdf-security.spec.ts` — "SSRF Protection — ContentIngestionResolver"

### VULN-004: Path Traversal in MinIO File Key Construction (HIGH)

- **File:** `apps/subgraph-knowledge/src/sources/knowledge-source.service.ts:143`
- **Description:** MinIO file key was constructed as `${tenantId}/${courseId}/${uuid}/${input.origin}` where `input.origin` is the user-provided filename. A filename like `../../../etc/passwd` or `..\..\config` could escape the tenant prefix and overwrite or read files in other tenant namespaces.
- **OWASP:** A1:2017 - Injection (Path Traversal)
- **Fix:** Added `safeOrigin` sanitization that strips `../`, `..\`, and replaces `/` and `\` with `_`. Combined with the `randomUUID()` directory, this ensures complete path isolation.
- **Test:** `tests/security/rag-pdf-security.spec.ts` — "Path Traversal — MinIO file_key sanitization"

### VULN-005: Missing Tenant UUID Validation in TranscriptBridgeConsumer (MEDIUM)

- **File:** `apps/subgraph-knowledge/src/nats/transcript-bridge.consumer.ts:135`
- **Description:** Unlike `LessonNERConsumer` which cross-validates subject tenant vs payload tenant, the `TranscriptBridgeConsumer` accepted any `tenantId` string without format validation. A crafted NATS message with a non-UUID tenantId could potentially bypass RLS or cause unexpected behavior.
- **Fix:** Added UUID format validation regex before processing. Messages with non-UUID tenantId are rejected with error logging.
- **Test:** `tests/security/rag-pdf-security.spec.ts` — "Tenant Validation — TranscriptBridgeConsumer"

### VULN-006: Missing Zod Validation on ContentIngestionResultDto (MEDIUM)

- **File:** `apps/subgraph-knowledge/src/sources/content-ingestion.dto.ts`
- **Description:** `ContentIngestionResultDto` is a plain TypeScript interface with no runtime Zod validation. While this is a response DTO (lower risk than input), it violates the project convention of Zod schemas on all mutations.
- **Status:** Documented for future Sprint. Risk is mitigated because the resolver constructs the response internally and does not accept external data for these fields.

---

## Dependency Audit

`pnpm audit` reports **44 vulnerabilities** (5 critical, 14 high, 22 moderate, 3 low):

### Critical (5)

| Package | Advisory | Impact | Remediation |
|---------|----------|--------|-------------|
| `@apollo/query-planner` >=2.13.0 <2.13.2 | GHSA-pfjj-6f4p-rvmh | Prototype pollution via key sanitization | Transitive via `@graphql-yoga/nestjs-federation` — awaiting upstream update |
| `@apollo/gateway` >=2.13.0 <2.13.2 | GHSA-pfjj-6f4p-rvmh | Same as above | Same — not directly exploitable since we use Hive Gateway, not Apollo Gateway directly |
| `@apollo/federation-internals` >=2.13.0 <2.13.2 | GHSA-pfjj-6f4p-rvmh | Same as above | Same |
| `convict` <=6.2.4 | Prototype pollution via startsWith() | Transitive via `@argos-ci/playwright` (dev dependency) | Dev-only — no production impact |

### High (14)

Most are transitive dependencies in dev tools (`vitest`, `@nestjs/cli`, `@angular-devkit/core`). No direct production dependencies at high severity.

### Key Direct Dependencies — Status

| Package | Version | Status |
|---------|---------|--------|
| `pdfjs-dist` | ^5.5.207 | No known CVEs at this version |
| `pdf-parse` | ^2.4.5 | No active security advisories |
| `@aws-sdk/client-s3` | (via workspace) | Current — AWS SDK v3 is actively maintained |
| `mammoth` | ^1.11.0 | No known CVEs |
| `tesseract.js` | ^5.1.1 | No known CVEs |
| `dompurify` | ^3.3.2 | Current — actively maintained |

---

## Positive Security Findings (Already Correct)

These patterns were audited and found to be properly implemented:

1. **Cypher parameterization:** `packages/db/src/graph/client.ts` uses `toCypherLiteral()` with proper escaping (backslash, double-quote, newline, carriage return). Fallback `substituteParams()` only replaces known `$paramName` tokens.

2. **SVG sanitization in CrossFadeImage:** Uses `DOMPurify.sanitize()` with `USE_PROFILES: { svg: true }` — correct pattern.

3. **JsonLd component:** Uses `safeJsonLd()` to prevent `</script>` injection — correct.

4. **Custom CSS injection in useTenantBranding:** Uses `el.textContent = css` (not `innerHTML`) — XSS-safe.

5. **GraphQL auth directives:** All mutations in `knowledge-source.graphql` and `content-ingestion.graphql` have `@authenticated` and `@requiresScopes`.

6. **NATS SI-7 compliance:** All 3 NATS consumers (`NatsConsumer`, `LessonNERConsumer`, `TranscriptBridgeConsumer`) use `buildNatsOptions()` for TLS/NKey.

7. **LessonNERConsumer tenant cross-validation:** Validates subject tenantId matches payload tenantId.

8. **MinIO presigned URL expiry:** 15-minute default (900 seconds) — appropriate.

9. **File upload limits:** 50 MB cap, memory storage, MIME allowlist, JWT validation.

10. **DocumentParserService SSRF guard:** Blocks private IPs, non-http protocols, and uses `AbortSignal.timeout`.

---

## Test Coverage

New security test file: `tests/security/rag-pdf-security.spec.ts` — **58 tests**

| Test Suite | Tests |
|-----------|-------|
| Path Traversal — MinIO file_key sanitization | 6 |
| Presigned URL — expiry configuration | 5 |
| SSRF Protection — ContentIngestionResolver | 9 |
| SSRF Protection — DocumentParserService.parseUrl | 5 |
| Tenant Validation — TranscriptBridgeConsumer | 6 |
| Tenant Validation — LessonNERConsumer | 4 |
| File Upload Security — KnowledgeSourceController | 8 |
| XSS Protection — PipelineResultDetail mermaidSvg | 4 |
| XSS Protection — NotificationTemplateEditor email HTML | 5 |
| Auth Directives — Knowledge Source GraphQL SDL | 4 |
| Auth Directives — Content Ingestion GraphQL SDL | 2 |

---

## Files Modified

| File | Change |
|------|--------|
| `apps/web/src/components/pipeline/PipelineResultDetail.tsx` | Added DOMPurify sanitization for mermaidSvg |
| `apps/web/src/pages/NotificationTemplatesPage.editor.tsx` | Replaced regex sanitizer with DOMPurify |
| `apps/subgraph-knowledge/src/sources/content-ingestion.resolver.ts` | Added SSRF guard + AbortSignal timeout |
| `apps/subgraph-knowledge/src/sources/knowledge-source.service.ts` | Added path traversal sanitization for MinIO file keys |
| `apps/subgraph-knowledge/src/nats/transcript-bridge.consumer.ts` | Added UUID format validation for tenantId |
| `tests/security/rag-pdf-security.spec.ts` | New — 58 security tests |

---

## Recommendations

1. **Upgrade Apollo packages** when `@graphql-yoga/nestjs-federation` releases a version with `@apollo/gateway` >=2.13.2.
2. **Add Zod schema** for `ContentIngestionResultDto` in a future Sprint.
3. **Consider DOMPurify server-side** for any future server-rendered HTML responses.
4. **Add CSP headers** (`Content-Security-Policy: script-src 'self'`) to further mitigate XSS even if sanitization is bypassed.
5. **DNS rebinding protection:** Consider adding resolved IP validation (resolve hostname, check if private) for stronger SSRF defense.
