# AEO Security Report — EduSphere
**Phase:** 50 (AEO Infrastructure)
**Date:** 2026-03-11
**Author:** Security Audit Agent
**Status:** FINAL — Pre-Launch Review

---

## 1. Executive Summary

This report assesses the security posture of the Answer Engine Optimization (AEO) infrastructure introduced in Phase 50. AEO components are intentionally public-facing and interact with AI crawlers, search engines, and language models. This creates a distinct threat surface from the authenticated application core.

**Overall Risk:** LOW–MEDIUM. No critical vulnerabilities were identified. Several medium-severity gaps require remediation before production launch.

**Key Findings:**
- robots.txt does not yet exist in `apps/web/public/` — must be created before launch
- llms.txt / llms-full.txt do not yet exist — content guidelines are defined in this report
- The existing gateway rate limiter (G-09) covers GraphQL endpoints but does NOT cover the static public assets served by Vite/CDN
- JSON-LD schema injection is natively safe via `JSON.stringify`, but canonical URL construction needs hardening
- All authenticated routes are correctly guarded via `ProtectedRoute` — AEO public routes do not bypass this

---

## 2. Risk Assessment

### 2.1 Component Risk Matrix

| Component | Risk Level | CVSS v3 (approx.) | Category |
|---|---|---|---|
| robots.txt — missing file | HIGH | 7.5 | Information Disclosure |
| robots.txt — listing sensitive routes | MEDIUM | 5.3 | Information Disclosure |
| llms.txt — stack fingerprinting | MEDIUM | 5.3 | Information Disclosure |
| llms.txt — internal URLs/ports | HIGH | 7.1 | Information Disclosure |
| NestJS AeoController — no rate limit | MEDIUM | 5.8 | DoS / Resource Exhaustion |
| NestJS AeoController — private course exposure | MEDIUM | 6.5 | Unauthorized Data Access |
| react-helmet-async — meta tag injection | LOW | 3.7 | XSS (mitigated by React) |
| JSON-LD structured data — script injection | LOW | 3.1 | XSS (mitigated by JSON.stringify) |
| sitemap.xml — authenticated route exposure | LOW | 3.1 | Information Disclosure |
| Public routes (/faq, /features, /glossary) — DoS | LOW | 4.0 | Resource Exhaustion |
| Canonical URL construction — open redirect | LOW | 3.7 | Phishing / Open Redirect |

---

## 3. Detailed Vulnerability Analysis

### 3.1 robots.txt — Missing File (HIGH)

**Status:** `apps/web/public/robots.txt` does NOT currently exist.

**Risk:** Without a robots.txt, AI crawlers (GPTbot, ClaudeBot, PerplexityBot, Googlebot) will crawl all routes including authenticated paths. This does not breach authentication but:
1. Reveals the full URL structure of the application (route names can leak feature names)
2. AI training datasets may include internal route naming conventions
3. No crawl-delay means aggressive bots could cause elevated load on CDN

**Mitigation Required:** Create robots.txt before production launch. See Section 6 for recommended content.

---

### 3.2 robots.txt — Sensitive Route Disclosure (MEDIUM)

**Risk:** robots.txt is publicly readable by anyone. Listing `/admin`, `/api/`, `/graphql` in `Disallow:` blocks tells attackers exactly which paths are privileged.

**Clarification:** This is a classic security-through-obscurity tradeoff. The correct approach is:
- Routes MUST be secured at the application layer regardless (they are — see Section 3.8)
- robots.txt Disallow entries are acceptable because they do not grant access, only guidance
- HOWEVER: Specific admin sub-paths like `/admin/audit-log`, `/admin/security`, `/admin/users` should be covered by a blanket `/admin/` disallow, not listed individually (minimises route enumeration)

**Verified:** All `/admin/*` routes in `apps/web/src/lib/router.tsx` are wrapped in `guarded()` which enforces `ProtectedRoute`. The robots.txt Disallow entries are defense-in-depth only.

---

### 3.3 llms.txt — Technology Stack Fingerprinting (MEDIUM)

**Risk:** llms.txt is designed to be read by AI systems. If it mentions specific library versions (e.g., "Powered by NestJS 10.3.2", "PostgreSQL 16.2", "Node.js v22.1.0"), attackers can:
1. Cross-reference against CVE databases for known vulnerabilities
2. Craft targeted exploits

