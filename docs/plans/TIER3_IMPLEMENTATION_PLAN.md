# Tier 3 Features — Full Implementation Plan
**Date:** 2026-02-24 | **Scope:** F-025 → F-039 (15 features)

## Context
Tier 1 (12) + Tier 2 (12) = 24 features completed (100%). This plan covers the remaining 15 Tier 3 features from `docs/plans/COMPETITIVE_GAP_ANALYSIS_PLAN.md`. All features use established codebase patterns (RLS, OnModuleDestroy, NATS, Drizzle, shadcn/ui).

---

## Sprint Organization — 5 Parallel Batches

### Sprint A — Quick Wins (4 agents in parallel)
| Feature | Effort | Subgraph | Agent |
|---------|--------|---------|-------|
| **F-039** VPAT / HECVAT Documentation | S | docs only | A-1 |
| **F-029** BI Tool Export (Power BI / Tableau) | M | subgraph-content | A-2 |
| **F-035** Social Following System | M | subgraph-core | A-3 |
| **F-027** CPD/CE Credit Tracking + Export | M | subgraph-content | A-4 |

### Sprint B — Mid Complexity (4 agents in parallel, after Sprint A)
| Feature | Effort | Subgraph | Agent |
|---------|--------|---------|-------|
| **F-028** xAPI / LRS Integration | L | subgraph-content | B-1 |
| **F-032** SCORM 2004 Export | L | subgraph-content | B-2 |
| **F-026** Stackable Credentials / Nanodegrees | L | subgraph-content | B-3 |
| **F-034** BBB Breakout Rooms + Polls | L | subgraph-content | B-4 |

### Sprint C — Dependent Features (3 agents in parallel, after Sprint A+B)
| Feature | Depends On | Subgraph | Agent |
|---------|-----------|---------|-------|
| **F-036** Social Content Recommendations | F-035 | subgraph-knowledge | C-1 |
| **F-030** 360° Multi-Rater Assessments | F-026 rubric pattern | subgraph-content | C-2 |
| **F-033** CRM Integration (Salesforce) | F-019 SCIM pattern | subgraph-core | C-3 |

### Sprint D — Complex / External Deps (2 agents in parallel, after Sprint B+C)
| Feature | Effort | Subgraph | Agent |
|---------|--------|---------|-------|
| **F-025** OpenBadges 3.0 Blockchain Credentials | XL | subgraph-content | D-1 |
| **F-031** Instructor Marketplace + Revenue Sharing | XL | subgraph-core | D-2 |

### Sprint E — Strategic / Business-Dependent (2 agents, after D)
| Feature | Effort | Subgraph | Agent |
|---------|--------|---------|-------|
| **F-037** No-Code Custom Portal Builder | XL | apps/web | E-1 |
| **F-038** Pre-Built Compliance Course Library | XL | subgraph-content | E-2 |

---

## Detailed Feature Specs

### F-039: VPAT / HECVAT Documentation (S)
**What:** Generate Voluntary Product Accessibility Template v2.5 + HECVAT (Higher Education Community Vendor Assessment Toolkit) documents based on the already-implemented WCAG 2.2 AA compliance (F-024).

**Files to create:**
- `docs/compliance/VPAT_v2.5.md` — Full VPAT with all 50 SC criteria mapped to F-024 implementation
- `docs/compliance/HECVAT_LITE.md` — HECVAT Lite questionnaire responses (data security, privacy, availability)
- `apps/web/src/pages/AccessibilityStatementPage.tsx` — Public `/accessibility` page with VPAT summary
- Route in `apps/web/src/lib/router.tsx` — `/accessibility` (no auth required)

**Reuse:** `docs/plans/WCAG22_ACCESSIBILITY_CHECKLIST.md` as source of truth

---

### F-029: BI Tool Export — Power BI / Tableau (M)
**What:** OData v4 REST endpoint + API key auth so BI tools can pull analytics data.

**DB:** New table `bi_api_tokens` (clone of `scim_tokens` + `type: 'BI_API'`)

**Files to create:**
- `packages/db/src/schema/bi-tokens.ts` — `bi_api_tokens` table (clone of scim.ts pattern)
- `apps/subgraph-content/src/bi-export/bi-export.controller.ts` — HTTP Controller:
  - `GET /odata/v1/Enrollments` — paginated enrollment data (OData format)
  - `GET /odata/v1/Completions` — completion events
  - `GET /odata/v1/QuizResults` — quiz scores
  - `GET /odata/v1/ActivityLog` — daily learning activity
  - `GET /odata/v1/$metadata` — OData service document
