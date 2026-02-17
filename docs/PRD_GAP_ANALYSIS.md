# PRD Gap Analysis - EduSphere

**תאריך:** 17 פברואר 2026
**נוצר על ידי:** Claude Sonnet 4.5
**סטטוס:** Active

---

## 📊 סיכום מצב

### ✅ מה יושם (Phases 13-15)
- ✅ Production Monitoring (Prometheus, Grafana, Loki, AlertManager)
- ✅ AI/ML Pipeline (RAG, LangGraph, Hybrid Search)
- ✅ Mobile App Polish (Notifications, Biometrics, Camera, Downloads)

### ❌ מה חסר (Phases 1-6)
- ❌ Data Layer (16 tables, RLS, Apache AGE, pgvector)
- ❌ Authentication (Keycloak, JWT, multi-tenant)
- ❌ Content Management (courses, media, transcripts)
- ❌ Annotation System (4 layers, threads, real-time)
- ❌ Knowledge Graph (Cypher queries, graph traversal)
- ❌ Collaboration (CRDT, Yjs, WebSocket)
- ❌ Frontend Web App (React SPA)

---

## 🎯 המלצה: "חזור לשורש" - 3 Sprints

### Sprint 1: Foundation + Content (7 ימים) - CRITICAL ⚡

#### Milestone 1.1: Data Layer (2 ימים)
**מטרה:** מסד נתונים מלא עם RLS + Apache AGE + pgvector

**משימות:**
1. ✅ **Create 16 PostgreSQL tables** (DATABASE-SCHEMA.md)
   - Users, Tenants, Courses, Modules, Lessons
   - MediaAssets, Transcripts, TranscriptSegments
   - Annotations, AnnotationThreads
   - Concepts, ConceptRelations (Apache AGE)
   - AgentExecutions, AgentMessages
   - CollaborationSessions, CRDTUpdates

2. ✅ **Setup Row-Level Security (RLS)**
   - `tenant_id` filtering on all tables
   - Personal annotation isolation
   - Cross-tenant prevention

3. ✅ **Initialize Apache AGE**
   - Create `edusphere_graph` graph
   - Vertex types: Concept, Person, Term, Source, TopicCluster
   - Edge types: RELATED_TO, CONTRADICTS, PREREQUISITE_OF, MENTIONS, CITES

4. ✅ **Setup pgvector**
   - HNSW indexes on embeddings (768-dim)
   - `m=16`, `ef_construction=64`
   - Cosine distance metric

5. ✅ **Seed demo data**
   - 2 tenants
   - 10 users (students, instructors, admins)
   - 5 courses with modules/lessons
   - Sample knowledge graph

**Acceptance Criteria:**
- `psql` shows all 16 tables created
- `SELECT * FROM ag_graph` shows ontology
- RLS test: Tenant A can't read Tenant B data
- `SELECT 1 FROM vector_documents LIMIT 1` works

---

#### Milestone 1.2: Authentication (1 יום)
**מטרה:** Keycloak SSO + JWT validation

**משימות:**
1. ✅ **Setup Keycloak realm**
   - Create `edusphere` realm
   - Configure OIDC client
   - Setup roles: SUPER_ADMIN, ORG_ADMIN, INSTRUCTOR, STUDENT

2. ✅ **Implement JWT validation**
   - `packages/auth` package
   - Extract `tenant_id`, `user_id`, `role`, `scopes` from JWT
   - NestJS guards: `@Authenticated()`, `@RequiresRole()`, `@RequiresScopes()`

3. ✅ **Multi-tenant context**
   - `withTenantContext(tenantId, userId, role, callback)`
   - Propagate `x-tenant-id` header from gateway

**Acceptance Criteria:**
- Login at `http://localhost:8080/realms/edusphere`
- JWT contains `tenant_id`, `role`, `scopes`
- Gateway propagates `x-tenant-id` header
- RLS filters work based on JWT

---

#### Milestone 1.3: Subgraph-Core (1 יום)
**מטרה:** User & Tenant CRUD

