# Phase 38: Assessment / Certificate / Marketplace / Quiz / SRS — UI Completion

**Status:** ✅ Complete — see OPEN_ISSUES.md

**Goal:** Close all real gaps surfaced by Phase 38 exploration: add certificate presigned-URL download, fix CourseListing JOIN/filter gap, build CertificatesPage + QuizBuilderPage, update MarketplacePage to show real course data, and add mobile SRS + Certificate screens.

**Architecture:** 3 sprints. Sprint A: 4 parallel agents (backend fixes). Sprint B: 5+ parallel agents (frontend pages). Sprint C: QA gate.

**Tech Stack:** NestJS + Drizzle ORM + @aws-sdk/s3-request-presigner | urql (web) | Apollo Client (mobile) | shadcn/ui + Tailwind | Expo SDK 54 | TypeScript strict

---

## Context

Phase 37 is complete at commit `f350ca5`. Exploration of the Phase 38 scope (Assessment / Certificates / Marketplace / Quiz / SRS) revealed that most backend services are already fully implemented. The gaps are:

- **Certificate presigned URL**: `pdfUrl` stored as raw MinIO object key; no download URL generation; no `CertificatesPage` in web
- **CourseListing resolver mismatch**: supergraph defines `title/instructorName/description/rating/tags` but `marketplace.service.ts::getListings()` does `SELECT * FROM course_listings` returning only DB columns — no JOIN to `courses` or `users` tables
- **Marketplace filters not wired**: `CourseListingFiltersInput` defined in SDL but `marketplace.service.ts` ignores all filter args
- **MarketplacePage renders raw UUIDs**: without title/instructorName fields from backend, the page falls back to `Course ${id.slice(0,8)}...` pattern
- **CertificatesPage**: does not exist at all in `apps/web/src/pages/`
- **QuizBuilderPage**: does not exist — instructor cannot create quizzes via the frontend
- **InstructorEarningsPage `enabled: false`**: live query disabled via placeholder guard — needs to be activated
- **Mobile SRS + Certificate screens**: mobile has no SRS Review or Certificates screen
- **Already done** (no work needed): SRS ReviewPage (`/srs-review`) and InstructorEarningsPage (`/instructor/earnings`) are FULLY implemented in web frontend — only minor fixes needed

---

## Open Items Inventory

| # | Severity | Item | Sprint |
|---|----------|------|--------|
| P38-1 | 🔴 | Certificate presigned URL: `certificate.service.ts` + SDL + `CertificatesPage` | A+B |
| P38-2 | 🔴 | CourseListing JOIN: courses + users table JOIN in `marketplace.service.ts` | A |
| P38-3 | 🔴 | MarketplacePage: show real title/instructorName + filter UI | B |
| P38-4 | 🟡 | Marketplace filters: WHERE clauses in `marketplace.service.ts` | A |
| P38-5 | 🟡 | QuizBuilderPage: instructor quiz creation UI | B |
| P38-6 | 🟡 | InstructorEarningsPage: remove `enabled: false`, use mounted guard | B |
| P38-7 | 🟡 | Mobile SrsReviewScreen + CertificatesScreen | B |
| P38-8 | ⚪ | Supergraph: add `certificateDownloadUrl` query | A+B |
| P38-9 | ⚪ | AppSidebar: add Certificates + SRS Review nav items | B |
| P38-10 | ⚪ | API_CONTRACTS Section 25 + OPEN_ISSUES.md + README sync | C |

---

## Dependency Graph

```
Sprint A — T+0 (4 agents, parallel)
├── Agent-A1 [Backend]: Certificate presigned URL (service + SDL + supergraph query)
├── Agent-A2 [Backend]: CourseListing JOIN + filter WHERE clauses
├── Agent-A3 [Frontend-fix]: InstructorEarningsPage enabled + AppSidebar nav items
└── Agent-A4 [Docs]: API_CONTRACTS Section 25 skeleton + OPEN_ISSUES P38 entries

Sprint B — T+5 (5 agents, after Sprint A, parallel)
├── Agent-B1 [Frontend]: CertificatesPage.tsx (depends on A1)
├── Agent-B2 [Frontend]: QuizBuilderPage.tsx
├── Agent-B3 [Frontend]: MarketplacePage: real fields + filter UI (depends on A2)
├── Agent-B4 [Mobile]: SrsReviewScreen + CertificatesScreen (mobile only)
└── Agent-B5 [DevOps]: Supergraph compose verify + local SDL consistency check

Sprint C — Sequential QA gate
└── Agent-C: E2E specs + security tests + OPEN_ISSUES final sync
```