- `apps/subgraph-content/src/bi-export/bi-token.service.ts` — API key management (clone scim-token.service.ts)
- `apps/subgraph-content/src/bi-export/bi-export.service.ts` — OData query + CSV/JSON response
- `apps/subgraph-content/src/bi-export/bi-export.graphql` — `generateBIApiKey`, `revokeBIApiKey`, `bIApiTokens` query
- `apps/subgraph-content/src/bi-export/bi-export.resolver.ts`
- `apps/subgraph-content/src/bi-export/bi-export.module.ts`
- `apps/web/src/pages/BiExportSettingsPage.tsx` — `/admin/bi-export`
- Tests: `bi-export.service.spec.ts` (8 tests) + `bi-token.service.memory.spec.ts` (3 tests)

**Reuse:**
- `apps/subgraph-core/src/scim/scim-token.service.ts` — token auth pattern
- `apps/subgraph-core/src/scim/scim.controller.ts` — HTTP controller + Bearer auth
- `apps/subgraph-content/src/analytics/analytics.service.ts` — data source

---

### F-035: Social Following System (M)
**What:** User-to-user follow relationships with counts and mutual-follower detection.

**DB:** New `packages/db/src/schema/social.ts`:
```
user_follows: { id, follower_id, following_id, tenant_id, created_at }
Unique: (follower_id, following_id)
RLS: User sees own follows + other public profiles within tenant
```

**Files to create:**
- `packages/db/src/schema/social.ts` — `user_follows` table + RLS
- `apps/subgraph-core/src/social/social.service.ts` — `followUser`, `unfollowUser`, `getFollowers(userId)`, `getFollowing(userId)`, `isFollowing(currentUserId, targetUserId)`, `getMutualFollowers`
- `apps/subgraph-core/src/social/social.graphql` — SDL:
  ```graphql
  extend type User { followersCount: Int!, followingCount: Int!, isFollowedByMe: Boolean! }
  type Mutation { followUser(userId: ID!): Boolean!, unfollowUser(userId: ID!): Boolean! }
  type Query { myFollowers(limit: Int): [User!]!, myFollowing(limit: Int): [User!]! }
  ```
- `apps/subgraph-core/src/social/social.resolver.ts`
- `apps/subgraph-core/src/social/social.module.ts`
- `apps/web/src/components/FollowButton.tsx` — toggle follow/unfollow
- `apps/web/src/components/FollowersList.tsx` — modal with follower list
- Updated `apps/web/src/pages/PublicProfilePage.tsx` — add follower/following counts + FollowButton
- NATS event: `EDUSPHERE.user.followed` → badge award (SOCIAL category)
- Tests: `social.service.spec.ts` (8 tests) + `social.service.memory.spec.ts` (3 tests)

**Reuse:**
- `apps/subgraph-core/src/user/user.service.ts` — service pattern + OnModuleDestroy
- `packages/db/src/schema/gamification.ts` — badge SOCIAL category already defined

---

### F-027: CPD/CE Credit Tracking + Regulatory Export (M)
**What:** Track Continuing Professional Development hours per course completion; export in regulatory formats (NASBA, AMA).

**DB:** New `packages/db/src/schema/cpd.ts`:
```
cpd_credit_types: { id, tenant_id, name, regulatory_body, credit_hours_per_hour, active }
course_cpd_credits: { id, course_id, tenant_id, credit_type_id, credit_hours, approved_at }
user_cpd_log: { id, user_id, tenant_id, course_id, credit_type_id, earned_hours, completion_date, certificate_id }
```

**Files to create:**
- `packages/db/src/schema/cpd.ts` — 3 tables + RLS
- `apps/subgraph-content/src/cpd/cpd.service.ts` — NATS consumer `EDUSPHERE.course.completed` → log CPD hours; `getUserCPDReport(userId, dateRange)`, `exportCPDReport(format: 'NASBA'|'AMA'|'CSV')`
- `apps/subgraph-content/src/cpd/cpd-export.service.ts` — CSV/PDF generation (clone compliance-pdf.service.ts)
- `apps/subgraph-content/src/cpd/cpd.graphql` + resolver + module
- `apps/web/src/pages/CPDReportPage.tsx` — `/cpd` learner view of earned credits
- `apps/web/src/pages/CPDSettingsPage.tsx` — `/admin/cpd` admin config of credit types per course
- Tests: `cpd.service.spec.ts` (8 tests) + `cpd.service.memory.spec.ts` (3 tests)