**משימות:**
1. ✅ **GraphQL schema**
   ```graphql
   type User @key(fields: "id") {
     id: ID!
     email: String!
     firstName: String
     lastName: String
     role: Role!
     tenantId: ID!
   }

   type Tenant {
     id: ID!
     name: String!
     plan: Plan!
     users: [User!]!
   }

   enum Role { SUPER_ADMIN ORG_ADMIN INSTRUCTOR STUDENT }
   enum Plan { FREE STARTER PROFESSIONAL ENTERPRISE }

   type Query {
     me: User!
     user(id: ID!): User
     users(limit: Int, offset: Int): [User!]!
     tenant(id: ID!): Tenant
   }

   type Mutation {
     updateUser(id: ID!, input: UpdateUserInput!): User!
     deactivateUser(id: ID!): User!
   }
   ```

2. ✅ **Resolvers**
   - `me` query (from JWT context)
   - `users` query (RLS filtered)
   - `updateUser` mutation (self or admin only)

3. ✅ **Tests**
   - RLS: User in Tenant A can't see Tenant B users
   - Roles: STUDENT can't deactivate users
   - JWT: Invalid token rejected

**Acceptance Criteria:**
- Query `{ me { id email role } }` works
- RLS prevents cross-tenant queries
- Role enforcement works

---

#### Milestone 1.4: Subgraph-Content (3 ימים)
**מטרה:** Course CRUD + Media Upload + Transcription

**משימות:**
1. ✅ **GraphQL schema**
   ```graphql
   type Course @key(fields: "id") {
     id: ID!
     title: String!
     description: String
     isPublished: Boolean!
     modules: [Module!]!
     instructorId: ID!
     instructor: User! @requires(fields: "instructorId")
   }

   type Module {
     id: ID!
     courseId: ID!
     title: String!
     lessons: [Lesson!]!
   }

   type Lesson {
     id: ID!
     moduleId: ID!
     title: String!
     videoAsset: MediaAsset
     transcript: Transcript
   }

   type MediaAsset {
     id: ID!
     filename: String!
     filesize: Int!
     mimeType: String!
     url: String!
     hlsManifestUrl: String
     thumbnail: String
   }

   type Transcript {
     id: ID!
     assetId: ID!
     status: TranscriptStatus!
     confidence: Float
     segments: [TranscriptSegment!]!
   }

   type TranscriptSegment {
     id: ID!
     transcriptId: ID!
     text: String!
     startTime: Float!
     endTime: Float!
     speaker: String
     embedding: [Float!]
   }

   enum TranscriptStatus { QUEUED PROCESSING COMPLETED FAILED }

   type Query {
     course(id: ID!): Course
     courses(limit: Int, offset: Int): [Course!]!
     searchTranscripts(query: String!, courseId: ID): [TranscriptSegment!]!
   }

   type Mutation {
     createCourse(input: CreateCourseInput!): Course!
     updateCourse(id: ID!, input: UpdateCourseInput!): Course!
     publishCourse(id: ID!): Course!
     createPresignedUploadUrl(filename: String!, mimeType: String!): PresignedUrl!
     triggerTranscription(assetId: ID!): Transcript!
   }
   ```

2. ✅ **Media upload flow**
   - Generate presigned S3/MinIO URL
   - Client uploads directly to MinIO
   - Webhook on upload complete → create MediaAsset record

3. ✅ **Transcription worker** (faster-whisper)
   - Listen to NATS `media.uploaded` event
   - Run `faster-whisper` GPU transcription
   - Create TranscriptSegments
   - Generate embeddings (nomic-embed-text)
   - Store in pgvector

4. ✅ **Transcript search**
   - Full-text search across segments
   - Time-range filtering
   - Hybrid search (semantic + keyword)

**Acceptance Criteria:**
- Create course: `mutation { createCourse(...) { id } }`
- Upload video: Get presigned URL, upload succeeds
- Auto-transcription: Segment created within 2 min
- Search: `{ searchTranscripts(query: "GraphQL") { text startTime } }`

---

### Sprint 2: Annotation + Knowledge Graph (7 ימים)

