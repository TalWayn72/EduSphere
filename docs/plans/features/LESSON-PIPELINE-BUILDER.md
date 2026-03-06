# Lesson Pipeline Builder — Implementation Plan

> **Note (CLAUDE.md rule):** Move this file to `docs/plans/lesson-pipeline-builder.md` before any code work begins.

---

## Context

EduSphere needs a **modular, AI-powered lesson processing pipeline** for Jewish religious education. Instructors (rabbis) need to go from raw video → structured, published lesson in one guided workflow. Two lesson archetypes exist:

1. **THEMATIC (שיעור הגות)** — Topic chosen by lecturer (Rabbi Avichai), citation density medium, flexible structure
2. **SEQUENTIAL (ספר עץ חיים על הסדר)** — Continuous study of Kabbalistic text (Rabbi Tubol), strict citation verification, sequential continuity tracking required

The system builds on existing EduSphere infrastructure: transcription worker (faster-whisper), LangGraph.js workflows, pgvector semantic search, NATS JetStream events, MinIO file storage, and the subgraph-content GraphQL API.

---

## Architecture Decisions

| Decision                | Choice                                                                               | Rationale                                                                                         |
| ----------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Hebrew ASR model        | `ivrit-ai/whisper-large-v3` via existing faster-whisper server                       | 8–29% WER improvement over vanilla Whisper on Hebrew; existing infra reused                       |
| Pipeline Canvas UI      | Native HTML5 drag-drop (portal-builder pattern) + `@dnd-kit/sortable` for reorder    | Consistent with existing portal-builder; avoids `@xyflow/react` React 19 zustand conflict         |
| NER approach            | LangGraph `HebrewNERWorkflow` + Vercel AI SDK `generateObject` + DICTA preprocessing | No pre-trained Talmud NER exists; structured LLM output with Zod schema is the practical solution |
| Citation verification   | pgvector semantic similarity (existing) + Sefaria API + fuzzy matching               | Sefaria covers Etz Chaim; pgvector already deployed; hybrid approach balances accuracy/speed      |
| Pipeline orchestration  | NestJS service (NOT a LangGraph meta-graph) sequencing 9 LangGraph workflows         | ASR delegates to existing NATS-based transcription worker; fire-and-forget with 5-min timeout     |
| Structured notes output | Markdown primary + DOCX via base64-encoded buffer                                    | Avoids binary storage complexity; DOCX generated in-memory via `docx` npm package                 |
| Diagram generation      | LLM → Mermaid.js syntax → SVG render via `@mermaid-js/mermaid-core`                  | No GPU needed; deterministic; embeddable in web                                                   |

---

## Critical Files to Reuse (Patterns)

| Pattern                                                               | Source File                                                 |
| --------------------------------------------------------------------- | ----------------------------------------------------------- |
| Drizzle schema helpers (`pk`, `tenantId`, `timestamps`, `softDelete`) | `packages/db/src/schema/content.ts`                         |
| LangGraph workflow structure                                          | `packages/langgraph-workflows/src/tutorWorkflow.ts`         |
| NestJS resolver pattern                                               | `apps/subgraph-content/src/course/course.resolver.ts`       |
| NestJS service with RLS                                               | `apps/subgraph-content/src/course/course.service.ts`        |
| Frontend urql mutation pattern                                        | `apps/web/src/pages/CourseEditPage.metadata.tsx`            |
| Drag-drop canvas (native)                                             | `apps/web/src/components/portal-builder/CanvasDropZone.tsx` |
| Frontend test pattern                                                 | `apps/web/src/pages/CourseEditPage.test.tsx`                |
| NATS events extension                                                 | `packages/nats-client/src/events.ts`                        |

---

## Phase 1 — Backend Foundation

**Parallel execution — Agents A, B, C run simultaneously**

### Agent A: Database Schema + NATS Events

**CREATE `packages/db/src/schema/lesson.ts`** — 6 new tables:

- `lessons`: `id, tenant_id, course_id, module_id (nullable), title, type enum(THEMATIC|SEQUENTIAL), series, lesson_date, instructor_id, status enum(DRAFT|PROCESSING|READY|PUBLISHED), ...timestamps, ...softDelete`
- `lesson_assets`: `id, lesson_id, asset_type enum(VIDEO|AUDIO|NOTES|WHITEBOARD), source_url, file_url, media_asset_id (FK media_assets, nullable), metadata jsonb`
- `lesson_pipelines`: `id, lesson_id, template_name, nodes jsonb, config jsonb, status enum(DRAFT|READY|RUNNING|COMPLETED|FAILED)`
- `lesson_pipeline_runs`: `id, pipeline_id, started_at, completed_at, status enum(RUNNING|COMPLETED|FAILED|CANCELLED), logs jsonb`
- `lesson_pipeline_results`: `id, run_id, module_name, output_type, output_data jsonb, file_url`
- `lesson_citations`: `id, lesson_id, source_text, book_name, part, page, column, paragraph, match_status enum(VERIFIED|UNVERIFIED|FAILED), confidence numeric(5,4)`

RLS on `lessons`: `USING (tenant_id::text = current_setting('app.current_tenant', TRUE))` — SI-1 compliant.
Nested tables (`lesson_assets`, etc.): enforced at service layer via `withTenantContext` join verification.

**MODIFY `packages/db/src/schema/index.ts`** — add `export * from './lesson'`

**MODIFY `packages/nats-client/src/events.ts`** — add:

```typescript
type LessonEventType =
  | 'lesson.created'
  | 'lesson.asset.uploaded'
  | 'lesson.pipeline.started'
  | 'lesson.pipeline.module.completed'
  | 'lesson.pipeline.completed'
  | 'lesson.published';

interface LessonPayload {
  type;
  lessonId;
  courseId;
  tenantId;
  timestamp;
}
interface LessonPipelineModuleCompletedPayload {
  type;
  lessonId;
  runId;
  moduleType;
  status;
  tenantId;
  timestamp;
}
```

Add to `NatsSubjects`: `LESSON_CREATED`, `LESSON_PIPELINE_STARTED`, `LESSON_PIPELINE_MODULE_COMPLETED`, `LESSON_PIPELINE_COMPLETED`, `LESSON_PUBLISHED`.

**RUN**: `pnpm --filter @edusphere/db generate && pnpm --filter @edusphere/db migrate`

### Agent B: GraphQL SDL

**CREATE `apps/subgraph-content/src/lesson/lesson.graphql`** — Full SDL with:

- Types: `Lesson`, `LessonAsset`, `LessonPipeline`, `LessonPipelineRun`, `LessonPipelineResult`, `LessonCitation`
- Enums: `LessonType`, `LessonStatus`, `LessonAssetType`, `PipelineModuleType` (10 values), `PipelineStatus`, `RunStatus`, `CitationMatchStatus`
- Queries: `lesson(id)`, `lessonsByCourse(courseId, limit, offset)`, `lessonPipelineRun(runId)` — all `@authenticated`
- Mutations: `createLesson`, `updateLesson`, `deleteLesson`, `addLessonAsset`, `saveLessonPipeline`, `startLessonPipelineRun`, `cancelLessonPipelineRun`, `publishLesson` — all `@authenticated @requiresScopes(scopes: ["course:write"])`
- Subscription: `lessonPipelineProgress(runId)` for real-time run status

**MODIFY `apps/subgraph-agent/src/template/template.graphql`** and **`packages/db/src/schema/agent.ts`** — add 9 new `TemplateType` enum values: `LESSON_INGESTION, HEBREW_NER, CONTENT_CLEANING, LESSON_SUMMARIZATION, STRUCTURED_NOTES, DIAGRAM_GENERATOR, CITATION_VERIFIER, QA_GATE, LESSON_PIPELINE_ORCHESTRATOR`

### Agent C: NestJS Lesson Module (depends on A+B)

**CREATE `apps/subgraph-content/src/lesson/`** directory with:

- **`lesson.module.ts`** — `@Module` wiring all services + `NatsModule` import
- **`lesson.service.ts`** — `implements OnModuleDestroy`, CRUD + `closeAllPools()`, publishes `lesson.created` + `lesson.published` events. All DB via `withTenantContext`.
- **`lesson-asset.service.ts`** — Asset CRUD, publishes `lesson.asset.uploaded`
- **`lesson-pipeline.service.ts`** — `savePipeline` (upsert), `startRun` (insert row + NATS publish + fire-and-forget to orchestrator with `Promise.race([task, timeout(5min)])`), `cancelRun`. `implements OnModuleDestroy` + `closeAllPools()`
- **`lesson-pipeline-orchestrator.service.ts`** — `implements OnModuleDestroy`, `private readonly activeControllers = new Set<AbortController>()`, sequences 9 workflow executions, persists results to DB, publishes per-module NATS events. `onModuleDestroy`: abort all controllers + clear Set + `closeAllPools()`.
- **`lesson.resolver.ts`** — Thin resolver, delegates to services, field resolvers for `assets`/`pipeline`/`citations`, subscription resolver for `lessonPipelineProgress`