**Reuse:**
- `apps/subgraph-content/src/compliance/compliance.service.ts` — export + presigned URL pattern
- `apps/subgraph-content/src/compliance/csv-generator.ts` — CSV injection-safe generation
- `apps/subgraph-content/src/compliance/compliance-pdf.service.ts` — PDFKit table rendering

---

### F-028: xAPI / LRS Integration (L)
**What:** Emit xAPI 1.0.3 statements to an external Learning Record Store (LRS) for all learning events. Also provide a self-hosted LRS endpoint.

**DB:** New `packages/db/src/schema/xapi.ts`:
```
xapi_tokens: { id, tenant_id, token_hash, lrs_endpoint, description, is_active, created_at }
xapi_statements: { id, tenant_id, statement_id (uuid unique), actor, verb, object, result, context (all jsonb), stored_at }
```

**Files to create:**
- `packages/db/src/schema/xapi.ts`
- `apps/subgraph-content/src/xapi/xapi-statement.service.ts` — NATS subscriber for ALL EDUSPHERE.* events → map to xAPI statements → store locally + forward to configured external LRS
- `apps/subgraph-content/src/xapi/lrs.controller.ts` — Self-hosted LRS:
  - `POST /xapi/statements` — receive xAPI statements (Bearer auth)
  - `GET /xapi/statements` — query statements (actorId, verbId, since, until, limit)
  - `GET /xapi/about` — LRS capabilities document
- `apps/subgraph-content/src/xapi/xapi-token.service.ts` — API token management
- `apps/subgraph-content/src/xapi/xapi.graphql` + resolver + module
- `apps/web/src/pages/XapiSettingsPage.tsx` — `/admin/xapi` with LRS endpoint + token management
- xAPI verb mapping:
  - `course.completed` → verb `http://adlnet.gov/expapi/verbs/completed`
  - `content.viewed` → verb `http://id.tincanapi.com/verb/viewed`
  - `quiz.passed` → verb `http://adlnet.gov/expapi/verbs/passed`
  - `annotation.created` → verb `http://risc-inc.com/annotator/verbs/annotated`
- Tests: `xapi-statement.service.spec.ts` (10 tests) + `xapi-statement.service.memory.spec.ts` (3 tests)

**Reuse:**
- `apps/subgraph-core/src/scim/scim.controller.ts` — HTTP controller + Bearer auth pattern
- `apps/subgraph-core/src/scim/scim-token.service.ts` — token auth
- `packages/nats-client/src/events.ts` — all existing event types

---

### F-032: SCORM 2004 Export (L)
**What:** Package any EduSphere course (with its content items) as a SCORM 2004-compliant ZIP file for use in external LMS.

**Files to create:**
- `apps/subgraph-content/src/scorm/scorm-export.service.ts`:
  - `exportCourse(courseId, tenantCtx)` → fetch course + modules + content items → generate imsmanifest.xml → download content from MinIO → ZIP everything → upload ZIP to MinIO → return presigned URL
  - Manifest generation: `generateManifest2004(course, items)` → SCORM 2004 4th Edition XML
  - SCORM 2004 API shim injection into HTML files for standalone content items
- `apps/subgraph-content/src/scorm/scorm-export.graphql` — `exportCourseAsScorm(courseId: ID!): String!` (presigned URL)
- `apps/web/src/components/ScormExportButton.tsx` — Button in course detail for instructors
- Tests: `scorm-export.service.spec.ts` (8 tests)

**Reuse:**
- `apps/subgraph-content/src/scorm/scorm-manifest.parser.ts` — understand manifest structure
- `apps/subgraph-content/src/scorm/scorm-import.service.ts` — ZIP/MinIO/S3Client pattern
- `apps/subgraph-content/src/compliance/compliance.service.ts` — presigned URL generation pattern

---

### F-026: Stackable Credentials / Nanodegrees (L)
**What:** Group courses into "programs" with prerequisite chains. Earning all program courses issues a Nanodegree certificate.