#### Milestone 2.1: Subgraph-Annotation (3 ימים)
**מטרה:** 4-layer annotation system

**משימות:**
1. ✅ **GraphQL schema**
   ```graphql
   type Annotation @key(fields: "id") {
     id: ID!
     assetId: ID!
     layer: AnnotationLayer!
     type: AnnotationType!
     content: String!
     anchorTime: Float
     anchorPosition: JSON
     creatorId: ID!
     creator: User! @requires(fields: "creatorId")
     thread: [Annotation!]!
     isPinned: Boolean!
     isResolved: Boolean
   }

   enum AnnotationLayer { PERSONAL SHARED INSTRUCTOR AI_GENERATED }
   enum AnnotationType { TEXT SKETCH LINK BOOKMARK SPATIAL_COMMENT }

   type Query {
     annotations(
       assetId: ID!
       layer: AnnotationLayer
       timeRange: TimeRange
     ): [Annotation!]!
   }

   type Mutation {
     createAnnotation(input: CreateAnnotationInput!): Annotation!
     replyToAnnotation(annotationId: ID!, content: String!): Annotation!
     pinAnnotation(id: ID!): Annotation!
     resolveAnnotation(id: ID!): Annotation!
     promoteAnnotation(id: ID!, toLayer: AnnotationLayer!): Annotation!
   }

   type Subscription {
     annotationCreated(assetId: ID!): Annotation!
     annotationUpdated(assetId: ID!): Annotation!
   }
   ```

2. ✅ **RLS for PERSONAL layer**
   - `creator_id = current_user_id` for PERSONAL
   - All users see SHARED, INSTRUCTOR, AI_GENERATED

3. ✅ **Thread support**
   - Root annotation + children via `parent_id`
   - Nested replies

4. ✅ **Real-time subscriptions**
   - GraphQL subscriptions via WebSocket
   - NATS PubSub for event distribution

**Acceptance Criteria:**
- PERSONAL annotation visible only to creator
- SHARED annotation visible to all in tenant
- Reply creates nested thread
- Subscription receives real-time update

---

#### Milestone 2.2: Subgraph-Knowledge (4 ימים)
**מטרה:** Knowledge graph with Apache AGE

**משימות:**
1. ✅ **GraphQL schema**
   ```graphql
   type Concept @key(fields: "id") {
     id: ID!
     name: String!
     definition: String
     relatedConcepts(maxDepth: Int): [ConceptRelation!]!
     contradictions: [Contradiction!]!
     prerequisites: [Concept!]!
     mentions: [ConceptMention!]!
   }

   type ConceptRelation {
     concept: Concept!
     relationType: RelationType!
     strength: Float
     depth: Int!
   }

   type Contradiction {
     conceptA: Concept!
     conceptB: Concept!
     description: String!
     severity: Float
   }

   type ConceptMention {
     concept: Concept!
     segment: TranscriptSegment
     annotation: Annotation
     context: String
   }

   enum RelationType {
     RELATED_TO
     CONTRADICTS
     PREREQUISITE_OF
     MENTIONS
     CITES
     AUTHORED_BY
     INFERRED_RELATED
   }

   type Query {
     concept(id: ID!): Concept
     concepts(limit: Int): [Concept!]!
     searchConcepts(query: String!): [Concept!]!
     learningPath(conceptId: ID!): [Concept!]!
   }

   type Mutation {
     createConcept(input: CreateConceptInput!): Concept!
     createRelation(fromId: ID!, toId: ID!, type: RelationType!): ConceptRelation!
     deleteRelation(fromId: ID!, toId: ID!, type: RelationType!): Boolean!
   }
   ```

2. ✅ **Apache AGE Cypher queries**
   - Graph traversal: `MATCH (c:Concept)-[:RELATED_TO*1..3]->(related:Concept)`
   - Find contradictions: `MATCH (c)-[:CONTRADICTS]-(contra)`
   - Learning paths: `MATCH (c)-[:PREREQUISITE_OF*]->(advanced)`

