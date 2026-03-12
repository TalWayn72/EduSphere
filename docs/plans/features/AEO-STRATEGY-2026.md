# AEO Strategy 2026 — Answer Engine Optimization for EduSphere

**Version:** 1.0
**Date:** 2026-03-11
**Phase:** Phase 1 Complete
**Owner:** DevOps / Product

---

## 1. Executive Summary

Answer Engine Optimization (AEO) is the practice of structuring content so that AI-powered search engines (ChatGPT, Perplexity, Google AI Overviews, Claude, Bing Copilot) surface your content in direct answers rather than just as links.

**Why this matters for EduSphere:**
- AI Overviews now appear in 52% of Google searches (2025 data)
- ChatGPT/Perplexity do not execute JavaScript — a React SPA is invisible to them
- Competitors (Coursera, Khan Academy) already have structured data and static content
- B2B buyers increasingly research LMS platforms via AI chat before contacting vendors

**Phase 1 ROI:** Implementing robots.txt, llms.txt, JSON-LD schema, and public static pages costs ~2 engineering days but can capture 15-30% of AI-mediated discovery traffic.

---

## 2. Current State Analysis — Gaps Found

### 2.1 JavaScript Rendering Crisis (Critical)

**Problem:** GPTbot (OpenAI), ClaudeBot (Anthropic), and PerplexityBot do NOT execute JavaScript. EduSphere is a React SPA — when these bots crawl `https://edusphere.dev`, they see an empty `<div id="root"></div>`.

**Impact:** Zero AI-mediated discovery for all content behind the React router.

**Evidence from competitor analysis:**
- Coursera serves pre-rendered HTML for all public course pages
- Khan Academy uses Next.js SSR for all content
- Udemy has a static HTML fallback for crawlers
- EduSphere: React SPA with no SSR/pre-rendering = invisible to AI bots

### 2.2 No Structured Data (High)

**Problem:** Before Phase 1, EduSphere had no Schema.org markup. AI engines prefer sites with explicit semantic structure.

**Schema types missing:**
- `FAQPage` — most impactful for AI Overviews
- `SoftwareApplication` — essential for LMS comparison queries
- `DefinedTermSet` — ideal for EdTech glossaries
- `HowTo` — captures "how to use [feature]" queries
- `BreadcrumbList` — helps AI understand site structure
- `Organization` / `EducationalOrganization` — establishes entity identity

### 2.3 No AI Bot Guidance (Medium)

**Problem:** No `robots.txt` with AI bot rules, no `llms.txt` file for LLM guidance.

**Impact:** AI systems had no structured way to understand EduSphere's purpose, capabilities, or content.

### 2.4 No Public Static Pages (High)

**Problem:** All content was behind authentication. AI systems couldn't access any product information.

**Impact:** Queries like "what is EduSphere", "EduSphere features", "EduSphere glossary" returned no results.

---

## 3. What Was Implemented (Phase 1)

### 3.1 Infrastructure Files

| File | Purpose |
|------|---------|
| `apps/web/public/robots.txt` | Allows GPTbot, ClaudeBot, PerplexityBot, Googlebot-Image; blocks sensitive paths |
| `apps/web/public/llms.txt` | Short LLM guidance (43 lines) — product summary, key features, API info |
| `apps/web/public/llms-full.txt` | Full LLM guidance (124 lines) — pricing, compliance, use cases, API docs |

### 3.2 SEO/AEO React Components

| Component | Schema Type | File |
|-----------|-------------|------|
| `OrganizationSchema` | `EducationalOrganization` | `src/components/seo/OrganizationSchema.tsx` |
| `WebSiteSchema` | `WebSite` + `SearchAction` | `src/components/seo/WebSiteSchema.tsx` |
| `FAQSchema` | `FAQPage` | `src/components/seo/FAQSchema.tsx` |
| `BreadcrumbSchema` | `BreadcrumbList` | `src/components/seo/BreadcrumbSchema.tsx` |
| `SoftwareApplicationSchema` | `SoftwareApplication` | `src/components/seo/SoftwareApplicationSchema.tsx` |
| `PageMeta` | Helmet meta tags | `src/components/seo/PageMeta.tsx` |

All components use `react-helmet-async` for proper SSR-compatible head management.

### 3.3 New Public Pages

| Page | Route | Schema | Content |
|------|-------|--------|---------|
| FaqPage | `/faq` | FAQPage (20 Q&As) | Covers pricing, features, security, compliance, integrations |
| FeaturesPage | `/features` | HowTo × 3, SoftwareApplication, Breadcrumb | Feature overview with step-by-step guides |
| GlossaryPage | `/glossary` | DefinedTermSet (20 terms) | EdTech terminology A-Z with category filters |

### 3.4 Backend AEO API (NestJS AeoModule)

| Endpoint | Purpose |
|----------|---------|
| `GET /aeo/sitemap.xml` | Dynamic XML sitemap (home, faq, features, glossary + course pages) |
| `GET /aeo/courses` | JSON list of public course metadata for AI indexing |
| `GET /aeo/features` | Machine-readable feature list |
| `GET /aeo/faq` | Machine-readable FAQ data |

Files: `apps/subgraph-content/src/aeo/`

### 3.5 Security: safeJsonLd Helper

**Problem:** `JSON.stringify()` does NOT escape `</script>` inside JSON-LD `<script>` tags. A malicious user content string like `"</script><script>alert('xss')</script>"` could break out of the script tag and execute.