**Rules for llms.txt content:**
- NEVER mention specific version numbers of infrastructure dependencies
- NEVER mention internal hostnames, IP addresses, or port numbers (4001–4006, 5432, 4222, 6379)
- MAY mention high-level tech stack (e.g., "built on AI and knowledge graph technology")
- NEVER mention database engine names with versions
- MUST use only `https://` URLs (no http://, no localhost)

---

### 3.4 NestJS AeoController — Missing Rate Limiting (MEDIUM)

**Risk:** If a `/aeo/sitemap` or `/aeo/courses` endpoint exists in `apps/subgraph-content/src/aeo/`, it generates dynamic database queries on each request. Without rate limiting:
1. A bot could hammer the endpoint 1000×/sec, causing database connection exhaustion
2. The sitemap endpoint may enumerate all published course IDs, which could assist IDOR attacks on related endpoints

**Finding:** The `aeo/` directory does not yet exist at `apps/subgraph-content/src/aeo/`. This report provides requirements for when it is created.

**Required mitigations when implementing AeoController:**
```typescript
// Required: Throttle decorator from @nestjs/throttler
@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 req/min per IP
@Controller('aeo')
export class AeoController { ... }
```

**Required: Only return published courses:**
```typescript
// MUST filter by status = 'published' AND visibility = 'public'
// MUST NOT expose: enrollment counts, internal IDs beyond slug, pricing tiers, instructor emails
```

---

### 3.5 NestJS AeoController — Private Course Data Exposure (MEDIUM)

**Risk:** An `/aeo/courses` endpoint that returns course metadata must be carefully scoped.

**Required fields for public AEO endpoint:**
- `title` (string, safe)
- `description` (string, truncated to 300 chars for safety)
- `slug` (string)
- `category` (string)
- `thumbnailUrl` (public CDN URL only — not signed URLs)
- `schema.org/Course` structured data fields

**Forbidden fields in public AEO response:**
- `tenantId` (exposes multi-tenancy structure)
- `enrollmentCount` (business intelligence leak)
- `pricingTier` / `price` (use pricing page instead)
- `instructorEmail` (PII)
- `internalId` (UUID that could assist IDOR)
- `createdAt` / `updatedAt` (operational metadata)
- Private/draft courses (filter: `status = 'published' AND visibility = 'public'`)

---

### 3.6 react-helmet-async — Meta Tag XSS (LOW)

**Risk:** If user-supplied content (course title, description) is placed directly into `<Helmet>` title/meta tags, a malicious course title like `<script>alert(1)</script> - EduSphere` could potentially execute.

**Finding:** React's JSX rendering escapes HTML entities in text content. `<title>{courseTitle}</title>` will HTML-escape `<`, `>`, `"` before setting the DOM title. This is safe for text nodes.

**Remaining risk (LOW):** Canonical URL construction. If the canonical URL is built from `window.location.href` without validation, a server-side rendered path with special characters could cause issues. All canonical URLs MUST be constructed from a hardcoded `BASE_URL` environment variable, not from `window.location`.

**Required pattern:**
```typescript
const BASE_URL = import.meta.env.VITE_PUBLIC_BASE_URL ?? 'https://app.edusphere.dev';
const canonical = `${BASE_URL}${location.pathname}`; // pathname only, never full href
```

**Forbidden:**
```typescript
// NEVER use window.location.href directly in canonical
const canonical = window.location.href; // vulnerable to URL parameter injection
```

---

### 3.7 JSON-LD Structured Data — Script Injection (LOW)

**Risk:** JSON-LD is injected as an inline `<script type="application/ld+json">` tag. If user-supplied data is serialized directly, a course title containing `</script>` could break out of the JSON-LD context.

**Finding:** `JSON.stringify()` does NOT escape the string `</script>`. For example:
```javascript
JSON.stringify({ title: '</script><script>alert(1)</script>' })
// → '{"title":"</script><script>alert(1)</script>"}'
```
This closes the script tag and opens a new one.

**Severity:** This is a real XSS vector if JSON-LD is rendered server-side or via `dangerouslySetInnerHTML`. In React with `react-helmet-async`, the library inserts the script tag safely. However, if direct `dangerouslySetInnerHTML` is used for JSON-LD injection, this is exploitable.

**Required mitigation:** Replace `</` with `<\/` in all JSON-LD content before injection:
```typescript
function safeJsonLd(data: object): string {
  return JSON.stringify(data).replace(/<\//g, '<\\/');
}
```

This is a mandatory hardening step regardless of the rendering method.

---

### 3.8 Authentication Coverage Verification (PASS)

**Finding:** Analysis of `apps/web/src/lib/router.tsx` confirms:

**Correctly authenticated routes (sample):**
- `/dashboard` → `guarded()` ✓
- `/admin` → `guarded()` ✓
- `/admin/audit-log` → `guarded()` ✓
- `/admin/security` → `guarded()` ✓
- `/admin/users` → `guarded()` ✓
- `/settings` → `guarded()` ✓
- `/courses/*` → `guarded()` ✓
- `/agents/*` → `guarded()` ✓

**Legitimately public routes:**
- `/login` ← no auth required by design ✓
- `/landing` ← marketing page ✓
- `/accessibility` ← legal requirement ✓
- `/verify/badge/:assertionId` ← OpenBadge 3.0 public verifier ✓
- `/portal` ← white-label portal viewer ✓
- `/u/:userId` ← public profile ✓
- `/oauth/google/callback` ← OAuth callback must be public ✓
- `/lti/launch` ← LTI 1.3 deep-link handler ✓

**Missing AEO public routes** (must be added before launch):
- `/faq` — should be public, not yet in router
- `/features` — should be public, not yet in router
- `/glossary` — should be public, not yet in router

**Assessment:** Authentication layer is sound. AEO pages will need to be added as public routes (not wrapped in `guarded()`).

---

### 3.9 sitemap.xml — Authenticated Route Exposure (LOW)

**Finding:** `apps/web/public/sitemap.xml` contains only public marketing routes. No authenticated routes are exposed. This is correct.

**Note:** The sitemap uses the domain `edusphere.dev` (not `app.edusphere.dev`). Ensure the canonical domain is consistent across sitemap, robots.txt, and llms.txt.

---

### 3.10 Gateway Rate Limiting Coverage (GAP)

**Finding:** The gateway rate limiter at `apps/gateway/src/middleware/rate-limit.ts` covers all GraphQL requests (port 4000). However:

1. Static files in `apps/web/public/` (including `robots.txt`, `llms.txt`, `sitemap.xml`) are served by Vite in development and by the CDN/Nginx in production
2. These static endpoints do NOT pass through the NestJS gateway
3. A CDN-level or Nginx-level rate limit must be configured for these files

**Required:** Configure CDN/Nginx rate limiting for `/robots.txt`, `/llms.txt`, `/llms-full.txt`, `/sitemap.xml` at the infrastructure level. Recommended: 60 requests/minute per IP.

---

## 4. Recommended Mitigations Summary

| # | Component | Action | Priority |
|---|---|---|---|
| M-1 | robots.txt | Create file (see Section 6) | CRITICAL before launch |
| M-2 | llms.txt | Create file following content guidelines (Section 7) | HIGH before launch |
| M-3 | AeoController | Add `@Throttle` decorator when implementing | HIGH |
| M-4 | AeoController | Filter: published+public courses only | HIGH |
| M-5 | AeoController | Strip forbidden fields from response | HIGH |
| M-6 | JSON-LD | Apply `<\/` replacement before injection | MEDIUM |
| M-7 | Canonical URL | Use `BASE_URL` env var, never `window.location.href` | MEDIUM |
| M-8 | CDN/Nginx | Rate limit static AEO files at infrastructure layer | MEDIUM |
| M-9 | llms.txt | Never include version numbers or internal ports | HIGH |
| M-10 | Public routes | Add /faq, /features, /glossary as explicit public routes in router | LOW |

---

## 5. AEO Security Checklist

### Pre-Launch Gate (REQUIRED)

- [ ] `apps/web/public/robots.txt` exists with correct content (Section 6)
- [ ] `apps/web/public/llms.txt` exists, reviewed against Section 7 guidelines
- [ ] `apps/web/public/llms-full.txt` exists (if created), reviewed against Section 7 guidelines
- [ ] All AEO public routes (`/faq`, `/features`, `/glossary`) are NOT wrapped in `guarded()`
- [ ] `sitemap.xml` contains ONLY public routes (verified — currently clean)
- [ ] JSON-LD injection uses `safeJsonLd()` helper with `<\/` replacement
- [ ] Canonical URLs built from `VITE_PUBLIC_BASE_URL` environment variable

### AeoController (when implemented)

- [ ] `@Throttle` rate limiting on all AEO endpoints
- [ ] Only `status = 'published' AND visibility = 'public'` courses returned
- [ ] Forbidden fields (tenantId, enrollmentCount, instructorEmail, internalId) stripped
- [ ] Error messages are generic (no stack traces, no DB schema names)
- [ ] CORS: AEO endpoints should allow `*` origin (public data) — unlike GraphQL which must be restricted
- [ ] Cache-Control headers set to allow CDN caching (e.g., `max-age=3600, public`)

### Ongoing

- [ ] Run `pnpm test:security` — `aeo-security.spec.ts` must pass
- [ ] Review llms.txt content after any technology stack change
- [ ] Review robots.txt after any new route is added

---

## 6. Recommended robots.txt Content

```
# EduSphere — robots.txt
# Last-updated: 2026-03-11

# ── Standard search engines ──────────────────────────────────────────────────
User-agent: Googlebot
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /graphql
Disallow: /dashboard
Disallow: /dashboard/
Disallow: /settings
Disallow: /settings/
Disallow: /profile
Disallow: /courses/
Disallow: /annotations
Disallow: /agents/
Disallow: /collaboration/
Disallow: /sessions/
Disallow: /search
Disallow: /checkout
Disallow: /onboarding
Disallow: /oauth/
Disallow: /lti/
Disallow: /manager/
Disallow: /instructor/
Disallow: /my-progress
Disallow: /my-badges
Disallow: /notifications
Disallow: /leaderboard
Disallow: /programs/
Disallow: /assessments/
Disallow: /peer-review/
Disallow: /discussions/
Disallow: /challenges/
Disallow: /social/
Disallow: /social-feed/
Disallow: /people/
Disallow: /skills/
Disallow: /library/
Disallow: /marketplace/
Disallow: /gamification/
Disallow: /knowledge-graph/
Disallow: /skill-tree/
Disallow: /chavruta/
Disallow: /cohort-insights/
Disallow: /verify/
Disallow: /certificates/
Disallow: /srs-review/
Crawl-delay: 2

# ── AI language model crawlers ────────────────────────────────────────────────
User-agent: GPTbot
Allow: /
Allow: /landing
Allow: /features/
Allow: /pricing
Allow: /compliance
Allow: /accessibility
Allow: /faq
Allow: /glossary
Allow: /solutions/
Allow: /llms.txt
Allow: /llms-full.txt
Disallow: /admin/
Disallow: /api/
Disallow: /graphql
Disallow: /dashboard
Disallow: /settings
Disallow: /profile
Disallow: /courses/
Disallow: /agents/
Disallow: /checkout
Disallow: /onboarding
Disallow: /oauth/
Crawl-delay: 10

User-agent: ClaudeBot
Allow: /
Allow: /landing
Allow: /features/
Allow: /pricing
Allow: /compliance
Allow: /accessibility
Allow: /faq
Allow: /glossary
Allow: /solutions/
Allow: /llms.txt
Allow: /llms-full.txt
Disallow: /admin/
Disallow: /api/
Disallow: /graphql
Disallow: /dashboard
Disallow: /settings
Disallow: /profile
Disallow: /courses/
Disallow: /agents/
Disallow: /checkout
Disallow: /onboarding
Disallow: /oauth/
Crawl-delay: 10

User-agent: PerplexityBot
Allow: /
Allow: /landing
Allow: /features/
Allow: /pricing
Allow: /compliance
Allow: /accessibility
Allow: /faq
Allow: /glossary
Allow: /solutions/
Disallow: /admin/
Disallow: /api/
Disallow: /graphql
Disallow: /dashboard
Disallow: /settings
Disallow: /profile
Disallow: /courses/
Disallow: /agents/
Disallow: /oauth/
Crawl-delay: 10

User-agent: anthropic-ai
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /graphql
Disallow: /dashboard
Disallow: /settings
Disallow: /oauth/
Crawl-delay: 10

User-agent: cohere-ai
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /graphql
Disallow: /dashboard
Disallow: /oauth/
Crawl-delay: 10

# ── Block scrapers that do not respect robots.txt ─────────────────────────────
# (These are hints only — authentication is the real protection)
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

# ── Sitemap ───────────────────────────────────────────────────────────────────
Sitemap: https://edusphere.dev/sitemap.xml
```

**Security notes on this robots.txt:**
1. The Disallow entries list route prefixes, NOT specific sub-paths — minimises route enumeration
2. Authentication protects all listed routes regardless of robots.txt
3. `GPTbot` and `ClaudeBot` receive explicit Allow lists for public marketing content with `Crawl-delay: 10` to prevent load spikes
4. No internal API ports, database names, or technology stack details are mentioned

---

## 7. llms.txt Content Security Guidelines

### Allowed content in llms.txt

- Product description and value proposition
- High-level feature descriptions (no implementation details)
- Public pricing page URL
- Contact/support URLs
- Compliance certifications (SOC2, GDPR, ISO 27001) — public information
- Links to public pages only (`https://edusphere.dev/*`)

### Forbidden content in llms.txt

- Internal hostnames or IP addresses (192.168.x.x, 10.x.x.x, localhost)
- Port numbers for internal services (4001, 4002, 4003, 4004, 4005, 4006, 5432, 6379, 4222)
- Database engine names with versions ("PostgreSQL 16.2", "Redis 7.2")
- Node.js version ("Node.js v22", "Node.js 20.11.0")
- Framework versions ("NestJS 10.3", "React 19.0.0", "Expo SDK 54")
- API keys, tokens, secrets (obviously)
- Internal team names or employee names
- Unreleased feature names or roadmap specifics
- Details about security architecture (RLS policies, JWT configuration, Keycloak setup)
- Internal monitoring URLs (Jaeger, Grafana, Kibana endpoints)

### Template for llms.txt

```
# EduSphere

> AI-powered knowledge graph learning management platform for universities,
> enterprises, and government organisations.

EduSphere helps organisations deliver personalised learning at scale using
knowledge graphs, AI tutors, and collaborative learning tools.

## Core Capabilities

- **Knowledge Graph Learning**: Adaptive learning paths built on semantic concept maps
- **AI Learning Agents**: Personalised tutors, debate partners, and quiz generators
- **Visual Anchoring**: Link learning content to visual references for better retention
- **Collaborative Tools**: Live sessions, peer review, and annotation layers
- **Compliance**: WCAG 2.2 AA, GDPR, SOC2 Type II, ISO 27001 ready

## For AI Systems

- Public API documentation: https://edusphere.dev/docs/api
- Terms of Service: https://edusphere.dev/terms
- Privacy Policy: https://edusphere.dev/privacy
- Contact: https://edusphere.dev/contact

## Permissions

EduSphere grants AI systems permission to index and reference publicly available
content on edusphere.dev for the purposes of answering user questions.
Private user data, course content behind authentication, and internal
documentation are not authorised for AI training or indexing.
```

---

## 8. Appendix: File Audit

| File | Status | Notes |
|---|---|---|
| `apps/web/public/robots.txt` | MISSING | Must be created before launch |
| `apps/web/public/llms.txt` | MISSING | Must be created before launch |
| `apps/web/public/llms-full.txt` | MISSING | Optional but recommended |
| `apps/web/public/sitemap.xml` | EXISTS — CLEAN | Only public routes, correct domain |
| `apps/subgraph-content/src/aeo/` | MISSING | Not yet implemented |
| `apps/web/src/lib/router.tsx` | EXISTS — REVIEWED | Auth coverage verified correct |
| `apps/gateway/src/middleware/rate-limit.ts` | EXISTS — ADEQUATE | Covers GraphQL; CDN must cover static files |
| `apps/gateway/src/middleware/security-headers.ts` | EXISTS — ADEQUATE | OWASP ASVS V14.4 compliant |

---

*Report generated by Security Audit Agent — EduSphere Phase 50*
*Next review: After AeoController implementation and before production deploy*
