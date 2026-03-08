# Phase 29 Security Audit Report

**Date:** 2026-03-08
**Division:** Security & Compliance (Division 8)
**Scope:** Visual Anchoring & Asset Linking System
**Auditor:** Division 8 — Security & Compliance (automated static analysis)
**Files Reviewed:** 11 source files + 1 migration + 2 security test files

---

## Executive Summary

Phase 29 introduces a file upload pipeline (MinIO presigned PUT → ClamAV scan → sharp WebP conversion), a visual anchor CRUD system, document versioning with JSONB snapshots, and client-side offline caching via IndexedDB. The security posture is **overall good** with several well-implemented controls. However, **four issues** require remediation before production release, including one HIGH severity finding (NATS bare connect) and three MEDIUM severity findings.

---

## STRIDE Threat Model

### Flow: Upload → Scan → Anchor → Version

```
Browser (AssetUploader)
    │ 1. GET presignedUploadUrl (GraphQL, @authenticated)
    │ 2. PUT file → MinIO quarantine key (direct S3 presigned URL)
    │ 3. confirmVisualAssetUpload mutation (GraphQL, @authenticated + content:write)
    ▼
Content Subgraph (VisualAnchorService / visual-asset-upload.helper)
    │ 4. GetObject (quarantine key) from MinIO
    │ 5. ZIP bomb check (3x declared size AND > 5MB)
    │ 6. Magic-byte verification (file-type library + SVG text heuristic)
    │ 7. ClamAV scanBuffer (via node-clamscan → clamd TCP)
    │ 8. sharp WebP conversion
    │ 9. PutObject → production MinIO key ({tenantId}/{courseId}/visual-assets/...)
    │ 10. DeleteObject (quarantine key)
    │ 11. INSERT visual_assets (Drizzle, withTenantContext RLS)
    ▼
PostgreSQL (RLS enforced)
    + NATS publish EDUSPHERE.visual.anchor.created / deleted
```

### STRIDE Analysis per Component

| Threat | Target | Description | Mitigated? |
|--------|--------|-------------|-----------|
| **Spoofing** | GraphQL mutations | Unauthenticated actor calls `confirmVisualAssetUpload` | ✅ `@authenticated + @requiresScopes(content:write)` |
| **Spoofing** | MinIO presigned URL | Attacker guesses/reuses presigned URL to upload to another tenant's path | ✅ Key is scoped to `{tenantId}/{courseId}/...`; presigned URL requires valid AWS credentials to generate |
| **Tampering** | File buffer | Client sends different file than declared (MIME/size mismatch) | ✅ ZIP bomb check + magic-byte re-check on server side after download from MinIO |
| **Tampering** | SVG content | Client uploads SVG with embedded `<script>` or `onload` event handlers | ⚠️ SVG is stored and served as-is; no server-side SVG sanitization at upload time (DOMPurify only tested in unit test, not enforced in upload pipeline) |
| **Tampering** | JSONB snapshots | Attacker modifies `anchors_snapshot` in `document_versions` via SQL injection | ✅ All queries via Drizzle ORM parameterized; RLS prevents cross-tenant write |
| **Repudiation** | Infected upload | No audit trail links rejected upload to user identity in durable store | ⚠️ Pino log exists but no persistent audit record written for rejected infected files |
| **Information Disclosure** | Presigned URLs | `storageUrl` and `webpUrl` returned in GraphQL response — 15-min validity | ✅ Acceptable; tokens short-lived; not stored in DB |
| **Information Disclosure** | IndexedDB (useOfflineAnchors) | Anchor text cached in browser IndexedDB without encryption | ⚠️ MEDIUM — anchor text may contain sensitive content; no TTL eviction |
| **Information Disclosure** | NATS publish | `publishNats` sends `tenantId` and `anchorId` over bare NATS (no TLS/auth) | 🔴 HIGH — violates SI-7 |
| **Denial of Service** | ClamAV scan | Attacker uploads many 100MB files to exhaust ClamAV daemon | ✅ 100MB hard limit per file; but no per-tenant rate limiting on `confirmVisualAssetUpload` |
| **Denial of Service** | sharp WebP conversion | Decompression bomb reaches sharp despite 15MB declared-size gate | ⚠️ ZIP bomb check uses `declaredSize * 3` threshold — a single honest 15MB upload with an actual 46MB decompressed payload passes through |
| **Elevation of Privilege** | `syncAnchors` mutation | Any authenticated `content:write` user can sync any `mediaAssetId` | ⚠️ MEDIUM — no ownership check; a student with `content:write` could re-sync another instructor's document |
| **Elevation of Privilege** | `rollbackToVersion` | Any `content:write` actor can rollback any `versionId` | ⚠️ MEDIUM — same ownership issue; withing tenant context, but no role check (INSTRUCTOR/ORG_ADMIN should be required) |
| **Elevation of Privilege** | `assignAssetToAnchor` | Cross-asset assignment — anchor in course A assigned a visual asset from course B | ⚠️ MEDIUM — no cross-course ownership validation |

