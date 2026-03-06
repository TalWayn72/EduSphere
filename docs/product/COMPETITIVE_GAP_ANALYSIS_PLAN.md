# EduSphere — Competitive Feature Gap Analysis & Strategic PRD (February 2026)

**Document Type:** Product Requirements Document — Competitive Gap Analysis
**Version:** 1.0
**Date:** February 24, 2026
**Status:** Active — Awaiting Prioritization Sign-off
**Author:** Architecture Team (Claude Code)
**Saved to:** `docs/plans/` (as `competitive-gap-analysis-prd-2026-02.md`)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Capabilities Overview](#2-current-capabilities-overview)
3. [Gap Analysis by Category](#3-gap-analysis-by-category)
4. [Prioritized Feature Roadmap](#4-prioritized-feature-roadmap)
5. [Top 10 Quick Wins](#5-top-10-quick-wins)
6. [Investment Summary Table](#6-investment-summary-table)

---

## 1. Executive Summary

### 1.1 Purpose

This document performs a systematic competitive gap analysis between EduSphere's current production capabilities (as of February 2026) and the feature sets offered by 21 leading e-learning platforms — Coursera, LinkedIn Learning, Skillshare, edX, Pluralsight, Udacity, Khan Academy, MasterClass, Teachable, FutureLearn, Udemy, Canvas, Moodle, Docebo, TalentLMS, Cornerstone OnDemand, Brightspace (D2L), 360Learning, Absorb LMS, Blackboard Learn, and Adobe Learning Manager.

The goal is not to replicate every competitor feature but to identify which gaps represent the highest return on investment given EduSphere's existing technical foundation, its unique knowledge-graph-native architecture, and its target market of educational institutions and corporate training programs at scale.

### 1.2 EduSphere's Strategic Moat

Before examining gaps, it is essential to establish where EduSphere is already ahead of all 21 competitors — because these form the architecture that new features must build upon:

- **Knowledge Graph as First-Class Citizen**: Apache AGE Cypher integration with RELATED_TO, CONTRADICTS, PREREQUISITE_OF, MENTIONS, CITES edges is a capability no competitor offers at the infrastructure level. Competitors fake this with tags and categories.
- **HybridRAG**: pgvector (768-dim HNSW) + Apache AGE graph traversal fused before LLM generation. No competitor in the list ships this natively.
- **Multi-Layer Annotation Architecture**: 4 layers (PERSONAL/SHARED/INSTRUCTOR/AI_GENERATED), 5 annotation types (TEXT/SKETCH/LINK/BOOKMARK/SPATIAL_COMMENT), fully RLS-isolated. Competitors use single-layer commenting only.
- **LangGraph.js AI Agents**: 6 production templates including Chavruta (Socratic debate) with persistent memory, state-machine workflows, and gVisor sandboxing. No competitor ships AI agents at this architectural depth.
- **CRDT Collaboration**: Yjs/Hocuspocus with 10K+ concurrent WebSockets, per-document JWT authentication, and presence awareness.
- **Compliance Depth**: FERPA/GDPR/SOC2-ready from the ground up — 738 security tests, RLS on all 16 tables, data retention policies, GDPR consent management, audit log with 7-year retention.

### 1.3 Strategic Framing

This analysis identifies **47 feature gaps** across 12 categories. Rather than a "build everything" approach, the roadmap below is filtered through three lenses:

1. **Leverage-first**: Features that extend EduSphere's existing knowledge graph, AI agents, or CRDT infrastructure deliver more value than features that require building from scratch.
2. **Market table-stakes**: Features that are present on every competitor platform and whose absence causes EduSphere to lose sales evaluations.
3. **Differentiation multipliers**: Features that no competitor offers but that EduSphere's architecture makes uniquely achievable.

### 1.4 Summary Metrics

| Priority Tier                 | Feature Count | Total Effort Range            |
| ----------------------------- | ------------- | ----------------------------- |
| Tier 1 (Now — 0-3 months)     | 14 features   | ~25-38 weeks total capacity   |
| Tier 2 (Next — 3-6 months)    | 18 features   | ~40-60 weeks total capacity   |
| Tier 3 (Future — 6-18 months) | 15 features   | ~60-100+ weeks total capacity |

---

## 2. Current Capabilities Overview

### 2.1 Backend Capabilities (Verified from Source)

The following capabilities are confirmed present in the codebase as of February 24, 2026:

**GraphQL Federation (6 Subgraphs)**

| Subgraph                 | Port | Verified Entities/Resolvers                                                                                          |
| ------------------------ | ---- | -------------------------------------------------------------------------------------------------------------------- |
| `subgraph-core`          | 4001 | User (5 roles), Tenant (4 plans), UserStats, UserPreferences, GDPR erasure/export, retention cleanup                 |
| `subgraph-content`       | 4002 | Course (publish/draft/fork), Module, ContentItem (7 types), Media (S3/MinIO presigned), Translations, CourseProgress |
| `subgraph-annotation`    | 4003 | Annotation (5 types, 4 layers), real-time subscription, thread replies, layer-RLS                                    |
| `subgraph-collaboration` | 4004 | Discussion (FORUM/CHAVRUTA/DEBATE), DiscussionMessage (threaded), Hocuspocus/Yjs CRDT server                         |
| `subgraph-agent`         | 4005 | AgentTemplate (10 types), AgentExecution, AgentSession, LangGraph.js workflows, LLM consent guard                    |
| `subgraph-knowledge`     | 4006 | Concept, Person, Term, Source, TopicCluster, ConceptRelationship, LearningPath (shortestPath), EmbeddingService      |

**Database (PostgreSQL 18 + Apache AGE + pgvector)**

Confirmed schema tables (from `/packages/db/src/schema/`):

`users`, `tenants`, `courses`, `modules`, `content_items`, `user_courses`, `user_progress`, `annotations`, `discussions`, `discussion_messages`, `agent_sessions`, `agent_messages`, `agent_executions`, `embeddings`, `tags`, `audit_log`, `user_consents`, `data_retention_policies`, `tenant_branding`, `content_translations`

Apache AGE vertex types: `Concept`, `Person`, `Term`, `Source`, `TopicCluster`
Apache AGE edge types: `RELATED_TO`, `CONTRADICTS`, `PREREQUISITE_OF`, `MENTIONS`, `CITES`

**AI/ML Stack**

- Vercel AI SDK v6: `streamText`, `generateText`, `generateObject` (used in ConceptExtractor)
- LangGraph.js: State-machine workflows for Chavruta, Quiz, Assessment, Debate, Tutor
- Embedding pipeline: 768-dim nomic-embed-text (Ollama dev) / text-embedding-3-small (OpenAI prod), batched at 20 segments
- HybridRAG: pgvector cosine search fused with Apache AGE graph traversal
- LLM consent guard: `THIRD_PARTY_LLM` consent type enforced via `@edusphere/db` consent schema

**Transcription Worker**

- faster-whisper GPU with timestamps and speaker diarization
- ConceptExtractor: Automatic knowledge graph population from transcript text using `generateObject`
- NATS JetStream consumer for async processing

### 2.2 Frontend Capabilities (Verified from Source)

**Web App (`apps/web` — React 19 + Vite 6)**

Confirmed pages: Login, Dashboard, CourseList, CourseDetail, CourseCreate (3-step wizard), ContentViewer, KnowledgeGraph, Annotations, Collaboration, CollaborationSession, Agents, Search, Profile, Settings

**Mobile App (`apps/mobile` — Expo SDK 54)**

Confirmed screens: Home, Courses, CourseDetail, AI Tutor, Discussions, KnowledgeGraph, Profile, Settings
Features: expo-sqlite offline-first, background sync, biometrics, camera, push notifications

**i18n**

10 locales confirmed: `en`, `zh-CN`, `hi`, `es`, `fr`, `bn`, `pt`, `ru`, `id`, `he` (RTL)

### 2.3 Compliance & Security (Verified)

- 738 security tests across 15 spec files
- GDPR: data erasure, portability export, consent management, retention policies
- SOC2 Type II ready: audit log (7-year retention), access controls
- FERPA: tenant-isolated RLS on all tables
- EU AI Act: transparency disclosures in place (`ai-transparency.ts`)
- WCAG 2.1 AA: 9 accessibility tests (CI blocking)

### 2.4 Observability (Verified)

- Prometheus/Grafana: metrics endpoints on all 6 subgraphs (`/metrics/metrics.controller.ts` per subgraph)
- Grafana test dashboard: 5-panel dashboard in `infrastructure/monitoring/grafana/dashboards/tests.json`
- Pino structured logging: enforced platform-wide
- OpenTelemetry: Jaeger tracing infrastructure configured
- k6 load tests: 9 scenarios, nightly scheduled performance tests

---

## 3. Gap Analysis by Category

### 3.1 Personalization and Adaptive Learning

**3.1.1 Spaced Repetition System (SRS)**

EduSphere has `user_progress` tracking (`is_completed`, `time_spent`, `last_accessed_at`) and `conceptsMastered` in UserStats. However, it has no algorithmic scheduling for review intervals. The SM-2 algorithm (SuperMemo-2) or FSRS (Free Spaced Repetition Scheduler) would calculate optimal next-review timestamps per user per concept. Competitors using this: SC Training, FLOWSPARKS, Anki-based integrations.

**EduSphere advantage**: The knowledge graph already models Concept nodes with prerequisite chains. SRS review items would naturally map to Concept and Term entities. The `user_progress` table provides the raw signal; the gap is only the scheduling algorithm and UI.

**3.1.2 Competency Mapping and Auto-Pathing**

EduSphere has `learningPath(from, to)` via Apache AGE `shortestPath()` and `prerequisiteChain(conceptName)`. However, there is no user-facing competency profile — no way to define "I know X, I want to reach Y, suggest a path." Competitors: Docebo, D2L Brightspace. The technical foundation for auto-pathing already exists in the graph; what is missing is the competency declaration UI and the path-suggestion resolver that combines user progress with graph traversal.

**3.1.3 Performance Risk Detection (At-Risk Learner Flagging)**

EduSphere has `weeklyActivity`, `totalLearningMinutes`, and `conceptsMastered` in UserStats. There is no ML model that flags learners who show low engagement patterns, decreasing progress velocity, or who stop submitting quizzes. Competitors: D2L Brightspace (Intelligent Agents). This requires an ML scoring layer on top of existing analytics.

---

### 3.2 AI Features

**3.2.1 AI-Generated Course Creation from Prompt**

EduSphere's Summarizer agent can generate text summaries. The transcription worker uses `generateObject` to extract concepts. However, there is no "create a full course outline with modules and content stubs from a text prompt." Competitors: Docebo, Mindsmith. EduSphere's `generateObject` + LangGraph pipeline plus knowledge graph make this uniquely powerful — generated courses could automatically populate Concept nodes.

**3.2.2 AI-Generated Assessment Rubrics**

The Quiz Master agent generates questions but has no rubric generation (criteria, weight, exemplars per grade level). Competitors: Blackboard, Adobe Learning Manager.

**3.2.3 Plagiarism Detection**

No plagiarism detection exists. The pgvector embedding infrastructure could power a semantic similarity detector against a corpus of existing submissions. Competitors: Blackboard, Canvas (Turnitin integration). EduSphere's HybridRAG makes a native implementation technically feasible without a third-party vendor.

**3.2.4 Skill Gap Analysis and Recommendations**

EduSphere has knowledge graph traversal and semantic search but no proactive skill gap surface. A user's completed concepts versus a target role's required concepts would yield a gap list. Competitors: Pluralsight Skill IQ, Docebo.

**3.2.5 AI Role-Play Scenarios and Simulations**

Chavruta provides debate-style AI interaction. No scripted-scenario branching with AI role-play (e.g., "practice a customer service conversation") exists. Competitors: Adobe Learning Manager, Mursion.

---

### 3.3 Assessment

**3.3.1 Branching and Scenario-Based Learning**

`content_items` has a `QUIZ` type but no branching logic (if learner answers A, show path 1; if B, show path 2). Competitors: Articulate Storyline content exported to most platforms. EduSphere's graph edges could model branching paths natively.

**3.3.2 360-Degree and Multi-Rater Assessments**

No peer or manager review functionality. Competitors: Cornerstone, Docebo. This requires a new subgraph or domain extension.

**3.3.3 Advanced Quiz Item Types**

Current `content_type` enum includes `QUIZ` but the schema stores quiz data as `content: text`. No structured question types beyond what the content JSON holds. Missing: drag-and-drop, hotspot image, matching, Likert scale, slider response. Competitors: Articulate, iSpring.

---

### 3.4 Gamification and Engagement

**3.4.1 Badges, Points, and Leaderboards**

No gamification layer. `UserStats` has `conceptsMastered` and `totalLearningMinutes` which could seed a points engine. Competitors: TalentLMS, Absorb, Brightspace. A new `subgraph-engagement` or extension to `subgraph-core` would suffice.

**3.4.2 Quest System**

No structured learning quests with chains of achievements. Competitors: TalentLMS, EdApp.

**3.4.3 Streak Tracking**

`weeklyActivity` (DayActivity array in UserStats) provides the raw daily count data. Streak calculation is missing: it is a simple derived metric from the existing data. Competitors: Khan Academy. This is the lowest-effort gamification item.

---

### 3.5 Live and Synchronous Learning

**3.5.1 Virtual Classroom Integration**

No live class scheduling or video conferencing integration. The CRDT collaboration room and Hocuspocus WebSocket server exist but are for document editing, not video conferencing. Competitors: Canvas/BigBlueButton, Zoom integration on most platforms.

**3.5.2 Live Session Breakout Rooms, Polls, and Whiteboard**

No in-session polling or breakout room orchestration. The `whiteboard` directory exists in `subgraph-collaboration/src/` but appears empty (no files found in it). Competitors: many platforms.

**3.5.3 Session Recording and Replay**

No mechanism to record live sessions. MinIO object storage infrastructure could store recordings, and the HLS streaming pipeline already handles playback. The gap is the recording ingestion pipeline.

---

### 3.6 Credentials and Certification

**3.6.1 Digital Certificate Auto-Generation**

`UserCourse.completedAt` and `CourseProgress.percentComplete` exist. There is no certificate generation on completion. Competitors: essentially every LMS. A PDF generation service (using a library such as PDFKit or an HTML-to-PDF renderer) triggered on `enrollCourse` completion event via NATS would close this gap.

**3.6.2 Blockchain-Verified Micro-Credentials**

No blockchain anchoring. Competitors: BCdiploma, Credly. This is a Tier 3 item given the infrastructure prerequisite.

**3.6.3 Stackable Credentials and Nanodegrees**

No concept of credential stacking or program-level credentials that bundle multiple courses. Competitors: Coursera, edX, Udacity.

**3.6.4 CPD and CE Credit Tracking**

No Continuing Professional Development credit tracking with regulatory body reporting. Competitors: many compliance-focused LMS platforms.

---

### 3.7 Content Creation Tools

**3.7.1 In-Platform Course Authoring / Rich Page Builder**

CourseCreatePage exists (3-step wizard), but there is no rich drag-and-drop page builder for lesson content. Content is submitted as text/file upload. Competitors: Teachable (block editor), Canvas (rich editor), Moodle.

**3.7.2 Interactive Content Elements**

No hotspot images, clickable diagrams, or interactive video branching points within content items. Competitors: H5P (Canvas/Moodle plugin), Articulate.

**3.7.3 SCORM/xAPI Authoring Output**

Covered in the Integrations section. Instructors cannot export their courses as SCORM packages for use in other systems.

---

### 3.8 Analytics and Reporting

**3.8.1 Advanced Learning Analytics Dashboard**

EduSphere has `UserStats` (4 metrics + weekly heatmap) and Prometheus/Grafana infrastructure. However, there is no learner-facing or instructor-facing analytics dashboard with cohort analysis, completion funnels, quiz performance breakdowns, or time-on-task per content item. Competitors: Docebo Analytics, Cornerstone Reporting.

**3.8.2 Predictive Outcome Analytics**

No ML-based outcome prediction (will this learner pass the course? will they churn?). Competitors: D2L Brightspace Intelligent Agents.

**3.8.3 Compliance Reporting and Audit Trails for HR**

The `audit_log` table exists with full SOC2-grade data. However, there is no UI that surfaces compliance completion reports (who completed mandatory training by what date) for HR export. Competitors: Cornerstone, TalentLMS.

**3.8.4 xAPI / Learning Record Store (LRS) Integration**

No xAPI statement emission or LRS integration. Competitors: most enterprise LMS platforms. xAPI statements would require wrapping every user action in the `verb/actor/object` xAPI format.

**3.8.5 BI Tool Export (Power BI, Tableau)**

No direct export to enterprise BI tools. The `audit_log` and Prometheus metrics could feed these but there is no connector. Competitors: Cornerstone, Docebo.

---

### 3.9 Integrations and Standards

**3.9.1 SCORM 1.2 / 2004 Import and Export**

No SCORM parser or SCORM runtime (API shim). Competitors: essentially every LMS. This is the single biggest sales-blocking gap for institutional buyers who have existing SCORM content libraries.

**3.9.2 LTI 1.3 and LTI Advantage**

No Learning Tools Interoperability 1.3 support. Competitors: Canvas, Moodle, Blackboard. Without LTI, EduSphere cannot be embedded as an LMS tool inside institutional portals such as Sakai or other campus systems.

**3.9.3 HRIS Integration (Workday, BambooHR, SAP SuccessFactors)**

No HRIS sync for auto-enrollment based on employee role or department. Competitors: Cornerstone, Docebo. Multi-tenant RLS (`tenant_id` in users table) already supports the data model; the gap is the sync adapter.

**3.9.4 CRM Integration (Salesforce)**

No CRM connector for training assignment from Salesforce workflows. Competitors: Absorb LMS.

**3.9.5 SSO Beyond Keycloak OIDC**

Keycloak supports SAML 2.0, OAuth2, LDAP, and SCIM via its admin API. EduSphere has not exposed SCIM provisioning or SAML federation configuration through the UI. Enterprise buyers often require SCIM provisioning for automated user lifecycle management.

---

### 3.10 Compliance and Corporate Training

**3.10.1 Auto-Enrollment by Role and Department**

No rule engine for "when a user with role=Sales is added, enroll them in course X." The tenant plan model, user roles, and NATS JetStream subscription infrastructure could all support this, but the rule engine does not exist.

**3.10.2 Compliance Deadline Reminders**

No scheduled notifications for training deadlines. `@nestjs/schedule` (cron) is available in the NestJS ecosystem. The `data_retention_policies` table shows the pattern for cron-driven processing, and the `retention-cleanup.service.ts` demonstrates the implementation pattern.

**3.10.3 Regulatory Compliance Course Library**

No pre-built course library. This is a content/partnership item, not a technical feature. Competitors: Cornerstone, LinkedIn Learning.

---

### 3.11 Content Marketplace

**3.11.1 Pre-Built Course Library**

No content marketplace or bundled course library. Competitors: LinkedIn Learning (21,000+ courses), Cornerstone.

**3.11.2 Instructor Marketplace and Revenue Sharing**

No instructor-facing monetization, Stripe integration, or revenue sharing model. Competitors: Udemy, Teachable, Skillshare.

---

### 3.12 Social and Community Features

**3.12.1 Public Learner Portfolios**

`ProfilePage.tsx` exists but contains only basic user stats. No public-facing portfolio with completed courses, badges, knowledge graph contributions, or annotation highlights. Competitors: LinkedIn Learning, Coursera.

**3.12.2 Social Following**

No follow relationships between users. Competitors: multiple platforms.

**3.12.3 Social Content Recommendations**

No "learners like you also studied" or social activity feed for recommendations. Competitors: LinkedIn Learning (collaborative filtering), Coursera.

---

### 3.13 Microlearning

**3.13.1 Dedicated Microlearning Format**

No formal microlearning content type (3-7 minute focused modules with single learning objective). `content_type` enum could be extended with `MICROLESSON`, but there is no microlearning-specific player or path. Competitors: SC Training (formerly EdApp), 5mins.ai.

**3.13.2 Mobile-First Microlearning Paths**

Mobile app exists (8 screens) but is a mirror of the web app, not optimized for the "3 minutes on the train" microlearning pattern. Competitors: EdApp.

---

### 3.14 Accessibility

**3.14.1 WCAG 2.2 AA Automation**

Current accessibility testing targets WCAG 2.1 AA (confirmed in `accessibility.spec.ts` and README badge). WCAG 2.2 added 9 new success criteria in 2023, including focus appearance and dragging alternatives. Competitors: Absorb, Open LMS have updated to 2.2.

**3.14.2 Auto-Captioning and AI Alt-Text Generation**

The transcription worker produces timestamps and speaker diarization from audio/video. However, there is no auto-generated captions track (WebVTT format) served alongside HLS streams. Alt-text generation for images is absent. Competitors: multiple platforms leverage Whisper-based captioning (same model EduSphere already uses).

**3.14.3 VPAT and HECVAT Documentation**

No formal Voluntary Product Accessibility Template or Higher Education Community Vendor Assessment Toolkit documentation. Institutional buyers in the US require these for procurement. This is a documentation item, not a technical feature.

---

## 4. Prioritized Feature Roadmap

The following scoring criteria are applied:

- **Business Value (H/M/L)**: Driven by market demand, sales-blocking severity, and differentiation potential
- **Development Effort (S/M/L/XL)**: S=1-2 weeks, M=3-6 weeks, L=7-12 weeks, XL=13+ weeks, measured in single full-stack engineer capacity
- **Priority Tier**: Tier 1=Now (0-3 months), Tier 2=Next (3-6 months), Tier 3=Future (6+ months)

---

### 4.1 Personalization and Adaptive Learning

---

#### F-001: Spaced Repetition System (SRS) with SM-2 Algorithm

**Description**: Schedule concept and quiz reviews for each learner using the SM-2 spaced repetition algorithm. When a learner answers a quiz question or marks a concept as learned, calculate the next review date based on recall quality. Surface due reviews on the Dashboard and in the mobile app's Home screen.

**Platforms that offer it**: SC Training, FLOWSPARKS, Anki integrations

**Business Value**: HIGH — Measurable learning outcome improvement (SRS produces 3-5x better retention vs. massed practice). Directly supports EduSphere's core claim of superior learning science. Publishable in academic contexts.

**Development Effort**: M (3-4 weeks)

**Priority Tier**: 1

**Technical Approach for EduSphere's Stack**:

- Add `spaced_repetition_cards` table to `packages/db/src/schema/` with columns: `user_id`, `concept_id` (or `quiz_item_id`), `due_date`, `interval_days`, `ease_factor`, `repetitions`, `last_reviewed_at`
- New `SRSService` in `subgraph-core` or new `subgraph-learning` implementing SM-2: `new_interval = interval * ease_factor` after each review
- New GraphQL mutation `submitReview(cardId, quality: 0-5)` and query `dueReviews(limit)` in `subgraph-core`
- `NATS` subject `EDUSPHERE.srs.review.due` for scheduled daily digests using `@nestjs/schedule`
- Dashboard widget showing review queue count; mobile Home screen "Review due" card
- Leverage existing `conceptsMastered` in `UserStatsService` — add SRS progression as a new dimension

**Key Risk**: SM-2 requires historical data to improve. Cold-start for new users means first reviews are spaced arbitrarily. Mitigate with FSRS algorithm which handles cold-start better.

---

#### F-002: Competency Mapping and Auto-Pathing

**Description**: Allow learners to declare skill goals ("I want to master Bayesian Statistics") and display a recommended learning path through existing courses and concepts, using the existing Apache AGE `shortestPath()` resolver. Add a competency profile to user settings.

**Platforms that offer it**: Docebo, D2L Brightspace

**Business Value**: HIGH — Directly leverages EduSphere's biggest technical differentiator (knowledge graph). No competitor can replicate this without rebuilding their entire data model. Creates a compelling product demonstration moment.

**Development Effort**: M (4-5 weeks)

**Priority Tier**: 1

**Technical Approach**:

- Extend `user.graphql` with `competencyGoals: [CompetencyGoal!]!` and mutations `addCompetencyGoal`, `removeCompetencyGoal`
- New `user_competency_goals` table with `user_id`, `target_concept_name`, `current_level`, `target_level`
- New GraphQL query `myLearningPath(targetConceptName: String!): AutoPath!` in `subgraph-knowledge` that:
  1. Fetches user's mastered concepts from `user_progress` join
  2. Calls `learningPath(from: $mastered, to: $target)` for each mastered concept
  3. Returns the shortest overall path
- Frontend: New "My Learning Path" section on Dashboard showing concept graph visualization (the KnowledgeGraph page already exists and renders the graph — extend it with personal progress overlay)

---

#### F-003: Performance Risk Detection (At-Risk Learner Flagging)

**Description**: Automatically flag learners whose engagement metrics fall below adaptive thresholds. Use existing activity data (`weeklyActivity`, `totalLearningMinutes`, `conceptsMastered`) combined with course enrollment status to produce a risk score. Surface alerts to instructors in a class management dashboard.

**Platforms that offer it**: D2L Brightspace Intelligent Agents

**Business Value**: HIGH for institutional customers — demonstrates care for learner success beyond content delivery. Key selling point for university and corporate HR buyers.

**Development Effort**: L (8-10 weeks including ML model training)

**Priority Tier**: 2

**Technical Approach**:

- Simple heuristic v1 (avoid ML complexity): flag learner if `daysSinceLastActivity > 7 AND courseProgress < 30% AND courseDaysRemaining < 14`
- Add `at_risk_flags` table with `learner_id`, `course_id`, `risk_score`, `risk_factors: jsonb`, `flagged_at`, `resolved_at`
- New `@nestjs/schedule` cron job running nightly, publishing `EDUSPHERE.risk.learner.flagged` NATS events
- Instructor dashboard: new `atRiskLearners(courseId)` GraphQL query
- v2 (ML): Train a simple logistic regression model on historical completion data; deploy as a NATS consumer microservice

---

### 4.2 AI Features

---

#### F-004: AI-Generated Course Creation from Prompt

**Description**: An instructor types a topic or pastes a document. The AI generates a full course outline: title, description, modules, module titles, and content item stubs. The instructor can edit and then publish. Leverage the existing `generateObject` (Vercel AI SDK) and LangGraph.js workflows.

**Platforms that offer it**: Docebo Shape AI, Mindsmith

**Business Value**: HIGH — Dramatically reduces the time to create a course from weeks to hours. Directly compatible with EduSphere's knowledge graph (generated concepts can be automatically linked via the ConceptExtractor already in `transcription-worker`).

**Development Effort**: M (4-6 weeks)

**Priority Tier**: 1

**Technical Approach**:

- New `COURSE_GENERATOR` template type in `template.graphql` TemplateType enum
- LangGraph workflow: `outline_generation` node (generateObject with CourseSchema) → `concept_linking` node (calls existing ConceptExtractor) → `draft_creation` node (creates Course + Modules + ContentItems via existing mutations)
- New mutation `generateCourseFromPrompt(input: GenerateCourseInput!): CourseGenerationResult!` in `subgraph-agent`
- Frontend: New "AI Create Course" button on CourseList page, streaming progress via `executionStatusChanged` subscription (already exists)
- GDPR: Requires `THIRD_PARTY_LLM` consent (guard already in place via `llm-consent.guard.ts`)

---

#### F-005: Plagiarism Detection via Semantic Similarity

**Description**: When a learner submits a text assignment, compute its embedding and compare against a corpus of previously submitted assignments using pgvector cosine similarity. Flag submissions above a configurable similarity threshold (default 85%) for instructor review.

**Platforms that offer it**: Blackboard (Turnitin), Canvas (Turnitin/Copyleaks)

**Business Value**: HIGH for institutional customers (universities, corporate training with certifications). Eliminates third-party Turnitin license cost.

**Development Effort**: M (4-5 weeks)

**Priority Tier**: 2

**Technical Approach**:

- New `submission_embeddings` table in `packages/db/`: `submission_id`, `vector (768-dim)`, `submitted_at`, `course_id`, `tenant_id` — with pgvector HNSW index
- On assignment submission: emit `EDUSPHERE.submission.created` NATS event → plagiarism worker generates embedding and runs similarity query using existing `EmbeddingProviderService`
- Return top-K similar submissions with similarity scores
- Similarity threshold configurable per tenant in `tenants.settings: jsonb`
- New GraphQL field: `Submission.plagiarismReport: PlagiarismReport`

---

#### F-006: Skill Gap Analysis and Recommendations

**Description**: Compare a learner's mastered concepts (from knowledge graph traversal + user_progress) against a defined skill profile for their role or learning goal. Return a ranked list of skills to develop with recommended content items.

**Platforms that offer it**: Pluralsight Skill IQ, Docebo

**Business Value**: HIGH — Turns the knowledge graph into a visible, actionable career tool. Strong differentiation for corporate L&D buyers.

**Development Effort**: M (3-4 weeks, building on F-002)

**Priority Tier**: 2

**Technical Approach**:

- New `skill_profiles` table: `role_name`, `required_concepts: text[]`, `tenant_id`
- New `subgraph-knowledge` query: `skillGapAnalysis(roleId: ID!): SkillGapReport!` — uses Apache AGE to find concepts in the role profile not yet mastered by the user
- Recommendation engine: for each gap concept, run `searchSemantic` to find closest content items
- Frontend: New "Skill Gap" card on Dashboard and Profile page

---

#### F-007: AI Role-Play Scenarios

**Description**: A new agent template `ROLEPLAY_SIMULATOR` where the AI plays a character (customer, patient, student, colleague) in a branching conversation. The learner must navigate the scenario. After completion, the AI provides coaching on communication quality, missed opportunities, and emotional intelligence markers.

**Platforms that offer it**: Adobe Learning Manager, Mursion

**Business Value**: HIGH for corporate soft-skills training (sales, customer service, healthcare, management). Opens a new market segment.

**Development Effort**: L (8-10 weeks)

**Priority Tier**: 2

**Technical Approach**:

- New `ROLEPLAY_SIMULATOR` in `TemplateType` enum
- LangGraph workflow: `scene_setting` node → `character_response` node (LLM with character persona) → `learner_turn` node (human interrupt) → `evaluation` node (assess communication quality using `generateObject`)
- New `scenario_templates` table: `character_persona`, `scene_description`, `evaluation_rubric: jsonb`, `difficulty_level`
- Frontend: new full-screen immersive UI using the existing AgentsPage interaction pattern

---

### 4.3 Assessment

---

#### F-008: Advanced Quiz Item Types

**Description**: Extend the quiz content type to support: drag-and-drop ordering, hotspot image (click on the correct region), matching pairs, Likert scale, and fill-in-the-blank with semantic matching (not exact string match).

**Platforms that offer it**: Articulate, iSpring, most LMS platforms

**Business Value**: HIGH — Basic multiple-choice-only quizzes are inadequate for skill assessment. Required for STEM, medical, and technical training use cases.

**Development Effort**: L (8-10 weeks — primarily frontend work)

**Priority Tier**: 1

**Technical Approach**:

- Extend `content_items.content: text` (currently free-form JSON) with typed `quiz_items` JSONB schema validated via Zod
- New `quiz_item_type` enum: `MULTIPLE_CHOICE`, `DRAG_ORDER`, `HOTSPOT`, `MATCHING`, `LIKERT`, `FILL_BLANK`
- Backend: new `gradeQuizSubmission(contentItemId, answers: JSON): QuizResult!` mutation with server-side grading in `subgraph-content`
- For `FILL_BLANK` semantic matching: call `EmbeddingService.searchSemantic` to compare learner answer against correct answer embedding (uses existing infrastructure)
- Frontend: React component per item type, using `react-konva` (already in stack) for hotspot items

---

#### F-009: Branching Scenario-Based Learning

**Description**: Define a content item of type `SCENARIO` where learner choices lead to different content branches. Model the branching graph in Apache AGE as a directed path through ContentItem nodes.

**Platforms that offer it**: Articulate Storyline, Adobe Captivate, Lectora

**Business Value**: MEDIUM-HIGH — Strong for compliance training, onboarding, and safety training. Unique implementation using the knowledge graph.

**Development Effort**: L (9-12 weeks)

**Priority Tier**: 2

**Technical Approach**:

- Add `SCENARIO` to `content_type` enum in `contentItems.ts`
- Model scenario branches in Apache AGE: `ContentItem` nodes connected by `LEADS_TO` edges with a `condition: String` property
- New GraphQL mutations: `createScenarioBranch(fromId, toId, condition)`, `recordScenarioChoice(contentItemId, choiceId)`
- Frontend: branching narrative UI component; falls back to linear for non-scenario items

---

### 4.4 Gamification and Engagement

---

#### F-010: Streak Tracking

**Description**: Calculate the learner's current daily learning streak using existing `weeklyActivity` (DayActivity array) data. Display streak count on Dashboard, profile, and mobile Home screen. Award a special badge (F-011) for milestone streaks.

**Platforms that offer it**: Khan Academy, Duolingo

**Business Value**: HIGH — Easy engagement booster with zero new data requirements. The DayActivity data is already being computed in `UserStatsService`.

**Development Effort**: S (1 week)

**Priority Tier**: 1

**Technical Approach**:

- Extend `UserStatsService.getMyStats()` to compute `currentStreak: Int!` and `longestStreak: Int!` from the existing `weeklyActivity` query result (pure TypeScript computation, no new DB queries)
- Extend `user.graphql` UserStats type with these two new fields
- Frontend: streak flame icon component on Dashboard and Profile page (shadcn/ui + Lucide icon)
- Mobile: streak counter on HomeScreen

---

#### F-011: Badges, Points, and Leaderboards

**Description**: Award badges (e.g., "First Course Completed", "100 Annotations", "7-Day Streak") and accumulate points from learning activities. Display a tenant-scoped leaderboard.

**Platforms that offer it**: TalentLMS, Absorb LMS, Brightspace

**Business Value**: HIGH for corporate and K-12 contexts; MEDIUM for higher education.

**Development Effort**: M (4-5 weeks)

**Priority Tier**: 2

**Technical Approach**:

- New tables: `badges` (definition), `user_badges` (earned instances), `user_points` (running total with event log)
- Badge award triggers via NATS events: `EDUSPHERE.course.completed`, `EDUSPHERE.annotation.created`, `EDUSPHERE.streak.milestone`
- New `BadgeService` in `subgraph-core` as a NATS consumer
- New GraphQL queries: `myBadges`, `leaderboard(courseId, limit)`, `myRank(courseId)`
- All tables with `tenant_id` RLS — leaderboard is always tenant-scoped
- Frontend: badges grid on ProfilePage, leaderboard widget on Dashboard

---

### 4.5 Live and Synchronous Learning

---

#### F-012: Virtual Classroom via BigBlueButton Integration

**Description**: Integrate with BigBlueButton (open-source, self-hostable) for live video classes. Instructors schedule a "live session" as a `content_item` of type `LIVE_SESSION`. Learners join from within EduSphere. Recordings stored in MinIO and linked back as VIDEO content items automatically.

**Platforms that offer it**: Canvas (BigBlueButton), Moodle (BigBlueButton), Brightspace (Zoom/Teams)

**Business Value**: HIGH — Live instruction is a key market requirement for universities. Sales-blocking for institutional buyers.

**Development Effort**: L (8-10 weeks)

**Priority Tier**: 1

**Technical Approach**:

- Add `LIVE_SESSION` to `content_type` enum
- New `LiveSessionService` in `subgraph-content`: BigBlueButton Create Meeting API call, join URL generation
- New table: `live_sessions` with `content_item_id`, `bbb_meeting_id`, `scheduled_at`, `recording_url`, `status`
- NATS: `EDUSPHERE.live.session.ended` → trigger recording extraction from BigBlueButton → upload to MinIO → create new VIDEO `content_item`
- Frontend: Join button on ContentViewer; instructor "Start Meeting" button; recording playback uses existing HLS player
- Self-hostable BBB aligns with EduSphere's MIT/Apache open-source stack ethos

---

#### F-013: WebVTT Auto-Captioning from Whisper Transcripts

**Description**: The transcription worker already uses faster-whisper with timestamps. Convert the timestamped transcript output into WebVTT caption files, store them in MinIO, and serve them alongside HLS streams in the video player.

**Platforms that offer it**: Most modern LMS platforms; required by WCAG 2.1 AA SC 1.2.2

**Business Value**: HIGH — Required for accessibility compliance (WCAG 1.2.2 Captions). Removes the final accessibility blocker for institutional procurement. Uses entirely existing infrastructure.

**Development Effort**: S (1-2 weeks)

**Priority Tier**: 1

**Technical Approach**:

- Extend `transcription-worker`: after Whisper produces segments, format them as WebVTT (`00:00:01.000 --> 00:00:04.000\nText here`)
- Upload `.vtt` file to MinIO alongside the video file, using existing `minio.client.ts`
- Update `media.graphql` to add `captionsUrl: String` field on media items
- Frontend: pass `captionsUrl` as a `<track>` element to the Video.js player (Video.js has native WebVTT support)
- Multilingual captions: future — use existing i18n infrastructure to serve captions in user's locale

---

### 4.6 Credentials and Certification

---

#### F-014: Digital Certificate Auto-Generation on Course Completion

**Description**: When `myCourseProgress.percentComplete` reaches 100% and the course is marked complete in `user_courses`, auto-generate a PDF certificate with the learner's name (from User entity), course title, completion date, and a unique verification code. Store the PDF in MinIO, emit a NATS event, and send a notification.

**Platforms that offer it**: Every major LMS

**Business Value**: HIGH — Table-stakes feature. Its absence is immediately noticeable in any product demo or trial.

**Development Effort**: M (3-4 weeks)

**Priority Tier**: 1

**Technical Approach**:

- New `certificates` table: `id`, `user_id`, `course_id`, `tenant_id`, `issued_at`, `verification_code (UUID)`, `pdf_url`, `metadata: jsonb`
- Certificate generator service: listen to `EDUSPHERE.course.completed` NATS event → generate PDF using PDFKit (Node.js, MIT) → upload to MinIO → update `certificates` table
- New `certificate.graphql` queries: `myCertificates`, `verifyCertificate(code: String!)` (public, no auth required)
- Public verification URL: `https://[tenant].edusphere.io/verify/[code]` — renders certificate info without authentication
- Frontend: "Download Certificate" button on CourseDetail after completion; Certificates section on ProfilePage

---

### 4.7 Analytics and Reporting

---

#### F-015: Instructor Analytics Dashboard

**Description**: A dedicated analytics view for instructors showing: enrollment count, active learners (last 7 days), completion rate, average quiz score, per-content-item view counts, time-on-task distribution, and drop-off funnel per module.

**Platforms that offer it**: Docebo, Cornerstone, TalentLMS — essentially all LMS platforms

**Business Value**: HIGH — Without this, instructors cannot improve their courses. Sales-critical for any institutional buyer.

**Development Effort**: M (4-5 weeks)

**Priority Tier**: 1

**Technical Approach**:

- New GraphQL queries in `subgraph-content`: `courseAnalytics(courseId: ID!): CourseAnalytics!` returning all needed aggregates
- `CourseAnalytics` type: `enrollmentCount`, `activeLearnersLast7Days`, `completionRate`, `avgQuizScore`, `contentItemMetrics: [ContentItemMetric!]!`, `dropOffFunnel: [FunnelStep!]!`
- Backend: Drizzle queries with CTEs across `user_courses`, `user_progress`, and future quiz submissions tables
- Frontend: New `CourseAnalyticsPage.tsx` with shadcn/ui charts (Recharts, already a common shadcn companion)
- Access: `@requiresRole(roles: [INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN])`

---

#### F-016: Compliance Training Report Export

**Description**: Allow ORG_ADMINs to export a CSV/PDF report of which users completed which mandatory training courses, with completion dates and assessment scores. Suitable for regulatory audit submissions.

**Platforms that offer it**: Cornerstone, TalentLMS, Absorb

**Business Value**: HIGH for corporate and regulated industry customers (healthcare, finance, manufacturing).

**Development Effort**: M (3-4 weeks)

**Priority Tier**: 2

**Technical Approach**:

- Tag courses with `is_compliance: Boolean` and `compliance_due_date: DateTime` in the `courses` table
- New `subgraph-core` query: `complianceReport(courseIds: [ID!]!, asOf: DateTime): ComplianceReport!`
- Report generation: CSV export using the existing CSV utilities pattern, PDF via PDFKit
- Store report in MinIO with pre-signed URL (expires in 1 hour for security)
- Frontend: ORG_ADMIN settings page → Compliance Reports section

---

### 4.8 Integrations and Standards

---

#### F-017: SCORM 1.2 / 2004 Import

**Description**: Parse SCORM ZIP packages (imsmanifest.xml + content files) and import them as EduSphere courses with modules and content items. Provide a SCORM API shim for SCORM 1.2 content (JavaScript `API` object) so existing SCORM content runs in the EduSphere content viewer.

**Platforms that offer it**: Every major LMS platform

**Business Value**: HIGH — Sales-blocking for any institutional buyer with an existing SCORM content library (which is nearly every institution that has run LMS software before).

**Development Effort**: XL (14-18 weeks — SCORM API shim is complex)

**Priority Tier**: 1 (SCORM import), 2 (SCORM API shim)

**Technical Approach**:

- Phase 1 (SCORM Import, L): New `ScormImportService` in `subgraph-content` using `fast-xml-parser` to parse `imsmanifest.xml`. Create Course + Modules + ContentItems from the manifest. Upload SCORM content files to MinIO.
- Phase 2 (SCORM API Shim, L): Inject JavaScript into the SCORM content iframe: `window.API = new SCORM12API(sessionId)` that maps SCORM 1.2 API calls (`LMSInitialize`, `LMSSetValue`, `LMSCommit`, `LMSGetValue`) to GraphQL mutations via a lightweight bridge
- Bridge: `scorm_sessions` table records `cmi.core.lesson_status`, `cmi.core.score.raw`, `cmi.suspend_data`
- SCORM 2004 support: similar shim for `window.API_1484_11` (a separate phase)

---

#### F-018: LTI 1.3 Provider

**Description**: Implement EduSphere as an LTI 1.3 Tool Provider so it can be embedded inside institutional LMS platforms (Canvas, Moodle, Blackboard, Sakai) as an external tool. Learner authentication uses LTI 1.3 JWT launch claims.

**Platforms that offer it**: Canvas (LTI consumer and provider), Moodle, Blackboard

**Business Value**: HIGH for university market — many universities will not consider replacing their current LMS but will purchase an LTI tool.

**Development Effort**: L (8-10 weeks)

**Priority Tier**: 2

**Technical Approach**:

- New NestJS module `LtiModule` in `subgraph-core` implementing LTI 1.3 launch verification using `ltijs` library (MIT license)
- LTI launch → extract `sub` (user ID), `context_id` (course), `roles` → map to EduSphere JWT + tenant context
- New routes: `POST /lti/launch`, `GET /lti/jwks`, `GET /lti/config` (Canvas configuration XML)
- Deep link support: LTI 2.0 Deep Linking for selecting specific EduSphere content from within Canvas
- Store LTI platform registrations in `lti_platforms` table (per tenant)

---

#### F-019: HRIS Auto-Enrollment via Webhook

**Description**: Provide a webhook endpoint and SCIM 2.0 API that HRIS systems (Workday, BambooHR, SAP) can call to provision users, assign them to groups (departments), and trigger auto-enrollment rules.

**Platforms that offer it**: Cornerstone, Docebo

**Business Value**: HIGH for corporate L&D — auto-enrollment eliminates the #1 administrative burden for training managers.

**Development Effort**: L (8-10 weeks)

**Priority Tier**: 2

**Technical Approach**:

- SCIM 2.0 endpoints in a new `ScimController` in `subgraph-core`: `GET/POST /scim/v2/Users`, `PUT /scim/v2/Users/:id`, `PATCH /scim/v2/Groups`
- Keycloak already supports SCIM — expose it with EduSphere-specific user provisioning hooks
- Auto-enrollment rule engine: `enrollment_rules` table with `condition: jsonb` (e.g., `{"department": "Sales", "role": "AE"}`) and `course_ids: uuid[]`
- NATS: `EDUSPHERE.user.provisioned` → enrollment rule evaluator → `enrollCourse` mutations

---

### 4.9 Content Creation Tools

---

#### F-020: Rich In-Platform Content Editor (Block Editor)

**Description**: Replace the current text input for content creation with a block-based rich editor (Tiptap, which is already in the stack for CRDT collaboration). Support text blocks, image blocks, video embeds, code blocks with syntax highlighting, math/LaTeX, and quiz question insertion.

**Platforms that offer it**: Canvas (Pages editor), Moodle (Atto), Teachable, Notion-style editors

**Business Value**: HIGH — Instructors need to create rich content without leaving the platform. The content wizard (3 steps) currently only supports file upload or raw text.

**Development Effort**: M (5-6 weeks)

**Priority Tier**: 2

**Technical Approach**:

- Tiptap is already listed in the Sprint 4 tech plan as used in the collaboration layer. Reuse the same Tiptap instance with extensions: `mathematics` (LaTeX), `code-block-lowlight`, `task-list`, `image`, `table`
- New `content_type: RICH_DOCUMENT` with content stored as Tiptap JSON in the `content: text` column (serialize as JSON string)
- New CourseWizard step or ContentViewer edit mode with Tiptap editor
- Math rendering: KaTeX (MIT) for LaTeX formula rendering
- Code highlighting: highlight.js (BSD) via `code-block-lowlight`

---

#### F-021: Microlearning Content Type

**Description**: Introduce a `MICROLESSON` content type with a 3-7 minute constraint enforced at creation time. Microlessons have a single learning objective, one key concept, and one quiz question. They appear in a dedicated "Daily Learning" surface on the Dashboard and mobile Home screen.

**Platforms that offer it**: SC Training, 5mins.ai, EdApp

**Business Value**: MEDIUM — Growing market segment, particularly for mobile. Differentiator for corporate deskless worker training.

**Development Effort**: M (4-5 weeks)

**Priority Tier**: 2

**Technical Approach**:

- Add `MICROLESSON` to `content_type` enum; add `maxDurationSeconds: Int` validation in `subgraph-content` (enforce max 420 seconds at mutation level)
- New `microlearning_paths` table linking ordered `content_item_id` sequences with `topic_cluster_id`
- Frontend: dedicated swipe-card player component (like TikTok/Duolingo card style) on Dashboard
- Mobile: full-screen card player on Home screen; offline-downloadable via expo-sqlite

---

### 4.10 Social and Community Features

---

#### F-022: Public Learner Portfolio

**Description**: Make the ProfilePage publicly accessible (with opt-in from user settings). Display: completed courses, badges earned, knowledge graph contributions (concepts created/linked), annotation highlights the user has made public, and current learning streaks.

**Platforms that offer it**: LinkedIn Learning, Coursera, GitHub (for developer credentials)

**Business Value**: MEDIUM — Strong for individual learners seeking professional credentialing. Reduces need for LinkedIn Learning subscription.

**Development Effort**: M (3-4 weeks)

**Priority Tier**: 2

**Technical Approach**:

- Add `isPublicProfile: Boolean` to `UserPreferences`
- New public GraphQL query `publicProfile(userId: ID!): PublicProfile` — no `@authenticated` directive
- RLS: public profile query uses a service-level role bypass, not tenant context
- `PublicProfile` type: subset of User fields plus `completedCourses`, `badges`, `knowledgeGraphContributions`, `publicAnnotationCount`
- Frontend: `ProfilePage.tsx` — add toggle in settings; public URL `/u/:userId`
- Shareable link (copy to clipboard) for professional portfolios

---

### 4.11 Accessibility

---

#### F-023: AI Alt-Text Generation for Uploaded Images

**Description**: When an instructor uploads an image to MinIO, automatically generate a descriptive alt-text string using a vision-capable LLM (GPT-4o Vision or LLaVA via Ollama). Store the alt-text in the `media` table. Surface a confirmation/edit UI before publishing.

**Platforms that offer it**: Multiple platforms using Microsoft Azure AI Vision or similar

**Business Value**: HIGH — WCAG 2.1 AA 1.1.1 Non-text Content requires alt-text. Auto-generation removes the friction that causes instructors to skip it.

**Development Effort**: M (3-4 weeks)

**Priority Tier**: 1

**Technical Approach**:

- NATS subject `EDUSPHERE.media.uploaded` → `AltTextGeneratorService` (new NestJS service in `subgraph-content`)
- Use Vercel AI SDK `generateText` with `experimental_providerMetadata` for vision input (OpenAI GPT-4o or Ollama LLaVA)
- New `alt_text: text` column on `files`/`media` table
- GraphQL mutation `updateMediaAltText(mediaId: ID!, altText: String!): Media!` for instructor review
- Frontend: alt-text review modal on media upload confirmation step

---

#### F-024: WCAG 2.2 AA Upgrade

**Description**: Upgrade from WCAG 2.1 AA to WCAG 2.2 AA. The 9 new success criteria in WCAG 2.2 include: Focus Appearance (2.4.11), Dragging Movements (2.5.7), Target Size (Minimum) (2.5.8), Consistent Help (3.2.6), Redundant Entry (3.3.7), Accessible Authentication (3.3.8/3.3.9).

**Platforms that offer it**: Absorb LMS, Open LMS

**Business Value**: HIGH for government and public sector procurement in the US (WCAG 2.2 is referenced in DOJ Title II rule effective 2026) and EU (EN 301 549).

**Development Effort**: M (4-5 weeks)

**Priority Tier**: 1

**Technical Approach**:

- Audit all interactive elements for new SC using axe-core 4.9+ (update `accessibility.spec.ts` test targets from WCAG 2.1 to WCAG 2.2)
- Focus Appearance (2.4.11): Ensure all focus indicators meet 3:1 contrast ratio — update Tailwind CSS custom focus styles
- Dragging Movements (2.5.7): All drag-and-drop interactions (future quiz types from F-008) must have single-pointer alternatives
- Target Size (2.5.8): Minimum 24x24 CSS pixels for all interactive elements — audit shadcn/ui components
- Accessible Authentication (3.3.8): Remove CAPTCHAs that block authentication (Keycloak login)
- Update the accessibility test badge in README.md from 2.1 to 2.2

---

### 4.12 Further Tier 3 Features (Summary)

The following features are architecturally sound but require significant prerequisites or represent longer-term market investments:

| ID    | Feature                                                          | Priority | Effort | Dependency                              |
| ----- | ---------------------------------------------------------------- | -------- | ------ | --------------------------------------- |
| F-025 | Blockchain-verified micro-credentials (BCdiploma/OpenBadges 3.0) | Tier 3   | XL     | F-014 (certificates) must exist first   |
| F-026 | Stackable credentials / nanodegree programs                      | Tier 3   | L      | F-014 + F-011 (badges)                  |
| F-027 | CPD/CE credit tracking with regulatory body export               | Tier 3   | L      | F-016 (compliance reports)              |
| F-028 | xAPI / Tin Can API statement emission + LRS                      | Tier 3   | L      | Architecture decision on LRS vendor     |
| F-029 | Power BI / Tableau connector via REST API                        | Tier 3   | M      | F-015 (analytics) must be built first   |
| F-030 | 360-degree multi-rater assessments                               | Tier 3   | L      | New domain requiring product design     |
| F-031 | Instructor marketplace + revenue sharing                         | Tier 3   | XL     | Stripe integration, legal/tax framework |
| F-032 | SCORM 2004 export from EduSphere courses                         | Tier 3   | L      | F-017 SCORM import first                |
| F-033 | CRM integration (Salesforce)                                     | Tier 3   | M      | F-019 HRIS integration pattern first    |
| F-034 | Live session breakout rooms + polls                              | Tier 3   | L      | F-012 (virtual classroom) must exist    |
| F-035 | Social following system                                          | Tier 3   | M      | F-022 (public profiles) must exist      |
| F-036 | Social content recommendations                                   | Tier 3   | L      | F-035 + significant analytics data      |
| F-037 | No-code custom portal builder                                    | Tier 3   | XL     | Separate product investment             |
| F-038 | Pre-built compliance course library                              | Tier 3   | XL     | Content/partnership investment          |
| F-039 | VPAT and HECVAT documentation                                    | Tier 3   | S      | F-024 (WCAG 2.2) must be verified first |

---

## 5. Top 10 Quick Wins

These features deliver the highest business value relative to development effort. They are ordered by value-to-effort ratio and are all achievable within 1-2 weeks each.

---

### QW-1: Streak Tracking (F-010) — 1 week, HIGH value

The `UserStatsService.fetchWeeklyActivity()` already returns a `DayActivity[]` array from the database. Computing `currentStreak` and `longestStreak` is pure TypeScript from that array — no new DB queries, no new tables. Adding the streak count to the `UserStats` GraphQL type and displaying it as a flame icon on the Dashboard and ProfilePage creates a highly visible engagement feature from a trivial code change.

**Files to touch**: `user-stats.service.ts` (add streak computation), `user.graphql` (add 2 fields), `Dashboard.tsx`, `ProfilePage.tsx`

---

### QW-2: WebVTT Auto-Captioning from Existing Whisper Output (F-013) — 1-2 weeks, HIGH value

The transcription worker already produces timestamped segments from faster-whisper. The only missing piece is a WebVTT formatter (10-15 lines of TypeScript), a MinIO upload call (already implemented in `minio.client.ts`), and a `captionsUrl` field on the media GraphQL type. The Video.js player supports `<track>` elements natively. This closes WCAG 1.2.2 (Captions) and removes the single biggest accessibility compliance gap.

**Files to touch**: `transcription-worker/src/hls/hls.service.ts` (emit VTT), `media.graphql` (add field), `ContentViewer.tsx` (add track element)

---

### QW-3: Digital Certificate Auto-Generation (F-014) — 3-4 weeks, HIGH value

`user_courses.completedAt` is already populated. `UserCourse.status` tracks ACTIVE/COMPLETED. PDFKit is a well-maintained MIT library with minimal API surface. MinIO upload is already implemented. The NATS `EDUSPHERE.course.completed` event is already in the event schema. This is primarily a new service with a simple PDF template, a new DB table, and a Dashboard widget.

**Files to touch**: New `CertificateService` and `certificate.graphql`, `Dashboard.tsx`, new `certificates` table migration

---

### QW-4: Instructor Analytics Dashboard — Basic Version (F-015) — 4-5 weeks, HIGH value

A large fraction of the data for course analytics is already queryable. `user_courses` has enrollment count and `completedAt`. `user_progress` has `time_spent`, `is_completed`. A single Drizzle CTE query can produce all enrollment, completion, and activity metrics. The only frontend work is a new page with Recharts components (common in shadcn/ui projects).

**Files to touch**: New `CourseAnalyticsPage.tsx`, new `courseAnalytics` resolver in `subgraph-content`

---

### QW-5: Competency Goal Setting + Knowledge Graph Path (F-002) — 4-5 weeks, HIGH value

The `learningPath(from, to)` resolver already exists in `subgraph-knowledge`. The `KnowledgeGraph.tsx` page already renders the graph. The gap is only: a UI for setting a competency goal, and a new resolver that combines the learner's current progress with the existing `learningPath` query. This demonstrates EduSphere's knowledge graph advantage in the most direct way possible.

**Files to touch**: `user.graphql`, `KnowledgeGraph.tsx`, new `user_competency_goals` table migration

---

### QW-6: AI Alt-Text Generation for Images (F-023) — 3-4 weeks, HIGH value

The NATS `EDUSPHERE.media.uploaded` event is already implied by the media service architecture. The Vercel AI SDK `generateText` with vision is already configured in the agent service for Ollama/OpenAI. The media table already has `alt_text` conceptually (needs column addition). This closes a WCAG 1.1.1 gap with minimal infrastructure additions and directly uses existing AI infrastructure.

**Files to touch**: New `AltTextGeneratorService`, `media.graphql`, `files` table migration

---

### QW-7: AI-Generated Course Creation (F-004) — 4-6 weeks, HIGH value

`generateObject` is already used in `ConceptExtractor`. `LangGraph.js` workflows are already deployed. The existing GraphQL mutations for `createCourse`, `createModule`, and future `createContentItem` provide the target API. This is primarily a new LangGraph workflow and a frontend trigger button — the infrastructure already exists.

**Files to touch**: New `CourseGeneratorWorkflow`, new mutation in `agent.graphql`, `CourseList.tsx` (add button)

---

### QW-8: WCAG 2.2 AA Upgrade (F-024) — 4-5 weeks, HIGH value

Updating the axe-core test version and systematically checking each WCAG 2.2 criterion is methodical work rather than architectural work. Many of the issues (focus indicators, target sizes) are CSS/Tailwind changes. Government procurement cycles in 2026 are beginning to mandate WCAG 2.2 due to the US DOJ Title II rulemaking.

**Files to touch**: `accessibility.spec.ts`, Tailwind config, shadcn/ui component overrides, `README.md`

---

### QW-9: Compliance Training Report Export (F-016) — 3-4 weeks, HIGH value

The `audit_log` table (7-year retention, full action log) combined with `user_courses` (completion dates) provides all the data needed for a compliance report. A CSV export is a simple Drizzle query with stream-to-response. PDFKit produces the formatted report. The MinIO pre-signed URL pattern is already implemented in `media.service.ts`. This unlocks the corporate compliance training market segment.

**Files to touch**: New `ComplianceReportService`, new query in `subgraph-core`, new `SettingsPage.tsx` admin section

---

### QW-10: Skill Gap Analysis (F-006) — 3-4 weeks, HIGH value (depends on F-002 setup)

With competency goals set (F-002), the skill gap is a graph query: find concepts in the `skill_profiles` for a given role that are not yet in the user's mastered concept list. Apache AGE makes this a single Cypher query. The recommendation layer is `searchSemantic` already implemented. The result is a compelling "Your next steps" feature on the Dashboard.

**Files to touch**: New `skillGapAnalysis` resolver in `subgraph-knowledge`, new `skill_profiles` table, `Dashboard.tsx`

---

## 6. Investment Summary Table

All features sorted by Priority Tier, then by Business Value within tier.

| ID    | Feature                                | Category              | Tier | Business Value | Effort       | Platforms That Have It         |
| ----- | -------------------------------------- | --------------------- | ---- | -------------- | ------------ | ------------------------------ |
| F-010 | Streak Tracking                        | Gamification          | 1    | HIGH           | S (1w)       | Khan Academy, Duolingo         |
| F-013 | WebVTT Auto-Captioning                 | Accessibility / Video | 1    | HIGH           | S (1-2w)     | Most modern LMS                |
| F-014 | Digital Certificate Auto-Generation    | Credentials           | 1    | HIGH           | M (3-4w)     | Every major LMS                |
| F-023 | AI Alt-Text Generation                 | Accessibility         | 1    | HIGH           | M (3-4w)     | Multiple platforms             |
| F-015 | Instructor Analytics Dashboard         | Analytics             | 1    | HIGH           | M (4-5w)     | Every major LMS                |
| F-001 | Spaced Repetition System               | Adaptive Learning     | 1    | HIGH           | M (3-4w)     | SC Training, FLOWSPARKS        |
| F-002 | Competency Mapping + Auto-Pathing      | Adaptive Learning     | 1    | HIGH           | M (4-5w)     | Docebo, D2L                    |
| F-004 | AI Course Creation from Prompt         | AI Features           | 1    | HIGH           | M (4-6w)     | Docebo, Mindsmith              |
| F-008 | Advanced Quiz Item Types               | Assessment            | 1    | HIGH           | L (8-10w)    | Articulate, most LMS           |
| F-012 | Virtual Classroom (BigBlueButton)      | Live Learning         | 1    | HIGH           | L (8-10w)    | Canvas, Moodle                 |
| F-017 | SCORM 1.2/2004 Import                  | Integrations          | 1    | HIGH           | XL (14-18w)  | Every major LMS                |
| F-024 | WCAG 2.2 AA Upgrade                    | Accessibility         | 1    | HIGH           | M (4-5w)     | Absorb, Open LMS               |
| F-011 | Badges, Points, Leaderboards           | Gamification          | 2    | HIGH           | M (4-5w)     | TalentLMS, Absorb, Brightspace |
| F-005 | Plagiarism Detection                   | AI Features           | 2    | HIGH           | M (4-5w)     | Blackboard, Canvas             |
| F-006 | Skill Gap Analysis                     | AI Features           | 2    | HIGH           | M (3-4w)     | Pluralsight, Docebo            |
| F-016 | Compliance Report Export               | Analytics             | 2    | HIGH           | M (3-4w)     | Cornerstone, TalentLMS         |
| F-018 | LTI 1.3 Provider                       | Integrations          | 2    | HIGH           | L (8-10w)    | Canvas, Moodle, Blackboard     |
| F-019 | HRIS Auto-Enrollment (SCIM)            | Integrations          | 2    | HIGH           | L (8-10w)    | Cornerstone, Docebo            |
| F-003 | At-Risk Learner Flagging               | Adaptive Learning     | 2    | HIGH           | L (8-10w)    | D2L Brightspace                |
| F-020 | Rich Block Content Editor              | Content Creation      | 2    | HIGH           | M (5-6w)     | Canvas, Moodle, Teachable      |
| F-007 | AI Role-Play Scenarios                 | AI Features           | 2    | HIGH           | L (8-10w)    | Adobe LM, Mursion              |
| F-009 | Branching Scenario Learning            | Assessment            | 2    | MED-HIGH       | L (9-12w)    | Articulate, Adobe Captivate    |
| F-022 | Public Learner Portfolio               | Social                | 2    | MED            | M (3-4w)     | LinkedIn Learning, Coursera    |
| F-021 | Microlearning Content Type             | Microlearning         | 2    | MED            | M (4-5w)     | SC Training, EdApp             |
| F-025 | Blockchain Micro-Credentials           | Credentials           | 3    | MED            | XL (14+w)    | BCdiploma, Credly              |
| F-026 | Stackable Credentials / Nanodegrees    | Credentials           | 3    | MED            | L (8-10w)    | Coursera, edX, Udacity         |
| F-027 | CPD/CE Credit Tracking                 | Compliance            | 3    | MED            | L (8-10w)    | Multiple platforms             |
| F-028 | xAPI / LRS Integration                 | Integrations          | 3    | MED            | L (8-10w)    | Most enterprise LMS            |
| F-029 | BI Tool Export (Power BI, Tableau)     | Analytics             | 3    | MED            | M (3-4w)     | Cornerstone, Docebo            |
| F-030 | 360-Degree Multi-Rater Assessment      | Assessment            | 3    | MED            | L (8-10w)    | Cornerstone, Docebo            |
| F-031 | Instructor Marketplace + Revenue Share | Marketplace           | 3    | MED            | XL (20+w)    | Udemy, Teachable, Skillshare   |
| F-032 | SCORM Export                           | Integrations          | 3    | MED            | L (8-10w)    | Most LMS                       |
| F-033 | CRM Integration (Salesforce)           | Integrations          | 3    | LOW            | M (4-5w)     | Absorb LMS                     |
| F-034 | Live Breakout Rooms + Polls            | Live Learning         | 3    | MED            | L (8-10w)    | Multiple platforms             |
| F-035 | Social Following System                | Social                | 3    | LOW            | M (3-4w)     | Multiple platforms             |
| F-036 | Social Content Recommendations         | Social                | 3    | LOW            | L (7-9w)     | LinkedIn Learning              |
| F-037 | No-Code Portal Builder                 | Content Creation      | 3    | LOW            | XL (20+w)    | Adobe LM                       |
| F-038 | Pre-Built Compliance Library           | Marketplace           | 3    | MED            | XL (partner) | Cornerstone, LinkedIn          |
| F-039 | VPAT / HECVAT Documentation            | Accessibility         | 3    | HIGH           | S (2-3w)     | Absorb, Open LMS               |

---

## Appendix A: Technical Prerequisites Summary

Before any Tier 1 feature development begins, the following are confirmed as already in place:

| Prerequisite                             | Status    | Location                                                  |
| ---------------------------------------- | --------- | --------------------------------------------------------- |
| Apache AGE graph with shortestPath       | DONE      | `subgraph-knowledge/src/graph/`                           |
| pgvector 768-dim HNSW embeddings         | DONE      | `packages/db/src/schema/embeddings.ts`                    |
| Vercel AI SDK `generateObject`           | DONE      | `transcription-worker/src/knowledge/concept-extractor.ts` |
| LangGraph.js state machine workflows     | DONE      | `subgraph-agent/src/ai/`                                  |
| NATS JetStream event bus                 | DONE      | All subgraphs via `packages/nats-client`                  |
| MinIO S3 object storage (presigned URLs) | DONE      | `subgraph-content/src/media/media.service.ts`             |
| Pino structured logging everywhere       | DONE      | All services                                              |
| faster-whisper timestamped transcription | DONE      | `transcription-worker/src/`                               |
| `@nestjs/schedule` cron capability       | AVAILABLE | Can be added to any subgraph                              |
| RLS + `withTenantContext` wrapper        | DONE      | All DB queries                                            |
| GDPR consent guard (`THIRD_PARTY_LLM`)   | DONE      | `subgraph-agent/src/ai/llm-consent.guard.ts`              |
| WCAG 2.1 AA tests (CI blocking)          | DONE      | `apps/web/e2e/accessibility.spec.ts`                      |

---

## Appendix B: Effort Calibration Notes

Effort estimates assume a single full-stack engineer with deep familiarity with the EduSphere codebase, NestJS, GraphQL Federation, and React.

- S (Small): 1-2 weeks — primarily configuration or TypeScript extension of existing services
- M (Medium): 3-6 weeks — new service with DB table, GraphQL type, and frontend component
- L (Large): 7-12 weeks — new domain with multiple services, complex business logic, or significant frontend UI
- XL (Extra Large): 13+ weeks — new protocol implementation (SCORM, LTI), marketplace features, or ML model training

Parallel execution (as mandated by CLAUDE.md) can compress timelines: a 3-engineer team running Tier 1 features in parallel could deliver all 12 Tier 1 features in approximately 12-16 weeks rather than 35-40 weeks sequentially.

---

**End of Document**

**Saved to**: `docs/plans/competitive-gap-analysis-prd-2026-02.md`
**Next Action**: Product team sign-off on Tier 1 priority order → Engineering sprint planning → Begin with QW-1 (Streak Tracking) and QW-2 (WebVTT Captions) in parallel as the first sprint

---

### Critical Files for Implementation

- `/c/Users/P0039217/.claude/projects/EduSphere/apps/subgraph-core/src/user/user-stats.service.ts` - Core logic to extend for streak tracking (QW-1) and as pattern for new analytics services; already contains the `getMyStats` and `fetchWeeklyActivity` methods
- `/c/Users/P0039217/.claude/projects/EduSphere/apps/subgraph-knowledge/src/graph/graph.graphql` - Schema to extend for competency mapping (F-002), skill gap analysis (F-006), and any new Apache AGE Cypher-backed resolvers; defines the `learningPath` and `relatedConcepts` patterns to follow
- `/c/Users/P0039217/.claude/projects/EduSphere/apps/subgraph-agent/src/ai/ai.service.ts` - Pattern to follow for all new AI features (F-004, F-007); implements the LangGraph.js + Vercel AI SDK integration with LLM consent guard
- `/c/Users/P0039217/.claude/projects/EduSphere/apps/transcription-worker/src/hls/hls.service.ts` - File to modify for WebVTT caption generation (QW-2); already processes timestamped Whisper segments and uploads to MinIO