3. ✅ **Hybrid search integration**
   - Vector search for concepts (embeddings)
   - Graph traversal for context
   - Fusion: `0.6 * semantic + 0.4 * centrality`

4. ✅ **AI-inferred relations**
   - Flag with `INFERRED_RELATED` edge
   - Review workflow for instructors

**Acceptance Criteria:**
- Create concept: `mutation { createConcept(...) { id } }`
- Traverse graph: `{ concept(id:"...") { relatedConcepts(maxDepth:3) } }`
- Find contradictions: `{ concept { contradictions { description } } }`
- Hybrid search returns graph context

---

### Sprint 3: Collaboration + Frontend (10 ימים)

#### Milestone 3.1: Subgraph-Collaboration (3 ימים)
**מטרה:** Real-time CRDT collaboration

**משימות:**
1. ✅ **Yjs + Hocuspocus setup**
   - Deploy Hocuspocus WebSocket server
   - Store CRDT updates in `crdt_updates` table
   - Compaction job (monthly)

2. ✅ **GraphQL schema**
   ```graphql
   type CollaborationSession {
     id: ID!
     documentId: ID!
     participants: [User!]!
     connectionInfo: ConnectionInfo!
   }

   type ConnectionInfo {
     wsUrl: String!
     token: String!
   }

   type Query {
     collaborationSession(documentId: ID!): CollaborationSession
   }

   type Mutation {
     joinCollaboration(documentId: ID!): CollaborationSession!
     leaveCollaboration(sessionId: ID!): Boolean!
   }
   ```

3. ✅ **Presence awareness**
   - Live cursors
   - Participant list
   - Yjs awareness protocol

**Acceptance Criteria:**
- Join session: `mutation { joinCollaboration(documentId:"...") { wsUrl } }`
- Connect to WebSocket with JWT
- See live cursor positions
- Changes sync real-time

---

#### Milestone 3.2: Frontend - Course UI (3 ימים)
**מטרה:** Web app לצפייה בקורסים

**משימות:**
1. ✅ **Setup React SPA** (apps/web)
   - Vite 6 + React 19
   - TanStack Query + Zustand
   - React Router 6
   - shadcn/ui components

2. ✅ **Course pages**
   - `/courses` - Browse courses
   - `/courses/:id` - Course detail
   - `/courses/:id/lessons/:lessonId` - Lesson view

3. ✅ **Video player**
   - HLS streaming (video.js)
   - Playback controls (speed, quality)
   - Resume from last position
   - Fullscreen mode

**Acceptance Criteria:**
- Browse courses
- Watch video with HLS
- Resume playback

---

#### Milestone 3.3: Frontend - Annotations (2 ימים)
**מטרה:** Annotation canvas on video

**משימות:**
1. ✅ **Konva.js canvas**
   - Drawing tools (pen, highlighter, shapes)
   - Touch/mouse gestures
   - Undo/redo

2. ✅ **Annotation UI**
   - Timeline view of all annotations
   - Filter by layer
   - Thread view with replies
   - Real-time updates (WebSocket)

**Acceptance Criteria:**
- Draw on video frame
- Create text annotation
- See annotations from other students
- Reply to annotation

---

#### Milestone 3.4: Frontend - Search + AI Chat (2 ימים)
**מטרה:** Search UI + AI chat interface

**משימות:**
1. ✅ **Global search**
   - Search bar with autocomplete
   - Results: courses, transcripts, annotations
   - Filters and sorting

2. ✅ **AI chat**
   - Chat interface with streaming
   - Markdown rendering
   - Agent selection
   - Message history

**Acceptance Criteria:**
- Search returns relevant results
- Chat with AI agent works
- Streaming responses render

---

## 📋 סיכום משימות לפי סדר ביצוע

### Week 1: Foundation (Sprint 1)
**ימים 1-2:** Data Layer + Apache AGE + pgvector
**יום 3:** Authentication (Keycloak + JWT)
**יום 4:** Subgraph-Core (Users + Tenants)
**ימים 5-7:** Subgraph-Content (Courses + Media + Transcription)