**MODIFY `apps/subgraph-content/src/app.module.ts`** — import `LessonModule`

---

## Phase 2 — AI Pipeline Workflows

**All agents run in parallel (no dependencies between them)**

### Agents A–D: LangGraph Workflows (packages/langgraph-workflows/src/)

All follow `tutorWorkflow.ts` pattern exactly: Zod state schema → `Annotation.Root` → `StateGraph` → class with `buildGraph()`, `compile()`, `run()`, `stream()`. Hebrew prompts via `injectLocale(prompt, 'he')`.

| File                          | Workflow                 | State Highlights                                                       | Nodes                                                                                       | Array Cap                    |
| ----------------------------- | ------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------- |
| `lessonIngestionWorkflow.ts`  | LessonIngestionWorkflow  | videoUrl, audioFileKey, bundle                                         | validateInputs → fetchYouTubeMeta → bundleAssets                                            | —                            |
| `hebrewNERWorkflow.ts`        | HebrewNERWorkflow        | transcript, entities[], enrichedTranscript                             | extractBookNames → extractRabbis → extractTerms → linkSources → enrichTranscript            | entities: 500                |
| `contentCleaningWorkflow.ts`  | ContentCleaningWorkflow  | rawText, cleanedText, changeLog[]                                      | removeLogistics → replaceCitationMarkers → generateChangeLog                                | changeLog: 200               |
| `summarizationWorkflow.ts`    | SummarizationWorkflow    | text, shortSummary, longSummary, keyPoints[], discussionQuestions[]    | generateShortSummary → generateLongSummary → extractKeyPoints → generateDiscussionQuestions | keyPoints: 50, questions: 50 |
| `structuredNotesWorkflow.ts`  | StructuredNotesWorkflow  | summary, entities, structuredContent, outputMarkdown, outputDocxBase64 | buildHierarchy → insertSourceRefs → formatMarkdown → formatDocx                             | —                            |
| `diagramGeneratorWorkflow.ts` | DiagramGeneratorWorkflow | keyPoints, mermaidSrc, svgOutput                                       | buildMermaidSyntax → validateMermaid → renderToSvg                                          | —                            |
| `citationVerifierWorkflow.ts` | CitationVerifierWorkflow | citations, verifiedCitations[], failedCitations[], matchReport         | loadCandidates → semanticMatch → fuzzyMatch → generateReport                                | each: 500                    |
| `qaWorkflow.ts`               | QAWorkflow               | content, scores, sensitivityFlags[], fixList[], overallScore           | checkLinguistic → checkTopicCoverage → scanSensitivity → computeScore                       | fixList: 100                 |

**Agent E: Orchestrator (depends on A–D conceptually, but can be written concurrently)**

`lessonPipelineOrchestratorWorkflow.ts` — not a LangGraph graph itself, but exports the workflow dispatch map used by `LessonPipelineOrchestratorService`.

Module → Workflow mapping:

- `INGESTION` → `LessonIngestionWorkflow`
- `ASR` → NATS request-reply to existing `transcription-worker` (timeout 10 min for long audio)
- `NER_SOURCE_LINKING` → `HebrewNERWorkflow`
- `CONTENT_CLEANING` → `ContentCleaningWorkflow`
- `SUMMARIZATION` → `SummarizationWorkflow`
- `STRUCTURED_NOTES` → `StructuredNotesWorkflow`
- `DIAGRAM_GENERATOR` → `DiagramGeneratorWorkflow`
- `CITATION_VERIFIER` → `CitationVerifierWorkflow`
- `QA_GATE` → `QAWorkflow`
- `PUBLISH_SHARE` → handled by `publishLesson` mutation (no workflow needed)

**MODIFY `packages/langgraph-workflows/src/index.ts`** — export all 8 new workflow classes

**SI-10 compliance**: Every workflow that sends text to OpenAI/Anthropic must check `THIRD_PARTY_LLM` tenant consent flag before calling LLM.

---

## Phase 3 — Frontend

**All agents run in parallel**

### Agent X: GraphQL Queries + Zustand Store + Router

