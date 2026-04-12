# Feature Plan: Professional Jargon (ג'ארגון מקצועי)

## Context

Lesson transcripts (especially Hebrew) suffer from STT errors on domain-specific terminology. Terms like ע"ב, ספירות, זו"ן are misrecognized as gibberish. This feature builds a domain-aware jargon dictionary that corrects transcripts, creates a living glossary wiki, and adds a source citation verification workflow — transforming raw transcripts into scholarly-grade enriched content.

**Decisions made:**

- Domain detection: auto from transcript + instructor confirmation
- Glossary scope: tenant (organization) level, shared across courses
- UX: tooltip/popover in transcript + dedicated wiki page
- Citation format: generic (presets + free-text LLM parsing via Ollama)
- Content types: all (video, PDF, DOCX, text)
- LLM: Ollama local (existing infra), fallback to OpenAI
- Strategy: 3 phases

---

## Phase 1: Jargon Dictionary + Transcript Recognition

### 1.1 Database — new file `packages/db/src/schema/jargon.ts`

**`jargon_domains`** — Subject areas (Kabbalah, Talmud, Physics...)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK(tenants) | RLS |
| name | text NOT NULL | UNIQUE(tenant_id, name) |
| description | text | |
| language | text DEFAULT 'he' | primary language |
| parent_domain_id | uuid FK(self) | hierarchy (Kabbalah → Jewish Studies) |
| metadata | jsonb DEFAULT {} | |

**`jargon_terms`** — Individual terms within a domain
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| tenant_id | uuid FK(tenants) | RLS |
| domain_id | uuid FK(jargon_domains) | |
| canonical_form | text NOT NULL | correct spelling: "ספירות" |
| phonetic_hint | text | for Whisper prompt: "sefirot" |
| alt_forms | jsonb DEFAULT [] | variants: ["ספירה","הספירות"] |
| definition_short | text | tooltip definition |
| definition_full | text | wiki content (Phase 2) |
| language | text DEFAULT 'he' | |
| source | text DEFAULT 'AUTO' | AUTO / MANUAL / IMPORTED |
| confidence | numeric(5,4) | auto-detection confidence |
| graph_term_id | text | FK to AGE Term vertex |
| UNIQUE(tenant_id, domain_id, canonical_form) | | |

**`domain_proximity`** — Vector distance between domains
| Column | Type | Notes |
|--------|------|-------|
| domain_a_id, domain_b_id | uuid FK(jargon_domains) | |
| proximity_score | numeric(5,4) | 0-1 (Kabbalah↔Talmud = 0.85) |
| UNIQUE(tenant_id, domain_a_id, domain_b_id) | | |

**`lesson_domain_assignments`** — Which domains a lesson belongs to
| Column | Type | Notes |
|--------|------|-------|
| lesson_id | uuid FK(lessons) | |
| domain_id | uuid FK(jargon_domains) | |
| detection_method | text | AUTO / INSTRUCTOR_CONFIRMED |
| confidence | numeric(5,4) | |

**`jargon_occurrences`** — Where terms appear in lessons
| Column | Type | Notes |
|--------|------|-------|
| lesson_id | uuid FK(lessons) | |
| term_id | uuid FK(jargon_terms) | |
| segment_id | uuid FK(transcript_segments) | |
| block_id | uuid FK(enriched_transcript_blocks) | |
| start_time, end_time | numeric(10,3) | |
| original_text | text | what STT produced |
| corrected_text | text | canonical form applied |
| confidence | numeric(5,4) | |

**`jargon_term_embeddings`** — pgvector for fuzzy term matching
| Column | Type | Notes |
|--------|------|-------|
| term_id | uuid FK(jargon_terms) UNIQUE | |
| embedding | vector(768) | HNSW cosine index |

### 1.2 Apache AGE Graph — modify `packages/db/src/graph/ontology.ts`

Add new vertex label `Domain` and edges:

- `(:Domain)-[:RELATED_DOMAIN {proximity: float}]->(:Domain)`
- `(:Term)-[:BELONGS_TO_DOMAIN]->(:Domain)`

Reuse existing `ConceptRelationshipType` pattern. Add `'RELATED_DOMAIN'` and `'BELONGS_TO_DOMAIN'` to the type union.

### 1.3 Enriched Block Type Extension

