# EduSphere — Agent Memory

## Project Status (Feb 2026)
- Branch: `fix/bug-16-23-g18` → PR #2 open against `master` (https://github.com/TalWayn72/EduSphere/pull/2)
- Phase: Production-ready; all features complete (Tier 1+2+3, 15/15)
- DB package: CommonJS module (`"module": "CommonJS"`) — cannot use `import.meta.url`
- `@edusphere/db` must be rebuilt (`pnpm --filter @edusphere/db build`) after schema changes before other packages can see new types
- GitHub API: use `NODE_TLS_REJECT_UNAUTHORIZED=0 node` + HTTPS module (no `gh` CLI, no curl on git-bash)

## Key Architecture Decisions
- Auth in subgraph resolvers: use `@Context() ctx: GraphQLContext` from `../auth/auth.middleware.js` and call `ctx.authContext.tenantId` (no UseGuards)
- GraphQL client in web: exported as `gqlClient` from `@/lib/graphql` (NOT `graphqlClient`)
- Schema tables use snake_case property names (from `content.ts`); `contentItems.ts` uses camelCase — inconsistency in codebase, both work
- Knowledge graph: Apache AGE via `executeCypher()` from `@edusphere/db` (packages/db/src/graph/client.ts)

## Nahar Shalom Course (Example Course Built)
- Course ID: `cc000000-0000-0000-0000-000000000002`
- Seed files:
  - `packages/db/src/seed/nahar-shalom-course.ts` — 8 modules, 27 content items, 15 graph concepts
  - `packages/db/src/seed/nahar-shalom-source.ts` — processes the DOCX as KnowledgeSource
  - `packages/db/src/seed/assets/nahar-shalom.docx` — source Word file (248KB)
- HebrewBooks.org free text: https://hebrewbooks.org/21991 (Siddur Nahar Shalom Part 1)

## NotebookLM Feature (Knowledge Sources) — COMPLETE
Full NotebookLM-style source management:
- **Schema**: `packages/db/src/schema/knowledge-sources.ts` → `knowledgeSources` table
- **Backend**: `apps/subgraph-knowledge/src/sources/`
  - `document-parser.service.ts` — parses DOCX (mammoth), PDF (pdf-parse), URL (fetch), YouTube (youtube-transcript), text
  - `knowledge-source.service.ts` — CRUD + chunking + embedding; handles FILE_PDF/TXT/YOUTUBE
  - `knowledge-source.controller.ts` — REST `POST /api/knowledge-sources/upload` (Multer memory, JWT, 50MB)
  - `knowledge-source.resolver.ts` — GraphQL queries/mutations incl. addYoutubeSource
  - `knowledge-source.graphql` — SDL schema with AddYoutubeSourceInput
  - `knowledge-source.module.ts` — NestJS module (controller registered)
- **Frontend**: `apps/web/src/components/SourceManager.tsx`
  - Add source modal: URL tab, Text tab, File tab (DOCX/PDF), YouTube tab
  - JWT Authorization header on file upload fetch
- **CourseDetailPage**: collapsible "מקורות מידע" panel (data-testid="toggle-sources")
- **Vite proxy**: `/api` → `http://localhost:4006`
- **GraphQL queries**: `apps/web/src/lib/graphql/sources.queries.ts` (incl. ADD_YOUTUBE_SOURCE)
- **Tests**: 52 unit tests pass; E2E: `apps/web/e2e/knowledge-sources.spec.ts`

## DOCX Processing Pattern
```typescript
// In Node.js (CommonJS package):
import { readFileSync } from 'fs';
import { join } from 'path';
const DOCX_PATH = join(__dirname, 'assets', 'nahar-shalom.docx');
const { default: mammoth } = await import('mammoth');
const buffer = readFileSync(DOCX_PATH);
const result = await mammoth.extractRawText({ buffer });
```

## Offline Storage Quota Feature (Feb 2026)
- **Mobile**: `apps/mobile/src/services/StorageManager.ts` — quota = 50% total disk, warn at 80%, block at 100%
  - `useStorageManager` hook in `apps/mobile/src/hooks/useStorageManager.ts` (polls every 5 min, clears interval on unmount)
  - `SettingsScreen.tsx` updated with visual storage bar + clear cache/downloads actions
  - `downloads.ts` has quota guard — throws `STORAGE_QUOTA_EXCEEDED:used:quota` error code
  - Tests in `apps/mobile/src/services/__tests__/StorageManager.test.ts`
- **Web**: `apps/web/src/services/StorageManager.ts` — uses `navigator.storage.estimate()`, self-limit = 50% of browser quota
  - `useStorageManager` hook in `apps/web/src/hooks/useStorageManager.ts`
  - `StorageWarningBanner.tsx` mounted in `App.tsx` — shows on ALL pages when over limit
  - `SettingsPage.tsx` has storage card with progress bar + clear cache button
- **No DB changes** — storage settings are device-local only (disk size varies per device)

## URL Processing Pattern
```typescript
const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
const html = await res.text();
const text = html.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim();
```