---

## SI-1 through SI-10 Compliance Matrix

| SI | Rule | Phase 29 Relevance | Status | Evidence |
|----|------|--------------------|--------|---------|
| **SI-1** | RLS variable = `app.current_tenant` | All 3 new tables use RLS policies | ✅ PASS | Migration 0016 lines 36, 88, 118: `current_setting('app.current_tenant', TRUE)` |
| **SI-2** | No wildcard CORS | New upload flow uses presigned URLs (no new CORS surface added) | ✅ N/A | No new CORS configuration in Phase 29 |
| **SI-3** | PII fields encrypted | `anchor_text` stored in `visual_anchors` plain; `anchors_snapshot` JSONB plain | ⚠️ REVIEW | `anchor_text` can contain student-authored content (potentially PII). Not encrypted. Review needed vs SI-3 classification |
| **SI-4** | Keycloak brute-force | No new auth flows introduced | ✅ N/A | Phase 29 uses existing JWT/Keycloak auth |
| **SI-5** | No SSL bypass in Docker | No new Dockerfile or Docker config in Phase 29 | ✅ N/A | No new Docker config reviewed |
| **SI-6** | Inter-service HTTPS | MinIO endpoint uses `http://` in `VisualAnchorService` constructor | ⚠️ REVIEW | `visual-anchor.service.ts:80`: `http://${minioConfig.endpoint}:${minioConfig.port}` — this is the internal MinIO endpoint, acceptable in dev but must be HTTPS in prod via mTLS/Linkerd |
| **SI-7** | NATS with auth/TLS | `publishNats()` uses bare `connect({ servers: natsUrl })` — no credentials, no TLS | 🔴 FAIL | `visual-anchor.service.ts:290`: `connect({ servers: natsUrl })` — violates SI-7 |
| **SI-8** | DB via getOrCreatePool() | Both services use `createDatabaseConnection()` from `@edusphere/db` | ✅ PASS | `visual-anchor.service.ts:69`, `document-version.service.ts:53` — correct pattern |
| **SI-9** | withTenantContext() wrapping | All DB queries in VisualAnchorService and DocumentVersionService wrapped | ✅ PASS | Every select/insert/update in both services uses `withTenantContext(this.db, authCtx, ...)` |
| **SI-10** | LLM consent before AI calls | `ai_suggestions` column is JSONB, currently always `null` on insert | ✅ PASS (placeholder) | `document-version.service.ts:152`: `ai_suggestions: null` — no LLM call made yet. When AI suggestions are implemented, SI-10 consent check must be added |

---

## Vulnerabilities Found