In `packages/db/src/schema/enriched-transcript.ts` line 34:

- Extend `block_type` enum: `['TEXT', 'CITATION', 'VISUAL_ANCHOR', 'HEADING']` → add no new type
- Instead, enhance TEXT blocks' `content` jsonb to include jargon highlights:
  ```json
  {
    "text": "...",
    "jargonHighlights": [{ "termId": "uuid", "start": 42, "end": 47 }]
  }
  ```

### 1.4 GraphQL SDL — new `apps/subgraph-knowledge/src/jargon/jargon.graphql`

```graphql
type JargonDomain { id, name, description, language, parentDomain, termCount, relatedDomains }
type JargonTerm { id, domain, canonicalForm, phoneticHint, altForms, definitionShort, source, confidence }
type JargonOccurrence { id, lessonId, term, startTime, endTime, originalText, correctedText }
type DomainDetectionResult { domains: [DetectedDomain!]!, suggestedTerms }

Query:
  jargonDomains, jargonTerms(domainId, search), detectLessonDomains(lessonId)
  lessonJargonOccurrences(lessonId)

Mutation:
  createJargonDomain, addJargonTerm, confirmLessonDomains(lessonId, domainIds)
  importJargonTerms(domainId, terms[])
```

### 1.5 Backend Services — `apps/subgraph-knowledge/src/jargon/`

| Service                       | Responsibility                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `jargon-domain.service.ts`    | CRUD domains, parent-child hierarchy, compute proximity via pgvector           |
| `jargon-term.service.ts`      | CRUD terms, alt_forms, generate embeddings, bulk import                        |
| `jargon-detection.service.ts` | **Core algorithm**: Aho-Corasick multi-pattern match + pgvector fuzzy fallback |
| `jargon-resolver.ts`          | GraphQL resolvers                                                              |

### 1.6 Jargon Post-Processor — `apps/transcription-worker/src/jargon/`

| Service                             | Responsibility                                                           |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `jargon-post-processor.service.ts`  | Runs after transcript stored, before enriched blocks. Corrects segments. |
| `jargon-post-processor.consumer.ts` | NATS consumer for `lesson.transcript.ready`                              |

**Pipeline insertion point** (existing flow → new step):

```
transcript stored → NATS(lesson.transcript.ready)
  → [NEW] JargonPostProcessorConsumer:
      1. detectDomains(transcript) via Ollama + pgvector
      2. detectJargon(segments, domains) via Aho-Corasick + pgvector
      3. Correct transcript_segments.text with canonical forms
      4. Store jargon_occurrences
      5. NATS(jargon.detection.completed)
  → [EXISTING] TranscriptReadyConsumer (enriched blocks, now using corrected text)
```

### 1.7 Jargon Detection Algorithm

```
1. Load all jargon_terms for lesson's domains + nearby domains (proximity > 0.5)
2. Build Aho-Corasick automaton from canonical_form + alt_forms → O(n) multi-match
3. For unmatched Hebrew substrings that look like jargon (acronyms, abbreviations):
   a. Embed candidate via Ollama nomic-embed-text
   b. pgvector cosine search against jargon_term_embeddings (threshold > 0.85)
   c. Record as fuzzy match with lower confidence
4. Record all occurrences in jargon_occurrences
5. Correct segment text: replace garbled form with canonical_form
6. New unrecognized terms → add to jargon_terms with source=AUTO, low confidence
```

### 1.8 Whisper Enhancement — modify `apps/transcription-worker/src/transcription/whisper.client.ts`

Add `initial_prompt` parameter with domain-specific jargon terms:

```
initial_prompt: "שיעור בקבלה. מושגים: ספירות, עץ חיים, זוהר, פרצוף, ע"ב, ס"ג, מ"ה, ב"ן..."
```

Fetch top 50 terms from lesson's domains when domains are pre-assigned.

### 1.9 Domain Detection Algorithm

```
1. Take first 4000 chars of transcript
2. Embed via nomic-embed-text
3. For each tenant domain: compute centroid (avg of top-20 term embeddings)
4. cosine_similarity(transcript_embedding, domain_centroid) → score
5. Additionally: LLM structured output (Ollama) to identify domains
6. Combine: embedding 60% + LLM 40%
7. Return domains with score > 0.4, sorted descending
8. Present to instructor for confirmation
```

### 1.10 Frontend — Phase 1