---

## Sprint A — Backend Fixes (4 Parallel Agents)

### Agent-A1: Certificate Presigned URL Backend

**Pattern to follow:** `apps/subgraph-content/src/analytics/tenant-analytics-export.service.ts`
(uses `@aws-sdk/s3-request-presigner` + `getSignedUrl` + `GetObjectCommand`, PRESIGNED_URL_EXPIRY = 900s)

**File: `apps/subgraph-content/src/certificate/certificate.service.ts`**
- Add private `s3: S3Client` field
- Initialize in constructor (after existing injections):
  ```typescript
  import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
  import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
  // In constructor:
  const scheme = minioConfig.useSSL ? 'https' : 'http';
  this.s3 = new S3Client({
    endpoint: `${scheme}://${minioConfig.endpoint}:${minioConfig.port}`,
    region: minioConfig.region,
    credentials: { accessKeyId: minioConfig.accessKey, secretAccessKey: minioConfig.secretKey },
    forcePathStyle: true,
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
  ```
- Add method `getCertificateDownloadUrl(certId: string, userId: string, tenantId: string): Promise<string>`
  - `withTenantContext(db, { tenantId, userId, userRole: 'STUDENT' }, fn)` — SELECT cert WHERE id=certId AND user_id=userId (security: user can only download their own cert)
  - If not found: throw `NotFoundException`
  - If `cert.pdfUrl` is null: throw `BadRequestException('PDF not yet generated')`
  - Return `getSignedUrl(this.s3, new GetObjectCommand({ Bucket: minioConfig.bucket, Key: cert.pdfUrl }), { expiresIn: 900 })`
- **Memory safety note:** If adding S3Client + method pushes file past 200 lines, extract into `certificate-download.service.ts` + add to `CertificateModule`'s providers and exports.
- Add to `onModuleDestroy()`: `this.s3.destroy()` (S3Client has a `.destroy()` method)

**File: `apps/subgraph-content/src/certificate/certificate.graphql`**
- Add to `extend type Query`:
  ```graphql
  certificateDownloadUrl(certId: ID!): String! @authenticated
  ```

**File: `apps/subgraph-content/src/certificate/certificate.resolver.ts`**
- Add `@Query('certificateDownloadUrl')` method calling `certificateService.getCertificateDownloadUrl(certId, ctx.userId, ctx.tenantId)`

**File: `apps/gateway/supergraph.graphql`**
- Add to Query type: `certificateDownloadUrl(certId: ID!): String! @join__field(graph: CONTENT) @authenticated`

**Tests:**
- `certificate.service.spec.ts`: add 3 tests: returns presigned URL; throws NotFoundException for wrong user; throws BadRequestException when pdfUrl is null
- `certificate.resolver.spec.ts`: add test: delegates to service with JWT userId (not arg userId)

---

### Agent-A2: CourseListing JOIN + Filters

**File: `apps/subgraph-content/src/marketplace/marketplace.service.ts`**

Rewrite `getListings(tenantId, filters?)` method using Drizzle JOINs:
```typescript
// JOIN chain:
tx.select({
  id: schema.courseListings.id,
  courseId: schema.courseListings.courseId,
  priceCents: schema.courseListings.priceCents,
  currency: schema.courseListings.currency,
  isPublished: schema.courseListings.isPublished,
  revenueSplitPercent: schema.courseListings.revenueSplitPercent,
  title: schema.courses.title,
  description: schema.courses.description,
  thumbnailUrl: schema.courses.thumbnailUrl,
  instructorName: sql<string>`COALESCE(${schema.users.firstName} || ' ' || ${schema.users.lastName}, ${schema.users.username})`,
  enrollmentCount: sql<number>`(SELECT COUNT(*) FROM purchases p WHERE p.course_id = ${schema.courses.id} AND p.status = 'COMPLETE')`,
})
.from(schema.courseListings)
.innerJoin(schema.courses, eq(schema.courseListings.courseId, schema.courses.id))
.innerJoin(schema.users, eq(schema.courses.instructorId, schema.users.id))
.where(
  and(
    eq(schema.courseListings.tenantId, tenantId),
    eq(schema.courseListings.isPublished, true),
    // conditional filters:
    filters?.search ? ilike(schema.courses.title, `%${filters.search}%`) : undefined,
    filters?.priceMax !== undefined ? lte(schema.courseListings.priceCents, Math.round(filters.priceMax * 100)) : undefined,
    filters?.instructorName ? ilike(sql<string>`COALESCE(...)`, `%${filters.instructorName}%`) : undefined,
  )
)
```

- Return `tags: []` for now (no course_tags table; document in OPEN_ISSUES.md)
- Return `rating: null`, `totalLessons: 0` for now
- Signature: `getListings(tenantId: string, limit?: number, offset?: number, filters?: CourseListingFiltersInput): Promise<CourseListingMapped[]>`

**File: `apps/subgraph-content/src/marketplace/marketplace.graphql`**
- Update `CourseListing` type to include all new fields (title, description, instructorName, thumbnailUrl, price, currency, tags, enrollmentCount, rating, totalLessons)
- Add `CourseListingFiltersInput` input type
- Update `courseListings` query signature: `courseListings(tenantId: ID, limit: Int, offset: Int, filters: CourseListingFiltersInput): [CourseListing!]!`

**File: `apps/subgraph-content/src/marketplace/marketplace.resolver.ts`**
- Update `getCourseListings` to accept `@Args('filters') filters?: CourseListingFiltersInput` and pass to service
- Note: `tenantId` arg must be ignored in favor of JWT tenantId (SI-9)

**Tests:**
- `marketplace.service.spec.ts`: add tests: returns title from courses JOIN; search filter applied; priceMax filter applied; empty filters returns all

---

### Agent-A3: InstructorEarnings Fix + AppSidebar Nav

**File: `apps/web/src/pages/InstructorEarningsPage.tsx`**
- Find `enabled: false` placeholder guard
- Replace with mounted guard:
  ```typescript
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // In query options: enabled: mounted
  ```

**File: `apps/web/src/components/AppSidebar.tsx`**
- Add nav items (follow existing pattern of conditional role-gated items):
  - Certificates: `{ to: '/certificates', icon: Award, labelKey: 'nav.certificates' }` — all authenticated users
  - SRS Review: `{ to: '/srs-review', icon: Brain, labelKey: 'nav.srsReview' }` — all authenticated users
  - Quiz Builder: `{ to: '/quiz-builder', icon: FileQuestion, labelKey: 'nav.quizBuilder' }` — INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN only

**File: `apps/web/src/locales/en/nav.json` (and other 7 locales)**
- Add keys: `certificates`, `srsReview`, `quizBuilder`
- For non-English locales use English as fallback if translation not available (mark as `[TODO]`)

---

### Agent-A4: Documentation Skeleton

**File: `OPEN_ISSUES.md`**
- Add Phase 38 tracking entry with P38-1 through P38-10 in 🟡 In Progress status

**File: `API_CONTRACTS_GRAPHQL_FEDERATION.md`**
- Add Section 25 at end of file:
  ```markdown
  ## Section 25 — Phase 37+38: Gamification, Manager Dashboard, Onboarding, Certificates (March 2026)

  ### New Query: certificateDownloadUrl(certId: ID!): String!
  Returns a 15-minute presigned MinIO URL for secure PDF download.
  Auth: @authenticated — user can only download their own certificates (server-side userId validation).

  ### Updated Type: CourseListing
  Added fields: title, description, instructorName, thumbnailUrl, price (Float), currency,
  tags ([String!]!), enrollmentCount (Int!), rating (Float), totalLessons (Int!)

  ### New Input: CourseListingFiltersInput
  Fields: tags ([String!]), priceMax (Float), instructorName (String), search (String)
  Applied as server-side WHERE clauses in marketplace resolver.

  ### Phase 37 types (Gamification)
  GamificationStats, UserChallenge, LeaderboardEntry: see gamification.graphql in subgraph-core
  TeamOverview, TeamMemberProgress: see manager.graphql in subgraph-core
  OnboardingState, UpdateOnboardingStepInput: see onboarding.graphql in subgraph-core
  ```

---

## Sprint B — Frontend Pages (5 Parallel Agents)

### Agent-B1: CertificatesPage

**New file:** `apps/web/src/pages/CertificatesPage.tsx`
- Route: `/certificates`
- Uses urql `useQuery` + mounted guard (`pause: !mounted`)
- Queries: `MY_CERTIFICATES_QUERY` + lazy `CERTIFICATE_DOWNLOAD_URL_QUERY`
- Layout: card grid (follow `MarketplacePage.tsx` card pattern)
- Each card: course name, issued date (formatted), verification code (monospace + copy button), Download PDF button
- Download button pattern: lazy query with `pause: activeCertId === null` + `useEffect` to `window.open(url, '_blank')` when URL returns
- States: skeleton loading, empty state ("No certificates yet — complete a course to earn one!"), cards, error

**New file:** `apps/web/src/lib/graphql/certificate.queries.ts`
```typescript
export const MY_CERTIFICATES_QUERY = gql`
  query MyCertificates {
    myCertificates {
      id courseId issuedAt verificationCode pdfUrl
      metadata { learnerName courseName }
    }
  }
`;
export const CERTIFICATE_DOWNLOAD_URL_QUERY = gql`
  query CertificateDownloadUrl($certId: ID!) {
    certificateDownloadUrl(certId: $certId)
  }
`;
```

**Modify:** `apps/web/src/lib/router.tsx` — add `/certificates` lazy route
**Modify:** `apps/web/src/components/AppSidebar.tsx` — coordinate with A3 (if A3 hasn't added it yet, add it here)

**Security invariant:** the raw `pdfUrl` (MinIO key string) must NEVER be rendered in the DOM. Only the presigned URL (fetched on button click) is used, and only via `window.open`, not rendered as visible text.

**New file:** `apps/web/src/pages/CertificatesPage.test.tsx`
- Tests: heading visible; empty state renders; certificate card with course name; download button present; raw pdfUrl NOT in DOM text (regression guard)

---

### Agent-B2: QuizBuilderPage

**Architecture:** Split into 3 files (to stay under 150-line limit):
- `apps/web/src/pages/QuizBuilderPage.tsx` — main shell, route params, submit handler (~80 lines)
- `apps/web/src/components/quiz-builder/QuizBuilderForm.tsx` — question list + add/remove logic (~100 lines)
- `apps/web/src/components/quiz-builder/QuizQuestion.tsx` — individual question form (~80 lines)

**Route:** `/courses/:courseId/modules/:moduleId/quiz/new`
- Role gate: redirect to `/dashboard` if role is not INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN
- Submit: calls `createContentItem` mutation with `contentType: QUIZ` and `body: JSON.stringify(quizContent)`

**Quiz content structure (Phase 38 scope: MULTIPLE_CHOICE only):**
```typescript
interface QuizContent {
  passingScore: number; // 0-100
  items: Array<{
    type: 'MULTIPLE_CHOICE';
    question: string;
    choices: string[];      // 4 choices
    correctIndex: number;   // 0-3
  }>;
}
```

**UI:**
1. Quiz title input (for ContentItem.title)
2. Passing score slider (0-100, default 70)
3. "Add Question" button → appends empty question to list
4. Each question: text area + 4 choice inputs + radio group for correct answer + "Remove" button
5. Submit → validate (min 1 question, all fields filled) → mutate → redirect to course detail page on success

**Modify:** `apps/web/src/lib/router.tsx` — add route
**Modify:** Add `CREATE_CONTENT_ITEM_MUTATION` to `apps/web/src/lib/graphql/content.queries.ts` if not already present

**Tests:**
- `QuizBuilderPage.test.tsx`: renders heading; add question button works; remove question decrements count; submit validates empty; submit calls mutation with correct JSON body

---

### Agent-B3: MarketplacePage Real Data + Filters

**Modify:** `apps/web/src/pages/MarketplacePage.tsx`

Changes:
1. Update GraphQL query to request all new fields: `title, description, instructorName, thumbnailUrl, price, currency, tags, enrollmentCount, rating, totalLessons`
2. Add TypeScript interface update for `CourseListing` to include new fields
3. Add filter bar above course grid:
   - `<input type="text" placeholder="Search courses..." />` — 300ms debounce → sets `filters.search`
   - Max price dropdown: `Free | Under $25 | Under $50 | Any price` → sets `filters.priceMax`
4. Pass `{ filters }` as query variable
5. Update card rendering:
   - Show `listing.title` (not the old UUID truncation)
   - Show `listing.instructorName`
   - Show `listing.description` (line-clamp-2)
   - Show thumbnail image if `listing.thumbnailUrl` present
6. Memory safety: debounce `clearTimeout` on effect cleanup

**Modify:** `apps/web/src/pages/MarketplacePage.test.tsx`
- Update mock to include new fields (title, instructorName)
- Add test: renders `'React Fundamentals'` (real title) not `'Course aabb...'` (UUID truncation)
- Add regression test: DOM text must NOT match `/Course [0-9a-f]{8}/`

---

### Agent-B4: Mobile SrsReviewScreen + CertificatesScreen

**Approach:** Pure logic extraction → mobile screen component

**New file:** `apps/mobile/src/screens/srs.logic.ts`
```typescript
// Pure functions extracted for testability
export function computeSessionStats(cards: SrsCard[], ratings: Rating[]): SessionStats { ... }
export function advanceCard(current: number, total: number): number | null { ... }
export function formatDueDate(dueDate: string): string { ... }
```

**New file:** `apps/mobile/src/screens/SrsReviewScreen.tsx`
- Apollo Client: `useQuery(SRS_REVIEW_QUERY, { skip: !userId })`
- Card flip animation via `Animated.Value` + `interpolate` (no CSS)
- 4 rating buttons: Again (1) / Hard (2) / Good (3) / Easy (5)
- On rate → `submitRating` mutation → advance to next card
- Empty state: "No cards due today — check back tomorrow!"
- `useFocusEffect` (React Navigation) as pause guard

**New file:** `apps/mobile/src/screens/CertificatesScreen.tsx`
- Apollo Client `useQuery(MY_CERTIFICATES_QUERY)`
- `FlatList` of certificate cards
- Download button → `Linking.openURL(presignedUrl)` after fetching `certificateDownloadUrl` query
- Empty state: "No certificates yet"

**New file:** `apps/mobile/src/screens/__tests__/SrsReviewScreen.test.ts`
- Pure logic tests: `computeSessionStats` correct counts; `advanceCard` returns null at end; `formatDueDate` formatting

**New file:** `apps/mobile/src/screens/__tests__/CertificatesScreen.test.ts`
- Pure logic tests: certificate date formatting; verification code masking

**Modify:** `apps/mobile/src/navigation/MainTabNavigator.tsx` — if tabs not full, add SRS Review tab (Brain icon) and Certificates tab (Award icon)

---

### Agent-B5: Supergraph Compose Verify

**Modify:** `apps/gateway/supergraph.graphql`
- Verify `certificateDownloadUrl` field is in Query type (may have been added by A1)
- Verify `CourseListing` type matches the updated local SDL from A2 (title, description, instructorName, etc.)
- Verify `CourseListingFiltersInput` is present

**Run:** `pnpm --filter @edusphere/gateway compose` — confirm zero composition errors
**Report:** Paste the compose output; if any errors, fix the supergraph type definitions

---

## Sprint C — QA Gate (Sequential)

### Agent-C: E2E + Security + Final Sync

**New E2E specs:**

| File | Assertions |
|------|-----------|
| `apps/web/e2e/certificates.spec.ts` | Login → /certificates → heading visible; empty/cards state; no raw MinIO key in DOM; `toHaveScreenshot` |
| `apps/web/e2e/marketplace-data.spec.ts` | Mock courseListings with title field → assert real title appears, UUID pattern absent; filter input visible; `toHaveScreenshot` |
| `apps/web/e2e/quiz-builder.spec.ts` | Instructor login → /courses/.../quiz/new → heading visible; add question; submit form; `toHaveScreenshot` |
| `apps/web/e2e/srs-review.spec.ts` | Login → /srs-review → flashcard OR no-cards state visible; no `[object Object]` in DOM; `toHaveScreenshot` |

**Security tests (`tests/security/api-security.spec.ts`):**
- `certificateDownloadUrl` with another user's certId → expect `NotFoundException` (not 200 OK)
- `courseListings` filter with SQL injection string → Drizzle parameterized query returns empty/normal result (no 500)

**Final OPEN_ISSUES.md update:**
- Mark all P38 items as ✅ Fixed, listing exact E2E spec files
- Update Phase 38 entry to ✅ Complete

**README.md update:**
- Update test counts with new Phase 38 test additions

---

## Memory Safety Checklist

| Service / Component | Rule | Implementation |
|---------------------|------|----------------|
| `certificate.service.ts` | S3Client destroy | `this.s3.destroy()` in `onModuleDestroy()` |
| `CertificatesPage.tsx` | Download query cleanup | `pause: activeCertId === null` clears on unmount |
| `MarketplacePage.tsx` | Debounce cleanup | `clearTimeout(debounceRef.current)` in useEffect cleanup |
| `SrsReviewScreen.tsx` | Query pause | `useFocusEffect` sets `skip: true` when screen unfocuses |

---

## Security Invariants

| Check | Implementation |
|-------|---------------|
| Certificate download: user can only download their own cert | `WHERE cert.user_id = jwt.userId` before presigned URL generation |
| Marketplace filter: no SQL injection | Drizzle parameterized queries via `ilike()`, `lte()` (never raw string interpolation) |
| No PII in leaderboard | Confirmed from Phase 37: `displayName` only, no email |

---

## Critical Files

| File | Change |
|------|--------|
| `apps/subgraph-content/src/certificate/certificate.service.ts` | Add S3Client + `getCertificateDownloadUrl()` |
| `apps/subgraph-content/src/certificate/certificate.graphql` | Add `certificateDownloadUrl` query |
| `apps/subgraph-content/src/marketplace/marketplace.service.ts` | Rewrite `getListings()` with JOIN + filters |
| `apps/subgraph-content/src/marketplace/marketplace.graphql` | Update CourseListing type + add filters input |
| `apps/gateway/supergraph.graphql` | Add certificateDownloadUrl + verify CourseListing |
| `apps/web/src/pages/CertificatesPage.tsx` | NEW — certificate list + download UI |
| `apps/web/src/pages/QuizBuilderPage.tsx` | NEW — instructor quiz creation |
| `apps/web/src/pages/InstructorEarningsPage.tsx` | Fix `enabled: false` → mounted guard |
| `apps/web/src/pages/MarketplacePage.tsx` | Real fields + filter bar |
| `apps/web/src/components/AppSidebar.tsx` | Add Certificates + SRS Review + QuizBuilder nav items |
| `apps/mobile/src/screens/SrsReviewScreen.tsx` | NEW |
| `apps/mobile/src/screens/CertificatesScreen.tsx` | NEW |

---

## Verification Steps

### After Sprint A
```bash
# CourseListing JOIN works:
# mcp__graphql__query-graphql: { courseListings { title instructorName description } }
# → returns real course titles (not empty/null)

