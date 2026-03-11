# EduSphere — B2B Go-to-Market & Platform Completion Plan (v2.0 — Full Strategic)
**Plan File:** `harmonic-herding-hopper.md`
**Target Location After Approval:** `docs/plans/features/B2B-GTM-PLATFORM-COMPLETION-v2.md`
**Date:** 2026-03-11
**Scope:** Landing B2B + YAU + Subscriptions + AI Course Gen + Visual Anchoring + Air-Gapped + B2B2C + SEO + Compliance + ROI Analytics + HRIS + Sales Enablement

---

## Executive Summary

EduSphere completes its transition from B2C freemium to **B2B White-Label SaaS + B2B2C** sold to universities, colleges, corporate training organizations, and defense/intelligence agencies. The platform is differentiated by:

1. **GraphRAG native** — multi-hop reasoning, 45–71% fewer hallucinations, full auditability
2. **Visual Anchoring Sidebar** (PRD 1.6) — auto-semantic anchors on images/diagrams, 60fps, offline-first
3. **Air-Gapped / On-Premise** — zero external dependencies, static model, local context, end-to-end audit trail (critical for defense market)
4. **AI Chavruta Tutor** — Socratic dialectical partner, unique in the LMS market
5. **AI Course Builder** — full course (modules + lessons + quizzes) in 10 minutes from a prompt
6. **B2B2C Partner Portal** — white-label API for training companies (Duffel-style, Revenue Share 30%)

### TAM (2026 research)
| Market | 2026 Size | 2030–2035 Projection | CAGR |
|--------|-----------|---------------------|------|
| Global LMS | $31.6B | $104–123B (2034) | 16–20.6% |
| Higher-Ed KM | $22.9B | $81.9B (2035) | 13.6% |
| AI-Driven KM | $9.6B | $237.8B (2034) | 43.7% |
| Knowledge Graph | $1.9B | $6.9–8.9B (2032) | 28.9–36.6% |
| Global Defense | $506.9B | $739B (2030) | — |

### ROI Evidence
- GraphRAG: 45–71% fewer hallucinations → auditable AI for regulated industries
- Visual Anchoring: +30% knowledge retention in visual-heavy subjects
- AI Course Builder: saves 60% instructor time on course creation
- Student retention: +4–25% with AI-personalized learning paths
- Knowledge loss prevention: organizations lose up to **25% of revenue** to undocumented knowledge — EduSphere's KG captures it

---

## Current State (Codebase Audit — 2026-03-11)

| Component | Status | Details |
|-----------|--------|---------|
| Landing Page | ⚠️ B2C only | Free/Pro/Enterprise consumer tiers — needs full B2B rewrite |
| Visual Anchoring | ✅ Phase 29 built | Backend + DB + sidebar complete; NOT marketed on landing page |
| Billing tables | ⚠️ Partial | `marketplace.ts` exists; NO subscription lifecycle, NO Stripe webhooks |
| YAU counting | ❌ Proxy only | Uses `updated_at` — not a real YAU mechanism |
| Admin panels | ✅ Exists | SUPER_ADMIN + ORG_ADMIN, but no billing/usage dashboards |
| AI Course Gen | ⚠️ Backend only | `course-generator.service.ts` 100% ready; frontend NOT wired |
| Quiz Gen | ✅ Backend | `quiz.workflow.ts` complete; UI exists but no "generate from content" button |
| SEO | ❌ Minimal | No OG tags, no sitemap, no structured data |
| Air-Gapped | ❌ Not started | No on-prem packaging, no local model support documented |
| B2B2C Portal | ❌ Not started | No partner API, no revenue share mechanism |
| Pilot flow | ❌ Not started | No pilot signup page, no approval workflow |

---

## 12 Work Areas

### Area 1 — Landing Page B2B Transformation (Full Rewrite)

**Goal:** Replace all consumer messaging. Beat Canvas, D2L, Blackboard, Docebo on every section. Prominently display all compliance credentials. Position EduSphere as the only LMS with GraphRAG + Visual Anchoring + Air-Gapped.

#### 12-Section Architecture (LandingPage.tsx — full rewrite)