**Fix:** `apps/web/src/lib/safe-json-ld.ts` — replaces all `</` with `<\/` (valid JSON, safe HTML).

**Applied to:** All 5 SEO schema components + GlossaryPage + FeaturesPage.

**Test coverage:** `apps/web/src/lib/safe-json-ld.test.ts` (5 tests covering XSS injection, nested objects, arrays, round-trip JSON validity).

### 3.6 index.html Static JSON-LD

Added a `SoftwareApplication` JSON-LD block directly in `index.html` for the home page — this is visible even to bots that don't execute JavaScript (static HTML parsing still works).

---

## 4. What Remains (Phase 2 — Future Roadmap)

### 4.1 Pre-rendering / SSR (Critical — Phase 2 Priority 1)

**Problem:** React SPA = invisible to AI bots that don't execute JS.

**Solutions (ranked by effort vs impact):**

| Solution | Effort | Impact | Recommendation |
|----------|--------|--------|---------------|
| Vite SSG (vite-plugin-ssg) | Low-Medium | High for static pages | Recommended for public pages |
| Next.js migration | High | Very High | Long-term ideal |
| Prerender.io / Rendertron proxy | Low | Medium | Quick win for crawlers |
| Cloudflare Workers pre-render | Medium | High | Best for edge performance |

**Recommended approach:** Use `vite-plugin-ssg` to pre-render `/faq`, `/features`, `/glossary`, and `/` into static HTML at build time. Authenticated routes remain SPA.

### 4.2 Course Schema on Individual Pages (High)

Add `Course` schema (Schema.org) to individual course pages:
```json
{
  "@type": "Course",
  "name": "Course Title",
  "description": "...",
  "provider": { "@type": "EducationalOrganization", "name": "EduSphere" },
  "hasCourseInstance": { "courseMode": "online" }
}
```

Requires: public course catalog (currently requires auth).

### 4.3 Blog / Original Research Content (Medium)

AI systems cite original research heavily. Create:
- Weekly EdTech trend posts
- Original research (e.g., "Learning Graph Retention Study")
- Comparison guides ("EduSphere vs Canvas: 2026 LMS Comparison")

### 4.4 Instructor Public Profiles (Medium)

Add `Person` schema for instructors with `teachesCoursework` and credentials. Enables "find AI tutor for X" queries.

### 4.5 Dynamic OG Images (Low Priority)

Generate per-course Open Graph images using Satori or similar. Improves social sharing and AI-mediated content previews.

### 4.6 Structured Data Validation CI (Medium)

Add CI step to validate all JSON-LD against Schema.org spec using `schema-dts` or Google's Structured Data Testing Tool API.

---

## 5. Priority Matrix

| Item | Impact | Effort | Phase |
|------|--------|--------|-------|
| Pre-rendering public pages | Very High | Medium | Phase 2 |
| Course schema (public catalog) | High | High | Phase 3 |
| Blog with original research | High | High | Phase 3 |
| Instructor public profiles | Medium | Medium | Phase 3 |
| Dynamic OG images | Low | Low | Phase 4 |
| Schema validation in CI | Medium | Low | Phase 2 |

---

## 6. Success Metrics / KPIs

### Immediate (Phase 1 — 30 days)
- [ ] Google Search Console: structured data errors = 0
- [ ] Rich Results Test: FAQPage detected on `/faq`
- [ ] `robots.txt` accessible at `https://edusphere.dev/robots.txt`
- [ ] `llms.txt` accessible at `https://edusphere.dev/llms.txt`

### Short-term (Phase 2 — 90 days)
- [ ] ChatGPT correctly answers "What is EduSphere?" with accurate product info
- [ ] Perplexity citations EduSphere in LMS comparison queries
- [ ] Google AI Overview appears for "EduSphere features" query
- [ ] Organic traffic to `/faq`, `/features`, `/glossary` = 100+ sessions/month

### Medium-term (Phase 3 — 6 months)
- [ ] AI-mediated discovery contributes 15% of trial sign-ups
- [ ] EduSphere appears in AI-generated LMS comparison lists
- [ ] 5+ external citations from AI systems in LMS queries

### Long-term (Phase 4 — 12 months)
- [ ] AI Overviews inclusion rate for "enterprise LMS" queries
- [ ] Perplexity source rank for "university LMS with knowledge graph"
- [ ] Brand awareness: "EduSphere" recognized by major AI systems without disambiguation

---

## 7. Technical Debt Created

| Debt | Description | Fix In |
|------|-------------|--------|
| No SSR/pre-rendering | AI bots can't see SPA routes | Phase 2 |
| `react-helmet-async` not in SSR context | Will need adapter for SSG | Phase 2 |
| `index.html` static JSON-LD vs PageMeta duplication | Both exist; need reconciliation after SSR | Phase 2 |
| AeoModule in subgraph-content | Sitemap belongs in gateway or dedicated service | Phase 3 |

---

## 8. References

- [Google Search Central — Structured Data](https://developers.google.com/search/docs/appearance/structured-data)
- [Schema.org — Course](https://schema.org/Course)
- [llms.txt specification](https://llmstxt.org)
- [OWASP JSON-LD XSS](https://owasp.org/www-community/attacks/xss/)
- [AI Overviews — Search Central Blog 2025](https://developers.google.com/search/blog)