**DB:** New `packages/db/src/schema/programs.ts`:
```
credential_programs: { id, tenant_id, title, description, badge_emoji, required_course_ids (uuid[]), total_hours, published }
program_enrollments: { id, user_id, program_id, tenant_id, enrolled_at, completed_at, certificate_id }
program_prerequisites: { program_id, prerequisite_program_id }
```

**Files to create:**
- `packages/db/src/schema/programs.ts`
- `apps/subgraph-content/src/programs/program.service.ts` — CRUD + completion check (NATS `course.completed` → check if all program courses done → issue nanodegree cert)
- `apps/subgraph-content/src/programs/program.graphql` + resolver + module
- `apps/web/src/pages/ProgramsPage.tsx` — `/programs` grid of nanodegrees
- `apps/web/src/pages/ProgramDetailPage.tsx` — `/programs/:id` with course list + progress
- Tests: `program.service.spec.ts` (8 tests) + `program.service.memory.spec.ts` (3 tests)

**Reuse:**
- `apps/subgraph-content/src/certificate/certificate.service.ts` — cert generation on completion
- `apps/subgraph-content/src/certificate/certificate.graphql` — cert types

---

### F-034: BBB Breakout Rooms + Polls (L)
**What:** Add breakout room creation during live sessions and real-time polling (during live sessions).

**DB:** New columns in `live_sessions`:
```
breakout_rooms: { id, session_id, tenant_id, room_name, bbb_breakout_id, capacity, assigned_user_ids (uuid[]) }
session_polls: { id, session_id, tenant_id, question, options (jsonb), is_active, created_at }
poll_votes: { id, poll_id, user_id, tenant_id, option_index, voted_at }
```

**Files to create:**
- `packages/db/src/schema/live-session-extensions.ts`
- `apps/subgraph-content/src/live-session/breakout.service.ts` — Create BBB breakout rooms via `sendBreakoutRooms` API + track assignments
- `apps/subgraph-content/src/live-session/poll.service.ts` — Create/activate/close polls; tally votes; NATS `EDUSPHERE.poll.vote` events for real-time updates
- `apps/subgraph-content/src/live-session/live-session-extensions.graphql` — `createBreakoutRooms`, `createPoll`, `vote`, `pollResults` subscription
- `apps/web/src/components/PollWidget.tsx` — Moderator creates poll + learner votes in real-time
- `apps/web/src/components/BreakoutRoomPanel.tsx` — Moderator assigns participants to rooms
- Tests: `poll.service.spec.ts` (8 tests), `breakout.service.spec.ts` (6 tests)

**Reuse:**
- `apps/subgraph-content/src/live-session/bbb.client.ts` — BBB REST API + checksum auth

---

### F-036: Social Content Recommendations (L)
**What:** "Learners you follow are studying X" — collaborative filtering on follow graph.

**DB:** No new tables; queries `user_follows` (F-035) + `user_progress` + content items.

**Files to create:**
- `apps/subgraph-knowledge/src/graph/social-recommendations.service.ts`:
  - `getRecommendations(userId, tenantId, limit)` — Apache AGE Cypher: find what users-I-follow are currently studying, ranked by recency + mutual-follow weight
  - `getSocialFeed(userId, tenantId)` — recent learning activity of followed users
- `apps/subgraph-knowledge/src/graph/social-recommendations.graphql` — `socialRecommendations`, `socialFeed` queries
- `apps/web/src/components/SocialFeedWidget.tsx` — Dashboard widget showing "Following Activity"
- Tests: `social-recommendations.service.spec.ts` (6 tests)

**Reuse:**
- `apps/subgraph-knowledge/src/graph/skill-gap.service.ts` — Apache AGE Cypher pattern
- `apps/subgraph-knowledge/src/graph/skill-gap.recommendations.ts` — recommendation result type

---

### F-030: 360° Multi-Rater Assessments (L)
**What:** Campaign-based multi-rater feedback: self-assessment + peer + manager + direct report ratings on a shared rubric. Results aggregated anonymously.

**DB:** New `packages/db/src/schema/assessments.ts`:
```
assessment_campaigns: { id, tenant_id, course_id, target_user_id, title, rubric (jsonb), due_date, status (DRAFT|ACTIVE|COMPLETED) }
assessment_responses: { id, campaign_id, responder_id, tenant_id, rater_role (SELF|PEER|MANAGER|DIRECT_REPORT), criteria_scores (jsonb), narrative, submitted_at }
assessment_results: { id, campaign_id, target_user_id, tenant_id, aggregated_scores (jsonb), summary, generated_at }
```