| # | Section | Key Content |
|---|---------|-------------|
| 1 | **HeroSection** | "The AI-Native LMS That Replaces Canvas — Without the Price Tag" · "Knowledge Graph intelligence. Visual Anchoring. Built-in AI Tutor. True white-label included. Starting at $12,000/year." · CTAs: [Request Demo] [Start 90-Day Pilot] |
| 2 | **TrustBar** | Logo row placeholder · 5 inline compliance mini-badges · "Trusted by universities, enterprises & defense agencies" |
| 3 | **ComplianceBadgesSection** | Large proud grid: FERPA ✓ WCAG 2.1 AA ✓ SCORM 2004 ✓ LTI 1.3 ✓ xAPI ✓ SAML 2.0 SSO ✓ SOC2 Type II (roadmap) ✓ GDPR ✓ **Air-Gapped Ready** ✓ |
| 4 | **VsCompetitorsSection** | Full comparison table — see below |
| 5 | **UniqueFeaturesSection** | 3 hero features with animated Remotion demos: (1) Knowledge Graph live explore, (2) Visual Anchoring sidebar demo, (3) AI Course Builder 10-min flow |
| 6 | **HowPilotWorksSection** | 3-step: Register → Pending Approval (24h) → Launch · "90 days free, no credit card, full feature access" |
| 7 | **AICourseBuildSection** | "Build a full course in 10 minutes" · animated flow: prompt text → AI generates outline → modules appear → quiz auto-generated → publish · instructor hours saved counter |
| 8 | **ROISection** | Interactive calculator (sliders: # instructors, hrs/week on creation, hourly rate, # students) → shows: hours saved/year, dollar value, % of EduSphere cost vs savings. Default assumption: 70% reduction in course creation time |
| 9 | **PricingSection** | 4 B2B tiers — see Area 3. White-label "Included" badge on all tiers (contrast vs Canvas) |
| 10 | **PilotCTASection** | Pilot signup form embedded · calendar scheduling widget (Calendly iframe) |
| 11 | **TestimonialsSection** | 3 cards — update copy to institutional voice ("As a department chair...", "Our IT procurement team...") |
| 12 | **LandingFooter** | Add: Privacy Policy, Terms, Accessibility Statement, FERPA Notice, Security, Air-Gapped Deployment |

#### Competitor Comparison Table (12+ features)

| Feature | EduSphere | Canvas | D2L Brightspace | Docebo | Blackboard |
|---------|-----------|--------|----------------|--------|-----------|
| Knowledge Graph + GraphRAG | ✅ Native multi-hop | ❌ | ❌ | ❌ | ❌ |
| Visual Anchoring Sidebar | ✅ Auto-semantic | ❌ | ❌ | ❌ | ❌ |
| Air-Gapped / On-Prem | ✅ All tiers | ❌ | ⚠️ Enterprise | ❌ | ❌ |
| AI Socratic Tutor (Chavruta) | ✅ Full dialog | ❌ | ❌ | ⚠️ Basic | ❌ |
| AI Course Builder (10 min) | ✅ Included | ❌ | ❌ | ❌ | ❌ |
| White-Label | ✅ **All tiers** | ⚠️ Enterprise | ⚠️ Enterprise | ⚠️ Enterprise | ⚠️ Enterprise |
| SCORM 2004 + xAPI | ✅ | ✅ | ✅ | ✅ | ✅ |
| LTI 1.3 | ✅ | ✅ | ✅ | ✅ | ✅ |
| FERPA Compliant | ✅ | ✅ | ✅ | ✅ | ✅ |
| WCAG 2.1 AA | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| GraphRAG Auditability | ✅ Full chain | ❌ | ❌ | ❌ | ❌ |
| B2B2C Partner API | ✅ Revenue Share | ❌ | ❌ | ❌ | ❌ |
| **Price for 5,000 YAU/year** | **$35,000** | $50K–100K | $100K–200K | $420K–600K | $80K–150K |
| 90-Day Free Pilot | ✅ Self-serve | ❌ | ❌ | ❌ | ❌ |

#### New Landing Components

| File | Purpose |
|------|---------|
| `apps/web/src/components/landing/VsCompetitorsTable.tsx` | Comparison table with column highlighting |
| `apps/web/src/components/landing/ComplianceBadges.tsx` | Badge grid (8 compliance certs) |
| `apps/web/src/components/landing/ROICalculator.tsx` | Interactive sliders → savings output |
| `apps/web/src/components/landing/PilotSteps.tsx` | 3-step visual explainer |
| `apps/web/src/components/landing/AirGappedBadge.tsx` | Air-Gapped Ready badge with tooltip |
| `apps/web/src/components/landing/GraphRAGDemo.tsx` | Animated KG traversal demo (Remotion or CSS) |
| `apps/web/src/components/landing/VisualAnchoringDemo.tsx` | Animated sidebar demo |

---

### Area 2 — Active User Tracking (YAU Dual System)

**Goal:** Accurate Yearly Active User counting. Two isolated views: platform-wide (SUPER_ADMIN) and tenant-only (ORG_ADMIN). Definition of "active": any user who performed at least one authenticated login in the current calendar year.

#### Database: Migration 0020

```sql
-- Proper activity columns on users table
ALTER TABLE users
  ADD COLUMN last_login_at TIMESTAMPTZ,
  ADD COLUMN last_activity_at TIMESTAMPTZ;

-- Session events table
CREATE TABLE user_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  logged_in_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logged_out_at   TIMESTAMPTZ,
  ip_address      INET,
  user_agent      TEXT,
  session_token_hash TEXT     -- SHA-256 of JWT jti
);

CREATE INDEX idx_user_sessions_tenant_year
  ON user_sessions (tenant_id, logged_in_at DESC);

CREATE INDEX idx_user_sessions_user_year
  ON user_sessions (user_id, logged_in_at DESC);

-- RLS: SUPER_ADMIN sees all; ORG_ADMIN sees own tenant
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_rls" ON user_sessions
  USING (
    current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'
    OR tenant_id::text = current_setting('app.current_tenant', TRUE)
  );

-- Extend existing tenant_analytics_snapshots
ALTER TABLE tenant_analytics_snapshots
  ADD COLUMN yearly_active_users  INTEGER  DEFAULT 0,
  ADD COLUMN seat_limit           INTEGER,
  ADD COLUMN seat_utilization_pct NUMERIC(5,2);
```

**Drizzle schema files:**
- `packages/db/src/schema/user-sessions.ts` — new table
- `packages/db/src/schema/users.ts` — add `lastLoginAt`, `lastActivityAt`
- `packages/db/src/schema/tenant-analytics-snapshots.ts` — extend with YAU columns

#### Backend Services (subgraph-core)

**`apps/subgraph-core/src/auth/session-tracker.service.ts`** (new, ~80 lines)
- `recordLogin(userId, tenantId, jwtJti, ip, userAgent)` → INSERT into `user_sessions` + UPDATE `users.last_login_at`
- `recordLogout(sessionTokenHash)` → UPDATE `logged_out_at`
- `recordActivity(userId, tenantId)` → UPDATE `users.last_activity_at` (called on every authenticated request, debounced 60s)
- Memory safety: `OnModuleDestroy` clears debounce timers

**`apps/subgraph-core/src/analytics/yau-counter.service.ts`** (new, ~100 lines)
- `getYAUForTenant(tenantId, year)`: `COUNT(DISTINCT user_id) FROM user_sessions WHERE tenant_id = $1 AND EXTRACT(YEAR FROM logged_in_at) = $2`
- `getYAUAllTenants(year)`: same grouped by `tenant_id` (SUPER_ADMIN, enforced by role in resolver)
- `getSeatUtilization(tenantId)`: YAU / seatLimit × 100
- `getDailySnapshot(tenantId)`: MAU (last 30 days) + YAU (current year) + peak concurrent (last 7 days)
- `@Cron('0 2 * * *')` daily: upsert into `tenant_analytics_snapshots`
- Memory safety: `OnModuleDestroy` stops cron handle

#### GraphQL SDL (subgraph-core)

```graphql
type TenantUsageStats {
  tenantId: ID!
  tenantName: String!
  plan: TenantPlan!
  yearlyActiveUsers: Int!
  monthlyActiveUsers: Int!
  seatLimit: Int!
  seatUtilizationPct: Float!
  overageUsers: Int!           # max(0, YAU - seatLimit)
  peakConcurrentLast7Days: Int!
}

extend type Query {
  platformUsageOverview(year: Int): [TenantUsageStats!]!
    @requiresRole(roles: [SUPER_ADMIN])

  myTenantUsage(year: Int): TenantUsageStats!
    @authenticated
}
```

#### Frontend: Platform Admin (SUPER_ADMIN)

**`apps/web/src/pages/PlatformUsageDashboardPage.tsx`** (new, route `/admin/platform-usage`)
- Table: Tenant | Plan | YAU | Seat Limit | Utilization % | Status (🟢<80% / 🟡 80–99% / 🔴≥100%)
- Recharts BarChart: top 10 tenants by utilization %
- Export CSV (download all rows as `.csv`)
- Link from AdminDashboardPage "Seat Utilization" stat card

#### Frontend: Org Admin (ORG_ADMIN)

**`apps/web/src/components/admin/UsageMeter.tsx`** (new, ~60 lines)
- Circular progress (SVG, no external lib): "342 / 500 YAU (68%)"
- Color: green < 80%, yellow 80–99%, red ≥ 100%
- Tooltip: "Yearly Active Users — any user who logged in at least once in 2026"

**`apps/web/src/pages/OrgUsagePage.tsx`** (new, route `/admin/usage`)
- Large number + UsageMeter (current YAU vs seat limit)
- Recharts LineChart: MAU last 12 months
- Table: top 20 most active users (name, role, last login, # sessions this year)
- Overage callout if applicable: "⚠️ You have 12 users over your 500-seat limit. Contact us to upgrade."

---

### Area 3 — B2B Subscription Management

**Goal:** Manage institutional subscription lifecycle (Pilot → Starter → Professional → Enterprise → Defense Custom). Enforce seat limits. No Stripe for institutional plans (sales-led, invoiced). Stripe remains for individual course marketplace (already built).

#### Database: Migration 0021

**`packages/db/src/schema/subscription-plans.ts`** (new)
```typescript
export const tenantPlanEnum = pgEnum('tenant_plan',
  ['PILOT', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE', 'DEFENSE', 'FREE']);

export const tenantSubscriptions = pgTable('tenant_subscriptions', {
  id:               uuid('id').primaryKey().defaultRandom(),
  tenantId:         uuid('tenant_id').notNull().references(() => tenants.id),
  plan:             tenantPlanEnum('plan').notNull(),
  seatLimit:        integer('seat_limit').notNull(),
  annualPriceUsd:   integer('annual_price_usd'),     // null = custom
  startsAt:         timestamp('starts_at').notNull(),
  expiresAt:        timestamp('expires_at'),          // null = auto-renew
  pilotExpiresAt:   timestamp('pilot_expires_at'),    // only for PILOT
  contractRef:      text('contract_ref'),             // invoice # for billing
  isAirGapped:      boolean('is_air_gapped').default(false),
  notes:            text('notes'),
  createdBy:        uuid('created_by').references(() => users.id),
  createdAt:        timestamp('created_at').defaultNow(),
});
```

#### Pricing Tiers

| Tier | Price | YAU Cap | Overage | White-Label | Air-Gapped |
|------|-------|---------|---------|-------------|-----------|
| **PILOT** | Free | 100 | Block | ✅ | No |
| **Starter** | $12,000/yr | 500 | $18/YAU | ✅ | No |
| **Professional** | $35,000/yr | 5,000 | $6/YAU | ✅ | No |
| **Enterprise** | Custom | Custom | Custom | ✅ | Optional |
| **Defense** | Custom (classified) | Custom | N/A | ✅ | ✅ Required |

#### Backend Service

**`apps/subgraph-core/src/subscription/subscription.service.ts`** (new, ~120 lines)
- `getActivePlan(tenantId)` → current plan + seat limit + expiry + isAirGapped
- `checkSeatLimit(tenantId)` → `{ canAdd: boolean, currentYAU: number, limit: number, overageCount: number }`
- `isPilotExpired(tenantId)` → check `pilotExpiresAt`
- `activatePilot(tenantId, seatLimit?)` → insert PILOT subscription (pilotExpiresAt = NOW() + 90 days, seatLimit default 100)
- `approvePilot(tenantId, seatLimit, approvedBy)` → update subscription to ACTIVE
- `rejectPilot(tenantId, reason, rejectedBy)` → publish `pilot.rejected` NATS event → email user
- `upgradePlan(tenantId, newPlan, seatLimit, expiresAt)` → SUPER_ADMIN only

**Seat limit enforcement middleware** (`apps/subgraph-core/src/auth/seat-limit.guard.ts`):
- On `createUser` mutation: call `checkSeatLimit()` → throw `SEAT_LIMIT_EXCEEDED` if `canAdd = false`
- Error response: `{ code: 'SEAT_LIMIT_EXCEEDED', message: 'Your plan (500 YAU) is at capacity. Contact EduSphere to upgrade.', currentYAU: 498, limit: 500 }`
- On login: if PILOT plan + pilot expired → flag for soft block (don't block login, but return `pilotExpired: true` in JWT context) → frontend shows upgrade modal

#### GraphQL SDL

```graphql
type TenantSubscription {
  plan:            TenantPlan!
  seatLimit:       Int!
  annualPriceUsd:  Int
  startsAt:        DateTime!
  expiresAt:       DateTime
  pilotExpiresAt:  DateTime
  isPilotActive:   Boolean!
  isPilotExpired:  Boolean!
  daysUntilExpiry: Int
  isAirGapped:     Boolean!
}

input PilotSignupInput {
  institutionName:  String!
  contactEmail:     String!    # no domain restriction — any email
  estimatedUsers:   Int!
  useCase:          String!
  adminFirstName:   String!
  adminLastName:    String!
  requestedSeatLimit: Int      # optional suggestion from the prospect
}

type PilotSignupResult {
  status:    String!  # "PENDING_APPROVAL"
  message:   String!
  requestId: ID!
}

extend type Mutation {
  # Public — pilot signup (no auth required)
  requestPilot(input: PilotSignupInput!): PilotSignupResult!

  # SUPER_ADMIN — approve/reject
  approvePilot(tenantId: ID!, seatLimit: Int): TenantSubscription!
    @requiresRole(roles: [SUPER_ADMIN])

  rejectPilot(tenantId: ID!, reason: String!): Boolean!
    @requiresRole(roles: [SUPER_ADMIN])

  # SUPER_ADMIN — plan management
  setTenantPlan(tenantId: ID!, plan: TenantPlan!, seatLimit: Int!, expiresAt: DateTime, isAirGapped: Boolean): TenantSubscription!
    @requiresRole(roles: [SUPER_ADMIN])
}
```

#### Frontend: Pilot Flow

**`apps/web/src/pages/PilotSignupPage.tsx`** (new, public route `/pilot`)
- Step 1: Form — Institution name, Contact email (any domain), Estimated users, Use case dropdown (University / College / Corporate L&D / Defense / Other), Admin first+last name, optional: requested seat limit
- Step 2: "✅ Request Received" — "EduSphere will review your request within 24 hours. Check your email for updates." + Calendly iframe embed (optional scheduling call)
- Calls `requestPilot` mutation → creates pending pilot record

**`apps/web/src/pages/PilotRequestsAdminPage.tsx`** (new, route `/admin/pilot-requests`, SUPER_ADMIN only)
- Table: Institution Name | Contact Email | Use Case | Est. Users | Requested Seats | Submitted Date | Status
- Actions per row:
  - **Approve** → modal: adjust seat limit (default: 100) + confirm → calls `approvePilot` mutation → user receives approval email
  - **Reject** → modal: rejection reason textarea → calls `rejectPilot` mutation → user receives rejection email
- Notification dot in AdminSidebar when pending requests exist

**`apps/web/src/components/PilotBanner.tsx`** (new)
- Shown in dashboard header for all PILOT plan users
- "🚀 Pilot Mode — {N} days remaining. [Upgrade to continue →]"
- Pulse animation when < 14 days remain

---

### Area 4 — AI Course Generation Frontend Wiring

**Goal:** Make the already-built AI course generator accessible to instructors as the primary course creation path. "Build a full course in 10 minutes" is a top differentiator.

#### Step 1: Supergraph SDL — Expose generateCourseFromPrompt

Add to `apps/subgraph-agent/src/schema.graphql`:
```graphql
type GeneratedCourse {
  executionId:       ID!
  status:            ExecutionStatus!
  courseTitle:       String
  courseDescription: String
  modules:           [GeneratedModule!]
  draftCourseId:     ID
}

type GeneratedModule {
  title:       String!
  description: String!
  items:       [GeneratedContentItem!]!
}

type GeneratedContentItem {
  title:   String!
  type:    String!      # lesson | quiz | video | document
  content: String
}

input GenerateCourseInput {
  prompt:               String!
  targetAudienceLevel:  String   # beginner | intermediate | advanced
  estimatedHours:       Float
  language:             String   # BCP-47 language code
}

extend type Mutation {
  generateCourseFromPrompt(input: GenerateCourseInput!): GeneratedCourse!
    @authenticated
    @requiresScopes(scopes: ["course:write"])
}

extend type Subscription {
  executionStatusChanged(executionId: ID!): GeneratedCourse!
    @authenticated
}
```

Then: `pnpm --filter @edusphere/gateway compose` to recompose supergraph.

#### Step 2: AiCourseCreatorModal

**`apps/web/src/components/course/AiCourseCreatorModal.tsx`** (new, ~150 lines)

**Flow — 4 steps:**
1. **Input**: Large textarea ("Describe your course in plain language...") + audience level select + hours estimate + language select
2. **Generating**: Skeleton animation + spinning Brain icon + stage labels: "Analyzing prompt... → Generating outline... → Linking to knowledge graph... → Creating quiz questions... → Finalizing..."
   - `executionStatusChanged` subscription (pause tied to modal open state)
   - Fallback: 3-second interval polling of `agentExecution` query if WebSocket unavailable
3. **Preview**: Accordion list of generated modules + content items
   - Inline editing of each title
   - "🔄 Regenerate this module" button
4. **Publish**: "Create Draft Course" → calls `createCourse` mutation → navigate to `/courses/:id/edit`

**Memory safety rules:**
- `const [paused, setPaused] = useState(true)`
- `useEffect(() => { if (isOpen) setPaused(false); return () => setPaused(true); }, [isOpen])`
- No polling when closed

#### Step 3: CourseCreatePage Integration

**`apps/web/src/pages/CourseCreatePage.tsx`** (modify existing)

Add prominent AI option at top of Step 1, ABOVE the manual form:
```
┌─────────────────────────────────────────────────┐
│  ✨ AI Course Builder — Build in 10 Minutes     │
│  Describe your course → AI creates all modules, │
│  lessons, and quiz questions automatically.      │
│         [Launch AI Builder →]                   │
└─────────────────────────────────────────────────┘
          ── or build manually below ──
```

#### Step 4: Quiz Generation from Content

**`apps/web/src/pages/QuizBuilderPage.tsx`** (modify existing)

Add button in toolbar: "✨ Generate quiz from lesson content →"
- Calls `generateQuizFromContent(lessonId, questionCount)` mutation
- Shows generated questions in QuizBuilderForm for instructor review/edit

**New mutation in subgraph-content:**
```graphql
type GeneratedQuiz {
  questions: [GeneratedQuestion!]!
}
type GeneratedQuestion {
  text:        String!
  type:        String!   # multiple_choice | true_false | short_answer
  options:     [String!]
  correctIndex: Int
  explanation: String
}
extend type Mutation {
  generateQuizFromContent(lessonId: ID!, questionCount: Int): GeneratedQuiz!
    @authenticated
    @requiresScopes(scopes: ["course:write"])
}
```

---

### Area 5 — SEO & Compliance Infrastructure

**robots.txt** (`apps/web/public/robots.txt`):
```
User-agent: *
Allow: /landing
Allow: /pricing
Allow: /pilot
Allow: /accessibility
Disallow: /dashboard
Disallow: /admin
Disallow: /checkout
Sitemap: https://edusphere.ai/sitemap.xml
```

**sitemap.xml** (`apps/web/public/sitemap.xml`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://edusphere.ai/landing</loc><priority>1.0</priority><changefreq>weekly</changefreq></url>
  <url><loc>https://edusphere.ai/pricing</loc><priority>0.9</priority><changefreq>monthly</changefreq></url>
  <url><loc>https://edusphere.ai/pilot</loc><priority>0.9</priority><changefreq>monthly</changefreq></url>
  <url><loc>https://edusphere.ai/accessibility</loc><priority>0.5</priority><changefreq>yearly</changefreq></url>
</urlset>
```

**index.html meta tags** (add to `<head>`):
```html
<meta name="description" content="EduSphere is the AI-native LMS with Knowledge Graph + GraphRAG intelligence and Visual Anchoring. Built for universities, colleges, defense agencies, and enterprises. FERPA compliant. Air-Gapped ready. White-label included. Starting at $12,000/year.">
<meta name="keywords" content="LMS, AI LMS, Canvas alternative, knowledge graph LMS, GraphRAG LMS, university LMS, FERPA LMS, air-gapped LMS, white label LMS, visual anchoring, educational knowledge management">
<meta property="og:type" content="website">
<meta property="og:title" content="EduSphere — AI-Native LMS · Knowledge Graph · GraphRAG · Visual Anchoring">
<meta property="og:description" content="Knowledge Graph + AI Chavruta + Visual Anchoring + Air-Gapped. True white-label on all tiers. FERPA, WCAG 2.1 AA, SCORM 2004, LTI 1.3. From $12,000/year.">
<meta property="og:image" content="https://edusphere.ai/og-image.png">
<meta property="og:url" content="https://edusphere.ai">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="EduSphere — AI-Native LMS with Knowledge Graph">
<meta name="twitter:description" content="GraphRAG + Visual Anchoring + AI Tutor. FERPA. Air-Gapped. From $12K/year.">
```

**JSON-LD** (`apps/web/src/components/seo/JsonLd.tsx` — new):
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "EduSphere",
  "applicationCategory": "EducationalApplication",
  "offers": [
    {"@type": "Offer", "name": "Starter", "price": "12000", "priceCurrency": "USD", "billingPeriod": "P1Y"},
    {"@type": "Offer", "name": "Professional", "price": "35000", "priceCurrency": "USD", "billingPeriod": "P1Y"},
    {"@type": "Offer", "name": "Enterprise", "description": "Custom pricing"},
    {"@type": "Offer", "name": "Defense", "description": "Air-Gapped deployment, custom pricing"}
  ],
  "featureList": [
    "Knowledge Graph + GraphRAG", "Visual Anchoring Sidebar", "Air-Gapped / On-Premise",
    "AI Chavruta Tutor", "AI Course Builder", "FERPA Compliant", "WCAG 2.1 AA",
    "White-Label All Tiers", "SCORM 2004", "LTI 1.3", "xAPI", "SAML 2.0 SSO"
  ]
}
```

**`apps/web/src/hooks/usePageTitle.ts`** (new):
```typescript
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} — EduSphere` : 'EduSphere — AI-Native LMS';
    return () => { document.title = 'EduSphere'; };
  }, [title]);
}
```

**Dedicated Pricing Route:**
- **`apps/web/src/pages/PricingPage.tsx`** (new, route `/pricing`)
- Full pricing section + compliance badges + comparison table + FAQ accordion
- `usePageTitle('Pricing & Plans')`

---

### Area 6 — Visual Anchoring & Asset Linking System (PRD 1.6 Full Marketing Integration)

**Background:** Phase 29 already built the core Visual Anchoring system. This area:
1. Completes any remaining PRD 1.6 items
2. Makes Visual Anchoring a **prominently marketed differentiator** on the landing page
3. Ensures all 19 edge cases from the PRD are handled

#### What's Already Built (Phase 29)
- DB: `visual_assets`, `visual_anchors` tables + RLS + Hebrew FTS
- Backend: ClamAV scan + ImageOptimizer + VisualAnchorService (CRUD + simhash) + DocumentVersionService + NATS events
- Frontend: VisualSidebar (280px) + AnchorFrame + CrossFadeImage (GPU fade) + AnchorEditor + AssetUploader + AssetPicker + InstructorAnchorPanel + ResumeBanner
- Mobile: VisualBottomSheet (@gorhom/bottom-sheet, snap 25%/50%/90%)
- E2E: `visual-anchoring.spec.ts` + `visual-anchoring-instructor.spec.ts`

#### Remaining Work

**Backend additions:**
- `AnchorSyncCron` — sync anchor positions after lesson content edits (regenerate geometric coords on content change)
- DIFF API endpoint: compare anchor states between document versions (`GET /anchors/diff/:v1/:v2`)
- Comment thread on anchors: global comments + @mentions + GraphRAG-linked notes (link comment to knowledge graph concept)

**Frontend additions:**
- `VisualAnchoringDemo.tsx` — landing page demo (animated gif or CSS animation showing sidebar appearing as student reads)
- `GlobalCommentThread.tsx` — inline comment thread attached to visual anchor (threaded, @mentions, resolved state)
- Search: "Find images containing..." — full-text + semantic anchor search

**All 19 PRD edge cases verification** (documented in `docs/plans/bugs/PRD16-edge-cases.md`)

---

### Area 7 — Air-Gapped / On-Premise & Defense Readiness

**Goal:** Enable full deployment with zero external dependencies for defense/intelligence/regulated organizations.

#### 4 Core Requirements (from strategic documents)

| Requirement | Implementation |
|-------------|---------------|
| **Zero External Dependencies** | All models local (Ollama + Llama 3), MinIO for storage, Keycloak for auth, NATS for messaging — all self-hosted |
| **Static Model** | Model version pinned at deployment, no internet-based updates, model hash verified on startup |
| **Local Context** | Knowledge Graph fully on-premise (Apache AGE on local PostgreSQL), pgvector embeddings local, no cloud API calls |
| **End-to-End Auditability** | Every GraphRAG query: full trace → source documents → reasoning path → answer. Stored in audit log. Immutable. |

#### Infrastructure

**Helm Chart** (`infrastructure/helm/edusphere-airgapped/`):
- Values: `airgapped.enabled: true` → disables all external URL references in all services
- Includes: Ollama sidecar, local model download job, certificate bundle, offline artifact registry

**Zarf packaging** (`infrastructure/zarf/zarf.yaml`):
- Package all container images + Helm charts for K3s (offline deployment)
- Air-Gapped checklist validation script

#### Backend Changes

**`apps/subgraph-agent/src/ai/local-inference.service.ts`** (new):
- When `AIRGAP_MODE=true`: use Ollama only, reject any call to OpenAI/Anthropic
- Model hash verification on startup (compare SHA-256 of model weights file vs pinned hash in config)
- All LLM calls routed through `LocalInferenceService` → `createOllama({baseURL: process.env.OLLAMA_URL})`

**GraphRAG Audit Trail** (extend existing `audit_log`):
- For every AI query: record `{ queryText, graphTraversalPath[], sourcedocuments[], modelVersion, modelHash, answerText, confidenceScore }`
- Audit records: immutable (no UPDATE/DELETE on audit_log)
- Export: PDF audit report for compliance reviews

**`apps/subgraph-knowledge/src/graphrag/graphrag-audit.service.ts`** (new):
- `recordQuery(queryId, path, sources, answer)` → INSERT into `audit_log` with type `GRAPHRAG_QUERY`
- `generateAuditReport(tenantId, startDate, endDate)` → PDF export (using pdfkit or Puppeteer)

#### Compliance Roadmap

| Milestone | Timeline |
|-----------|----------|
| Air-Gapped Helm chart + Zarf package | Phase 50 |
| Local model verification | Phase 50 |
| GraphRAG full audit trail | Phase 51 |
| SOC2 Type II audit preparation | Q3 2026 |
| CompTIA SecAI+ alignment documentation | Q3 2026 |
| Defense classification readiness review | Q4 2026 |

---

### Area 8 — B2B2C Partner Portal & Training Company Ecosystem

**Goal:** Enable training companies and content creators to use EduSphere as their white-label delivery platform (Duffel-style API). Revenue share: 30% to EduSphere, 70% to partner.

#### Partner Types

| Type | Description | Revenue Model |
|------|-------------|---------------|
| **Training Company** | Delivers corporate training on white-label EduSphere | $X/license/month + 30% RevShare on learner subscriptions |
| **Content Creator** | Publishes courses in EduSphere marketplace | 30% RevShare on course sales |
| **Reseller** | Sells EduSphere to institutions | 20% commission on first year |
| **System Integrator** | Deploys + customizes EduSphere for clients | Professional services fees |

#### Database

**`packages/db/src/schema/partners.ts`** (new):
```typescript
export const partnerTypeEnum = pgEnum('partner_type',
  ['TRAINING_COMPANY', 'CONTENT_CREATOR', 'RESELLER', 'SYSTEM_INTEGRATOR']);

export const partners = pgTable('partners', {
  id:           uuid('id').primaryKey().defaultRandom(),
  name:         text('name').notNull(),
  type:         partnerTypeEnum('type').notNull(),
  apiKey:       text('api_key_hash').notNull(),  // SHA-256 of actual key
  tenantId:     uuid('tenant_id').references(() => tenants.id),
  revSharePct:  integer('rev_share_pct').notNull().default(30),
  status:       text('status').notNull().default('pending'),  // pending | active | suspended
  createdAt:    timestamp('created_at').defaultNow(),
});

export const partnerRevenue = pgTable('partner_revenue', {
  id:         uuid('id').primaryKey().defaultRandom(),
  partnerId:  uuid('partner_id').references(() => partners.id),
  month:      text('month').notNull(),        // YYYY-MM
  grossRevUsd: integer('gross_rev_usd').notNull(),
  platformCut: integer('platform_cut_usd').notNull(),
  partnerPayout: integer('partner_payout_usd').notNull(),
  status:      text('status').notNull(),      // pending | paid
});
```

#### Partner API (OpenAPI spec → `docs/api/partner-api.yaml`)

```
POST   /api/v1/partner/courses/generate    # AI course generation
POST   /api/v1/partner/tenants             # Create sub-tenant (white-label)
GET    /api/v1/partner/usage               # Learner activity stats
GET    /api/v1/partner/revenue             # Revenue report
POST   /api/v1/partner/enrollments         # Bulk enroll learners
```

Authentication: API key in `Authorization: Bearer <partner-api-key>` header.

#### Frontend: Partner Portal

**`apps/web/src/pages/PartnerSignupPage.tsx`** (new, public route `/partners`)
- Partner type selection + business details form
- Sends `requestPartnership` mutation → pending approval

**`apps/web/src/pages/PartnerDashboardPage.tsx`** (new, route `/partner/dashboard`)
- Revenue chart (monthly): Gross | Platform cut | Partner payout
- Learner counts by sub-tenant
- API key management (rotate, revoke)
- Course performance metrics

**Gamification for Partners:**
- Partner tiers: Bronze → Silver → Gold → Platinum (based on monthly learner count)
- Tier badges displayed on partner profile
- Higher tiers: lower platform cut (Bronze: 30%, Gold: 25%, Platinum: 20%)

---

### Area 9 — Advanced ROI & Analytics Dashboard

**Goal:** Give CFOs, Procurement, and L&D directors the data they need to justify the EduSphere investment.

#### KPI Metrics

| KPI | Calculation | Data Source |
|-----|------------|-------------|
| Time-to-Insight | Avg time from content upload to first quiz pass | `agent_sessions` + `content_items` |
| Knowledge Retention % | Quiz score T1 vs quiz re-take score T2 (30-day gap) | `quiz_responses` |
| Student Retention | % of students who completed 3+ courses in 12 months | `enrollments` |
| Instructor Time Saved | AI-generated course items / total course items × instructor_rate | `content_items` |
| Knowledge Loss Risk | # of concepts not yet documented in KG / total org concepts | `knowledge_graph` |
| Cost per Completion | Total platform cost / total course completions | `subscriptions` + `completions` |

#### Frontend: Analytics Dashboard

**`apps/web/src/pages/ROIAnalyticsDashboardPage.tsx`** (new, route `/admin/roi-analytics`)
- Interactive Knowledge Graph explorer (D3.js or react-force-graph): nodes = concepts, edges = learning paths
- ROI summary card: "EduSphere saved your organization an estimated $X this year"
- PDF/CSV export for CFO/Procurement
- Drill-down: by department, by instructor, by course

---

### Area 10 — HRIS & Enterprise Integrations

**Goal:** Remove the #1 enterprise blocker — HRIS integration.

| Integration | Protocol | Priority |
|-------------|----------|----------|
| Workday | REST API + SOAP | High (most common in US enterprise) |
| SAP SuccessFactors | OData REST | High |
| Banner (Ellucian) | REST API | High (higher-ed SIS standard) |
| Colleague (Ellucian) | Colleague Web API | Medium |
| ADP Workforce | REST API | Medium |
| SCIM 2.0 (generic) | REST | All enterprise (user provisioning) |
| xAPI (Tin Can) | LRS REST | Already planned |

**Architecture:**
- HRIS integration service: `apps/subgraph-core/src/integrations/hris/`
- One adapter per system (Adapter pattern)
- Sync schedule: configurable cron (default: nightly 3AM)
- SUPER_ADMIN configures per tenant: integration type + credentials + field mapping

---

### Area 11 — Advanced AI Phases (Future Phases)

| Feature | Phase | Notes |
|---------|-------|-------|
| Stripe B2B invoicing | Phase 51 | Auto-invoice PDF; annual + multi-year contracts |
| AI auto-grading of free-text | Phase 52 | GraphRAG scoring + rubric adherence + explanation |
| Video generation from outline | Phase 53 | HeyGen/Synthesia integration; instructor avatar options |
| Multi-language content gen UI | Q2 2026 | Backend already ready (`language` param); needs UI wiring |
| Custom AI fine-tuning on institution content | Enterprise/Defense | On-prem training pipeline |
| AI-powered gap analysis | Phase 52 | "Your organization is missing knowledge in these areas..." |
| Predictive dropout risk | Phase 52 | ML model on engagement signals → early intervention |
| Global comments + @mentions on anchors | Phase 51 | GraphRAG-linked threaded comments on visual anchors |

---

### Area 12 — Sales Enablement & Investor Deck Materials

**Goal:** Auto-generate and maintain sales materials from live platform data.

#### Guy Kawasaki 10/20/30 Deck (auto-generated)

**`apps/web/src/pages/InvestorDeckPage.tsx`** (new, route `/internal/investor-deck`, SUPER_ADMIN only)

Slides (generated from live data):
1. Title: "EduSphere — AI-Native LMS for the Knowledge Economy"
2. Problem: "Organizations lose 25% of revenue to undocumented knowledge"
3. Solution: "GraphRAG + Visual Anchoring + AI Tutor in one platform"
4. Why Now: TAM data (AI-Driven KM: $9.6B → $237B, CAGR 43.7%)
5. Product: Screenshots/demos of top 3 differentiators
6. Business Model: B2B + B2B2C pricing table
7. Go-to-Market: 90-day pilot → 70% conversion path
8. Competition: VsCompetitors table
9. Traction: Live stats from DB (# pilots, # active tenants, # courses generated)
10. Team + Ask

**One-pager generator** (`/internal/one-pager`):
- A4 PDF with: Problem → Solution → 3 Differentiators → Pricing → Contact
- Download as PDF (Puppeteer/pdfkit)

**ROI Story templates** (stored in `packages/db`, queryable):
- University story: "University of X saved 2,100 instructor hours in year 1"
- Corporate story: "Company Y reduced onboarding time by 40% with AI Course Builder"
- Defense story: "Agency Z achieved full knowledge auditability with GraphRAG"

---

## Execution Order — 5 Parallel Agents + Sequential QA

### Phase A — All 5 Agents Simultaneously

| Agent | Division | Scope | Dependencies |
|-------|----------|-------|-------------|
| **Agent-1** | Database & Data | Migration 0020 (YAU tracking) + Migration 0021 (subscriptions) + Migration 0022 (partners + partner_revenue) + Drizzle schema files + seed data | None |
| **Agent-2** | Backend Engineering | YAUCounterService + SessionTrackerService + SubscriptionService + PilotService + seat limit guard + PilotRequestsAdminResolver + GraphRAG audit service + AirGapped LocalInferenceService | Agent-1 schema types |
| **Agent-3** | Backend Engineering | Supergraph SDL: generateCourseFromPrompt + executionStatusChanged + generateQuizFromContent + TenantUsageStats queries + Partner API + recompose supergraph | None |
| **Agent-4** | Frontend Engineering | LandingPage.tsx full B2B rewrite (12 sections) + PricingPage + PilotSignupPage + PilotRequestsAdminPage + PartnerSignupPage + router wiring + all landing components (Compliance, VsCompetitors, ROICalculator, PilotSteps, GraphRAGDemo, VisualAnchoringDemo) | None — uses mock data |
| **Agent-5** | Frontend + DevOps | AiCourseCreatorModal + CourseCreatePage AI CTA + QuizBuilderPage AI button + PlatformUsageDashboardPage + OrgUsagePage + UsageMeter + PilotBanner + ROIAnalyticsDashboardPage + SEO (robots.txt, sitemap.xml, index.html, JsonLd, usePageTitle) | None — uses mock data |

### Phase B — Integration & Merge (sequential)
1. `pnpm --filter @edusphere/db migrate` (Agent-1 migrations)
2. `pnpm --filter @edusphere/gateway compose` (Agent-3 SDL)
3. Connect Agent-4/5 frontend query hooks to Agent-2/3 backend resolvers
4. `pnpm turbo typecheck` — resolve any type mismatches

### Phase C — QA + Security (parallel sub-agents)

| Agent | Task |
|-------|------|
| D1 | Unit tests: YAUCounterService + SubscriptionService + SessionTrackerService + SeatLimitGuard |
| D2 | E2E: pilot-signup.spec.ts + pricing-page.spec.ts + ai-course-builder.spec.ts + org-usage.spec.ts + landing-b2b.spec.ts + pilot-admin.spec.ts |
| D3 | Security: seat limit bypass tests + SI-10 AI consent + pilot approval auth + Air-Gapped mode (block external calls) + Partner API key validation |

### Phase D — Air-Gapped + B2B2C (after Phase C)
- Helm chart packaging
- Partner Portal MVP
- Defense readiness checklist

---

## Critical Files — Complete List

### New Files (25+)
| File | Description |
|------|-------------|
| `packages/db/src/schema/user-sessions.ts` | Session tracking table |
| `packages/db/src/schema/subscription-plans.ts` | Plans + tenant subscriptions + partner tables |
| `packages/db/src/schema/partners.ts` | Partner + partner_revenue tables |
| `apps/subgraph-core/src/analytics/yau-counter.service.ts` | YAU counting |
| `apps/subgraph-core/src/auth/session-tracker.service.ts` | Login event recording |
| `apps/subgraph-core/src/auth/seat-limit.guard.ts` | Seat limit enforcement |
| `apps/subgraph-core/src/subscription/subscription.service.ts` | Plan management |
| `apps/subgraph-agent/src/ai/local-inference.service.ts` | Air-Gapped LLM routing |
| `apps/subgraph-knowledge/src/graphrag/graphrag-audit.service.ts` | GraphRAG audit trail |
| `apps/web/src/pages/LandingPage.tsx` | Full B2B rewrite |
| `apps/web/src/pages/PricingPage.tsx` | Dedicated `/pricing` route |
| `apps/web/src/pages/PilotSignupPage.tsx` | Pilot registration |
| `apps/web/src/pages/PilotRequestsAdminPage.tsx` | SUPER_ADMIN pilot approval |
| `apps/web/src/pages/PlatformUsageDashboardPage.tsx` | Cross-tenant YAU dashboard |
| `apps/web/src/pages/OrgUsagePage.tsx` | Per-tenant usage view |
| `apps/web/src/pages/ROIAnalyticsDashboardPage.tsx` | ROI KPIs + graph explorer |
| `apps/web/src/pages/PartnerSignupPage.tsx` | Partner application |
| `apps/web/src/pages/PartnerDashboardPage.tsx` | Partner revenue + learners |
| `apps/web/src/pages/InvestorDeckPage.tsx` | Auto-generated pitch deck |
| `apps/web/src/components/course/AiCourseCreatorModal.tsx` | AI course builder UI |
| `apps/web/src/components/admin/UsageMeter.tsx` | Circular YAU meter |
| `apps/web/src/components/PilotBanner.tsx` | Pilot countdown banner |
| `apps/web/src/components/landing/VsCompetitorsTable.tsx` | Competitor comparison |
| `apps/web/src/components/landing/ComplianceBadges.tsx` | 8-badge compliance grid |
| `apps/web/src/components/landing/ROICalculator.tsx` | Interactive sliders |
| `apps/web/src/components/landing/PilotSteps.tsx` | 3-step explainer |
| `apps/web/src/components/landing/GraphRAGDemo.tsx` | Animated KG demo |
| `apps/web/src/components/landing/VisualAnchoringDemo.tsx` | Sidebar demo animation |
| `apps/web/src/components/landing/AirGappedBadge.tsx` | Air-Gapped badge |
| `apps/web/src/components/seo/JsonLd.tsx` | JSON-LD injector |
| `apps/web/src/hooks/usePageTitle.ts` | Dynamic page titles |
| `apps/web/public/robots.txt` | SEO crawl rules |
| `apps/web/public/sitemap.xml` | SEO sitemap |
| `infrastructure/helm/edusphere-airgapped/` | Air-Gapped Helm chart |
| `docs/api/partner-api.yaml` | OpenAPI spec for Partner API |

### Modified Files
| File | Change |
|------|--------|
| `apps/web/src/pages/CourseCreatePage.tsx` | Add AI Builder CTA at top |
| `apps/web/src/pages/QuizBuilderPage.tsx` | Add "Generate from content" button |
| `apps/web/src/pages/AdminDashboardPage.tsx` | Add usage card + pilot requests link |
| `apps/web/src/lib/router.tsx` | Add 8 new routes |
| `apps/web/index.html` | All meta/OG/Twitter/JSON-LD tags |
| `apps/subgraph-agent/src/schema.graphql` | Expose AI mutations + subscriptions |
| `apps/subgraph-core/src/schema.graphql` | Add usage + subscription queries |
| `packages/db/src/schema/users.ts` | Add `lastLoginAt`, `lastActivityAt` |
| `packages/db/src/schema/tenant-analytics-snapshots.ts` | Add YAU + seat columns |
| `packages/db/src/schema/tenants.ts` | Update plan enum reference |

---

## Verification Plan

```bash
# Unit tests
pnpm --filter @edusphere/subgraph-core test -- --testPathPattern=yau-counter
pnpm --filter @edusphere/subgraph-core test -- --testPathPattern=subscription
pnpm --filter @edusphere/subgraph-core test -- --testPathPattern=session-tracker
pnpm --filter @edusphere/subgraph-core test -- --testPathPattern=seat-limit
pnpm --filter @edusphere/web test -- --testPathPattern=PilotSignupPage
pnpm --filter @edusphere/web test -- --testPathPattern=AiCourseCreatorModal
pnpm --filter @edusphere/web test -- --testPathPattern=UsageMeter

# New E2E specs
# apps/web/e2e/pilot-signup.spec.ts       — full pilot flow
# apps/web/e2e/pilot-admin-approval.spec.ts — SUPER_ADMIN approve/reject
# apps/web/e2e/pricing-page.spec.ts       — all 4 tiers + compliance badges
# apps/web/e2e/ai-course-builder.spec.ts  — modal flow (mocked API)
# apps/web/e2e/org-usage.spec.ts          — YAU meter accuracy
# apps/web/e2e/landing-b2b.spec.ts        — VsCompetitors + ROI calculator
# apps/web/e2e/airgap-mode.spec.ts        — verify no external calls in AIRGAP_MODE

# Full gate
pnpm turbo typecheck                             # 0 errors
pnpm turbo lint                                  # 0 warnings
pnpm turbo test                                  # 100% pass
pnpm test:security                               # 0 failures
pnpm --filter @edusphere/gateway compose         # supergraph composes
./scripts/health-check.sh                        # all services UP
```

---

## Deferred (Future Phases — tracked in OPEN_ISSUES.md)

| Item | Phase |
|------|-------|
| Stripe integration for B2B institutional invoicing | Phase 51 |
| AI auto-grading of free-text answers (GraphRAG + rubrics) | Phase 52 |
| Video generation from course outline (HeyGen/Synthesia) | Phase 53 |
| Multi-language content generation UI | Q2 2026 (backend ready) |
| HRIS full integration suite (Banner, Workday, SAP, ADP) | Enterprise Phase |
| SOC2 Type II formal audit | Q3 2026 |
| Custom AI fine-tuning on institution content | Defense/Enterprise |
| Global comments + @mentions on visual anchors | Phase 51 |
| CompTIA SecAI+ alignment documentation | Q3 2026 |
| Investor deck auto-generation from live data | Phase 52 |
| Partner gamification (Bronze → Platinum tiers) | Phase 52 |
| AnchorSyncCron + DIFF API for visual anchors | Phase 51 |