| ID | Severity | Description | File:Line | Recommended Fix |
|----|----------|-------------|-----------|-----------------|
| **VULN-001** | 🔴 HIGH | SI-7 violation: bare NATS `connect()` in `publishNats()` — no TLS, no credentials. Any attacker on the internal network can publish/subscribe to EDUSPHERE.visual.* subjects | `visual-anchor.service.ts:290` | Replace `connect({ servers: natsUrl })` with `connect({ servers: natsUrl, tls: { ... }, authenticator: ... })` using env-var credentials, matching the SI-7 pattern from other services. Alternatively inject the shared `NatsKVClient` from `@edusphere/nats-client` |
| **VULN-002** | 🟡 MEDIUM | No role-based ownership check on `syncAnchors` and `rollbackToVersion` — any user with `content:write` scope can modify any document within the tenant | `visual-anchor.service.ts:235`, `document-version.service.ts:169` | Add `@requiresRole(roles: [INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN])` to `syncAnchors` and `rollbackToVersion` SDL directives; add role assertion in resolver `requireAuth()` |
| **VULN-003** | 🟡 MEDIUM | No cross-course ownership validation in `assignAssetToAnchor` — a `visualAssetId` from a different course can be assigned to an anchor in another course (same tenant) | `visual-anchor.service.ts:223` | Before update, verify that `visual_asset.course_id = anchor.course_id` by loading both records; throw `ForbiddenException` if mismatch |
| **VULN-004** | 🟡 MEDIUM | IndexedDB anchor cache (useOfflineAnchors) stores anchor text without encryption and without TTL eviction. Cached anchor data persists indefinitely in the browser. | `useOfflineAnchors.ts:51-55` | Add TTL field (`cachedAt`) eviction: reject records older than 24h on `loadCachedAnchors`. Add note that anchor text should not include PII beyond what is policy-acceptable for client-side storage |
| **VULN-005** | 🟢 LOW | SVG files are allowed through the MIME check and stored/served without server-side sanitization. DOMPurify is tested in unit tests but NOT applied in the upload pipeline before storage. If a downstream system renders SVG via `<img src>` it is safe, but if any code uses `dangerouslySetInnerHTML` with stored SVG content, XSS is possible | `image-optimizer.service.ts:63-66`, `visual-asset-upload.helper.ts:91` | For SVG uploads: run DOMPurify (server-side via jsdom) on the SVG buffer before storing to MinIO. Add server-side test asserting sanitized SVG content is stored |
| **VULN-006** | 🟢 LOW | `clamav-upload.spec.ts` line 61 contains a placeholder test (`expect(expectedError).toBeTruthy()`) that always passes regardless of actual behavior. The INFECTED path is documented as tested "in service.spec.ts" but the referenced file is not verified to exist in this audit | `tests/security/clamav-upload.spec.ts:61` | Replace placeholder with an actual mock-based test: mock `ClamavService.scanBuffer` to return `{ isInfected: true, viruses: ['EICAR'], hasError: false }`, call `runVisualAssetUploadPipeline`, assert `BadRequestException('Malicious file detected')` is thrown |
| **VULN-007** | 🟢 LOW | ZIP bomb threshold uses `declaredSize * 3`. A client that declares 15MB (maximum allowed) and uploads an actual 44MB decompressed payload passes the check (44 < 15*3=45MB), allowing a >40MB buffer to reach sharp's WebP converter | `image-optimizer.service.ts:85` | Change threshold to `Math.max(declaredSize * 2, 10 * 1024 * 1024)` or apply an absolute hard ceiling of 20MB on `buffer.length` regardless of declared size |
| **VULN-008** | 🟢 LOW | `visual-asset-upload.helper.ts:158-174` inserts into `visual_assets` directly via `db.insert()` without `withTenantContext()` — this is the only DB write in Phase 29 that bypasses the tenant context wrapper | `visual-asset-upload.helper.ts:158` | Wrap the `db.insert(schema.visualAssets)...` call in `withTenantContext(db, authCtx, (tx) => tx.insert(...))` |
| **VULN-009** | 🟢 LOW | `anchorText` field (up to 5000 chars) is FTS-indexed (`to_tsvector('simple', anchor_text)`) and stored in `anchors_snapshot` JSONB. If anchor text contains student PII (names, personal notes), it is stored in plaintext and snapshot JSONB. SI-3 compliance requires `encryptField()` before write for PII fields | `0016_visual_anchoring.sql:83`, `visual-anchor.service.ts:142` | Determine if `anchor_text` is classified as PII under the project's data classification policy. If yes, apply `encryptField()` before insert and `decryptField()` after select |