**CREATE `apps/web/src/lib/graphql/lesson.queries.ts`** — Operations:
`CREATE_LESSON_MUTATION`, `LESSONS_BY_COURSE_QUERY`, `LESSON_QUERY`, `SAVE_PIPELINE_MUTATION`, `START_PIPELINE_RUN_MUTATION`, `CANCEL_PIPELINE_RUN_MUTATION`, `ADD_LESSON_ASSET_MUTATION`, `PUBLISH_LESSON_MUTATION`, `PIPELINE_PROGRESS_SUBSCRIPTION`

**CREATE `apps/web/src/lib/lesson-pipeline.store.ts`** — Zustand v5 store:

```typescript
interface LessonPipelineState {
  nodes: PipelineNode[]; // ordered, bounded (max 10)
  isDirty: boolean;
  selectedNodeId: string | null;
  // actions: setNodes, addNode, removeNode, reorderNodes, toggleNode,
  //          updateNodeConfig, loadTemplate, setSelectedNode, resetDirty
}
```

`loadTemplate('THEMATIC')` → 8 nodes: `[INGESTION, ASR, NER_SOURCE_LINKING, CONTENT_CLEANING, SUMMARIZATION, STRUCTURED_NOTES, QA_GATE, PUBLISH_SHARE]`
`loadTemplate('SEQUENTIAL')` → 9 nodes: `[INGESTION, ASR, NER_SOURCE_LINKING, CONTENT_CLEANING, CITATION_VERIFIER, STRUCTURED_NOTES, DIAGRAM_GENERATOR, QA_GATE, PUBLISH_SHARE]`

**MODIFY `apps/web/src/lib/router.tsx`** — Add 4 routes BEFORE `/courses/:courseId` (prevent greedy match):

```
/courses/:courseId/lessons/new           → CreateLessonPage (lazy)
/courses/:courseId/lessons/:lessonId/pipeline  → LessonPipelinePage (lazy)
/courses/:courseId/lessons/:lessonId/results   → LessonResultsPage (lazy)
/courses/:courseId/lessons/:lessonId           → LessonDetailPage (lazy)
```

### Agent Y: CreateLessonPage Wizard

**CREATE `apps/web/src/pages/CreateLessonPage.tsx`** — 3-step wizard (mirrors CourseCreatePage pattern):

- Step 1 (`CreateLessonPage.step1.tsx`): Title, Type radio (THEMATIC/SEQUENTIAL), Series, LessonDate, Instructor. React Hook Form + Zod validation.
- Step 2 (`CreateLessonPage.step2.tsx`): YouTube URL (validated `z.string().url()` restricted to youtube.com/youtu.be), audio upload, notes PDF upload. Calls `ADD_LESSON_ASSET_MUTATION` per asset.
- Step 3: Two template preset cards with Hebrew labels and descriptions. `loadTemplate()` on selection. "Create Lesson" calls `CREATE_LESSON_MUTATION`. On success → navigate to `/courses/:courseId/lessons/:lessonId/pipeline`.

### Agent Z: LessonPipelinePage (Pipeline Canvas)

**CREATE `apps/web/src/pages/LessonPipelinePage.tsx`** — main pipeline builder.

Sub-components (all under 150 lines, split by function):

- **`components/lesson-pipeline/ModulePalette.tsx`** — Left sidebar. 10 draggable module cards, Hebrew label + description. `draggable="true"` + `onDragStart` sets `dataTransfer.setData('moduleType', type)`. Same pattern as `BlockPalette.tsx`.
- **`components/lesson-pipeline/PipelineCanvas.tsx`** — Center drop zone. Reads from Zustand store. `onDrop` adds node. Existing nodes sortable via `@dnd-kit/sortable` (`SortableContext` + `useSortable` per node). "Save" button (disabled when `!isDirty`) calls `SAVE_PIPELINE_MUTATION`. "Run" button calls `START_PIPELINE_RUN_MUTATION`. Per-node status badges when run active.
- **`components/lesson-pipeline/NodeConfigPanel.tsx`** — Right panel. Config form per `PipelineModuleType`. Each module type has a static Zod config schema. React Hook Form. `onSubmit` calls `updateNodeConfig(id, config)` on store.
- **`components/lesson-pipeline/PipelineProgressPanel.tsx`** — Replaces config panel during active run. Vertical stepper showing per-module status from `PIPELINE_PROGRESS_SUBSCRIPTION`. Memory safety: `pause: true` flag controlled by `useEffect(() => () => setPaused(true), [])`.

### Agent W: LessonDetailPage + LessonResultsPage + CourseDetailPage patch