| Component                     | Location                          | Purpose                                              |
| ----------------------------- | --------------------------------- | ---------------------------------------------------- |
| `DomainConfirmationModal.tsx` | `apps/web/src/components/jargon/` | After detection, instructor confirms/adjusts domains |
| `JargonManagementPage.tsx`    | `apps/web/src/pages/`             | Tenant admin: manage domains + terms, bulk import    |
| `JargonTermForm.tsx`          | `apps/web/src/components/jargon/` | Add/edit term with alt_forms, phonetic hint          |

### 1.11 NATS Events (Phase 1)

| Subject                      | Publisher           | Consumer                           |
| ---------------------------- | ------------------- | ---------------------------------- |
| `jargon.domains.detected`    | JargonPostProcessor | content-subgraph                   |
| `jargon.detection.completed` | JargonPostProcessor | content-subgraph (enriched blocks) |
| `jargon.term.added`          | JargonTermService   | knowledge-subgraph (embedding)     |

---

## Phase 2: Glossary Wiki + Cross-References

### 2.1 Database — new file `packages/db/src/schema/glossary.ts`

**`glossary_entries`** — Wiki page per term
| Column | Type | Notes |
|--------|------|-------|
| term_id | uuid FK(jargon_terms) UNIQUE | one wiki page per term |
| wiki_content | text | Markdown, editable by instructor |
| aggregated_definition | text | auto-generated from lessons via LLM |
| aggregation_lesson_ids | jsonb DEFAULT [] | which lessons contributed |
| is_published | boolean DEFAULT false | |

**`glossary_lesson_refs`** — Cross-references (term → lessons)
| Column | Type | Notes |
|--------|------|-------|
| glossary_entry_id | uuid FK(glossary_entries) | |
| lesson_id | uuid FK(lessons) | |
| occurrence_count | integer | how many times term appears |
| centrality_score | numeric(5,4) | how central the term is in lesson |
| first_mention_time | numeric(10,3) | timestamp for deep-link |

### 2.2 GraphQL SDL — `apps/subgraph-knowledge/src/glossary/glossary.graphql`

```graphql
type GlossaryEntry { term, wikiContent, aggregatedDefinition, isPublished, lessonRefs, crossReferences }
type GlossaryLessonRef { lesson, occurrenceCount, centralityScore, firstMentionTime }

Query: glossaryEntry(termId), glossarySearch(query), glossaryEntries(domainId)
Mutation: updateGlossaryWiki(termId, wikiContent), aggregateGlossaryDefinition(termId)
```

### 2.3 Backend Services

| Service                           | Responsibility                                                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------- |
| `glossary-aggregation.service.ts` | On `jargon.detection.completed` → update lesson refs, compute centrality, LLM-aggregate definition |
| `glossary-search.service.ts`      | HybridRAG search: pgvector on term embeddings + full-text on wiki_content                          |

**Centrality algorithm:**

```
centrality = (occurrence_count / total_lesson_segments) * time_weight
time_weight: higher if term is discussed at length (not just mentioned once)
```

**Definition aggregation (LLM):**
Collect transcript segments where term occurs → Ollama prompt: "Synthesize a definition for [term] based on these lesson excerpts..."

### 2.4 Frontend — Phase 2

| Component               | Location               | Purpose                                                                       |
| ----------------------- | ---------------------- | ----------------------------------------------------------------------------- |
| `JargonTooltip.tsx`     | `enriched-transcript/` | Hover/click on highlighted term → short definition + wiki link                |
| `JargonHighlighter.tsx` | `enriched-transcript/` | Wraps jargon terms in `<mark>` with tooltip trigger                           |
| `GlossaryWikiPage.tsx`  | `pages/`               | Full wiki page: definition, lesson refs (sorted by centrality), related terms |
| `GlossarySearchBar.tsx` | `components/glossary/` | Debounced search across glossary                                              |

**Tooltip UX (Radix HoverCard):**

- Hover: term name + short definition (2-3 lines)
- "View full page →" link to `/glossary/:termId`
- Click on lesson ref → `/learn/:lessonId?t=<firstMentionTime>`

### 2.5 Enriched Block Enhancement

Modify `enriched-lesson-blocks.service.ts` (`createBlocksFromSegments`):

