# EduSphere Product Requirements Document (PRD)

**Version:** 1.0
**Last Updated:** February 22, 2026
**Document Owner:** Product Management
**Status:** Active

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Mission](#2-product-vision--mission)
3. [Target Users & Personas](#3-target-users--personas)
4. [Core Features](#4-core-features)
5. [User Stories](#5-user-stories)
6. [Technical Requirements](#6-technical-requirements)
7. [Success Metrics & KPIs](#7-success-metrics--kpis)
8. [Roadmap Alignment](#8-roadmap-alignment)
9. [Constraints & Assumptions](#9-constraints--assumptions)

---

## 1. Executive Summary

### 1.1 Product Overview

EduSphere is a next-generation educational platform that leverages knowledge graphs, AI agents, and semantic search to transform passive content consumption into active, personalized learning experiences. Built on a modern GraphQL Federation architecture with Apache AGE knowledge graphs and pgvector semantic search, EduSphere enables educational institutions to deliver rich, interconnected learning content at scale.

**Key Differentiators:**
- **Knowledge Graph-Native Learning**: Every concept, annotation, and piece of content is connected in a semantic graph, enabling discovery of relationships, contradictions, and prerequisites
- **AI-Powered Learning Companions**: Multiple AI agent templates (Chavruta debate partner, quiz master, research scout) adapt to individual learning styles
- **HybridRAG Architecture**: Combines vector semantic search with graph traversal for contextually rich AI responses
- **Multi-Layer Annotation System**: Personal, shared, instructor, and AI-generated annotation layers support collaborative learning
- **Real-Time Collaboration**: CRDT-based collaborative editing with presence awareness
- **Enterprise-Grade Multi-Tenancy**: Built from the ground up for 100,000+ concurrent users with tenant isolation

### 1.2 Business Context

**Target Market:** Educational institutions, corporate training programs, research organizations, online learning platforms

**Scale Target:** 100,000+ concurrent users across multiple tenants

**Deployment Model:** Multi-tenant SaaS with enterprise self-hosted option

**Pricing Tiers:**
- **FREE**: 10 users, 5GB storage, basic AI agents (10 executions/day)
- **STARTER**: 100 users, 50GB storage, all AI templates (100 executions/day)
- **PROFESSIONAL**: 1,000 users, 500GB storage, unlimited AI (1,000 executions/day)
- **ENTERPRISE**: Unlimited users, unlimited storage, custom AI models, on-premise deployment

### 1.3 Strategic Goals

1. **Transform Learning Paradigm**: Move from linear content delivery to graph-based knowledge exploration
2. **Enable AI-Enhanced Education**: Provide AI agents that act as Socratic learning partners, not just content generators
3. **Support Research & Discovery**: Empower researchers to identify contradictions, trace intellectual lineage, and discover cross-domain connections
4. **Ensure Platform Scalability**: Support institutional-scale deployments with 100K+ concurrent users
5. **Maintain Open Architecture**: Use MIT/Apache-licensed components to avoid vendor lock-in

---

## 2. Product Vision & Mission

### 2.1 Vision Statement

**"To make learning an interconnected, AI-augmented dialogue where every concept, annotation, and insight builds upon the collective knowledge of the community."**

### 2.2 Mission Statement

EduSphere empowers learners, instructors, and researchers to:
- **Discover** hidden connections between concepts across courses and domains
- **Debate** ideas with AI partners trained in dialectical reasoning (Chavruta methodology)
- **Annotate** content collaboratively across multiple semantic layers
- **Navigate** knowledge graphs that reveal prerequisites, contradictions, and intellectual lineages
- **Collaborate** in real-time with peers on shared annotations and documents
- **Search** semantically across video transcripts, PDFs, and annotations using hybrid vector+graph retrieval

### 2.3 Core Philosophy

**Knowledge as a Graph, Not a Tree**
Traditional learning platforms organize content hierarchically (courses → modules → lessons). EduSphere treats knowledge as a **directed graph** where:
- Concepts have PREREQUISITE_OF, RELATED_TO, and CONTRADICTS edges
- Annotations reference transcript segments, which are anchored to media assets
- AI agents traverse the graph to provide contextually rich explanations
- Search fuses vector similarity with graph centrality for relevance ranking

**AI as a Learning Partner, Not an Oracle**
EduSphere's AI agents are designed to:
- Ask Socratic questions rather than provide direct answers
- Present contradictory viewpoints to stimulate critical thinking
- Generate adaptive quizzes based on prerequisite chains
- Summarize content progressively (overview → detailed → expert)

**Collaboration with Semantic Layers**
Annotations are not flat comments but structured, layered contributions:
- **PERSONAL**: Private notes and highlights
- **SHARED**: Public student contributions
- **INSTRUCTOR**: Authoritative guidance and corrections
- **AI_GENERATED**: AI insights that can be accepted, rejected, or refined

---

## 3. Target Users & Personas

### 3.1 Persona 1: Dr. Sarah Cohen — University Professor

**Demographics:**
- Age: 42
- Role: Associate Professor of Medieval Jewish Philosophy
- Institution: Bar-Ilan University
- Tech Proficiency: Moderate (comfortable with LMS, Google Workspace)

**Goals:**
- Deliver engaging lectures on complex Talmudic debates
- Enable students to explore contradictions between Rambam and Rashi interpretations
- Track which students are struggling with prerequisite concepts
- Create reusable knowledge graphs for future cohorts

**Pain Points:**
- Existing LMS platforms treat content as isolated files, not interconnected knowledge
- Students passively watch lecture recordings without engaging critically
- No way to visualize how concepts build upon each other or contradict
- Grading annotations is time-consuming with no semantic organization

**User Journey:**
1. Uploads lecture video (automatically transcribed)
2. Reviews AI-generated concept extraction and contradiction detection
3. Adds INSTRUCTOR layer annotations to highlight key debates
4. Creates a Chavruta AI agent tuned to debate Rambam vs. Rashi positions
5. Students engage with the agent, which generates annotations on their behalf
6. Dr. Cohen reviews the knowledge graph to identify gaps in understanding

**Success Metrics:**
- 80% of students actively create annotations (vs. 20% in traditional LMS)
- Average session time increases 3x with AI agent engagement
- Prerequisite concept mastery improves by 40% based on quiz performance

---

### 3.2 Persona 2: Michael Kim — Graduate Student

**Demographics:**
- Age: 26
- Role: PhD candidate in Comparative Religion
- Institution: Columbia University
- Tech Proficiency: High (uses Zotero, Obsidian, Python for text analysis)

**Goals:**
- Trace the intellectual lineage of a theological concept across 10+ scholars
- Identify contradictory interpretations in primary sources
- Collaborate with peers on shared annotations
- Export knowledge graph data for dissertation analysis

**Pain Points:**
- Video lectures lack searchable transcripts
- No way to annotate PDFs and videos in the same system
- Contradictions are discovered manually through note comparison
- Can't visualize how different scholars' ideas are interconnected

**User Journey:**
1. Searches semantically for "divine attributes" across all course content
2. HybridRAG returns transcript segments + related concepts from knowledge graph
3. Creates spatial comments on video timestamps and PDF passages
4. Uses Research Scout AI agent to find cross-references and contradictions
5. Exports the knowledge graph subgraph for citation network analysis
6. Shares annotations with study group using SHARED layer

**Success Metrics:**
- Discovery time for cross-domain connections reduced from 10 hours to 30 minutes
- 50+ contradictions identified automatically vs. 5 manually
- 90% of dissertation citations come from EduSphere knowledge graph

---

### 3.3 Persona 3: Jessica Martinez — Undergraduate Student

**Demographics:**
- Age: 19
- Role: Sophomore studying Biology
- Institution: Community College
- Tech Proficiency: Moderate (uses TikTok, Google Docs, basic LMS)

**Goals:**
- Understand prerequisite concepts before exams
- Get personalized quiz questions based on her weak areas
- Study collaboratively with classmates in real-time
- Receive immediate feedback without waiting for TA office hours

**Pain Points:**
- Doesn't know which concepts to review first
- Static quizzes don't adapt to her knowledge gaps
- Video lectures are long and hard to navigate
- Peer study sessions are disorganized and lack structure

**User Journey:**
1. Opens course and sees recommended learning path based on prerequisites
2. Watches lecture video with AI-generated bookmarks for key concepts
3. Creates PERSONAL layer highlights on confusing segments
4. Triggers Quiz Master AI agent, which adapts difficulty based on her responses
5. Joins a Chavruta session with a peer, mediated by AI debate agent
6. Reviews AI-generated summary of the session with action items

**Success Metrics:**
- Exam scores improve 15% vs. control group using traditional LMS
- 70% of students use adaptive quizzing weekly
- Peer collaboration sessions increase from 1/month to 4/month

---

### 3.4 Persona 4: David Schwartz — IT Administrator

**Demographics:**
- Age: 38
- Role: Director of Educational Technology
- Institution: Yeshiva University
- Tech Proficiency: Expert (manages Keycloak, Kubernetes, PostgreSQL)

**Goals:**
- Deploy EduSphere for 5,000 users with SSO integration
- Ensure data residency compliance (GDPR, FERPA)
- Monitor platform performance and resource usage
- Customize branding and ontology fields for Judaic studies

**Pain Points:**
- Vendor lock-in with proprietary LMS solutions
- No visibility into actual usage patterns or bottlenecks
- AI costs are unpredictable and can spike unexpectedly
- Can't extend the data model for institution-specific metadata

**User Journey:**
1. Deploys EduSphere via Kubernetes Helm chart
2. Configures Keycloak realm with university SSO
3. Customizes tenant settings to add "Masechta" and "Perek" ontology fields
4. Sets resource limits: PROFESSIONAL plan, 1,000 AI executions/day
5. Monitors Grafana dashboards for p95 latency, active subscriptions, DB pool usage
6. Reviews audit logs for FERPA compliance

**Success Metrics:**
- Zero data breaches or compliance violations
- 99.9% uptime SLA achieved
- AI costs stay within $2/user/month budget
- Onboarding time reduced from 6 months (old LMS) to 2 weeks

---

### 3.5 Persona 5: Dr. Amara Okafor — Educational Researcher

**Demographics:**
- Age: 51
- Role: Senior Research Scientist at Learning Sciences Institute
- Institution: Carnegie Mellon University
- Tech Proficiency: High (R, Python, SQL, graph databases)

**Goals:**
- Study how students form mental models of interconnected concepts
- Analyze annotation patterns to identify learning bottlenecks
- Test hypotheses about AI agent effectiveness on learning outcomes
- Publish findings on knowledge graph-augmented learning

**Pain Points:**
- Can't access raw data from commercial LMS platforms
- No API for querying knowledge graph structure
- Annotation data is unstructured and lacks semantic metadata
- AI agent interactions are black boxes

**User Journey:**
1. Exports anonymized knowledge graph data via GraphQL API
2. Queries `relatedConcepts(maxDepth: 3)` to analyze concept clustering
3. Analyzes annotation layers to measure instructor vs. student contribution ratios
4. Runs A/B test: control group (no AI) vs. Chavruta agent group
5. Uses Apache AGE Cypher queries to compute graph centrality metrics
6. Publishes paper: "HybridRAG Improves Retention by 28% in STEM Courses"

**Success Metrics:**
- 10+ research papers published using EduSphere data
- Platform cited in 50+ education technology studies
- 3 patent applications for graph-based learning analytics

---

## 4. Core Features

### 4.1 Content Management

#### 4.1.1 Course & Module Structure

| Feature | Description | User Roles | Priority |
|---------|-------------|-----------|----------|
| **Course Creation** | Create courses with title, description, structured syllabus (JSON tree), version control | Instructor, Org Admin | P0 |
| **Module Organization** | Organize courses into modules with drag-and-drop reordering | Instructor | P0 |
| **Course Publishing** | Toggle course visibility (draft vs. published for students) | Instructor | P0 |
| **Course Forking** | Clone a course while maintaining lineage link to original | Instructor | P1 |
| **Versioning** | Monotonically increasing version numbers with change tracking | Instructor | P1 |
| **Tags & Metadata** | Categorize courses with searchable tags and custom metadata | Instructor, Org Admin | P1 |

#### 4.1.2 Media Asset Management

| Feature | Description | User Roles | Priority |
|---------|-------------|-----------|----------|
| **Multipart File Upload** | Presigned S3 URLs for direct upload (videos, PDFs, audio, images) | Instructor, Student (limited) | P0 |
| **Automatic Transcription** | faster-whisper GPU-accelerated speech-to-text with speaker diarization | System | P0 |
| **HLS Video Streaming** | Adaptive bitrate streaming via HLS manifests | All authenticated | P0 |
| **Thumbnail Generation** | Auto-generate video thumbnails and PDF previews | System | P1 |
| **Media Metadata** | Extract and store codec, bitrate, duration, resolution | System | P1 |
| **Transcript Search** | Full-text search across all transcript segments | All authenticated | P0 |
| **Time-Range Queries** | Retrieve transcript segments for specific video timestamps | All authenticated | P0 |
| **Re-transcription** | Manually trigger re-transcription (e.g., after model upgrade) | Instructor | P2 |

#### 4.1.3 Transcript Management

| Feature | Description | User Roles | Priority |
|---------|-------------|-----------|----------|
| **Segment-Level Granularity** | Store transcripts as time-aligned segments (start/end timestamps) | System | P0 |
| **Confidence Scores** | Track per-segment and overall confidence from transcription model | System | P1 |
| **Language Detection** | Automatic ISO 639-1 language code detection | System | P1 |
| **Speaker Diarization** | Tag segments with speaker identifiers | System | P1 |
| **Embedding Generation** | Auto-generate pgvector embeddings (768-dim nomic-embed-text) for each segment | System | P0 |

---

### 4.2 Annotation System

#### 4.2.1 Annotation Types

| Type | Description | Use Cases | Priority |
|------|-------------|-----------|----------|
| **TEXT** | Text highlights with optional comments | Note-taking, emphasis | P0 |
| **SKETCH** | Canvas-based drawings (Konva.js) overlaid on video/PDF | Visual explanations, diagrams | P1 |
| **LINK** | Hyperlinks to external resources or internal content | Citations, cross-references | P1 |
| **BOOKMARK** | Timestamp markers with labels | Quick navigation, key moments | P0 |
| **SPATIAL_COMMENT** | Positioned comments at specific video timestamps or PDF coordinates | Contextual discussion | P0 |

#### 4.2.2 Annotation Layers

| Layer | Visibility | Use Case | Priority |
|-------|-----------|----------|----------|
| **PERSONAL** | Only the creator | Private study notes | P0 |
| **SHARED** | All students in tenant | Peer collaboration | P0 |
| **INSTRUCTOR** | All users (read), instructor (write) | Authoritative guidance | P0 |
| **AI_GENERATED** | All users (read), AI agents (write) | AI insights, concept highlights | P0 |

#### 4.2.3 Annotation Features

| Feature | Description | User Roles | Priority |
|---------|-------------|-----------|----------|
| **Thread Support** | Nested replies to annotations (root annotation + children) | All authenticated | P0 |
| **Layer Filtering** | Toggle visibility of each layer independently | All authenticated | P0 |
| **Pin Annotations** | Mark annotations as "starred" for quick access | All authenticated | P1 |
| **Resolve Annotations** | Mark discussion threads as resolved | Instructor | P1 |
| **Move Between Layers** | Promote student annotations to INSTRUCTOR layer | Instructor | P1 |
| **Real-Time Sync** | WebSocket subscriptions for live annotation updates | All authenticated | P0 |
| **Owner-Only Enforcement** | PERSONAL layer annotations are RLS-protected | System | P0 |

---

### 4.3 Collaboration

#### 4.3.1 Real-Time Collaborative Editing

| Feature | Description | Technology | Priority |
|---------|-------------|-----------|----------|
| **CRDT Sync** | Yjs-based conflict-free replicated data type synchronization | Yjs + Hocuspocus | P0 |
| **Presence Awareness** | Live cursors and participant list | Yjs awareness | P0 |
| **WebSocket Connection** | Persistent WebSocket for low-latency updates | Hocuspocus server | P0 |
| **Document Persistence** | CRDT updates stored in `crdt_updates` table | PostgreSQL | P0 |
| **Compaction** | Periodic CRDT history compaction to reduce storage | Background job | P1 |
| **Offline Support** | Queue changes while offline, sync on reconnect | Yjs offline provider | P1 |

#### 4.3.2 Collaboration Sessions

| Feature | Description | User Roles | Priority |
|---------|-------------|-----------|----------|
| **Session Tracking** | Track active collaboration sessions with participant list | System | P1 |
| **Session History** | View past collaboration sessions and participants | All authenticated | P2 |
| **Access Control** | Session-level permissions tied to annotation layers | System | P1 |
| **Connection Info** | Provide WebSocket URL + JWT auth token for CRDT connection | All authenticated | P0 |

---

### 4.4 AI Agents

#### 4.4.1 Agent Templates

| Template | Description | Methodology | Priority |
|----------|-------------|-------------|----------|
| **CHAVRUTA** | Dialectical debate partner using CONTRADICTS edges | Socratic questioning | P0 |
| **SUMMARIZER** | Progressive summarization (overview → detailed → expert) | Hierarchical abstraction | P0 |
| **QUIZ_MASTER** | Adaptive quiz generation based on PREREQUISITE_OF chains | Mastery learning | P0 |
| **RESEARCH_SCOUT** | Cross-reference finder with contradiction detection | Graph traversal | P1 |
| **EXPLAINER** | Adaptive explanations with prerequisite scaffolding | Bloom's taxonomy | P1 |
| **CUSTOM** | User-defined JSON state machine | LangGraph.js | P2 |

#### 4.4.2 Agent Features

| Feature | Description | Technology | Priority |
|---------|-------------|-----------|----------|
| **State Machine Workflows** | LangGraph.js graphs with nodes/edges/checkpoints | LangGraph.js | P0 |
| **Streaming Responses** | Token-by-token streaming via NATS subjects | Vercel AI SDK | P0 |
| **MCP Tool Integration** | Sandboxed tools: knowledge_graph, semantic_search, transcript_reader, annotation_writer | Custom MCP proxy | P0 |
| **Execution Lifecycle** | QUEUED → RUNNING → COMPLETED/FAILED/CANCELLED | State machine | P0 |
| **Resource Limits** | Per-tenant execution quotas, timeouts, memory limits | NestJS guards | P0 |
| **Cancellation** | User-triggered execution cancellation | GraphQL mutation | P1 |
| **Execution History** | Audit log of all agent executions with inputs/outputs | PostgreSQL | P1 |

#### 4.4.3 AI Agent Sandboxing

| Feature | Description | Priority |
|---------|-------------|----------|
| **No Direct DB Access** | Agents interact via MCP tools, not raw SQL/Cypher | P0 |
| **Tenant Isolation** | Agents cannot access other tenants' data | P0 |
| **Rate Limiting** | Per-tenant execution quotas enforced at gateway | P0 |
| **Timeout Enforcement** | Execution killed after plan-specific timeout (30s–300s) | P0 |
| **Memory Limits** | Plan-specific memory caps (256MB–2GB) | P1 |

---

### 4.5 Knowledge Graph

#### 4.5.1 Graph Ontology

**Vertex Types:**

| Type | Description | Properties | Priority |
|------|-------------|-----------|----------|
| **Concept** | Abstract idea or term | `name`, `definition`, `tenant_id`, `created_at` | P0 |
| **Person** | Author, scholar, historical figure | `name`, `bio`, `born`, `died` | P1 |
| **Term** | Specialized vocabulary | `term`, `definition`, `language` | P1 |
| **Source** | Primary text or reference | `title`, `author`, `year`, `url` | P1 |
| **TopicCluster** | Thematic grouping of concepts | `name`, `description`, `color` | P1 |

**Edge Types:**

| Type | Description | Properties | Priority |
|------|-------------|-----------|----------|
| **RELATED_TO** | General semantic relationship | `strength` (0-1), `bidirectional` | P0 |
| **CONTRADICTS** | Logical contradiction | `description`, `severity` | P0 |
| **PREREQUISITE_OF** | Learning dependency | `required_mastery_level` (0-1) | P0 |
| **MENTIONS** | Concept appears in segment/annotation | `context`, `timestamp` | P0 |
| **CITES** | Formal citation relationship | `citation_text` | P1 |
| **AUTHORED_BY** | Authorship | — | P1 |
| **INFERRED_RELATED** | AI-generated relationship (pending review) | `confidence`, `source_model` | P1 |
| **REFERS_TO** | Cross-reference | — | P2 |
| **DERIVED_FROM** | Intellectual lineage | `transformation_type` | P2 |
| **BELONGS_TO** | Cluster membership | — | P1 |

#### 4.5.2 Knowledge Graph Features

| Feature | Description | Technology | Priority |
|---------|-------------|-----------|----------|
| **Concept CRUD** | Create, read, update, delete concepts | GraphQL mutations | P0 |
| **Relation CRUD** | Create, delete edges between vertices | GraphQL mutations | P0 |
| **Graph Traversal** | `relatedConcepts(maxDepth)` — multi-hop Cypher queries | Apache AGE | P0 |
| **Contradiction Detection** | Find all CONTRADICTS edges for a concept | Cypher query | P0 |
| **Learning Paths** | Traverse PREREQUISITE_OF chains | Cypher query | P0 |
| **Concept Mentions** | Track where concepts appear in transcripts/annotations | MENTIONS edges | P0 |
| **Inferred Relations** | AI-generated relations flagged for review | Review workflow | P1 |
| **Topic Clustering** | Group concepts into thematic clusters | K-means on embeddings | P1 |
| **Graph Export** | Export subgraphs as JSON or GraphML | GraphQL query | P2 |

---

### 4.6 Multi-Language Support (i18n)

**Status:** ✅ Implemented — February 2026

EduSphere is fully internationalized with support for 9 languages across all user interfaces.

**Supported Languages:**

| Code | Language | Native Name |
|------|----------|-------------|
| en | English | English |
| zh-CN | Simplified Chinese | 中文 |
| hi | Hindi | हिन्दी |
| es | Spanish | Español |
| fr | French | Français |
| bn | Bengali | বাংলা |
| pt | Portuguese (BR) | Português |
| ru | Russian | Русский |
| id | Indonesian | Bahasa Indonesia |

**Implementation Architecture:**

| Layer | Technology | Details |
|-------|-----------|---------|
| **Shared Translation Package** | `@edusphere/i18n` | 9 locales × 12 namespaces = 108 JSON files, TypeScript strict `t()` autocomplete |
| **Web (React 19)** | i18next + react-i18next | Vite dynamic import backend; all 14 pages and all components translated |
| **Mobile (Expo SDK 54)** | i18next | Metro-compatible `require()` backend; all 7 screens translated |
| **Language Settings** | `/settings` page + `useUserPreferences` hook | Locale persisted to DB (`users.preferences` JSONB) + localStorage |
| **AI Agent Responses** | `injectLocale()` system prompt injection | All workflows (Chavruta, Quiz, Summarizer, Tutor, Debate, Assessment) respond in user's language |
| **Content Translation** | `content_translations` table + NATS pipeline | On-demand async translation with DB cache; GraphQL query/mutation for requesting and fetching |

**Namespaces (12):**
`common`, `nav`, `auth`, `dashboard`, `courses`, `content`, `annotations`, `agents`, `collaboration`, `knowledge`, `settings`, `errors`

---

### 4.7 Search & Discovery

#### 4.7.1 Semantic Search

| Feature | Description | Technology | Priority |
|---------|-------------|-----------|----------|
| **Vector Embedding** | 768-dim nomic-embed-text embeddings via Ollama/OpenAI | Vercel AI SDK | P0 |
| **HNSW Indexing** | Fast approximate nearest neighbor search | pgvector HNSW | P0 |
| **Similarity Ranking** | Cosine distance-based relevance scores | pgvector | P0 |
| **Cross-Content Search** | Search across transcript segments, annotations, concepts | Unified embedding table | P0 |
| **Result Highlighting** | Return matched text snippets with context | Full-text search | P1 |

#### 4.7.2 Hybrid Search (HybridRAG)

| Feature | Description | Fusion Strategy | Priority |
|---------|-------------|----------------|----------|
| **Vector + Graph Fusion** | Parallel vector search + 2-hop graph traversal | Rank by combined similarity + centrality | P0 |
| **Graph Context** | Include related concepts, contradictions, prerequisites in results | Apache AGE traversal | P0 |
| **Configurable Depth** | User-specified graph traversal depth (1-5 hops) | Query parameter | P1 |
| **Citation Paths** | Trace intellectual lineage from search results | DERIVED_FROM chains | P2 |

#### 4.7.3 Search Features

| Feature | Description | User Roles | Priority |
|---------|-------------|-----------|----------|
| **Transcript Search** | Full-text search across all transcript segments | All authenticated | P0 |
| **Time-Range Filtering** | Restrict search to specific video time ranges | All authenticated | P1 |
| **Asset Filtering** | Search within specific courses or media assets | All authenticated | P1 |
| **Multi-Language Support** | Search across Hebrew, English, Aramaic transcripts | All authenticated | P1 |
| **Saved Searches** | Bookmark frequent searches | All authenticated | P2 |

---

## 5. User Stories

### 5.1 Content Management (8 stories)

**CM-01**: As an **Instructor**, I want to **create a new course with a structured syllabus** so that **students can navigate the learning objectives**.

**CM-02**: As an **Instructor**, I want to **upload a video lecture and have it automatically transcribed** so that **students can search the content**.

**CM-03**: As an **Instructor**, I want to **publish or unpublish a course** so that **I can hide works-in-progress from students**.

**CM-04**: As an **Instructor**, I want to **fork an existing course** so that **I can customize it without affecting the original**.

**CM-05**: As a **Student**, I want to **search for a specific term across all lecture transcripts** so that **I can quickly find relevant segments**.

**CM-06**: As an **Instructor**, I want to **re-trigger transcription after fixing audio quality** so that **the transcript is more accurate**.

**CM-07**: As an **Org Admin**, I want to **view all courses in my tenant** so that **I can monitor content creation activity**.

**CM-08**: As an **Instructor**, I want to **reorder modules within a course** so that **the learning sequence matches my syllabus**.

---

### 5.2 Annotation (7 stories)

**AN-01**: As a **Student**, I want to **create a private annotation on a confusing segment** so that **I can review it later without others seeing**.

**AN-02**: As a **Student**, I want to **share my annotation with classmates** so that **we can discuss the concept collaboratively**.

**AN-03**: As an **Instructor**, I want to **add authoritative annotations to lecture videos** so that **students get accurate guidance**.

**AN-04**: As a **Student**, I want to **filter annotations by layer** so that **I can focus on instructor feedback or peer discussions**.

**AN-05**: As an **Instructor**, I want to **promote a student annotation to the instructor layer** so that **all students benefit from the insight**.

**AN-06**: As a **Student**, I want to **reply to an annotation** so that **I can participate in threaded discussions**.

**AN-07**: As an **Instructor**, I want to **mark annotation threads as resolved** so that **I can track which discussions have concluded**.

---

### 5.3 Knowledge Graph (6 stories)

**KG-01**: As a **Researcher**, I want to **create a concept node for "Rambam's view on divine attributes"** so that **I can link it to related concepts**.

**KG-02**: As a **Researcher**, I want to **create a CONTRADICTS edge between two concepts** so that **students can explore opposing viewpoints**.

**KG-03**: As a **Student**, I want to **view a learning path from basic to advanced concepts** so that **I know which prerequisites to study first**.

**KG-04**: As a **Researcher**, I want to **query all concepts mentioned in a specific lecture** so that **I can build a concept map**.

**KG-05**: As an **Instructor**, I want to **review AI-inferred relations before they're published** so that **I can ensure accuracy**.

**KG-06**: As a **Researcher**, I want to **export a subgraph of related concepts** so that **I can visualize it in Gephi or Cytoscape**.

---

### 5.4 AI Agents (6 stories)

**AI-01**: As a **Student**, I want to **chat with a Chavruta agent that debates both sides of an argument** so that **I develop critical thinking skills**.

**AI-02**: As a **Student**, I want to **trigger a Quiz Master agent that adapts to my knowledge gaps** so that **I focus on weak areas**.

**AI-03**: As an **Instructor**, I want to **create a custom AI agent with a specific system prompt** so that **it teaches in my pedagogical style**.

**AI-04**: As a **Student**, I want to **see a progressive summary of a long lecture** so that **I can decide which sections to watch in detail**.

**AI-05**: As a **Researcher**, I want to **use a Research Scout agent to find contradictions across 10 sources** so that **I save hours of manual reading**.

**AI-06**: As a **Student**, I want to **cancel a long-running AI execution** so that **I don't waste my daily quota**.

---

### 5.5 Collaboration (4 stories)

**CO-01**: As a **Student**, I want to **join a real-time collaboration session on a shared annotation** so that **my study group can brainstorm together**.

**CO-02**: As a **Student**, I want to **see my peer's cursor position on the canvas** so that **I know what they're focusing on**.

**CO-03**: As an **Instructor**, I want to **view the history of a collaboration session** so that **I can assess group participation**.

**CO-04**: As a **Student**, I want to **continue editing offline and sync when I reconnect** so that **poor Wi-Fi doesn't block my work**.

---

### 5.6 Search & Discovery (4 stories)

**SD-01**: As a **Student**, I want to **semantically search for "divine attributes"** so that **I find relevant segments even if they use different wording**.

**SD-02**: As a **Researcher**, I want to **use hybrid search to get graph context with my results** so that **I see related concepts and contradictions**.

**SD-03**: As a **Student**, I want to **filter search results to a specific time range in a video** so that **I find the exact moment the professor mentioned a term**.

**SD-04**: As a **Researcher**, I want to **search across multiple languages (Hebrew, English, Aramaic)** so that **I can find all references to a concept**.

---

### 5.7 Multi-Language Support (4 stories)

**I18N-01**: As a **Student**, I want to **select my preferred language in the Settings page** so that **the entire platform UI is displayed in my native language**.

**I18N-02**: As a **Student**, I want to **have my language preference remembered across sessions** so that **I don't have to re-select my language every time I log in**.

**I18N-03**: As a **Student**, I want to **ask an AI agent questions and receive answers in my selected language** so that **I can engage with educational content without a language barrier**.

**I18N-04**: As an **Instructor**, I want to **request an on-demand translation of course content** so that **students who speak different languages can access the same material**.

---

### 5.8 Administration (5 stories)

**AD-01**: As an **Org Admin**, I want to **configure SSO with our existing Keycloak realm** so that **users don't need separate credentials**.

**AD-02**: As an **Org Admin**, I want to **set resource limits for AI agent executions** so that **costs stay predictable**.

**AD-03**: As an **Org Admin**, I want to **customize the knowledge graph ontology with institution-specific fields** so that **we can model Talmudic tractates and chapters**.

**AD-04**: As an **Org Admin**, I want to **deactivate users who graduate or leave** so that **we don't exceed our license limits**.

**AD-05**: As an **Org Admin**, I want to **monitor platform usage via Grafana dashboards** so that **I can identify bottlenecks before users complain**.

---

## 6. Technical Requirements

### 6.1 Scale & Performance

| Requirement | Target | Justification |
|-------------|--------|---------------|
| **Concurrent Users** | 100,000+ | Enterprise institutional deployment scale |
| **API Latency (p95)** | < 500ms | Ensures responsive UI for synchronous operations |
| **API Latency (p99)** | < 1000ms | Prevents outlier slowdowns from degrading UX |
| **Search Latency (p95)** | < 200ms | Real-time search-as-you-type experience |
| **Agent Response Streaming** | < 100ms first token | Immediate feedback for AI interactions |
| **Subscription Throughput** | 10,000 concurrent WebSocket connections per gateway instance | Real-time collaboration and annotation updates |
| **Media Upload** | Support 10GB video files | Typical university lecture recording size |
| **Transcript Throughput** | Process 1 hour of audio in < 2 minutes (GPU) | Timely availability of searchable content |
| **Embedding Generation** | 1,000 segments/minute | Keep pace with transcription pipeline |
| **Database Connections** | 1,000 per subgraph (via PgBouncer) | Support high concurrency without pool exhaustion |

### 6.2 Architecture Requirements

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **API Gateway** | Hive Gateway v2 (MIT) | Federation v2.7 compliance, 100% test pass, MIT license vs. Apollo Router ELv2 |
| **Subgraph Runtime** | GraphQL Yoga + NestJS | `YogaFederationDriver` actively maintained, MIT licensed |
| **Database** | PostgreSQL 16+ | RLS, JSON support, mature ecosystem |
| **Graph Database** | Apache AGE 1.5+ | Cypher queries within PostgreSQL, Apache 2.0 license |
| **Vector Search** | pgvector 0.8+ | HNSW indexes, 768-dim support, PostgreSQL native |
| **ORM** | Drizzle ORM 1.x | Native RLS, pgvector support, type-safe, Apache 2.0 |
| **Authentication** | Keycloak v26+ | OIDC/JWT, multi-tenant, Apache 2.0 |
| **Messaging** | NATS JetStream | At-least-once delivery, event-driven subscriptions, Apache 2.0 |
| **Object Storage** | MinIO | S3-compatible presigned URLs, AGPLv3 |
| **CRDT** | Yjs + Hocuspocus | Real-time collaboration, MIT |
| **AI Layer 1** | Vercel AI SDK v6 | Unified LLM abstraction, Apache 2.0 |
| **AI Layer 2** | LangGraph.js | State machine agent workflows, MIT |
| **AI Layer 3** | LlamaIndex.TS | RAG pipelines, MIT |
| **Transcription** | faster-whisper | GPU-accelerated, MIT |
| **Frontend** | React 19 + Vite 6 | Fast HMR, MIT |
| **Mobile** | Expo SDK 54 | Offline-first, MIT |
| **Reverse Proxy** | Traefik v3.6 | Auto-discovery, Let's Encrypt, MIT |
| **Monitoring** | OpenTelemetry + Jaeger | Distributed tracing, Apache 2.0 |
| **Monorepo** | pnpm workspaces + Turborepo | Efficient dependency hoisting, MIT |

### 6.3 Security Requirements

| Requirement | Implementation | Priority |
|-------------|---------------|----------|
| **Multi-Tenant Isolation** | Row-Level Security (RLS) on all tables with `tenant_id` filter | P0 |
| **Authentication** | JWT validation via Keycloak JWKS endpoint | P0 |
| **Authorization** | Role-based (`@requiresRole`) and scope-based (`@requiresScopes`) enforcement | P0 |
| **Data Encryption in Transit** | TLS 1.3 for all external connections | P0 |
| **Data Encryption at Rest** | PostgreSQL TDE (Transparent Data Encryption) | P1 |
| **PII Protection** | Anonymize user IDs in analytics exports | P0 |
| **Rate Limiting** | Per-tenant, per-IP, per-operation limits at gateway | P0 |
| **Query Complexity** | Block queries with depth > 10 or breadth > 100 | P0 |
| **Persisted Queries** | Production allows only pre-registered queries | P1 |
| **Secret Management** | Vault or cloud-native secrets (no .env in production) | P0 |
| **Audit Logging** | Log all admin actions and data exports | P0 |
| **Dependency Scanning** | `pnpm audit --audit-level=high` in CI | P0 |
| **gVisor Sandboxing** | AI agent executions run in gVisor sandbox | P1 |

### 6.4 Compliance Requirements

| Standard | Requirements | Priority |
|----------|-------------|----------|
| **FERPA** | Student data isolation, access controls, audit logs | P0 |
| **GDPR** | Data export, right to erasure, consent tracking | P0 |
| **WCAG 2.1 AA** | Accessibility for all UI components | P1 |
| **SOC 2 Type II** | Security, availability, confidentiality controls | P1 |

### 6.5 Data Requirements

| Entity | Retention | Backup | Priority |
|--------|-----------|--------|----------|
| **User Data** | Indefinite (until user deletion request) | Daily incremental, weekly full | P0 |
| **Course Content** | Indefinite (soft delete with 30-day retention) | Daily | P0 |
| **Annotations** | Indefinite (soft delete with 30-day retention) | Daily | P0 |
| **Knowledge Graph** | Indefinite | Daily | P0 |
| **CRDT Updates** | 90 days (then compacted) | Weekly | P1 |
| **Agent Executions** | 1 year | Monthly | P1 |
| **Audit Logs** | 7 years | Monthly | P0 |
| **Media Files** | Indefinite (soft delete with 30-day retention) | Weekly (MinIO replication) | P0 |

### 6.6 Technology-Specific Requirements

#### 6.6.1 Apache AGE (Graph Database)

- **Schema Validation**: All vertex and edge types follow DATABASE-SCHEMA.md ontology
- **Tenant Isolation**: All graph queries filtered by `tenant_id` property on vertices
- **Query Optimization**: Indexes on `tenant_id`, `created_at`, `updated_at` properties
- **Traversal Limits**: Max depth = 5 hops to prevent graph traversal DoS
- **Concurrent Queries**: Support 100 concurrent Cypher queries per subgraph

#### 6.6.2 pgvector (Semantic Search)

- **Embedding Dimensions**: 768 (nomic-embed-text standard)
- **Index Type**: HNSW with `m=16`, `ef_construction=64`
- **Distance Metric**: Cosine distance
- **Batch Insert**: Bulk insert embeddings in batches of 500
- **Index Rebuild**: Monthly background job to optimize HNSW structure

#### 6.6.3 HybridRAG

- **Fusion Formula**: `score = 0.6 * vector_similarity + 0.4 * graph_centrality`
- **Graph Depth**: Default 2 hops, configurable 1-5
- **Result Limit**: Top 50 vector results, top 100 graph results (before fusion)
- **Timeout**: 3 seconds total (1.5s vector + 1.5s graph, parallel execution)

#### 6.6.4 CRDT (Yjs)

- **Update Batch Size**: Max 100 updates per CRDT sync message
- **Compaction Trigger**: When `crdt_updates` table exceeds 10,000 rows for a document
- **Offline Tolerance**: Client queues up to 1,000 updates while offline
- **Conflict Resolution**: Last-write-wins with vector clock tie-breaking

---

## 7. Success Metrics & KPIs

### 7.1 Product Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **User Activation Rate** | 80% of invited users create at least 1 annotation within 7 days | Daily cohort analysis |
| **DAU/MAU Ratio** | > 0.4 (indicating high engagement) | Google Analytics events |
| **Avg. Session Duration** | > 25 minutes (vs. 8 min in traditional LMS) | Session tracking |
| **Annotation Creation Rate** | 5+ annotations per user per week | Database query |
| **AI Agent Usage** | 60% of active users trigger at least 1 agent per week | Execution logs |
| **Search Usage** | 3+ searches per session | GraphQL query logs |
| **Knowledge Graph Growth** | 100+ new concepts per tenant per month | Database query |
| **Collaboration Sessions** | 2+ sessions per user per month | Session tracking |

### 7.2 Learning Outcome Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Quiz Score Improvement** | 15% higher vs. control group (no AI agents) | A/B testing |
| **Concept Mastery** | 70% of students achieve mastery (>80% quiz accuracy) within 4 weeks | Quiz analytics |
| **Prerequisite Gap Reduction** | 40% fewer students fail quizzes due to missing prerequisites | Learning path analytics |
| **Contradiction Awareness** | 80% of students identify at least 1 contradiction per course | Annotation analysis |
| **Peer Collaboration** | 50% of annotations are SHARED layer (vs. PERSONAL) | Layer distribution analysis |

### 7.3 Technical Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API p95 Latency** | < 500ms | OpenTelemetry traces |
| **API p99 Latency** | < 1000ms | OpenTelemetry traces |
| **Search p95 Latency** | < 200ms | OpenTelemetry traces |
| **Uptime** | 99.9% (43 min downtime/month) | Prometheus uptime checks |
| **Error Rate** | < 0.1% | Error logs aggregated in Jaeger |
| **Database CPU** | < 70% avg. utilization | PostgreSQL metrics |
| **Gateway RPS** | > 10,000 requests per second per instance | Load testing (k6) |
| **Subscription Stability** | < 0.01% dropped WebSocket connections | Gateway metrics |

### 7.4 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **MRR Growth** | 20% MoM | Billing system |
| **Churn Rate** | < 5% monthly | Subscription analytics |
| **Net Promoter Score (NPS)** | > 50 | Quarterly surveys |
| **Free → Paid Conversion** | 15% within 90 days | Cohort analysis |
| **Enterprise Deals** | 10 ENTERPRISE tier contracts in Year 1 | Sales CRM |
| **AI Cost per User** | < $2/month | LLM API usage tracking |
| **Customer Support Tickets** | < 2 tickets per 100 active users per month | Helpdesk system |

### 7.5 Leading Indicators

| Indicator | Why It Matters | Target |
|-----------|---------------|--------|
| **Time to First Annotation** | Faster = better onboarding | < 5 minutes |
| **Knowledge Graph Depth** | Deeper graphs = richer learning context | Avg. 3 hops from any concept |
| **AI Agent Retry Rate** | High retry = poor answers | < 10% of executions |
| **Search Zero-Result Rate** | High = poor content discoverability | < 5% |
| **Collaboration Invite Acceptance** | High = viral growth | > 70% |

---

## 8. Roadmap Alignment

### 8.1 Phase Mapping

EduSphere's 8-phase implementation roadmap (detailed in IMPLEMENTATION-ROADMAP.md) delivers features incrementally:

| Phase | Duration | Key Features Delivered | PRD Section Alignment |
|-------|----------|------------------------|----------------------|
| **Phase 0: Foundation** | 1-2 days | Docker stack, monorepo, health checks | Technical Requirements §6.2 |
| **Phase 1: Data Layer** | 2-3 days | All 16 tables, RLS, Apache AGE ontology, pgvector embeddings, seed data | Technical Requirements §6.6.1, §6.6.2 |
| **Phase 2: Core + Content** | 3-5 days | Auth (JWT/Keycloak), Core subgraph (users, tenants), Content subgraph (courses, media, transcripts), file upload | Content Management §4.1, User Stories CM-01 to CM-08 |
| **Phase 3: Annotation + Collab** | 3-4 days | Annotation subgraph (all layers, threads), Collaboration subgraph (CRDT, presence) | Annotation §4.2, Collaboration §4.3, User Stories AN-01 to AN-07, CO-01 to CO-04 |
| **Phase 4: Knowledge** | 4-5 days | Knowledge subgraph (graph CRUD, traversal, contradictions), semantic search, HybridRAG | Knowledge Graph §4.5, Search §4.6, User Stories KG-01 to KG-06, SD-01 to SD-04 |
| **Phase 5: Agents** | 4-5 days | Agent subgraph (CRUD, execution), LangGraph.js templates (Chavruta, Summarizer, Quiz Master, etc.), MCP tools, sandboxing | AI Agents §4.4, User Stories AI-01 to AI-06 |
| **Phase 6: Frontend** | 5-7 days | React SPA (course UI, video player, annotations, search, AI chat) | All user-facing features |
| **Phase 7: Production** | 5-7 days | Performance optimization, observability (Jaeger, Grafana), security hardening, K8s deployment, load testing (100K users) | Performance §6.1, Security §6.3, Compliance §6.4 |
| **Phase 8: Mobile + Advanced** | 5-7 days | Expo mobile app (offline-first), transcription worker (faster-whisper), Chavruta partner learning | Content Management §4.1.2 (transcription), Collaboration §4.3 (Chavruta sessions) |
| **Phase i18n: Internationalization** | 3-4 days | 9 languages UI (packages/i18n, web, mobile, settings), AI locale injection, content_translations pipeline | Multi-Language Support §4.6, User Stories I18N-01 to I18N-04 |

**Total Duration:** 32-45 working days (25-35 days with parallelization)

### 8.2 Feature Prioritization by Phase

| Priority | Phase Delivery | Rationale |
|----------|---------------|-----------|
| **P0 (MVP)** | Phases 0-5 | Core platform functionality: auth, content, annotations, knowledge graph, AI agents |
| **P1 (Early Adopter)** | Phases 6-7 | Production-ready with web UI, security, scalability |
| **P2 (Advanced)** | Phase 8 | Mobile support, advanced transcription, specialized collaboration features |

### 8.3 Deferred Features (Post-Launch)

The following features are identified in user stories but deferred to post-launch iterations:

- **Saved Searches** (SD-05): Low priority vs. other discovery features
- **Graph Export as GraphML** (KG-06): Research-focused, niche use case
- **Session History UI** (CO-03): Admin analytics, not critical for MVP
- **Custom Agent JSON Editor** (AI-06): Advanced feature requiring robust validation

---

## 9. Constraints & Assumptions

### 9.1 Technical Constraints

| Constraint | Impact | Mitigation |
|-----------|--------|-----------|
| **PostgreSQL Single-Point-of-Failure** | Database outage = full platform downtime | Deploy PostgreSQL HA cluster (Patroni) or use managed RDS/CloudSQL in production |
| **Apache AGE Maturity** | AGE 1.5 is relatively new; potential bugs | Comprehensive integration testing, contribute fixes upstream, fallback to Neo4j if critical issues arise |
| **pgvector Performance** | HNSW index build time increases with scale | Build indexes asynchronously, use partitioning for >10M embeddings |
| **NATS JetStream Learning Curve** | Team unfamiliar with NATS | Allocate 2 days for training, use managed NATS if self-hosting proves difficult |
| **LLM API Costs** | OpenAI/Anthropic costs can spike unpredictably | Enforce strict per-tenant quotas, use local Ollama models for FREE/STARTER tiers |
| **WebSocket Connection Limits** | Default OS limits ~1024 connections | Tune OS (`ulimit -n 65536`), use connection pooling, horizontal scaling |
| **Keycloak Configuration Complexity** | Multi-tenant realm setup is intricate | Use infrastructure-as-code (Terraform), provide detailed runbook |

### 9.2 Business Constraints

| Constraint | Impact | Mitigation |
|-----------|--------|-----------|
| **Budget for AI Inference** | LLM costs must stay < $2/user/month | Use tiered quotas, cache AI responses, prefer local models when possible |
| **Go-to-Market Timeline** | Pressure to launch in 6 months | Follow phased roadmap strictly, avoid scope creep |
| **Limited Initial Marketing Budget** | Can't afford paid ads | Focus on academic partnerships, open-source community evangelism |
| **Dependency on Keycloak** | No SSO = no enterprise adoption | Ensure Keycloak is robust, document self-hosted setup, offer managed option |

### 9.3 Assumptions

#### 9.3.1 User Assumptions

- **Assumption:** Users have basic familiarity with LMS concepts (courses, modules, discussions)
- **Validation:** Conduct user interviews with 20+ instructors and students from target institutions
- **Risk if Wrong:** Steep learning curve drives churn

---

- **Assumption:** Students will actively engage with AI agents if the experience is conversational
- **Validation:** A/B test Chavruta agent in pilot courses
- **Risk if Wrong:** Low AI adoption undermines differentiation

---

- **Assumption:** Instructors value knowledge graph visualizations over traditional hierarchical course structures
- **Validation:** Show knowledge graph demos to 10 professors, gather feedback
- **Risk if Wrong:** Feature bloat without user value

#### 9.3.2 Technical Assumptions

- **Assumption:** Hive Gateway v2 will remain actively maintained and MIT-licensed
- **Validation:** Monitor GitHub activity, engage with maintainers
- **Risk if Wrong:** Need to migrate to Apollo Router (licensing issues) or build custom gateway

---

- **Assumption:** Apache AGE will support PostgreSQL 17+ when it's released
- **Validation:** Track AGE release roadmap
- **Risk if Wrong:** Stuck on PostgreSQL 16 until AGE catches up

---

- **Assumption:** faster-whisper transcription quality is comparable to OpenAI Whisper API
- **Validation:** Run side-by-side benchmarks on 100 lecture recordings
- **Risk if Wrong:** Manual transcription corrections become a bottleneck

---

- **Assumption:** NATS JetStream can handle 100K concurrent subscriptions without clustering
- **Validation:** Load test with k6 and Artillery
- **Risk if Wrong:** Need to deploy NATS cluster (operational complexity)

#### 9.3.3 Market Assumptions

- **Assumption:** Universities are willing to migrate from established LMS platforms (Canvas, Blackboard, Moodle)
- **Validation:** Survey 50 institutions about pain points with current LMS
- **Risk if Wrong:** Adoption limited to greenfield institutions

---

- **Assumption:** Compliance with FERPA and GDPR is sufficient for most educational institutions
- **Validation:** Consult with university legal departments
- **Risk if Wrong:** Additional compliance frameworks (CCPA, HIPAA for medical education) required

---

- **Assumption:** Open-source model (MIT/Apache licensing) attracts contributors and builds trust
- **Validation:** Launch open-source repo with clear CONTRIBUTING.md
- **Risk if Wrong:** Competitors fork the project and offer competing SaaS

### 9.4 Dependencies

| Dependency | Owner | Risk Level | Mitigation |
|-----------|-------|-----------|-----------|
| **Keycloak v26+ Stability** | External (Red Hat) | Medium | Contribute to Keycloak community, maintain fork if needed |
| **Hive Gateway v2 Maintenance** | External (The Guild) | Low | Actively participate in community, sponsor development |
| **Apache AGE PostgreSQL Compatibility** | External (Apache) | Medium | Test with each PostgreSQL minor release, maintain compatibility matrix |
| **Vercel AI SDK LangGraph.js Support** | External (Vercel) | Low | Both are actively maintained, stable APIs |
| **Ollama Local Model Availability** | External (Ollama community) | Low | Fall back to OpenAI/Anthropic if local models unavailable |
| **MinIO S3 API Compatibility** | External (MinIO Inc.) | Low | S3 API is stable, minimal breaking changes |

### 9.5 Exclusions (Out of Scope)

The following features are **explicitly out of scope** for the initial release:

- **Video Conferencing**: Not building Zoom/Teams competitor; users can link external meeting URLs
- **Gradebook**: Not replicating traditional LMS grading features; focus is on knowledge exploration, not assessment
- **Mobile App Offline Transcoding**: Transcoding happens server-side only (Phase 8 mobile app is for consumption)
- **Built-in Payment Processing**: Billing integration deferred to Phase 9 (post-launch)
- **Content Authoring Tools**: No built-in video editor or PDF annotator; users upload pre-created content
- **Social Features**: No user profiles, followers, likes, etc. (collaborative learning ≠ social networking)
- **Gamification**: No badges, leaderboards, or points systems (focus on intrinsic learning motivation)
- **LTI Integration**: Learning Tools Interoperability deferred to Phase 9 (requested by enterprise customers)

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **AGE** | Apache AGE (A Graph Extension) — PostgreSQL extension for graph database queries using Cypher |
| **CRDT** | Conflict-Free Replicated Data Type — data structure enabling distributed collaboration without conflicts |
| **Chavruta** | Traditional Jewish learning methodology where two partners debate texts to deepen understanding |
| **Cypher** | Graph query language (originally from Neo4j, used by Apache AGE) |
| **Federation** | GraphQL architectural pattern where multiple subgraphs compose into a unified API |
| **HybridRAG** | Retrieval-Augmented Generation combining vector search and graph traversal |
| **HNSW** | Hierarchical Navigable Small World — algorithm for fast approximate nearest neighbor search |
| **HLS** | HTTP Live Streaming — adaptive bitrate video streaming protocol |
| **JWT** | JSON Web Token — standard for secure token-based authentication |
| **LangGraph** | Framework for building stateful AI agent workflows as directed graphs |
| **MCP** | Model Context Protocol — interface for AI tools to interact with data sources |
| **OIDC** | OpenID Connect — authentication layer on top of OAuth 2.0 |
| **pgvector** | PostgreSQL extension for vector similarity search |
| **RLS** | Row-Level Security — PostgreSQL feature for tenant-isolated data access |
| **WebSocket** | Protocol for full-duplex communication over a single TCP connection |
| **Yjs** | CRDT library for real-time collaborative applications |

---

## Appendix B: References

1. **IMPLEMENTATION-ROADMAP.md** — 8-phase build plan with acceptance criteria
2. **API-CONTRACTS-GRAPHQL-FEDERATION.md** — Complete GraphQL schema definitions
3. **DATABASE-SCHEMA.md** — PostgreSQL tables, RLS policies, Apache AGE ontology
4. **EduSphere_Claude.pdf** — Architecture guide and technology decisions
5. **EduSphere_DB.pdf** — Database design deep-dive

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-17 | Product Management | Initial PRD creation based on roadmap and API contracts |

---

**Approval Signatures:**

- **Product Owner:** _______________________  Date: __________
- **Engineering Lead:** _______________________  Date: __________
- **Architecture Review:** _______________________  Date: __________

---

**End of Document**