**CREATE `apps/web/src/pages/LessonDetailPage.tsx`** — Metadata card, asset list (with type icons), pipeline status badge. Buttons: "Open Pipeline" → pipeline route, "View Results" (only when READY/PUBLISHED) → results route.

**CREATE `apps/web/src/pages/LessonResultsPage.tsx`** — Sections rendered by `outputType`:

- Transcript (segmented, timestamps, speaker badges)
- Summary cards (short/long/key-points/discussion questions in tabs)
- Structured notes (Markdown via TipTap read-only or `react-markdown`)
- Diagram (SVG embed, full-screen option)
- Citations table (book name, location, match status badge, confidence %)
- QA report (RadialChart score from Recharts, fix list accordion)
- Publish section (copy link button, Word doc download)

**MODIFY `apps/web/src/pages/CourseDetailPage.tsx`** — Add "Lessons" section (additive only):

- `LESSONS_BY_COURSE_QUERY` with `pause: !courseId`
- Lesson cards list with status badges
- "Add Lesson" button → `/courses/:courseId/lessons/new`

---

## Phase 4 — Tests

**All test agents run in parallel**

### Agent T1: Backend Unit Tests

**`packages/db/src/schema/schema-lesson.test.ts`** — Validates all 6 tables exported, enum values correct, FK references defined. Pure TS, no DB.

**`apps/subgraph-content/src/lesson/lesson.service.spec.ts`** — Mock `createDatabaseConnection` + `withTenantContext`. Test CRUD, NATS publish on `create`/`publish`, `closeAllPools` in `onModuleDestroy`.

**`apps/subgraph-content/src/lesson/lesson-pipeline.service.spec.ts`** — Test `savePipeline` upsert, `startRun` flow, `cancelRun` status update, fire-and-forget timeout behavior.

**`apps/subgraph-content/src/lesson/lesson.resolver.spec.ts`** — Auth guard throws on missing context, service delegation correct.

**`packages/nats-client/src/events.lesson.test.ts`** — Type guard tests for all 6 new lesson event types. `NatsSubjects` contains all new keys with `EDUSPHERE.` prefix.

### Agent T2: Memory Safety + Workflow Tests

**`apps/subgraph-content/src/lesson/lesson-pipeline-orchestrator.service.memory.spec.ts`**:

1. `onModuleDestroy` calls `abort()` on all active `AbortController` instances
2. `activeControllers` Set is empty after destroy
3. `closeAllPools` called exactly once per destroy
4. New run started after destroy is rejected

**`packages/langgraph-workflows/src/hebrewNERWorkflow.test.ts`** — entity array capped at 500, `run()` returns complete state, `stream()` yields intermediate states. Mock `generateObject`.

**`packages/langgraph-workflows/src/citationVerifierWorkflow.test.ts`** — verified/failed arrays capped at 500, semantic match calls pgvector service.

**`packages/langgraph-workflows/src/summarizationWorkflow.test.ts`** — keyPoints capped at 50, both short+long summaries generated.

### Agent T3: CreateLessonPage Tests

**`apps/web/src/pages/CreateLessonPage.test.tsx`** — 12 tests, following `CourseEditPage.test.tsx` pattern exactly:

```typescript
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + String(values[i] ?? ''), ''),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));
vi.mock('@/components/Layout', () => ({ Layout: ({ children }) => children }));
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useParams: vi.fn(() => ({ courseId: 'c-1' })),
  useNavigate: vi.fn(() => mockNavigate),
}));
```

Tests: Step 1 renders + validation, Step 2 asset fields, template card selection, `createLesson` called on submit, navigate on success, error toast on failure.

**`apps/web/src/lib/lesson-pipeline.store.test.ts`** — Pure Zustand store tests (no React):

- `addNode` / `removeNode` / `reorderNodes` correctness
- `loadTemplate('THEMATIC')` → 8 nodes in correct order
- `loadTemplate('SEQUENTIAL')` → 9 nodes with CITATION_VERIFIER included
- `isDirty` set on any mutation, cleared by `resetDirty`

### Agent T4: LessonPipelinePage Tests

**`apps/web/src/pages/LessonPipelinePage.test.tsx`** — 14 tests:

- Module palette renders all 10 module types
- Empty canvas shows drop-zone placeholder text
- Drop on canvas adds node to Zustand store
- Existing nodes loaded from `LESSON_QUERY` displayed
- Save disabled when `!isDirty`, enabled after reorder
- `SAVE_PIPELINE_MUTATION` called with correct nodes JSON
- `START_PIPELINE_RUN_MUTATION` called on Run click
- Progress panel shown when `run.status === 'RUNNING'`
- Module status badges update from subscription data
- Selecting node opens config panel
- Config change updates store + enables Save

### Agent T5: Results + Detail Page Tests

**`apps/web/src/pages/LessonResultsPage.test.tsx`** — 10 tests: loading state, transcript section, summary cards, citation table with match status badges, QA score display, publish section with PUBLISHED status only.

**`apps/web/src/pages/LessonDetailPage.test.tsx`** — 8 tests: metadata rendered, asset list, pipeline status badge, "Open Pipeline" navigation, "View Results" conditional.

---

## Verification Checklist

```bash
# 1. Schema migration applies cleanly
pnpm --filter @edusphere/db generate
pnpm --filter @edusphere/db migrate

# 2. TypeScript — zero errors
pnpm --filter @edusphere/subgraph-content exec tsc --noEmit
pnpm --filter @edusphere/web exec tsc --noEmit
pnpm --filter @edusphere/langgraph-workflows exec tsc --noEmit

# 3. ESLint — zero warnings (run per file after each write)
mcp__eslint__lint-files({ filePaths: ["<absolute path>"] })

# 4. All tests pass
pnpm --filter @edusphere/web test --run
pnpm --filter @edusphere/subgraph-content test --run
pnpm --filter @edusphere/langgraph-workflows test --run
pnpm --filter @edusphere/nats-client test --run

# 5. Supergraph composition
pnpm --filter @edusphere/gateway compose

# 6. Memory safety spec passes
pnpm --filter @edusphere/subgraph-content test --run lesson-pipeline-orchestrator.service.memory

# 7. Security tests still pass
pnpm test:rls
pnpm test:security

# 8. Health check
./scripts/health-check.sh
```

---

## New Package Dependencies

```json
// apps/web/package.json — FRONTEND
"@xyflow/react": "NOT NEEDED — using native drag-drop pattern",
"docx": "^8.x",  // DOCX generation in LessonResultsPage download

// apps/transcription-worker (already has faster-whisper)
// No new Python packages needed — ivrit-ai/whisper-large-v3 is loaded via
// existing faster-whisper server by setting WHISPER_MODEL=ivrit-ai/whisper-large-v3

// packages/langgraph-workflows/package.json
"@mermaid-js/mermaid-core": "^11.x",  // SVG rendering for DiagramGeneratorWorkflow
"fuse.js": "^7.x",                      // Fuzzy matching for CitationVerifierWorkflow
```

---

## Security Requirements Summary

| Area             | Requirement                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RLS              | `lessons` table: standard `app.current_tenant` policy (SI-1). Nested tables: service-layer join verification.                                                                   |
| Input validation | `CreateLessonInput` validated by Zod in service: `type` only `THEMATIC\|SEQUENTIAL`, `moduleId` must belong to `courseId`. YouTube URL restricted to youtube.com/youtu.be only. |
| Auth             | All mutations: `@authenticated @requiresScopes(scopes: ["course:write"])`. Delete requires ownership check (instructor owns lesson OR ORG_ADMIN).                               |
| LLM consent      | All workflows calling OpenAI/Anthropic must check `THIRD_PARTY_LLM` consent flag (SI-10). Throw `CONSENT_REQUIRED` if missing.                                                  |
| Cross-tenant     | `LessonPipelineOrchestratorService` verifies tenant ownership before executing any run (SI-9).                                                                                  |
| Pipeline abuse   | `startLessonPipelineRun` rate-limited at gateway level (per-tenant). Cannot start run if another is `RUNNING` on same lesson.                                                   |

---

## File Count Summary

| Phase     | New Files                                                            | Modified Files                                          |
| --------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| Phase 1   | 7 (schema + NATS + SDL + 5 NestJS)                                   | 4 (db index, agent.ts, template.graphql, app.module.ts) |
| Phase 2   | 9 (8 workflows + index.ts)                                           | 1 (index.ts)                                            |
| Phase 3   | 12 (4 pages + 3 sub-pages + 4 components + 1 store + 1 queries file) | 2 (router.tsx + CourseDetailPage.tsx)                   |
| Phase 4   | 13 test files                                                        | 2 (existing test files updated)                         |
| **Total** | **41 new**                                                           | **9 modified**                                          |