- After grouping segments, query `jargon_occurrences` for the lesson
- Inject `jargonHighlights` into each TEXT block's `content` jsonb
- Frontend `JargonHighlighter` renders highlights from these offsets

---

## Phase 3: Source Citations + Verification

### 3.1 Database — new file `packages/db/src/schema/citation-format.ts`

**`citation_format_configs`** — How this course cites sources
| Column | Type | Notes |
|--------|------|-------|
| course_id | uuid FK(courses) | |
| preset_name | text | JEWISH_TEXTS / APA / MLA / CUSTOM |
| format_description | text | free-text from instructor |
| parsed_structure | jsonb | LLM-parsed: `{fields: [{name, label, required}]}` |
| is_active | boolean DEFAULT true | |

**`detected_source_references`** — Sources detected in transcript
| Column | Type | Notes |
|--------|------|-------|
| lesson_id | uuid FK(lessons) | |
| citation_id | uuid FK(lesson_citations) | links to existing citation |
| detected_text | text | raw text from transcript |
| parsed_reference | jsonb | structured: `{bookName, part, page, column}` |
| linked_source_id | uuid FK(knowledge_sources) | instructor-linked source |
| verification_status | text | PENDING / VERIFIED / MISMATCH / UNLINKED |
| verified_text | text | matched text from source doc |
| mismatch_details | text | explanation if mismatch |

### 3.2 Citation Format Configuration Flow

1. **After instructor uploads content** (video/PDF/docs):
   - System presents preset options:
     - Jewish Texts (ספר/חלק/עמוד/עמודה)
     - APA, MLA, Chicago
     - Custom (free-text description)
   - If custom: instructor writes description (like the Kabbalah example user gave)
   - **LLM parses** (Ollama) the free-text → structured field definition
   - System also **suggests format** based on citations detected in uploaded content
2. **Format stored** in `citation_format_configs`
3. **NER pipeline** uses format config to recognize citations in future transcripts

### 3.3 Source Upload Workflow

After transcription + jargon correction + citation NER:

1. System lists all `detected_source_references` for the lesson
2. For each reference (e.g., "ע"ח, ח"ב, מ"ד, ע"ד"):
   - "Upload source" button → opens KnowledgeSource upload dialog
   - "Link existing" dropdown → search existing knowledge_sources
3. After instructor links source → triggers verification

### 3.4 Citation Verification Algorithm

```
1. Parse reference using citation_format_config
   e.g., {bookName: "עץ חיים", part: "חלק ב", page: "מ"ד", column: "ד"}
2. Search linked knowledge_source.raw_content:
   a. Structured source (PDF with sections): navigate to part/page
   b. Unstructured: pgvector search on chunk_embeddings
3. Compare quoted text vs source text:
   a. Exact substring match → VERIFIED (confidence 1.0)
   b. Levenshtein ratio > 0.8 → VERIFIED (confidence = ratio)
   c. Semantic cosine > 0.9 → VERIFIED (confidence 0.7)
   d. Otherwise → MISMATCH + explanation
4. Verified citations → blue highlight in transcript (distinct from instructor words)
5. Mismatches → red flag for instructor review
```

### 3.5 Frontend — Phase 3

| Component                       | Location               | Purpose                                                           |
| ------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| `CitationFormatWizard.tsx`      | `components/citation/` | Step-by-step: preset → custom description → LLM parse → confirm   |
| `SourceLinkingPanel.tsx`        | `components/citation/` | List detected references + upload/link source buttons             |
| `VerifiedCitationIndicator.tsx` | `enriched-transcript/` | Blue highlight for verified, yellow for pending, red for mismatch |

### 3.6 NATS Events (Phase 3)

| Subject                           | Publisher                   | Consumer                        |
| --------------------------------- | --------------------------- | ------------------------------- |
| `citation.source.linked`          | CitationFormatService       | CitationVerificationService     |
| `citation.verification.completed` | CitationVerificationService | content-subgraph (block update) |

---

## Critical Files to Modify