# certificateDownloadUrl in SDL:
grep "certificateDownloadUrl" apps/gateway/supergraph.graphql  # → 1 match
grep "certificateDownloadUrl" apps/subgraph-content/src/certificate/certificate.graphql  # → 1 match
```

### After Sprint B
```bash
# CertificatesPage exists and renders
grep -r "CertificatesPage" apps/web/src/lib/router.tsx  # → 1 match

# No raw UUID pattern in MarketplacePage
grep "slice(0,8)" apps/web/src/pages/MarketplacePage.tsx  # → 0 results

# QuizBuilderPage exists
ls apps/web/src/pages/QuizBuilderPage.tsx  # → exists
```

### After Sprint C (Full QA Gate)
```bash
pnpm turbo test               # all pass
pnpm turbo typecheck          # 0 TypeScript errors
pnpm turbo lint               # 0 warnings
pnpm --filter @edusphere/web test:e2e  # all E2E pass
pnpm test:security            # 0 failures
./scripts/health-check.sh     # all services UP
```

---

## OPEN_ISSUES.md Entry

```
FEAT-PHASE38-CERTIFICATES-MARKETPLACE-QUIZ-SRS | 🟡 In Progress | HIGH
Phase 38 — Assessment Engine / Certificate Download / Marketplace Data / Quiz Builder / SRS UI
10 items: certificate presigned URL + CertificatesPage, CourseListing JOIN fix + filters,
MarketplacePage real data + filter UI, QuizBuilderPage (instructor), InstructorEarnings fix,
mobile SRS Review + Certificates screens, AppSidebar nav items, docs sync
Files: apps/web, apps/mobile, apps/subgraph-content, apps/gateway
Tests required: unit + E2E (certificates, marketplace, quiz-builder, srs-review) + security
```