### Week 2: Core Features (Sprint 2)
**ימים 8-10:** Subgraph-Annotation (4 layers + threads)
**ימים 11-14:** Subgraph-Knowledge (Apache AGE graph)

### Week 3: User Experience (Sprint 3)
**ימים 15-17:** Subgraph-Collaboration (CRDT + Yjs)
**ימים 18-20:** Frontend - Course UI + Video Player
**ימים 21-22:** Frontend - Annotations UI
**ימים 23-24:** Frontend - Search + AI Chat

---

## 🎯 Success Criteria (End of 3 Sprints)

### Functional Requirements
- ✅ Instructor can create course with video lessons
- ✅ Auto-transcription works (faster-whisper)
- ✅ Student can watch video and create annotations
- ✅ Annotations sync real-time across users
- ✅ Knowledge graph shows related concepts
- ✅ Hybrid search finds relevant content
- ✅ AI chat provides contextual help
- ✅ Collaboration session works with live cursors

### Technical Requirements
- ✅ All 6 subgraphs operational (Core, Content, Annotation, Collaboration, Agent, Knowledge)
- ✅ Gateway composes supergraph successfully
- ✅ RLS prevents cross-tenant data access
- ✅ Apache AGE graph queries work
- ✅ pgvector semantic search < 200ms (P95)
- ✅ WebSocket subscriptions stable
- ✅ JWT authentication enforced

### User Stories Completed
- ✅ CM-01, CM-02, CM-03, CM-05 (Content Management)
- ✅ AN-01, AN-02, AN-03, AN-04, AN-06 (Annotations)
- ✅ KG-01, KG-02, KG-03, KG-04 (Knowledge Graph)
- ✅ AI-01, AI-02, AI-04 (AI Agents)
- ✅ CO-01, CO-02 (Collaboration)
- ✅ SD-01, SD-02, SD-03 (Search)

---

## 🚨 Critical Path Items

### Must Have (Blockers)
1. **Database Schema** - כל השאר תלוי בזה
2. **Authentication** - אבטחה בסיסית
3. **Subgraph-Content** - אין תוכן = אין פלטפורמה
4. **Subgraph-Annotation** - תכונת ליבה #1
5. **Frontend** - אין UI = אין מוצר

### Should Have (Important)
6. **Subgraph-Knowledge** - ה-differentiator המרכזי
7. **Subgraph-Collaboration** - real-time experience
8. **Transcription Worker** - automation is key

### Nice to Have (Post-MVP)
9. Course forking (CM-04)
10. Graph export (KG-06)
11. Session history (CO-03)

---

## 📊 Effort Estimation

| Sprint | Days | Complexity | Risk Level |
|--------|------|------------|------------|
| **Sprint 1** (Foundation + Content) | 7 | High (DB + Auth + Transcription) | Medium |
| **Sprint 2** (Annotation + Graph) | 7 | Medium (Known patterns) | Low |
| **Sprint 3** (Collab + Frontend) | 10 | Medium-High (CRDT + UI) | Medium |
| **Total** | **24 days** | **~4 weeks** | **Can deliver MVP** |

---

## 🎬 Next Steps

### Immediate Actions (התחל מחר!)
1. **Day 1 Morning:** Create all 16 database tables (DATABASE-SCHEMA.md)
2. **Day 1 Afternoon:** Initialize Apache AGE graph + pgvector
3. **Day 2 Morning:** Seed demo data (2 tenants, 10 users, 5 courses)
4. **Day 2 Afternoon:** Setup Keycloak realm + test JWT
5. **Day 3:** Build Subgraph-Core (users, tenants)
6. **Days 4-7:** Build Subgraph-Content + transcription

### Success Metrics
- **Day 7:** Can create course and upload video
- **Day 14:** Can annotate videos and see knowledge graph
- **Day 24:** Full web app with all features working

---

**סיכום:** יש לנו תשתית AI/ML מעולה (Phases 13-15) אבל **חסרות התכונות הבסיסיות**!
צריך לחזור ל-Phases 1-6 ולבנות את הליבה. אחרי 3 Sprints יהיה לנו MVP מלא שמממש את ה-PRD! 🚀