---

## Security Controls Verified

The following controls were checked and confirmed to be correctly implemented:

1. **GraphQL authentication directives** — All 6 mutations and 2 queries in `visual-anchor.graphql` carry `@authenticated`. All write mutations carry `@requiresScopes(scopes: ["content:write"])`. Subscriptions carry `@authenticated`.

2. **Zod input validation** — `CreateVisualAnchorSchema` and `UpdateVisualAnchorSchema` enforce: UUID format for IDs, coordinate values clamped to `[0, 1]`, page numbers as positive integers, `anchorText` max 5000 chars. Schemas called via `.parse()` (throws on violation) not `.safeParse()`.

3. **SI-1 RLS variable names** — All three migration policies correctly use `current_setting('app.current_tenant', TRUE)`. The `document_versions_instructor_write` policy additionally checks `app.current_user_role` correctly.

4. **SI-8 Database connection pattern** — Both `VisualAnchorService` and `DocumentVersionService` use `createDatabaseConnection()` from `@edusphere/db`. Both implement `OnModuleDestroy` calling `closeAllPools()`.

5. **SI-9 withTenantContext wrapping** — All select, update, and delete operations in `VisualAnchorService` and `DocumentVersionService` are wrapped in `withTenantContext()`. **Exception:** see VULN-008 for the one unwrapped insert.

6. **ClamAV size gate** — Files > 100MB are rejected with `BadRequestException` before reaching the ClamAV daemon.

7. **Infected file immediate deletion** — On positive ClamAV result, the quarantine MinIO key is deleted synchronously before throwing `BadRequestException`. The infected buffer is never promoted to production storage.

8. **Magic-byte MIME verification** — Server re-checks MIME via `file-type` library after downloading from MinIO quarantine key; client-declared MIME is not trusted for MIME determination.

9. **Filename sanitization** — `sanitizedName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_')` applied before ClamAV scan logging and before production MinIO key generation.

10. **Soft-delete pattern** — `deleteAnchor` uses `deleted_at` timestamp; `findAllByMediaAsset` filters `isNull(deleted_at)`. Rollback correctly soft-deletes current anchors before re-inserting snapshot.

11. **Memory safety** — `VisualAnchorService.publishNats()` uses try/finally to `nc.close()`. `CrossFadeImage` clears `setTimeout` handle in `useEffect` cleanup. `useOfflineAnchors` closes IDB connection on unmount.

12. **DOMPurify SVG unit tests** — `svg-sanitization.spec.ts` correctly tests `<script>`, `onerror`, `onload`, and `javascript:` stripping using DOMPurify with `USE_PROFILES: { svg: true }`. Regression guard uses `querySelectorAll('[onerror]').length === 0` (correct pattern per Phase 28 fix).

13. **Presigned URL scope** — Production MinIO keys are scoped to `{tenantId}/{courseId}/visual-assets/` preventing cross-tenant path enumeration.

14. **`document_versions` instructor-only write** — The `document_versions_instructor_write` INSERT policy correctly restricts inserts to `SUPER_ADMIN`, `ORG_ADMIN`, and `INSTRUCTOR` roles via `app.current_user_role`.

---

## Penetration Test Requirements

The following pentest specs must be written before production release:

| ID | Priority | Spec File | Scenario |
|----|----------|-----------|----------|
| **PENTEST-024** | P0 (blockers VULN-001) | `tests/security/nats-visual-anchor.pentest.spec.ts` | Assert that `publishNats` is called with TLS + credentials config; mock NATS connect and verify options object contains `tls` and `authenticator` keys |
| **PENTEST-025** | P1 | `tests/security/visual-anchor-ownership.pentest.spec.ts` | Test that STUDENT role cannot call `syncAnchors` or `rollbackToVersion`; assert 403/UnauthorizedException. Test cross-course `assignAssetToAnchor` is blocked |
| **PENTEST-026** | P1 | `tests/security/visual-asset-upload-rls.pentest.spec.ts` | Test that `confirmVisualAssetUpload` with a `fileKey` belonging to tenant B returns error when called by tenant A's auth context. Test that DB insert for `visual_assets` uses tenant A's `tenantId` regardless of crafted `courseId` |
| **PENTEST-027** | P2 | `tests/security/svg-upload-storage.pentest.spec.ts` | Upload an SVG with embedded `<script>alert(1)</script>`; verify the stored MinIO content does NOT contain the script tag (requires server-side sanitization — currently absent; this test will fail until VULN-005 is fixed) |
| **PENTEST-028** | P2 | `tests/security/clamav-infected-path.pentest.spec.ts` | Replace the placeholder in `clamav-upload.spec.ts:61` with a proper mock-based test: mock `ClamavService.scanBuffer` → `isInfected: true`; call `runVisualAssetUploadPipeline`; assert `BadRequestException` thrown with message `'Malicious file detected. Upload rejected.'`; assert `DeleteObjectCommand` called on quarantine key |
| **PENTEST-029** | P2 | `tests/security/visual-anchor-zipbomb.pentest.spec.ts` | Craft a buffer where `buffer.length > declaredSize * 3 AND buffer.length > 5MB`; verify `BadRequestException` is thrown. Also test edge case: 15MB declared + 44MB actual passes through (documenting current behavior for future fix) |

---

## Additional Recommendations

1. **Rate limiting on `confirmVisualAssetUpload`** — This mutation triggers ClamAV scan + sharp conversion, both CPU-intensive. Add per-tenant rate limiting (e.g., 10 uploads/minute) at the gateway level to prevent DoS via scan queue flooding.

2. **Audit log for rejected uploads** — VULN-001 fix aside, infected upload rejections should write a durable audit record to `audit_log` table (not just Pino log) so compliance teams can review upload rejection history.

3. **`useOfflineAnchors` TTL** — The `cachedAt` field is stored but never checked on read. Add an expiry check in `loadCachedAnchors`: reject records older than 24 hours.

4. **`ai_suggestions` JSONB consent gate** — The column exists and is `null` today. Before any LLM-based anchor suggestion feature is built, add SI-10 consent check (check `THIRD_PARTY_LLM` consent flag) as a guard in `DocumentVersionService.createVersion()`. Add this as a TODO comment in the code.

5. **`file-type` ESM fallback** — When `file-type` is unavailable (line 69–73 in `image-optimizer.service.ts`), the service falls back to accepting the caller-declared MIME. This fallback path returns `'application/octet-stream'` which does NOT appear in `ALLOWED_MIME_TYPES`. Verify the caller validates `declaredMimeType` against the allow-list before calling `verifyMagicBytes`, or reject when `file-type` is unavailable.

---

## Sign-off

**Division 8 — Security & Compliance:** CONDITIONAL APPROVAL

**Conditions for production release:**
1. 🔴 **VULN-001 (HIGH) must be fixed before merge:** Replace bare `connect({ servers: natsUrl })` in `visual-anchor.service.ts:publishNats()` with authenticated + TLS NATS connection using `@edusphere/nats-client` shared wrapper.
2. 🟡 **VULN-002 must be fixed before merge:** Add `@requiresRole(roles: [INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN])` to `syncAnchors` and `rollbackToVersion` SDL entries.
3. 🟡 **VULN-003 must be fixed before merge:** Add cross-course ownership check in `assignAssetToAnchor`.
4. 🟡 **VULN-008 must be fixed before merge:** Wrap `db.insert(schema.visualAssets)` in `visual-asset-upload.helper.ts` with `withTenantContext()`.
5. PENTEST-024 through PENTEST-026 must pass before production deploy.

**Items that may be addressed post-merge (next sprint):**
- VULN-004 (IndexedDB TTL)
- VULN-005 (server-side SVG sanitization)
- VULN-006 (clamav placeholder test)
- VULN-007 (ZIP bomb absolute ceiling)
- VULN-009 (anchor_text PII classification review)
- PENTEST-027 through PENTEST-029

---

*Report generated: 2026-03-08 | Next audit: Phase 30 or upon upload pipeline changes*