**Files to create:**
- `packages/db/src/schema/assessments.ts`
- `apps/subgraph-content/src/assessment/assessment.service.ts` — Create campaign, invite respondents, collect responses, trigger aggregation
- `apps/subgraph-content/src/assessment/assessment-aggregator.service.ts` — Pure aggregation: average criteria scores per rater-role; generate AI narrative summary via Vercel AI SDK (SI-10 consent check)
- `apps/subgraph-content/src/assessment/assessment.graphql` + resolver + module
- `apps/web/src/pages/AssessmentCampaignPage.tsx` — Instructor creates campaigns
- `apps/web/src/components/AssessmentForm.tsx` — Rater submits feedback (Likert scales + narrative)
- `apps/web/src/components/AssessmentResultReport.tsx` — Spider chart + narrative (similar to RoleplayEvaluationReport.tsx)
- Tests: `assessment.service.spec.ts` (10 tests) + `assessment.service.memory.spec.ts` (3 tests)

**Reuse:**
- `apps/subgraph-content/src/quiz/quiz-grader.service.ts` — Likert scoring algorithm
- `apps/subgraph-agent/src/ai/roleplay.workflow.ts` — AI evaluation + Zod generateObject pattern
- `packages/db/src/schema/scenarios.ts` — `EvaluationResult` JSONB type pattern

---

### F-033: CRM Integration — Salesforce (M)
**What:** Sync EduSphere course completions → Salesforce activities. Salesforce → EduSphere enrollment via webhook.

**DB:** New `packages/db/src/schema/crm.ts`:
```
crm_connections: { id, tenant_id, provider (SALESFORCE), access_token (encrypted), refresh_token (encrypted), instance_url, connected_by_user_id, expires_at, is_active }
crm_sync_log: { id, tenant_id, operation, external_id, status, error_message, created_at }
```

**Files to create:**
- `packages/db/src/schema/crm.ts`
- `apps/subgraph-core/src/crm/salesforce.client.ts` — OAuth 2.0 flow + REST API calls (create Activity record on completion)
- `apps/subgraph-core/src/crm/crm.service.ts` — NATS consumer `EDUSPHERE.course.completed` → create Salesforce Activity; webhook `/crm/salesforce/webhook` → enroll user in course
- `apps/subgraph-core/src/crm/crm.controller.ts` — `POST /crm/salesforce/webhook` (HMAC-verified), `GET /crm/salesforce/oauth-callback`
- `apps/subgraph-core/src/crm/crm.graphql` + resolver + module
- `apps/web/src/pages/CrmSettingsPage.tsx` — `/admin/crm` with "Connect Salesforce" OAuth button + sync log
- Tests: `crm.service.spec.ts` (8 tests) + `crm.service.memory.spec.ts` (3 tests)

**Reuse:**
- `apps/subgraph-core/src/scim/scim.controller.ts` — HTTP controller + webhook pattern
- `apps/subgraph-core/src/scim/scim-token.service.ts` — token/connection storage
- `apps/subgraph-content/src/compliance/compliance.service.ts` — NATS consumer pattern

---

### F-025: OpenBadges 3.0 / Blockchain Micro-Credentials (XL)
**What:** Issue verifiable W3C OpenBadges 3.0 credentials (JSON-LD + DID) on course/program completion. No external blockchain required — self-hosted with Ed25519 signature.

**DB:** New `packages/db/src/schema/open-badges.ts`:
```
open_badge_definitions: { id, tenant_id, name, description, image_url, criteria_url, tags (text[]), version (3.0) }
open_badge_assertions: { id, badge_definition_id, recipient_id, tenant_id, issued_at, expires_at, evidence_url, proof (jsonb - Ed25519 signature), revoked }
```

**Files to create:**
- `packages/db/src/schema/open-badges.ts`
- `apps/subgraph-content/src/open-badges/open-badge.service.ts`:
  - Generate Ed25519 key pair (tenant-specific, stored encrypted in env/Keycloak vault)
  - `issueCredential(userId, badgeDefinitionId)` → JSON-LD assertion + Ed25519 signature
  - `verifyCredential(assertionId)` → public endpoint, no auth
  - `revokeCredential(assertionId)`