| File                                                                          | Change                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------- |
| `packages/db/src/schema/jargon.ts`                                            | **NEW** — 6 tables                                   |
| `packages/db/src/schema/glossary.ts`                                          | **NEW** — 2 tables                                   |
| `packages/db/src/schema/citation-format.ts`                                   | **NEW** — 2 tables                                   |
| `packages/db/src/schema/enriched-transcript.ts`                               | Enhance content jsonb with jargonHighlights          |
| `packages/db/src/graph/ontology.ts`                                           | Add Domain vertex + 2 edge types                     |
| `apps/subgraph-knowledge/src/jargon/`                                         | **NEW** — domain, term, detection services + SDL     |
| `apps/subgraph-knowledge/src/glossary/`                                       | **NEW** — aggregation, search services + SDL         |
| `apps/transcription-worker/src/jargon/`                                       | **NEW** — post-processor consumer                    |
| `apps/transcription-worker/src/transcription/whisper.client.ts`               | Add initial_prompt with jargon terms                 |
| `apps/subgraph-content/src/enriched-lesson/enriched-lesson-blocks.service.ts` | Inject jargon highlights into blocks                 |
| `apps/subgraph-content/src/citation-format/`                                  | **NEW** — format config, verification services + SDL |
| `apps/web/src/components/jargon/`                                             | **NEW** — DomainConfirmation, JargonManagement       |
| `apps/web/src/components/enriched-transcript/JargonTooltip.tsx`               | **NEW**                                              |
| `apps/web/src/components/enriched-transcript/JargonHighlighter.tsx`           | **NEW**                                              |
| `apps/web/src/pages/GlossaryWikiPage.tsx`                                     | **NEW** — replace/extend current static glossary     |
| `apps/web/src/components/citation/CitationFormatWizard.tsx`                   | **NEW**                                              |
| `apps/web/src/components/citation/SourceLinkingPanel.tsx`                     | **NEW**                                              |

## Existing Code to Reuse

| What                             | Where                                                                       | Reuse How                                     |
| -------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------- |
| Aho-Corasick                     | NPM `ahocorasick` or implement in `jargon-detection.service.ts`             | Multi-pattern string matching                 |
| Embedding generation             | `apps/subgraph-knowledge/src/embedding/embedding.service.ts`                | Generate term embeddings                      |
| pgvector search                  | `apps/subgraph-knowledge/src/graph/graph-search.service.ts`                 | HybridRAG pattern for glossary search         |
| Cypher helpers                   | `packages/db/src/graph/ontology.ts` — `createConcept`, `createRelationship` | Pattern for Domain vertex CRUD                |
| CitationCard/InlineCitationBlock | `apps/web/src/components/enriched-transcript/`                              | Extend with verification status               |
| LLM structured output            | `apps/transcription-worker/src/knowledge/hebrew-citation-ner.service.ts`    | Pattern for domain detection + format parsing |
| HoverCard                        | Radix `@radix-ui/react-hover-card` via shadcn/ui                            | JargonTooltip component                       |
| SourceManager                    | `apps/web/src/components/source-manager/SourceManager.tsx`                  | Source upload in SourceLinkingPanel           |
| File upload                      | `apps/web/src/hooks/useFileUpload.ts`                                       | 3-phase upload for source documents           |

## Verification Plan

### Phase 1 Tests

- Unit: jargon schema RLS (8), domain/term CRUD (15), Aho-Corasick detection (15)
- Integration: NATS post-processor flow (5), Whisper prompt enhancement (3)
- Frontend: DomainConfirmationModal (5), JargonManagement (8)
- E2E: `apps/web/e2e/jargon-management.spec.ts` — create domain, add terms, process lesson (3)

### Phase 2 Tests

- Unit: glossary aggregation (12), search (8), centrality algo (5)
- Frontend: JargonTooltip (5), GlossaryWikiPage (8), JargonHighlighter (5)
- E2E: `apps/web/e2e/glossary-wiki.spec.ts` — search term, view wiki, click lesson ref (4)

### Phase 3 Tests

- Unit: format parsing LLM (10), citation verification (12), source suggestion (8)
- Frontend: CitationFormatWizard (6), SourceLinkingPanel (5), VerifiedCitationIndicator (4)
- E2E: `apps/web/e2e/citation-verification.spec.ts` — configure format, link source, verify (4)

### Manual Verification

- Upload Hebrew Kabbalah lesson → confirm jargon terms detected and corrected in transcript
- Hover term in transcript → tooltip appears with definition
- Navigate to glossary → term page shows lesson cross-references
- Click lesson ref → jumps to first mention timestamp
- Configure Jewish text citation format → sources detected → link source → blue highlight appears
