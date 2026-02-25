# FEAT: Knowledge Sources — NotebookLM-Style Source Management

**Status:** ✅ Implemented
**Branch:** `docs/normalize-file-naming`
**Date:** 2026-02-25
**Scope:** subgraph-knowledge + web frontend + db schema

---

## Overview

Adds NotebookLM-style information source management to EduSphere courses.
Instructors can attach multiple data sources to a course; the system extracts text,
chunks it, and generates pgvector embeddings for semantic search and AI-assisted learning.

---

## User Stories

| Story | Description |
|-------|-------------|
| **US-1** | As an instructor, I can attach a URL to a course so the system indexes the web page content |
| **US-2** | As an instructor, I can paste raw text so it becomes a searchable knowledge source |
| **US-3** | As an instructor, I can upload a DOCX file and have the system extract its text |
| **US-4** | As a learner, I can see which sources are attached to a course and their processing status |
| **US-5** | As an instructor, I can delete a source when it is no longer relevant |

---

## Architecture

### Processing Pipeline

```
User submits source (URL / text / file)
   │
   ▼
INSERT knowledge_sources  (status = PENDING)
   │
   ▼
DocumentParserService.parse*()
   │  • parseUrl()   — fetch HTML + strip tags
   │  • parseText()  — normalise whitespace
   │  • parseDocx()  — mammoth.js DOCX → plaintext
   ▼
DocumentParserService.chunkText()
   │  chunkSize=1000 chars, overlap=200 chars
   │  snaps to word boundaries
   ▼
EmbeddingService.generateEmbedding() per chunk
   │  segmentId = "ks:{sourceId}:{chunkIndex}"
   │  stored in content_embeddings (pgvector HNSW)
   ▼
UPDATE knowledge_sources  (status = READY | FAILED)
```

### Example Course: Nahar Shalom (Rashash)

A complete example course (`cc000000-0000-0000-0000-000000000002`) was seeded
to demonstrate the feature. The Siddur Nahar Shalom text (505K chars, ~500 chunks)
by Rabbi Shalom Sharabi (Rashash, ~1760) was attached as a FILE_DOCX source.

Seed files:
- `packages/db/src/seed/nahar-shalom-course.ts` — 8 modules, 27 content items
- `packages/db/src/seed/nahar-shalom-source.ts` — DOCX source + chunking
- `packages/db/src/seed/assets/nahar-shalom.docx` — 248KB Word file

---

## Files Changed / Created

### Database

| File | Change |
|------|--------|
| `packages/db/src/schema/knowledge-sources.ts` | NEW — `knowledge_sources` table |
| `packages/db/src/schema/index.ts` | Export `knowledgeSources` |
| `packages/db/src/seed.ts` | Call `seedNaharShalomCourse()` + `seedNaharShalomSource()` |

#### Schema: `knowledge_sources`

```sql
CREATE TABLE knowledge_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  course_id   UUID REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  source_type TEXT NOT NULL,   -- FILE_DOCX | FILE_PDF | FILE_TXT | URL | YOUTUBE | TEXT
  origin      TEXT,            -- URL or file path
  file_key    TEXT,            -- MinIO key for uploaded files
  raw_content TEXT,            -- full extracted plaintext
  status      TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | PROCESSING | READY | FAILED
  chunk_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Backend (subgraph-knowledge, port 4006)

| File | Description |
|------|-------------|
| `src/sources/document-parser.service.ts` | Parse DOCX / URL / text → plaintext + chunk |
| `src/sources/knowledge-source.service.ts` | CRUD + processing pipeline |
| `src/sources/knowledge-source.resolver.ts` | GraphQL queries + mutations |
| `src/sources/knowledge-source.graphql` | SDL schema |
| `src/sources/knowledge-source.module.ts` | NestJS module |
| `src/app.module.ts` | Import `KnowledgeSourceModule` |

### Frontend (apps/web)

| File | Description |
|------|-------------|
| `src/components/SourceManager.tsx` | NotebookLM-style panel component |
| `src/lib/graphql/sources.queries.ts` | GraphQL query/mutation documents |

---

## GraphQL API

### Types

```graphql
enum SourceType { FILE_DOCX FILE_PDF FILE_TXT URL YOUTUBE TEXT }
enum SourceStatus { PENDING PROCESSING READY FAILED }

type KnowledgeSource {
  id: ID!
  title: String!
  sourceType: SourceType!
  origin: String
  preview: String
  rawContent: String
  status: SourceStatus!
  chunkCount: Int!
  errorMessage: String
  createdAt: String!
}
```

### Queries

```graphql
courseKnowledgeSources(courseId: ID!): [KnowledgeSource!]!
knowledgeSource(id: ID!): KnowledgeSource
```

### Mutations

```graphql
addUrlSource(input: AddUrlSourceInput!): KnowledgeSource!
addTextSource(input: AddTextSourceInput!): KnowledgeSource!
deleteKnowledgeSource(id: ID!): Boolean!
```

---

## Frontend Component

`<SourceManager courseId={id} />` renders a left sidebar panel with:

- **Source list** — each source shows icon, title, status badge, chunk count
- **Add Source modal** — three tabs: URL | Text | File (DOCX/PDF/TXT drag-drop)
- **Detail drawer** — full `rawContent` viewer
- **Auto-polling** — refetches every 3s while any source is PENDING or PROCESSING
- **Delete** — confirm dialog + immediate refetch

Status colors:
- `PENDING` → yellow
- `PROCESSING` → blue (animated pulse)
- `READY` → green
- `FAILED` → red + error message

---

## Testing

| Test File | Coverage |
|-----------|----------|
| `src/sources/document-parser.service.spec.ts` | parseText, chunkText, parseUrl, parseDocx |
| `src/sources/knowledge-source.service.spec.ts` | CRUD, processSource (TEXT/URL/DOCX), embedding failure handling |
| `src/sources/knowledge-source.service.memory.spec.ts` | onModuleDestroy closes pool, idempotent destroy, no orphaned PROCESSING rows |

---

## Security

- Auth: `ctx.authContext.tenantId` from JWT (no UseGuards — standard subgraph pattern)
- Tenant isolation: all queries filter by `tenant_id`
- No raw SQL — all Drizzle ORM queries
- File uploads go through existing MinIO REST endpoint (not implemented in this PR)

---

## Known Limitations / Future Work

- File upload via REST (`/api/knowledge-sources/upload`) — endpoint stub only in UI; backend REST route not yet implemented (DOCX seeded directly)
- YouTube transcript extraction (`YOUTUBE` type) — type enum exists, parser not yet wired
- PDF parsing — requires `pdf-parse` package; placeholder exists in `DocumentParserService`
- Embeddings are generated synchronously inline; for production, push to NATS JetStream queue

---

## Seed Instructions

```bash
# Build DB package first (schema changes)
pnpm --filter @edusphere/db build

# Run full seed (includes Nahar Shalom course + source)
pnpm --filter @edusphere/db seed
```