- `apps/subgraph-content/src/open-badges/open-badge.controller.ts` — `GET /ob3/assertion/:id` (JSON-LD response, public)
- `apps/subgraph-content/src/open-badges/open-badge.graphql` + resolver + module
- `apps/web/src/components/OpenBadgeCard.tsx` — Display badge with "Verify" link + share to LinkedIn
- `apps/web/src/pages/BadgeVerifierPage.tsx` — `/verify/badge/:assertionId` public verification page
- Tests: `open-badge.service.spec.ts` (10 tests) + `open-badge.service.memory.spec.ts` (3 tests)

**Reuse:**
- `apps/subgraph-content/src/certificate/certificate.service.ts` — NATS event pattern
- `apps/subgraph-core/src/gamification/badge.service.ts` — badge definition pattern

---

### F-031: Instructor Marketplace + Revenue Sharing (XL)
**What:** Instructors sell courses; platform takes configurable % cut; Stripe handles payments and payouts.

**DB:** New `packages/db/src/schema/marketplace.ts`:
```
course_listings: { course_id, tenant_id, price_cents, currency (USD/EUR/ILS), stripe_price_id, is_published, revenue_split_percent (instructor %) }
stripe_customers: { user_id, tenant_id, stripe_customer_id (unique) }
purchases: { id, user_id, course_id, tenant_id, stripe_payment_intent_id, amount_cents, status (PENDING|COMPLETE|REFUNDED), purchased_at }
instructor_payouts: { id, instructor_id, tenant_id, stripe_transfer_id, amount_cents, period_start, period_end, status }
```

**Files to create:**
- `packages/db/src/schema/marketplace.ts`
- `apps/subgraph-content/src/marketplace/stripe.client.ts` — Stripe SDK wrapper: createPaymentIntent, createCustomer, createTransfer, constructWebhookEvent
- `apps/subgraph-content/src/marketplace/marketplace.service.ts` — `purchaseCourse`, `processWebhook`, `getInstructorEarnings`, `requestPayout`
- `apps/subgraph-content/src/marketplace/marketplace.controller.ts` — `POST /webhooks/stripe` (Stripe-signature verified)
- `apps/subgraph-content/src/marketplace/marketplace.graphql` + resolver + module
- `apps/web/src/pages/MarketplacePage.tsx` — Course store browse
- `apps/web/src/pages/InstructorEarningsPage.tsx` — Earnings dashboard + payout request
- `apps/web/src/components/PurchaseCourseButton.tsx` — Stripe Checkout integration
- Env vars needed: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PUBLISHABLE_KEY`
- Tests: `marketplace.service.spec.ts` (10 tests) + `stripe.client.spec.ts` (6 tests)

---

### F-037: No-Code Custom Portal Builder (XL)
**What:** Drag-and-drop page builder for tenant admins to customize their learning portal homepage.

**DB:** New `packages/db/src/schema/portal.ts`:
```
portal_pages: { id, tenant_id, slug, title, layout (jsonb - block tree), published, created_by }
portal_blocks: pre-defined block types stored as JSON (HeroBanner, FeaturedCourses, StatWidget, TextBlock, ImageBlock, CTAButton)
```

**Files to create:**
- `packages/db/src/schema/portal.ts`
- `apps/subgraph-core/src/portal/portal.service.ts` — CRUD for portal pages + block validation
- `apps/subgraph-core/src/portal/portal.graphql` + resolver + module
- `apps/web/src/pages/PortalBuilderPage.tsx` — `/admin/portal` — drag-and-drop grid using `@dnd-kit/core` (reuse existing DnD patterns from DragOrderQuestion)
- `apps/web/src/components/portal-builder/BlockPalette.tsx` — Available block types
- `apps/web/src/components/portal-builder/CanvasDropZone.tsx` — Drop target
- `apps/web/src/components/portal-builder/blocks/` — 6 block renderer components
- `apps/web/src/pages/PortalPage.tsx` — `/portal` — renders published portal for learners
- Tests: `portal.service.spec.ts` (8 tests)

**Reuse:**
- `apps/web/src/components/editor/RichEditor.tsx` — block editing patterns
- `apps/web/src/components/quiz/DragOrderQuestion.tsx` — `@dnd-kit` drag pattern

---

### F-038: Pre-Built Compliance Course Library (XL)
**What:** Curated SCORM-packaged compliance courses (GDPR, SOC 2, HIPAA, AML, harassment prevention) imported via F-017 SCORM infrastructure, pre-licensed for tenants to activate.

**DB:** New `packages/db/src/schema/course-library.ts`:
```
library_courses: { id, title, description, topic (GDPR|SOC2|HIPAA|AML|DEI), scorm_package_url (MinIO), license_type (FREE|PAID), price_cents, last_updated }
tenant_library_activations: { tenant_id, library_course_id, activated_at, activated_by }
```

**Files to create:**
- `packages/db/src/schema/course-library.ts`
- `apps/subgraph-content/src/course-library/library.service.ts` — List available library courses; `activateCourse(tenantId, libraryId)` → clone SCORM package into tenant's course catalog via SCORM import service
- `apps/subgraph-content/src/course-library/library.graphql` + resolver + module
- `apps/web/src/pages/CourseLibraryPage.tsx` — `/library` — browse + activate compliance courses
- Seed script: `packages/db/src/seed/library-courses.ts` — Insert demo library courses (using existing SCORM seed fixtures)
- Tests: `library.service.spec.ts` (6 tests)

**Reuse:**
- `apps/subgraph-content/src/scorm/scorm-import.service.ts` — activation clones SCORM package

---

## Critical Files to Modify (All Sprints)

| File | What to Add |
|------|------------|
| `packages/db/src/schema/index.ts` | Export new schemas per sprint |
| `apps/web/src/lib/router.tsx` | New routes per sprint |
| `apps/web/src/components/Layout.tsx` | New nav links (admin section) |
| `packages/nats-client/src/events.ts` | New event types: `UserFollowedPayload`, `PollVotePayload`, `XapiStatementPayload` |
| `apps/subgraph-core/src/app.module.ts` | Register: SocialModule, CrmModule, PortalModule |
| `apps/subgraph-content/src/app.module.ts` | Register: BiExportModule, CpdModule, XapiModule, ScormExportModule (extends ScormModule), ProgramModule, BreakoutModule, AssessmentModule, OpenBadgeModule, MarketplaceModule, LibraryModule |
| `apps/subgraph-knowledge/src/app.module.ts` | Register: SocialRecommendationsModule |

---

## Environment Variables (New)

| Variable | Feature | Service |
|----------|---------|---------|
| `STRIPE_SECRET_KEY` | F-031 | subgraph-content |
| `STRIPE_WEBHOOK_SECRET` | F-031 | subgraph-content |
| `STRIPE_PUBLISHABLE_KEY` | F-031 | apps/web |
| `SALESFORCE_CLIENT_ID` | F-033 | subgraph-core |
| `SALESFORCE_CLIENT_SECRET` | F-033 | subgraph-core |
| `EXTERNAL_LRS_ENDPOINT` | F-028 | subgraph-content (optional) |
| `EXTERNAL_LRS_KEY` | F-028 | subgraph-content (optional) |
| `OPENBADGE_ISSUER_DID` | F-025 | subgraph-content |
| `OPENBADGE_PRIVATE_KEY` | F-025 | subgraph-content (Ed25519, base64) |

---

## Quality Gates (Each Sprint)

Per CLAUDE.md, every sprint must pass before proceeding:
```bash
pnpm turbo build --filter='./apps/*'   # 0 TS errors
pnpm turbo lint                          # 0 ESLint errors
pnpm turbo test -- --coverage            # 100% pass, coverage thresholds met
pnpm --filter @edusphere/gateway compose # supergraph composes
./scripts/health-check.sh               # all services healthy
```

Each new service requires:
- `*.service.spec.ts` — ≥6 unit tests
- `*.service.memory.spec.ts` — 3 memory safety tests (OnModuleDestroy)
- E2E test additions in `apps/web/e2e/`

---

## Execution: Launch Order

```
Sprint A (parallel): F-039, F-029, F-035, F-027
     ↓ (after A completes)
Sprint B (parallel): F-028, F-032, F-026, F-034
     ↓ (after A+B)
Sprint C (parallel): F-036, F-030, F-033
     ↓ (after B+C)
Sprint D (parallel): F-025, F-031
     ↓ (after D)
Sprint E (parallel): F-037, F-038
```

Total: **14 subgraph agents + 1 docs agent = 15 agents across 5 sprint waves**
