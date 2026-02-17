# EduSphere GraphQL Operations Guide

> **Complete reference for all GraphQL queries, mutations, and subscriptions.**
> This document provides practical examples, authentication requirements, and best practices for consuming the EduSphere GraphQL API.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Schema Registry](#2-schema-registry)
3. [Queries (44 Total)](#3-queries-44-total)
4. [Mutations (44 Total)](#4-mutations-44-total)
5. [Subscriptions (7 Total)](#5-subscriptions-7-total)
6. [Authentication](#6-authentication)
7. [Error Handling](#7-error-handling)
8. [Pagination](#8-pagination)
9. [Rate Limiting](#9-rate-limiting)
10. [Code Generation](#10-code-generation)
11. [Client Examples](#11-client-examples)
12. [Testing GraphQL Operations](#12-testing-graphql-operations)
13. [Performance Optimization](#13-performance-optimization)

---

## 1. Overview

EduSphere's GraphQL API is built using **GraphQL Federation v2.7** with **Hive Gateway v2** as the supergraph gateway. The API is composed of **6 independent subgraphs**, each handling a specific domain:

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Client Applications                          │
│              (React SPA · React Native · PWA)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                  HTTPS / WebSocket (WSS)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               Hive Gateway v2 (Node.js)                         │
│  • Supergraph composition    • JWT validation                   │
│  • Query planning            • Rate limiting                    │
│  • Subscriptions (WS)        • Persisted queries                │
└──┬─────┬──────┬──────┬──────┬──────┬──────────────────────────┘
   │     │      │      │      │      │
   ▼     ▼      ▼      ▼      ▼      ▼
┌────┐┌────┐┌────┐┌────┐┌────┐┌──────────┐
│Core││Cont││Anno││Coll││Agnt││Knowledge │
│:01 ││:02 ││:03 ││:04 ││:05 ││   :06    │
└────┘└────┘└────┘└────┘└────┘└──────────┘
```

### Subgraph Decomposition

| Subgraph | Port | Owned Entities | Domain |
|----------|------|----------------|--------|
| **Core** | 4001 | `Tenant`, `User` | Identity, tenancy, auth |
| **Content** | 4002 | `Course`, `Module`, `MediaAsset`, `Transcript`, `TranscriptSegment` | Courses, media pipeline, transcription |
| **Annotation** | 4003 | `Annotation` | Markings, sketches, spatial comments |
| **Collaboration** | 4004 | `CollabDocument`, `CollabSession` | CRDT persistence, real-time presence |
| **Agent** | 4005 | `AgentDefinition`, `AgentExecution` | AI agents, templates, executions |
| **Knowledge** | 4006 | `Concept`, `Person`, `Term`, `Source`, `TopicCluster` | Knowledge graph, embeddings, semantic search |

### Technology Stack

- **Federation**: GraphQL Federation v2.7 (Apollo spec compatible)
- **Gateway**: Hive Gateway v2 (MIT-licensed)
- **Subgraphs**: NestJS + GraphQL Yoga + `YogaFederationDriver`
- **Database**: PostgreSQL 16+ with RLS (Row-Level Security)
- **Extensions**: Apache AGE (graph), pgvector (embeddings)
- **Transport**: HTTPS + WebSocket (for subscriptions)
- **Schema Registry**: GraphQL Hive

---

## 2. Schema Registry

EduSphere uses **GraphQL Hive** for schema management and governance.

### Key Features

- **Breaking Change Detection**: Automatically detects breaking changes before deployment
- **Schema Composition**: Validates federation composition across all subgraphs
- **Performance Monitoring**: Tracks query performance and error rates
- **Schema Evolution**: Maintains version history and deprecation warnings

### Accessing the Schema

**Production Schema:**
```
https://gateway.edusphere.com/graphql
```

**Introspection Query:**
```bash
curl https://gateway.edusphere.com/graphql \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { queryType { name } } }"}'
```

**GraphQL Playground:**
```
https://gateway.edusphere.com/graphql-playground
```

### Schema Governance

All schema changes must pass through Hive validation:

```bash
# Check schema compatibility before deploying
hive schema:check \
  --registry.endpoint https://app.graphql-hive.com \
  --registry.accessToken $HIVE_TOKEN \
  --service content \
  apps/subgraph-content/src/schema.graphql
```

---

## 3. Queries (44 Total)

All queries are organized by subgraph. Unless marked `Public`, all queries require authentication via JWT.

### 3.1 Core Subgraph (5 Queries)

#### `me: User!`

Returns the currently authenticated user. This is the primary entry point for client initialization.

**Authentication**: Required
**RLS**: Returns only the authenticated user's record

**Example:**
```graphql
query CurrentUser {
  me {
    id
    email
    displayName
    avatarUrl
    role
    preferences {
      language
      theme
      defaultAnnotationLayer
    }
    tenant {
      id
      name
      slug
      plan
    }
  }
}
```

**Response:**
```json
{
  "data": {
    "me": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "displayName": "John Doe",
      "avatarUrl": "https://cdn.edusphere.com/avatars/550e8400.jpg",
      "role": "INSTRUCTOR",
      "preferences": {
        "language": "en",
        "theme": "DARK",
        "defaultAnnotationLayer": "PERSONAL"
      },
      "tenant": {
        "id": "tenant-uuid",
        "name": "Bar-Ilan University",
        "slug": "bar-ilan",
        "plan": "PROFESSIONAL"
      }
    }
  }
}
```

---

#### `user(id: UUID!): User`

Fetch a user by ID within the current tenant.

**Authentication**: Required
**RLS**: Returns only users within the same tenant
**Authorization**: Accessible to all authenticated users

**Example:**
```graphql
query GetUser($userId: UUID!) {
  user(id: $userId) {
    id
    displayName
    avatarUrl
    role
  }
}
```

**Variables:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

#### `users(...): UserConnection!`

List all users within the current tenant with filtering, sorting, and pagination.

**Authentication**: Required
**RLS**: Returns only users within the same tenant
**Pagination**: Relay Cursor Connection

**Arguments:**
- `first: PositiveInt = 20` - Returns the first N edges
- `after: Cursor` - Returns edges after this cursor
- `last: PositiveInt` - Returns the last N edges
- `before: Cursor` - Returns edges before this cursor
- `filter: UserFilterInput` - Filter by role, activity status
- `orderBy: UserOrderByInput` - Sort by field and direction

**Example:**
```graphql
query ListUsers(
  $first: PositiveInt!
  $after: Cursor
  $filter: UserFilterInput
) {
  users(first: $first, after: $after, filter: $filter) {
    edges {
      node {
        id
        displayName
        email
        role
        isActive
        createdAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "first": 20,
  "filter": {
    "roles": ["INSTRUCTOR", "STUDENT"],
    "isActive": true
  }
}
```

**Input Types:**
```graphql
input UserFilterInput {
  roles: [UserRole!]
  isActive: Boolean
  search: String  # Searches displayName and email
}

input UserOrderByInput {
  field: UserOrderField!
  direction: SortDirection!
}

enum UserOrderField {
  CREATED_AT
  DISPLAY_NAME
  EMAIL
  LAST_LOGIN
}
```

---

#### `currentTenant: Tenant!`

Fetch the current tenant's details based on the JWT `tenant_id` claim.

**Authentication**: Required
**RLS**: Returns only the tenant from the JWT

**Example:**
```graphql
query CurrentTenant {
  currentTenant {
    id
    name
    slug
    plan
    settings {
      defaultLanguage
      allowedLlmProviders
      brandingColors {
        primary
        secondary
      }
    }
    quotas {
      maxStorageBytes
      maxUsers
      maxCoursesPerUser
    }
  }
}
```

---

#### `tenantBySlug(slug: String!): Tenant`

Fetch a tenant by its URL-friendly slug. Used for SSO login flow to resolve tenant.

**Authentication**: Public (no JWT required)
**Use Case**: Login page needs to resolve tenant before authentication

**Example:**
```graphql
query ResolveOrgForLogin($slug: String!) {
  tenantBySlug(slug: $slug) {
    id
    name
    ssoEnabled
    keycloakRealm
  }
}
```

**Variables:**
```json
{
  "slug": "bar-ilan-university"
}
```

---

### 3.2 Content Subgraph (7 Queries)

#### `course(id: UUID!): Course`

Fetch a single course by ID.

**Authentication**: Required
**RLS**: Returns only courses within the same tenant
**Authorization**: Students see only published courses; instructors/admins see all

**Example:**
```graphql
query GetCourse($courseId: UUID!) {
  course(id: $courseId) {
    id
    title
    description
    thumbnailUrl
    isPublished
    creator {
      id
      displayName
      avatarUrl
    }
    modules(first: 50, orderBy: { field: ORDER_INDEX, direction: ASC }) {
      edges {
        node {
          id
          title
          orderIndex
          durationSeconds
        }
      }
    }
    tags
    createdAt
    updatedAt
  }
}
```

---

#### `courses(...): CourseConnection!`

List courses within the current tenant with filtering and pagination.

**Authentication**: Required
**RLS**: Returns only courses within the same tenant
**Authorization**: Students see only published courses; instructors see their own + published

**Arguments:**
- `first: PositiveInt = 20`
- `after: Cursor`
- `last: PositiveInt`
- `before: Cursor`
- `filter: CourseFilterInput`
- `orderBy: CourseOrderByInput`

**Example:**
```graphql
query ListCourses(
  $first: PositiveInt!
  $filter: CourseFilterInput
) {
  courses(first: $first, filter: $filter) {
    edges {
      node {
        id
        title
        description
        thumbnailUrl
        isPublished
        creator {
          id
          displayName
        }
        moduleCount
        totalDurationSeconds
        createdAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Input Types:**
```graphql
input CourseFilterInput {
  search: String         # Searches title and description
  creatorId: UUID        # Filter by creator
  isPublished: Boolean   # Published status
  tags: [String!]        # Match any of these tags
}

input CourseOrderByInput {
  field: CourseOrderField!
  direction: SortDirection!
}

enum CourseOrderField {
  CREATED_AT
  UPDATED_AT
  TITLE
  MODULE_COUNT
}
```

---

#### `module(id: UUID!): Module`

Fetch a single module by ID.

**Authentication**: Required
**RLS**: Returns only modules within the same tenant

**Example:**
```graphql
query GetModule($moduleId: UUID!) {
  module(id: $moduleId) {
    id
    title
    description
    orderIndex
    course {
      id
      title
    }
    mediaAssets(first: 20) {
      edges {
        node {
          id
          title
          type
          durationSeconds
          thumbnailUrl
        }
      }
    }
  }
}
```

---

#### `mediaAsset(id: UUID!): MediaAsset`

Fetch a single media asset by ID.

**Authentication**: Required
**RLS**: Returns only media assets within the same tenant

**Example:**
```graphql
query GetMediaAsset($assetId: UUID!) {
  mediaAsset(id: $assetId) {
    id
    title
    type
    durationSeconds
    hlsManifestUrl
    thumbnailUrl
    transcriptionStatus
    transcript {
      id
      fullText
      language
      confidence
    }
    annotations(first: 30) {
      edges {
        node {
          id
          type
          layer
          content
          timestampStart
          timestampEnd
        }
      }
    }
  }
}
```

---

#### `mediaAssets(...): MediaAssetConnection!`

List media assets within the current tenant.

**Authentication**: Required
**RLS**: Returns only media assets within the same tenant
**Pagination**: Relay Cursor Connection

**Arguments:**
- `first: PositiveInt = 20`
- `after: Cursor`
- `filter: MediaAssetFilterInput`
- `orderBy: MediaAssetOrderByInput`

**Example:**
```graphql
query ListMediaAssets(
  $first: PositiveInt!
  $filter: MediaAssetFilterInput
) {
  mediaAssets(first: $first, filter: $filter) {
    edges {
      node {
        id
        title
        type
        durationSeconds
        thumbnailUrl
        transcriptionStatus
        createdAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Input Types:**
```graphql
input MediaAssetFilterInput {
  type: MediaType
  transcriptionStatus: TranscriptionStatus
  moduleId: UUID
  search: String
}

input MediaAssetOrderByInput {
  field: MediaAssetOrderField!
  direction: SortDirection!
}

enum MediaAssetOrderField {
  CREATED_AT
  TITLE
  DURATION_SECONDS
}
```

---

#### `segmentsForTimeRange(...): [TranscriptSegment!]!`

Fetch transcript segments for a specific time range within a media asset. Useful for showing captions in a video player.

**Authentication**: Required
**RLS**: Returns segments only if the user has access to the parent media asset

**Arguments:**
- `assetId: UUID!` - The media asset ID
- `startTime: Float!` - Start time in seconds
- `endTime: Float!` - End time in seconds

**Example:**
```graphql
query GetSegmentsForPlayer(
  $assetId: UUID!
  $start: Float!
  $end: Float!
) {
  segmentsForTimeRange(
    assetId: $assetId
    startTime: $start
    endTime: $end
  ) {
    id
    startTime
    endTime
    text
    speaker
    confidence
  }
}
```

**Variables:**
```json
{
  "assetId": "asset-uuid",
  "start": 120.5,
  "end": 180.0
}
```

---

#### `searchTranscripts(...): TranscriptSearchResultConnection!`

Full-text search across all transcripts in the current tenant.

**Authentication**: Required
**RLS**: Returns results only from transcripts within the same tenant
**Pagination**: Relay Cursor Connection (default 10, max 50)

**Arguments:**
- `query: String!` - Search query
- `first: PositiveInt = 10`
- `after: Cursor`
- `assetIds: [UUID!]` - Optionally limit search to specific assets

**Example:**
```graphql
query SearchTranscripts(
  $query: String!
  $first: PositiveInt!
) {
  searchTranscripts(query: $query, first: $first) {
    edges {
      node {
        segment {
          id
          text
          startTime
          endTime
        }
        asset {
          id
          title
          thumbnailUrl
        }
        matchedText
        score
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "query": "machine learning",
  "first": 10
}
```

---

### 3.3 Annotation Subgraph (3 Queries)

#### `annotation(id: UUID!): Annotation`

Fetch a single annotation by ID.

**Authentication**: Required
**RLS**: Returns only annotations within the same tenant
**Authorization**: Users see their own PERSONAL layer + SHARED/INSTRUCTOR/AI_GENERATED layers

**Example:**
```graphql
query GetAnnotation($annotationId: UUID!) {
  annotation(id: $annotationId) {
    id
    type
    layer
    content
    sketchData
    timestampStart
    timestampEnd
    spatialX
    spatialY
    isPinned
    isResolved
    author {
      id
      displayName
      avatarUrl
    }
    asset {
      id
      title
    }
    replies(first: 10) {
      edges {
        node {
          id
          content
          author {
            id
            displayName
          }
          createdAt
        }
      }
    }
    createdAt
    updatedAt
  }
}
```

---

#### `annotations(...): AnnotationConnection!`

List annotations with filtering and pagination.

**Authentication**: Required
**RLS**: Returns annotations within the same tenant
**Authorization**: Students see their own PERSONAL layer + shared/instructor/AI layers

**Arguments:**
- `first: PositiveInt = 20`
- `after: Cursor`
- `last: PositiveInt`
- `before: Cursor`
- `filter: AnnotationFilterInput`
- `orderBy: AnnotationOrderByInput`

**Example:**
```graphql
query ListAnnotations(
  $assetId: UUID!
  $layers: [AnnotationLayer!]
) {
  annotations(
    first: 30
    filter: {
      assetId: $assetId
      layers: $layers
    }
  ) {
    edges {
      node {
        id
        type
        layer
        content
        timestampStart
        timestampEnd
        author {
          id
          displayName
        }
        isPinned
        replyCount
        createdAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Input Types:**
```graphql
input AnnotationFilterInput {
  assetId: UUID
  layers: [AnnotationLayer!]
  type: AnnotationType
  authorId: UUID
  isPinned: Boolean
  isResolved: Boolean
  timestampRange: TimeRangeInput
}

input TimeRangeInput {
  start: Float!
  end: Float!
}

input AnnotationOrderByInput {
  field: AnnotationOrderField!
  direction: SortDirection!
}

enum AnnotationOrderField {
  CREATED_AT
  TIMESTAMP_START
  REPLY_COUNT
}
```

---

#### `annotationThread(rootId: UUID!): [Annotation!]!`

Get all replies to a root annotation, returned as a flat list ordered by creation time.

**Authentication**: Required
**RLS**: Returns only annotations within the same tenant

**Example:**
```graphql
query GetThread($rootId: UUID!) {
  annotationThread(rootId: $rootId) {
    id
    content
    author {
      id
      displayName
      avatarUrl
    }
    parentId
    createdAt
  }
}
```

---

### 3.4 Collaboration Subgraph (4 Queries)

#### `collabDocument(id: UUID!): CollabDocument`

Fetch a collaborative document by ID.

**Authentication**: Required
**RLS**: Returns only documents within the same tenant

**Example:**
```graphql
query GetCollabDoc($docId: UUID!) {
  collabDocument(id: $docId) {
    id
    documentName
    title
    entityType
    entityId
    yDocSnapshot
    activeSessions {
      id
      user {
        id
        displayName
        avatarUrl
      }
      cursorPosition
      connectedAt
    }
    updatedAt
  }
}
```

---

#### `collabDocumentByName(documentName: String!): CollabDocument`

Fetch a collaborative document by its unique document name.

**Authentication**: Required
**RLS**: Returns only documents within the same tenant

**Example:**
```graphql
query GetDocByName($name: String!) {
  collabDocumentByName(documentName: $name) {
    id
    documentName
    title
  }
}
```

---

#### `collabDocumentsForEntity(...): [CollabDocument!]!`

List all collaborative documents associated with a specific entity (e.g., all documents for a course).

**Authentication**: Required
**RLS**: Returns only documents within the same tenant

**Arguments:**
- `entityType: String!` - e.g., "Course", "Annotation"
- `entityId: UUID!` - The entity's UUID

**Example:**
```graphql
query GetCourseDocuments(
  $entityType: String!
  $entityId: UUID!
) {
  collabDocumentsForEntity(
    entityType: $entityType
    entityId: $entityId
  ) {
    id
    documentName
    title
    activeSessionCount
    updatedAt
  }
}
```

**Variables:**
```json
{
  "entityType": "Course",
  "entityId": "course-uuid"
}
```

---

#### `collabConnectionInfo(documentId: UUID!): CollabConnectionInfo!`

Get WebSocket connection information for real-time collaboration via Hocuspocus.

**Authentication**: Required
**RLS**: Returns connection info only for documents within the same tenant

**Example:**
```graphql
query GetWSInfo($docId: UUID!) {
  collabConnectionInfo(documentId: $docId) {
    wsUrl
    authToken
    documentName
  }
}
```

**Response:**
```json
{
  "data": {
    "collabConnectionInfo": {
      "wsUrl": "wss://collab.edusphere.com/ws",
      "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "documentName": "course-12345-notes"
    }
  }
}
```

---

### 3.5 Agent Subgraph (5 Queries)

#### `agentDefinition(id: UUID!): AgentDefinition`

Fetch an agent definition by ID.

**Authentication**: Required
**RLS**: Returns only agents within the same tenant
**Authorization**: Users see public agents + their own private agents

**Example:**
```graphql
query GetAgent($agentId: UUID!) {
  agentDefinition(id: $agentId) {
    id
    name
    description
    templateType
    isPublic
    creator {
      id
      displayName
    }
    config {
      dataScope {
        includeTranscripts
        includeConcepts
        courseIds
      }
      triggerType
      outputFormat
      personality
      customPrompt
      maxTokens
    }
    createdAt
  }
}
```

---

#### `agentDefinitions(...): AgentDefinitionConnection!`

List available agent definitions.

**Authentication**: Required
**RLS**: Returns agents within the same tenant
**Authorization**: Users see public agents + their own private agents

**Arguments:**
- `first: PositiveInt = 20`
- `after: Cursor`
- `filter: AgentDefinitionFilterInput`
- `orderBy: AgentDefinitionOrderByInput`

**Example:**
```graphql
query ListAgents($first: PositiveInt!) {
  agentDefinitions(first: $first) {
    edges {
      node {
        id
        name
        description
        templateType
        isPublic
        creator {
          displayName
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Input Types:**
```graphql
input AgentDefinitionFilterInput {
  templateType: AgentTemplate
  isPublic: Boolean
  creatorId: UUID
  search: String
}

input AgentDefinitionOrderByInput {
  field: AgentDefinitionOrderField!
  direction: SortDirection!
}

enum AgentDefinitionOrderField {
  CREATED_AT
  NAME
  USAGE_COUNT
}
```

---

#### `agentTemplates: [AgentTemplateInfo!]!`

List all built-in agent templates (predefined agent types).

**Authentication**: Required

**Example:**
```graphql
query GetTemplates {
  agentTemplates {
    templateType
    name
    description
    defaultConfig {
      dataScope {
        includeTranscripts
        includeConcepts
      }
      triggerType
      outputFormat
      personality
      maxTokens
    }
    icon
  }
}
```

**Response:**
```json
{
  "data": {
    "agentTemplates": [
      {
        "templateType": "CHAVRUTA",
        "name": "Chavruta Study Partner",
        "description": "Engages in Socratic dialogue, challenges assumptions",
        "defaultConfig": {
          "dataScope": {
            "includeTranscripts": true,
            "includeConcepts": true
          },
          "triggerType": "MANUAL",
          "outputFormat": "CHAT",
          "personality": "Curious, challenging, supportive",
          "maxTokens": 2048
        },
        "icon": "debate"
      }
    ]
  }
}
```

---

#### `agentExecution(id: UUID!): AgentExecution`

Fetch a specific agent execution.

**Authentication**: Required
**RLS**: Returns only executions within the same tenant
**Authorization**: Users can only see their own executions

**Example:**
```graphql
query GetExecution($execId: UUID!) {
  agentExecution(id: $execId) {
    id
    status
    input
    output
    error
    startedAt
    completedAt
    tokensUsed
    agentDefinition {
      id
      name
      templateType
    }
    triggeredBy {
      id
      displayName
    }
  }
}
```

---

#### `agentExecutions(...): AgentExecutionConnection!`

List agent executions with filtering.

**Authentication**: Required
**RLS**: Returns only executions within the same tenant
**Authorization**: Users see only their own executions

**Arguments:**
- `first: PositiveInt = 20`
- `after: Cursor`
- `filter: AgentExecutionFilterInput`

**Example:**
```graphql
query ListExecutions(
  $first: PositiveInt!
  $filter: AgentExecutionFilterInput
) {
  agentExecutions(first: $first, filter: $filter) {
    edges {
      node {
        id
        status
        startedAt
        completedAt
        agentDefinition {
          name
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Input Types:**
```graphql
input AgentExecutionFilterInput {
  agentId: UUID
  status: ExecutionStatus
  triggeredById: UUID
}
```

---

### 3.6 Knowledge Subgraph (20 Queries)

#### `concept(id: UUID!): Concept`

Fetch a concept by ID.

**Authentication**: Required
**RLS**: Returns only concepts within the same tenant

**Example:**
```graphql
query GetConcept($conceptId: UUID!) {
  concept(id: $conceptId) {
    id
    label
    description
    aliases
    domain
    relatedConcepts(first: 10) {
      edges {
        node {
          id
          relationType
          targetConcept {
            id
            label
          }
          strength
        }
      }
    }
    sources {
      id
      title
      url
    }
    createdAt
  }
}
```

---

#### `concepts(...): ConceptConnection!`

Search concepts by label, alias, or description.

**Authentication**: Required
**RLS**: Returns only concepts within the same tenant
**Pagination**: Relay Cursor Connection

**Arguments:**
- `first: PositiveInt = 20`
- `after: Cursor`
- `filter: ConceptFilterInput`
- `orderBy: ConceptOrderByInput`

**Example:**
```graphql
query SearchConcepts($search: String!) {
  concepts(first: 20, filter: { search: $search }) {
    edges {
      node {
        id
        label
        description
        domain
        relationCount
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Input Types:**
```graphql
input ConceptFilterInput {
  search: String
  domain: String
  hasRelations: Boolean
}

input ConceptOrderByInput {
  field: ConceptOrderField!
  direction: SortDirection!
}

enum ConceptOrderField {
  CREATED_AT
  LABEL
  RELATION_COUNT
}
```

---

#### `semanticSearch(...): SemanticSearchResultConnection!`

Semantic search across all content using natural language. Uses pgvector HNSW index for approximate nearest neighbor search.

**Authentication**: Required
**RLS**: Returns results only from content within the same tenant
**Pagination**: Relay Cursor Connection (default 10, max 50)

**Arguments:**
- `query: String!` - Natural language query (will be embedded by the server)
- `first: PositiveInt = 10`
- `after: Cursor`
- `minSimilarity: UnitFloat = 0.7` - Minimum similarity threshold (0-1)
- `assetIds: [UUID!]` - Optionally limit search to specific assets

**Example:**
```graphql
query SemanticSearch($query: String!, $first: PositiveInt!) {
  semanticSearch(
    query: $query
    first: $first
    minSimilarity: 0.75
  ) {
    edges {
      node {
        segment {
          id
          text
          startTime
          endTime
        }
        asset {
          id
          title
          thumbnailUrl
        }
        similarity
        matchedText
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "query": "What is machine learning?",
  "first": 10
}
```

---

#### `hybridSearch(...): HybridSearchResultConnection!`

HybridRAG search: combines vector search + knowledge graph traversal. Best for complex queries that need both semantic and structural context.

**Authentication**: Required
**RLS**: Returns results only from content within the same tenant
**Pagination**: Relay Cursor Connection (default 10, max 50)

**Arguments:**
- `query: String!` - Natural language query
- `first: PositiveInt = 10`
- `graphDepth: PositiveInt = 2` - How many graph hops to follow from vector results

**Example:**
```graphql
query HybridSearch(
  $query: String!
  $graphDepth: PositiveInt!
) {
  hybridSearch(
    query: $query
    first: 10
    graphDepth: $graphDepth
  ) {
    edges {
      node {
        segment {
          id
          text
          startTime
          endTime
        }
        asset {
          id
          title
          type
          thumbnailUrl
        }
        matchedText
        similarity
        combinedScore
        graphContext {
          concept {
            id
            label
            domain
          }
          connections {
            relatedConcept {
              id
              label
            }
            relationType
            strength
          }
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "query": "Explain the relationship between supervised and unsupervised learning",
  "graphDepth": 2
}
```

---

#### `relatedConcepts(...): KnowledgeRelationConnection!`

Find concepts related to a given concept via graph traversal.

**Authentication**: Required
**RLS**: Returns only concepts within the same tenant

**Arguments:**
- `conceptId: UUID!` - The starting concept
- `maxDepth: PositiveInt = 3` - Max graph traversal depth
- `first: PositiveInt = 50`

**Example:**
```graphql
query GetRelated($conceptId: UUID!, $maxDepth: PositiveInt!) {
  relatedConcepts(
    conceptId: $conceptId
    maxDepth: $maxDepth
    first: 50
  ) {
    edges {
      node {
        id
        relationType
        targetConcept {
          id
          label
          description
        }
        strength
        inferredByAI
        distance
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

**Variables:**
```json
{
  "conceptId": "concept-uuid",
  "maxDepth": 3
}
```

---

#### `contradictions(conceptId: UUID!): [Contradiction!]!`

Find contradictions for a concept (where different sources present conflicting information).

**Authentication**: Required
**RLS**: Returns only contradictions within the same tenant

**Example:**
```graphql
query GetContradictions($conceptId: UUID!) {
  contradictions(conceptId: $conceptId) {
    id
    concept1 {
      id
      label
    }
    concept2 {
      id
      label
    }
    evidence
    severity
    sources {
      id
      title
      url
    }
    createdAt
  }
}
```

---

#### `learningPath(...): [Concept!]!`

Generate a learning path from a starting concept (prerequisites first, then dependents).

**Authentication**: Required
**RLS**: Returns only concepts within the same tenant

**Arguments:**
- `conceptId: UUID!` - The target concept
- `maxDepth: PositiveInt = 5` - Max depth for prerequisite traversal

**Example:**
```graphql
query GetPath($conceptId: UUID!) {
  learningPath(conceptId: $conceptId, maxDepth: 5) {
    id
    label
    description
    domain
    depth
  }
}
```

---

#### `topicClusters(...): TopicClusterConnection!`

List topic clusters (groups of related concepts).

**Authentication**: Required
**RLS**: Returns only clusters within the same tenant

**Example:**
```graphql
query GetClusters($first: PositiveInt!) {
  topicClusters(first: $first) {
    edges {
      node {
        id
        name
        description
        concepts {
          id
          label
        }
        createdAt
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

---

#### `person(id: UUID!): Person`

Fetch a person reference by ID.

**Authentication**: Required
**RLS**: Returns only people within the same tenant

**Example:**
```graphql
query GetPerson($personId: UUID!) {
  person(id: $personId) {
    id
    fullName
    aliases
    bio
    birthDate
    deathDate
    relatedConcepts {
      id
      label
    }
    sources {
      id
      title
    }
    createdAt
  }
}
```

---

#### `people(...): PersonConnection!`

Search for people by name.

**Authentication**: Required
**RLS**: Returns only people within the same tenant

**Arguments:**
- `first: PositiveInt = 20`
- `after: Cursor`
- `search: String`

**Example:**
```graphql
query SearchPeople($search: String!, $first: PositiveInt!) {
  people(search: $search, first: $first) {
    edges {
      node {
        id
        fullName
        bio
        relatedConceptCount
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

---

#### `term(id: UUID!): Term`

Fetch a term (technical vocabulary) by ID.

**Authentication**: Required
**RLS**: Returns only terms within the same tenant

**Example:**
```graphql
query GetTerm($termId: UUID!) {
  term(id: $termId) {
    id
    label
    definition
    domain
    etymology
    relatedConcepts {
      id
      label
    }
    createdAt
  }
}
```

---

#### `terms(...): TermConnection!`

Search for terms by label or domain.

**Authentication**: Required
**RLS**: Returns only terms within the same tenant

**Arguments:**
- `first: PositiveInt = 20`
- `after: Cursor`
- `domain: String`
- `search: String`

**Example:**
```graphql
query SearchTerms($domain: String, $search: String!) {
  terms(domain: $domain, search: $search, first: 20) {
    edges {
      node {
        id
        label
        definition
        domain
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

---

#### `source(id: UUID!): Source`

Fetch a source (citation, reference) by ID.

**Authentication**: Required
**RLS**: Returns only sources within the same tenant

**Example:**
```graphql
query GetSource($sourceId: UUID!) {
  source(id: $sourceId) {
    id
    title
    type
    url
    authors {
      id
      fullName
    }
    publishedDate
    citationCount
    linkedConcepts {
      id
      label
    }
    createdAt
  }
}
```

---

#### `sources(...): SourceConnection!`

Search for sources by type or title.

**Authentication**: Required
**RLS**: Returns only sources within the same tenant

**Arguments:**
- `first: PositiveInt = 20`
- `after: Cursor`
- `type: String`
- `search: String`

**Example:**
```graphql
query SearchSources($type: String, $search: String!) {
  sources(type: $type, search: $search, first: 20) {
    edges {
      node {
        id
        title
        type
        url
        publishedDate
        citationCount
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
    totalCount
  }
}
```

---

## 4. Mutations (44 Total)

All mutations require authentication unless otherwise specified. Mutations return the modified entity or a boolean success indicator.

### 4.1 Core Subgraph (5 Mutations)

#### `updateMyProfile(input: UpdateProfileInput!): User!`

Update the current user's profile and preferences.

**Authentication**: Required
**Authorization**: Users can only update their own profile
**RLS**: Updates only the authenticated user's record

**Input Type:**
```graphql
input UpdateProfileInput {
  displayName: String
  avatarUrl: URL
  preferences: UserPreferencesInput
}

input UserPreferencesInput {
  language: String
  theme: ThemePreference
  defaultAnnotationLayer: AnnotationLayer
}

enum ThemePreference {
  LIGHT
  DARK
  AUTO
}
```

**Example:**
```graphql
mutation UpdateProfile($input: UpdateProfileInput!) {
  updateMyProfile(input: $input) {
    id
    displayName
    avatarUrl
    preferences {
      language
      theme
      defaultAnnotationLayer
    }
    updatedAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "displayName": "John Doe",
    "preferences": {
      "theme": "DARK",
      "defaultAnnotationLayer": "PERSONAL"
    }
  }
}
```

**Validation:**
- `displayName`: 1-100 characters
- `avatarUrl`: Must be a valid URL

---

#### `updateUserRole(userId: UUID!, role: UserRole!): User!`

Update a user's role. Requires ORG_ADMIN or SUPER_ADMIN.

**Authentication**: Required
**Authorization**: `org:users` scope
**RLS**: Can only update users within the same tenant

**Example:**
```graphql
mutation UpdateRole($userId: UUID!, $role: UserRole!) {
  updateUserRole(userId: $userId, role: $role) {
    id
    email
    displayName
    role
    updatedAt
  }
}
```

**Variables:**
```json
{
  "userId": "user-uuid",
  "role": "INSTRUCTOR"
}
```

---

#### `deactivateUser(userId: UUID!): User!`

Deactivate a user (soft delete). Requires ORG_ADMIN.

**Authentication**: Required
**Authorization**: `org:users` scope
**RLS**: Can only deactivate users within the same tenant

**Example:**
```graphql
mutation DeactivateUser($userId: UUID!) {
  deactivateUser(userId: $userId) {
    id
    email
    isActive
    updatedAt
  }
}
```

---

#### `reactivateUser(userId: UUID!): User!`

Reactivate a previously deactivated user.

**Authentication**: Required
**Authorization**: `org:users` scope
**RLS**: Can only reactivate users within the same tenant

**Example:**
```graphql
mutation ReactivateUser($userId: UUID!) {
  reactivateUser(userId: $userId) {
    id
    email
    isActive
    updatedAt
  }
}
```

---

#### `updateTenantSettings(input: UpdateTenantSettingsInput!): Tenant!`

Update tenant settings. Requires ORG_ADMIN.

**Authentication**: Required
**Authorization**: `org:manage` scope
**RLS**: Can only update the authenticated user's tenant

**Input Type:**
```graphql
input UpdateTenantSettingsInput {
  defaultLanguage: String
  allowedLlmProviders: [String!]
  brandingColors: BrandingColorsInput
}

input BrandingColorsInput {
  primary: String
  secondary: String
  accent: String
}
```

**Example:**
```graphql
mutation UpdateTenant($input: UpdateTenantSettingsInput!) {
  updateTenantSettings(input: $input) {
    id
    name
    settings {
      defaultLanguage
      allowedLlmProviders
      brandingColors {
        primary
        secondary
      }
    }
    updatedAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "defaultLanguage": "en",
    "allowedLlmProviders": ["openai", "anthropic"],
    "brandingColors": {
      "primary": "#1E40AF",
      "secondary": "#7C3AED"
    }
  }
}
```

---

### 4.2 Content Subgraph (14 Mutations)

#### `createCourse(input: CreateCourseInput!): Course!`

Create a new course. Requires INSTRUCTOR or ORG_ADMIN role.

**Authentication**: Required
**Authorization**: `course:write` scope
**RLS**: Creates course within the authenticated user's tenant

**Input Type:**
```graphql
input CreateCourseInput {
  title: String!
  description: String
  thumbnailUrl: URL
  isPublished: Boolean = false
  tags: [String!]
}
```

**Example:**
```graphql
mutation CreateCourse($input: CreateCourseInput!) {
  createCourse(input: $input) {
    id
    title
    description
    isPublished
    creator {
      id
      displayName
    }
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "title": "Introduction to Machine Learning",
    "description": "Learn the fundamentals of ML",
    "isPublished": false,
    "tags": ["AI", "ML", "Computer Science"]
  }
}
```

**Validation:**
- `title`: Required, 1-200 characters
- `description`: Optional, max 2000 characters
- `tags`: Max 10 tags, each max 50 characters

---

#### `updateCourse(id: UUID!, input: UpdateCourseInput!): Course!`

Update a course. Only the creator or ORG_ADMIN can update.

**Authentication**: Required
**Authorization**: `course:write` scope + ownership check
**RLS**: Can only update courses within the same tenant

**Input Type:**
```graphql
input UpdateCourseInput {
  title: String
  description: String
  thumbnailUrl: URL
  tags: [String!]
}
```

**Example:**
```graphql
mutation UpdateCourse($id: UUID!, $input: UpdateCourseInput!) {
  updateCourse(id: $id, input: $input) {
    id
    title
    description
    thumbnailUrl
    tags
    updatedAt
  }
}
```

---

#### `deleteCourse(id: UUID!): Boolean!`

Soft-delete a course. Only the creator or ORG_ADMIN can delete.

**Authentication**: Required
**Authorization**: `course:write` scope + ownership check
**RLS**: Can only delete courses within the same tenant

**Example:**
```graphql
mutation DeleteCourse($id: UUID!) {
  deleteCourse(id: $id)
}
```

**Returns:**
```json
{
  "data": {
    "deleteCourse": true
  }
}
```

---

#### `toggleCoursePublished(id: UUID!, isPublished: Boolean!): Course!`

Publish or unpublish a course.

**Authentication**: Required
**Authorization**: `course:write` scope + ownership check

**Example:**
```graphql
mutation PublishCourse($id: UUID!, $published: Boolean!) {
  toggleCoursePublished(id: $id, isPublished: $published) {
    id
    title
    isPublished
    updatedAt
  }
}
```

---

#### `forkCourse(courseId: UUID!): Course!`

Fork a course (creates a copy linked to the original).

**Authentication**: Required
**Authorization**: `course:write` scope

**Example:**
```graphql
mutation ForkCourse($courseId: UUID!) {
  forkCourse(courseId: $courseId) {
    id
    title
    forkedFrom {
      id
      title
      creator {
        displayName
      }
    }
    creator {
      id
      displayName
    }
    createdAt
  }
}
```

---

#### `createModule(input: CreateModuleInput!): Module!`

Add a module to a course.

**Authentication**: Required
**Authorization**: `course:write` scope

**Input Type:**
```graphql
input CreateModuleInput {
  courseId: UUID!
  title: String!
  description: String
  orderIndex: NonNegativeInt!
}
```

**Example:**
```graphql
mutation CreateModule($input: CreateModuleInput!) {
  createModule(input: $input) {
    id
    title
    description
    orderIndex
    course {
      id
      title
    }
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "courseId": "course-uuid",
    "title": "Week 1: Introduction",
    "description": "Overview of key concepts",
    "orderIndex": 0
  }
}
```

---

#### `updateModule(id: UUID!, input: UpdateModuleInput!): Module!`

Update a module.

**Authentication**: Required
**Authorization**: `course:write` scope

**Input Type:**
```graphql
input UpdateModuleInput {
  title: String
  description: String
  orderIndex: NonNegativeInt
}
```

**Example:**
```graphql
mutation UpdateModule($id: UUID!, $input: UpdateModuleInput!) {
  updateModule(id: $id, input: $input) {
    id
    title
    description
    orderIndex
    updatedAt
  }
}
```

---

#### `deleteModule(id: UUID!): Boolean!`

Delete a module (cascades to media assets).

**Authentication**: Required
**Authorization**: `course:write` scope

**Example:**
```graphql
mutation DeleteModule($id: UUID!) {
  deleteModule(id: $id)
}
```

---

#### `reorderModules(courseId: UUID!, moduleOrder: [UUID!]!): [Module!]!`

Reorder modules within a course.

**Authentication**: Required
**Authorization**: `course:write` scope

**Example:**
```graphql
mutation ReorderModules($courseId: UUID!, $order: [UUID!]!) {
  reorderModules(courseId: $courseId, moduleOrder: $order) {
    id
    title
    orderIndex
  }
}
```

**Variables:**
```json
{
  "courseId": "course-uuid",
  "order": ["module-uuid-3", "module-uuid-1", "module-uuid-2"]
}
```

---

#### `initiateMediaUpload(input: InitiateUploadInput!): UploadTicket!`

Initiate a media upload. Returns a presigned S3 upload URL.

**Authentication**: Required
**Authorization**: `media:upload` scope
**Rate Limit**: 20 uploads per hour per user

**Input Type:**
```graphql
input InitiateUploadInput {
  moduleId: UUID!
  filename: String!
  mediaType: MediaType!
  contentType: String!
  sizeBytes: PositiveInt!
}
```

**Response Type:**
```graphql
type UploadTicket {
  uploadId: UUID!
  presignedUrl: URL!
  expiresAt: DateTime!
  maxSizeBytes: PositiveInt!
}
```

**Example:**
```graphql
mutation InitiateUpload($input: InitiateUploadInput!) {
  initiateMediaUpload(input: $input) {
    uploadId
    presignedUrl
    expiresAt
    maxSizeBytes
  }
}
```

**Variables:**
```json
{
  "input": {
    "moduleId": "module-uuid",
    "filename": "lecture-01.mp4",
    "mediaType": "VIDEO",
    "contentType": "video/mp4",
    "sizeBytes": 524288000
  }
}
```

**Validation:**
- `sizeBytes` must be within tenant plan limits
- `contentType` must match `mediaType`

---

#### `completeMediaUpload(uploadId: UUID!, title: String!): MediaAsset!`

Complete a media upload after the client uploads directly to S3.

**Authentication**: Required
**Authorization**: `media:upload` scope

**Example:**
```graphql
mutation CompleteUpload($uploadId: UUID!, $title: String!) {
  completeMediaUpload(uploadId: $uploadId, title: $title) {
    id
    title
    type
    storageKey
    transcriptionStatus
    createdAt
  }
}
```

**Variables:**
```json
{
  "uploadId": "upload-uuid",
  "title": "Lecture 1: Introduction"
}
```

---

#### `updateMediaAsset(id: UUID!, input: UpdateMediaAssetInput!): MediaAsset!`

Update media asset metadata.

**Authentication**: Required
**Authorization**: `course:write` scope

**Input Type:**
```graphql
input UpdateMediaAssetInput {
  title: String
  description: String
  thumbnailUrl: URL
}
```

**Example:**
```graphql
mutation UpdateAsset($id: UUID!, $input: UpdateMediaAssetInput!) {
  updateMediaAsset(id: $id, input: $input) {
    id
    title
    description
    thumbnailUrl
    updatedAt
  }
}
```

---

#### `deleteMediaAsset(id: UUID!): Boolean!`

Delete a media asset (cascades to transcript and segments).

**Authentication**: Required
**Authorization**: `course:write` scope

**Example:**
```graphql
mutation DeleteAsset($id: UUID!) {
  deleteMediaAsset(id: $id)
}
```

---

#### `retriggerTranscription(assetId: UUID!): MediaAsset!`

Retrigger transcription for a media asset (if it failed).

**Authentication**: Required
**Authorization**: `course:write` scope

**Example:**
```graphql
mutation RetryTranscription($assetId: UUID!) {
  retriggerTranscription(assetId: $assetId) {
    id
    transcriptionStatus
    updatedAt
  }
}
```

---

### 4.3 Annotation Subgraph (6 Mutations)

#### `createAnnotation(input: CreateAnnotationInput!): Annotation!`

Create a new annotation on a media asset.

**Authentication**: Required
**RLS**: Creates annotation within the authenticated user's tenant

**Input Type:**
```graphql
input CreateAnnotationInput {
  assetId: UUID!
  type: AnnotationType!
  layer: AnnotationLayer = PERSONAL
  content: String
  sketchData: JSON
  timestampStart: Float
  timestampEnd: Float
  spatialX: Float
  spatialY: Float
  pageNumber: NonNegativeInt
  textRangeStart: NonNegativeInt
  textRangeEnd: NonNegativeInt
  parentId: UUID  # For replies
}
```

**Example:**
```graphql
mutation CreateAnnotation($input: CreateAnnotationInput!) {
  createAnnotation(input: $input) {
    id
    type
    layer
    content
    timestampStart
    timestampEnd
    author {
      id
      displayName
    }
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "assetId": "asset-uuid",
    "type": "TEXT",
    "layer": "PERSONAL",
    "content": "This is a great explanation!",
    "timestampStart": 120.5,
    "timestampEnd": 135.0
  }
}
```

**Validation:**
- `content`: Required for TEXT type, max 10000 characters
- `sketchData`: Required for SKETCH type
- `timestampStart`/`timestampEnd`: Required for time-based annotations
- `spatialX`/`spatialY`: Required for SPATIAL_COMMENT type

---

#### `updateAnnotation(id: UUID!, input: UpdateAnnotationInput!): Annotation!`

Update an annotation. Users can only update their own annotations.

**Authentication**: Required
**Authorization**: Owner only (or instructor for SHARED layer)

**Input Type:**
```graphql
input UpdateAnnotationInput {
  content: String
  sketchData: JSON
  layer: AnnotationLayer
}
```

**Example:**
```graphql
mutation UpdateAnnotation($id: UUID!, $input: UpdateAnnotationInput!) {
  updateAnnotation(id: $id, input: $input) {
    id
    content
    layer
    updatedAt
  }
}
```

---

#### `deleteAnnotation(id: UUID!): Boolean!`

Delete an annotation and all its replies (cascade).

**Authentication**: Required
**Authorization**: Owner only (or instructor for SHARED layer)

**Example:**
```graphql
mutation DeleteAnnotation($id: UUID!) {
  deleteAnnotation(id: $id)
}
```

---

#### `toggleAnnotationPin(id: UUID!, pinned: Boolean!): Annotation!`

Pin or unpin an annotation (instructors/admins only).

**Authentication**: Required
**Authorization**: `annotation:write` scope

**Example:**
```graphql
mutation PinAnnotation($id: UUID!, $pinned: Boolean!) {
  toggleAnnotationPin(id: $id, pinned: $pinned) {
    id
    isPinned
    updatedAt
  }
}
```

---

#### `resolveAnnotation(id: UUID!): Annotation!`

Mark an annotation as resolved.

**Authentication**: Required
**Authorization**: Owner or instructor

**Example:**
```graphql
mutation ResolveAnnotation($id: UUID!) {
  resolveAnnotation(id: $id) {
    id
    isResolved
    updatedAt
  }
}
```

---

#### `moveAnnotationsToLayer(annotationIds: [UUID!]!, targetLayer: AnnotationLayer!): [Annotation!]!`

Batch-move annotations between layers (instructor/admin only).

**Authentication**: Required
**Authorization**: `annotation:write` scope

**Example:**
```graphql
mutation MoveToShared($ids: [UUID!]!, $layer: AnnotationLayer!) {
  moveAnnotationsToLayer(annotationIds: $ids, targetLayer: $layer) {
    id
    layer
    updatedAt
  }
}
```

**Variables:**
```json
{
  "ids": ["ann-uuid-1", "ann-uuid-2"],
  "layer": "SHARED"
}
```

---

### 4.4 Collaboration Subgraph (2 Mutations)

#### `createCollabDocument(input: CreateCollabDocumentInput!): CollabDocument!`

Create a new collaborative document.

**Authentication**: Required
**RLS**: Creates document within the authenticated user's tenant

**Input Type:**
```graphql
input CreateCollabDocumentInput {
  documentName: String!
  title: String
  entityType: String
  entityId: UUID
}
```

**Example:**
```graphql
mutation CreateDoc($input: CreateCollabDocumentInput!) {
  createCollabDocument(input: $input) {
    id
    documentName
    title
    entityType
    entityId
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "documentName": "course-12345-notes",
    "title": "Course Notes",
    "entityType": "Course",
    "entityId": "course-uuid"
  }
}
```

---

#### `compactCollabDocument(documentId: UUID!): CollabDocument!`

Force-compact CRDT updates into a snapshot (admin only).

**Authentication**: Required
**Authorization**: `org:manage` scope

**Example:**
```graphql
mutation CompactDoc($docId: UUID!) {
  compactCollabDocument(documentId: $docId) {
    id
    documentName
    yDocSnapshot
    updatedAt
  }
}
```

---

### 4.5 Agent Subgraph (5 Mutations)

#### `createAgentDefinition(input: CreateAgentDefinitionInput!): AgentDefinition!`

Create a new agent definition.

**Authentication**: Required
**Authorization**: `agent:write` scope

**Input Type:**
```graphql
input CreateAgentDefinitionInput {
  name: String!
  description: String
  templateType: AgentTemplate!
  isPublic: Boolean = false
  config: AgentConfigInput!
}

input AgentConfigInput {
  dataScope: AgentDataScope!
  customQuery: String
  triggerType: AgentTrigger!
  outputFormat: AgentOutputFormat!
  personality: String
  customPrompt: String
  maxTokens: PositiveInt = 2048
}

input AgentDataScope {
  includeTranscripts: Boolean = true
  includeConcepts: Boolean = true
  courseIds: [UUID!]
  assetIds: [UUID!]
}
```

**Example:**
```graphql
mutation CreateAgent($input: CreateAgentDefinitionInput!) {
  createAgentDefinition(input: $input) {
    id
    name
    description
    templateType
    isPublic
    config {
      dataScope {
        includeTranscripts
        includeConcepts
      }
      triggerType
      outputFormat
    }
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "My Chavruta Partner",
    "description": "Custom Socratic dialogue agent",
    "templateType": "CHAVRUTA",
    "isPublic": false,
    "config": {
      "dataScope": {
        "includeTranscripts": true,
        "includeConcepts": true,
        "courseIds": ["course-uuid"]
      },
      "triggerType": "MANUAL",
      "outputFormat": "CHAT",
      "personality": "Curious and challenging",
      "maxTokens": 2048
    }
  }
}
```

---

#### `updateAgentDefinition(id: UUID!, input: UpdateAgentDefinitionInput!): AgentDefinition!`

Update an agent definition (creator only).

**Authentication**: Required
**Authorization**: `agent:write` scope + ownership check

**Input Type:**
```graphql
input UpdateAgentDefinitionInput {
  name: String
  description: String
  isPublic: Boolean
  config: AgentConfigInput
}
```

**Example:**
```graphql
mutation UpdateAgent($id: UUID!, $input: UpdateAgentDefinitionInput!) {
  updateAgentDefinition(id: $id, input: $input) {
    id
    name
    description
    isPublic
    updatedAt
  }
}
```

---

#### `deleteAgentDefinition(id: UUID!): Boolean!`

Delete an agent definition (creator only, cascades executions).

**Authentication**: Required
**Authorization**: `agent:write` scope + ownership check

**Example:**
```graphql
mutation DeleteAgent($id: UUID!) {
  deleteAgentDefinition(id: $id)
}
```

---

#### `executeAgent(input: ExecuteAgentInput!): AgentExecution!`

Execute an agent. Returns immediately with QUEUED status.

**Authentication**: Required
**Authorization**: `agent:execute` scope
**Rate Limit**: 30 executions per hour per user

**Input Type:**
```graphql
input ExecuteAgentInput {
  agentId: UUID!
  input: JSON!
  contextAssetId: UUID
}
```

**Example:**
```graphql
mutation RunAgent($input: ExecuteAgentInput!) {
  executeAgent(input: $input) {
    id
    status
    agentDefinition {
      id
      name
    }
    startedAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "agentId": "agent-uuid",
    "input": {
      "annotationId": "ann-uuid",
      "mode": "debate"
    },
    "contextAssetId": "asset-uuid"
  }
}
```

**Note:** Use the `agentExecutionUpdated` subscription to track progress.

---

#### `cancelAgentExecution(executionId: UUID!): AgentExecution!`

Cancel a running agent execution.

**Authentication**: Required
**Authorization**: Owner only

**Example:**
```graphql
mutation CancelAgent($execId: UUID!) {
  cancelAgentExecution(executionId: $execId) {
    id
    status
    cancelledAt
  }
}
```

---

### 4.6 Knowledge Subgraph (17 Mutations)

#### `createConcept(input: CreateConceptInput!): Concept!`

Manually create a concept in the knowledge graph.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Input Type:**
```graphql
input CreateConceptInput {
  label: String!
  description: String
  aliases: [String!]
  domain: String
}
```

**Example:**
```graphql
mutation CreateConcept($input: CreateConceptInput!) {
  createConcept(input: $input) {
    id
    label
    description
    aliases
    domain
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "label": "Machine Learning",
    "description": "A subset of AI focused on learning from data",
    "aliases": ["ML", "Statistical Learning"],
    "domain": "Computer Science"
  }
}
```

---

#### `updateConcept(id: UUID!, input: UpdateConceptInput!): Concept!`

Update a concept's label, description, aliases, or domain.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Input Type:**
```graphql
input UpdateConceptInput {
  label: String
  description: String
  aliases: [String!]
  domain: String
}
```

**Example:**
```graphql
mutation UpdateConcept($id: UUID!, $input: UpdateConceptInput!) {
  updateConcept(id: $id, input: $input) {
    id
    label
    description
    aliases
    domain
    updatedAt
  }
}
```

---

#### `deleteConcept(id: UUID!): Boolean!`

Delete a concept and all its edges from the knowledge graph.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation DeleteConcept($id: UUID!) {
  deleteConcept(id: $id)
}
```

---

#### `createRelation(input: CreateRelationInput!): Boolean!`

Create a relationship between two concepts.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Input Type:**
```graphql
input CreateRelationInput {
  fromConceptId: UUID!
  toConceptId: UUID!
  relationType: String!
  strength: UnitFloat = 1.0
}
```

**Example:**
```graphql
mutation CreateRelation($input: CreateRelationInput!) {
  createRelation(input: $input)
}
```

**Variables:**
```json
{
  "input": {
    "fromConceptId": "ml-uuid",
    "toConceptId": "ai-uuid",
    "relationType": "IS_A",
    "strength": 0.95
  }
}
```

**Common Relation Types:**
- `IS_A` - Subclass relationship
- `PART_OF` - Compositional relationship
- `PREREQUISITE` - Learning dependency
- `CONTRADICTS` - Conflicting information
- `RELATED_TO` - Generic relationship

---

#### `deleteRelation(...): Boolean!`

Remove a relationship between two concepts.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation DeleteRelation(
  $from: UUID!
  $to: UUID!
  $type: String!
) {
  deleteRelation(
    fromConceptId: $from
    toConceptId: $to
    relationType: $type
  )
}
```

---

#### `createContradiction(input: CreateContradictionInput!): Contradiction!`

Mark a contradiction between two concepts.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Input Type:**
```graphql
input CreateContradictionInput {
  concept1Id: UUID!
  concept2Id: UUID!
  evidence: String!
  severity: ContradictionSeverity!
  sourceIds: [UUID!]
}

enum ContradictionSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}
```

**Example:**
```graphql
mutation MarkContradiction($input: CreateContradictionInput!) {
  createContradiction(input: $input) {
    id
    concept1 {
      id
      label
    }
    concept2 {
      id
      label
    }
    evidence
    severity
    createdAt
  }
}
```

---

#### `reindexAssetEmbeddings(assetId: UUID!): Boolean!`

Trigger re-indexing of embeddings for a media asset.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation ReindexEmbeddings($assetId: UUID!) {
  reindexAssetEmbeddings(assetId: $assetId)
}
```

---

#### `reviewInferredRelation(...): Boolean!`

Review and approve/reject an AI-inferred relationship.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation ReviewRelation(
  $from: UUID!
  $to: UUID!
  $approved: Boolean!
) {
  reviewInferredRelation(
    fromConceptId: $from
    toConceptId: $to
    approved: $approved
  )
}
```

---

#### `createPerson(input: CreatePersonInput!): Person!`

Create a person reference in the knowledge graph.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Input Type:**
```graphql
input CreatePersonInput {
  fullName: String!
  aliases: [String!]
  bio: String
  birthDate: String
  deathDate: String
}
```

**Example:**
```graphql
mutation CreatePerson($input: CreatePersonInput!) {
  createPerson(input: $input) {
    id
    fullName
    bio
    birthDate
    createdAt
  }
}
```

---

#### `updatePerson(id: UUID!, input: UpdatePersonInput!): Person!`

Update a person's details.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation UpdatePerson($id: UUID!, $input: UpdatePersonInput!) {
  updatePerson(id: $id, input: $input) {
    id
    fullName
    bio
    updatedAt
  }
}
```

---

#### `deletePerson(id: UUID!): Boolean!`

Delete a person from the knowledge graph.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation DeletePerson($id: UUID!) {
  deletePerson(id: $id)
}
```

---

#### `createTerm(input: CreateTermInput!): Term!`

Create a term (technical vocabulary).

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Input Type:**
```graphql
input CreateTermInput {
  label: String!
  definition: String!
  domain: String
  etymology: String
}
```

**Example:**
```graphql
mutation CreateTerm($input: CreateTermInput!) {
  createTerm(input: $input) {
    id
    label
    definition
    domain
    createdAt
  }
}
```

---

#### `updateTerm(id: UUID!, input: UpdateTermInput!): Term!`

Update a term.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation UpdateTerm($id: UUID!, $input: UpdateTermInput!) {
  updateTerm(id: $id, input: $input) {
    id
    label
    definition
    updatedAt
  }
}
```

---

#### `deleteTerm(id: UUID!): Boolean!`

Delete a term.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation DeleteTerm($id: UUID!) {
  deleteTerm(id: $id)
}
```

---

#### `createSource(input: CreateSourceInput!): Source!`

Create a source (citation, reference).

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Input Type:**
```graphql
input CreateSourceInput {
  title: String!
  type: String!
  url: URL
  publishedDate: String
}
```

**Example:**
```graphql
mutation CreateSource($input: CreateSourceInput!) {
  createSource(input: $input) {
    id
    title
    type
    url
    publishedDate
    createdAt
  }
}
```

---

#### `updateSource(id: UUID!, input: UpdateSourceInput!): Source!`

Update a source.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation UpdateSource($id: UUID!, $input: UpdateSourceInput!) {
  updateSource(id: $id, input: $input) {
    id
    title
    url
    updatedAt
  }
}
```

---

#### `deleteSource(id: UUID!): Boolean!`

Delete a source.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation DeleteSource($id: UUID!) {
  deleteSource(id: $id)
}
```

---

#### `linkAuthorToSource(personId: UUID!, sourceId: UUID!): Boolean!`

Link a person as an author to a source.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation LinkAuthor($personId: UUID!, $sourceId: UUID!) {
  linkAuthorToSource(personId: $personId, sourceId: $sourceId)
}
```

---

#### `linkSourceToConcept(sourceId: UUID!, conceptId: UUID!): Boolean!`

Link a source to a concept.

**Authentication**: Required
**Authorization**: `knowledge:write` scope

**Example:**
```graphql
mutation LinkSource($sourceId: UUID!, $conceptId: UUID!) {
  linkSourceToConcept(sourceId: $sourceId, conceptId: $conceptId)
}
```

---

## 5. Subscriptions (7 Total)

All subscriptions require authentication and use WebSocket transport. The gateway supports both WebSocket (`graphql-ws` protocol) and SSE (Server-Sent Events) for subscriptions.

### 5.1 WebSocket Setup

**Connection URL:**
```
wss://gateway.edusphere.com/graphql
```

**Protocol:** `graphql-ws` (not the legacy `subscriptions-transport-ws`)

**Authentication:** Send JWT in the `connectionParams` during connection initialization.

**Example Connection (graphql-ws):**
```typescript
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'wss://gateway.edusphere.com/graphql',
  connectionParams: {
    authorization: `Bearer ${jwtToken}`,
  },
});
```

---

### 5.2 Content Subscriptions

#### `transcriptionStatusChanged(assetId: UUID!): MediaAsset!`

Fired when the transcription status of a media asset changes.

**Use Case:** Show progress in the upload flow
**NATS Subject:** `edusphere.{tenant_id}.media.{asset_id}.transcription.status`

**Example:**
```graphql
subscription OnTranscriptionStatus($assetId: UUID!) {
  transcriptionStatusChanged(assetId: $assetId) {
    id
    title
    transcriptionStatus
    transcript {
      id
      confidence
      language
    }
  }
}
```

**Emitted Events:**
- Status changes: `PENDING` → `PROCESSING` → `COMPLETED` or `FAILED`

---

#### `transcriptSegmentAdded(assetId: UUID!): TranscriptSegment!`

Fired when a new transcript segment is available during live transcription.

**Use Case:** Stream transcript segments as they're generated
**NATS Subject:** `edusphere.{tenant_id}.media.{asset_id}.segment.added`

**Example:**
```graphql
subscription OnSegmentAdded($assetId: UUID!) {
  transcriptSegmentAdded(assetId: $assetId) {
    id
    startTime
    endTime
    text
    speaker
    confidence
  }
}
```

---

### 5.3 Annotation Subscriptions

#### `annotationChanged(assetId: UUID!, layers: [AnnotationLayer!]): AnnotationChangeEvent!`

Fired when an annotation is created, updated, or deleted on an asset.

**Use Case:** Real-time annotation collaboration
**NATS Subject:** `edusphere.{tenant_id}.annotation.{asset_id}.changed`

**Event Type:**
```graphql
type AnnotationChangeEvent {
  changeType: ChangeType!
  annotation: Annotation
  deletedAnnotationId: UUID
}

enum ChangeType {
  CREATED
  UPDATED
  DELETED
}
```

**Example:**
```graphql
subscription OnAnnotationChange(
  $assetId: UUID!
  $layers: [AnnotationLayer!]
) {
  annotationChanged(assetId: $assetId, layers: $layers) {
    changeType
    annotation {
      id
      type
      layer
      content
      timestampStart
      author {
        id
        displayName
        avatarUrl
      }
    }
    deletedAnnotationId
  }
}
```

**Variables:**
```json
{
  "assetId": "asset-uuid",
  "layers": ["PERSONAL", "SHARED", "INSTRUCTOR"]
}
```

---

### 5.4 Collaboration Subscriptions

#### `collaboratorPresenceChanged(documentId: UUID!): PresenceEvent!`

Fired when collaborators join/leave or update cursor position.

**Use Case:** Show live presence indicators
**NATS Subject:** `edusphere.{tenant_id}.collab.{document_id}.presence`

**Event Type:**
```graphql
type PresenceEvent {
  eventType: PresenceEventType!
  session: CollabSession
  disconnectedUserId: UUID
}

enum PresenceEventType {
  JOINED
  LEFT
  CURSOR_MOVED
}
```

**Example:**
```graphql
subscription OnPresenceChange($documentId: UUID!) {
  collaboratorPresenceChanged(documentId: $documentId) {
    eventType
    session {
      id
      user {
        id
        displayName
        avatarUrl
      }
      cursorPosition
      connectedAt
    }
    disconnectedUserId
  }
}
```

---

### 5.5 Agent Subscriptions

#### `agentExecutionUpdated(executionId: UUID!): AgentExecution!`

Fired when an agent execution's status changes.

**Use Case:** Track agent execution progress
**NATS Subject:** `edusphere.{tenant_id}.agent.execution.{execution_id}.updated`

**Example:**
```graphql
subscription OnAgentProgress($executionId: UUID!) {
  agentExecutionUpdated(executionId: $executionId) {
    id
    status
    output
    error
    startedAt
    completedAt
    tokensUsed
  }
}
```

**Emitted Events:**
- Status changes: `QUEUED` → `RUNNING` → `COMPLETED` or `FAILED`
- Partial output updates during `RUNNING` state

---

#### `agentResponseStream(executionId: UUID!): AgentStreamChunk!`

Stream the agent's response tokens as they're generated.

**Use Case:** Show the agent's response character by character (like ChatGPT)
**NATS Subject:** `edusphere.{tenant_id}.agent.execution.{execution_id}.stream`

**Chunk Type:**
```graphql
type AgentStreamChunk {
  text: String!
  done: Boolean!
  tokensSoFar: NonNegativeInt!
}
```

**Example:**
```graphql
subscription StreamResponse($executionId: UUID!) {
  agentResponseStream(executionId: $executionId) {
    text
    done
    tokensSoFar
  }
}
```

**Client Handling:**
```typescript
const subscription = client.subscribe({
  query: StreamResponseDocument,
  variables: { executionId },
});

let fullText = '';

for await (const result of subscription) {
  const chunk = result.data?.agentResponseStream;
  if (chunk) {
    fullText += chunk.text;
    setDisplayText(fullText);

    if (chunk.done) {
      console.log('Stream complete. Total tokens:', chunk.tokensSoFar);
      break;
    }
  }
}
```

---

### 5.6 Knowledge Subscriptions

#### `conceptsExtracted(assetId: UUID!): [Concept!]!`

Fired when new concepts are extracted from content.

**Use Case:** Notify when NLP pipeline completes
**NATS Subject:** `edusphere.{tenant_id}.knowledge.{asset_id}.concepts.extracted`

**Example:**
```graphql
subscription OnConceptsExtracted($assetId: UUID!) {
  conceptsExtracted(assetId: $assetId) {
    id
    label
    description
    domain
    confidence
  }
}
```

---

## 6. Authentication

All GraphQL requests (except `tenantBySlug`) require a valid JWT (JSON Web Token) in the `Authorization` header.

### JWT Structure

EduSphere uses **Keycloak** for identity management. JWTs are issued by Keycloak and validated by the Hive Gateway.

**JWT Claims:**
```typescript
interface JWTClaims {
  sub: string;          // Keycloak user ID
  tenant_id: string;    // UUID of the tenant
  user_id: string;      // EduSphere internal user UUID
  email: string;
  roles: UserRole[];    // ["INSTRUCTOR", "STUDENT", etc.]
  scopes: string[];     // ["course:write", "agent:execute", etc.]
  iat: number;          // Issued at (Unix timestamp)
  exp: number;          // Expires at (Unix timestamp)
}
```

### Sending Requests

**HTTP Header:**
```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example (fetch):**
```typescript
const response = await fetch('https://gateway.edusphere.com/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`,
  },
  body: JSON.stringify({
    query: `
      query {
        me {
          id
          email
          displayName
        }
      }
    `,
  }),
});
```

**Example (graphql-request):**
```typescript
import { GraphQLClient } from 'graphql-request';

const client = new GraphQLClient('https://gateway.edusphere.com/graphql', {
  headers: {
    authorization: `Bearer ${jwtToken}`,
  },
});

const data = await client.request(query, variables);
```

### WebSocket Authentication

For subscriptions, send the JWT in the `connectionParams`:

```typescript
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'wss://gateway.edusphere.com/graphql',
  connectionParams: {
    authorization: `Bearer ${jwtToken}`,
  },
});
```

### Token Refresh

JWTs expire after **1 hour**. Clients should refresh tokens before expiration:

```typescript
// Check if token is about to expire (within 5 minutes)
function isTokenExpiringSoon(token: string): boolean {
  const decoded = JSON.parse(atob(token.split('.')[1]));
  const expiresAt = decoded.exp * 1000; // Convert to milliseconds
  const now = Date.now();
  return expiresAt - now < 5 * 60 * 1000; // 5 minutes
}

// Refresh token via Keycloak
async function refreshToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://keycloak.edusphere.com/realms/{tenant}/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: 'edusphere-web',
    }),
  });
  const data = await response.json();
  return data.access_token;
}
```

### Authorization Levels

| Directive | Enforcement | Example |
|-----------|-------------|---------|
| `@authenticated` | Gateway validates JWT | All queries/mutations except `tenantBySlug` |
| `@requiresScopes(scopes: [["course:write"]])` | Gateway checks JWT scopes | `createCourse`, `updateCourse` |
| `@ownerOnly` | Subgraph resolver checks ownership | `updateAnnotation` (user can only update their own) |
| `@requiresRole(roles: [INSTRUCTOR])` | Subgraph resolver checks role | `toggleCoursePublished` |

---

## 7. Error Handling

All errors follow the standard GraphQL error format with additional `extensions` for machine-readable metadata.

### Error Response Structure

```json
{
  "data": null,
  "errors": [
    {
      "message": "Course not found",
      "locations": [{ "line": 2, "column": 3 }],
      "path": ["course"],
      "extensions": {
        "code": "NOT_FOUND",
        "status": 404,
        "timestamp": "2025-01-15T10:30:00Z",
        "requestId": "req-123456",
        "field": "id",
        "debug": {
          "courseId": "invalid-uuid"
        }
      }
    }
  ]
}
```

### Error Codes Catalog

| Code | HTTP Status | Description | Retryable |
|------|------------|-------------|-----------|
| `UNAUTHENTICATED` | 401 | Missing or invalid JWT | No |
| `FORBIDDEN` | 403 | Valid JWT but insufficient permissions | No |
| `NOT_FOUND` | 404 | Requested resource does not exist | No |
| `CONFLICT` | 409 | Resource version conflict (optimistic locking) | Yes |
| `VALIDATION_ERROR` | 400 | Input validation failure | No |
| `RATE_LIMITED` | 429 | Too many requests | Yes (after `retryAfter`) |
| `TENANT_QUOTA_EXCEEDED` | 403 | Tenant has exceeded plan limits | No |
| `MEDIA_PROCESSING_ERROR` | 500 | Media transcoding/transcription failure | Yes |
| `AGENT_EXECUTION_ERROR` | 500 | Agent runtime failure | Yes |
| `GRAPH_QUERY_ERROR` | 500 | Apache AGE query failure | Yes |
| `EMBEDDING_ERROR` | 500 | Vector embedding generation failure | Yes |
| `INTERNAL_ERROR` | 500 | Unhandled server error | Yes |
| `PAGINATION_CLAMPED` | 200 | Requested page size was clamped (warning) | N/A |
| `OPTIMISTIC_LOCK_FAILED` | 409 | Version mismatch on update | Yes |

### Handling Errors in Clients

**TypeScript Example:**
```typescript
import { GraphQLClient, ClientError } from 'graphql-request';

const client = new GraphQLClient('https://gateway.edusphere.com/graphql', {
  headers: { authorization: `Bearer ${jwtToken}` },
});

try {
  const data = await client.request(query, variables);
  console.log(data);
} catch (error) {
  if (error instanceof ClientError) {
    const gqlError = error.response.errors?.[0];
    const code = gqlError?.extensions?.code;
    const status = gqlError?.extensions?.status;

    switch (code) {
      case 'UNAUTHENTICATED':
        // Redirect to login
        window.location.href = '/login';
        break;
      case 'FORBIDDEN':
        // Show permission denied message
        alert('You do not have permission to perform this action');
        break;
      case 'VALIDATION_ERROR':
        // Show validation errors in form
        const field = gqlError?.extensions?.field;
        showFieldError(field, gqlError?.message);
        break;
      case 'RATE_LIMITED':
        // Retry after delay
        const retryAfter = gqlError?.extensions?.retryAfter || 60;
        setTimeout(() => retry(), retryAfter * 1000);
        break;
      case 'NOT_FOUND':
        // Show 404 page
        navigate('/404');
        break;
      default:
        // Show generic error message
        showErrorToast(gqlError?.message);
    }
  }
}
```

### Validation Errors

Input validation errors include detailed field information:

```json
{
  "errors": [
    {
      "message": "Validation failed",
      "extensions": {
        "code": "VALIDATION_ERROR",
        "status": 400,
        "validationErrors": [
          {
            "field": "input.title",
            "message": "Title must be between 1 and 200 characters",
            "constraint": "length"
          },
          {
            "field": "input.sizeBytes",
            "message": "File size exceeds tenant quota",
            "constraint": "max",
            "max": 524288000
          }
        ]
      }
    }
  ]
}
```

---

## 8. Pagination

All list fields use the **Relay Cursor Connections Specification** for consistent, cursor-based pagination.

### Connection Pattern

Every paginated list returns a `Connection` type with `edges` and `pageInfo`:

```graphql
type CourseConnection {
  edges: [CourseEdge!]!
  pageInfo: PageInfo!
  totalCount: NonNegativeInt
}

type CourseEdge {
  node: Course!
  cursor: Cursor!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: Cursor
  endCursor: Cursor
}
```

### Pagination Arguments

All connection fields accept these arguments:

```graphql
input ConnectionArgs {
  first: PositiveInt        # Forward pagination: get first N items
  after: Cursor             # Forward pagination: after this cursor
  last: PositiveInt         # Backward pagination: get last N items
  before: Cursor            # Backward pagination: before this cursor
}
```

### Forward Pagination

Fetch the first page:

```graphql
query FirstPage {
  courses(first: 20) {
    edges {
      node {
        id
        title
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

Fetch the next page using `endCursor`:

```graphql
query NextPage($cursor: Cursor!) {
  courses(first: 20, after: $cursor) {
    edges {
      node {
        id
        title
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### Backward Pagination

Fetch the last page:

```graphql
query LastPage {
  courses(last: 20) {
    edges {
      node {
        id
        title
      }
      cursor
    }
    pageInfo {
      hasPreviousPage
      startCursor
    }
  }
}
```

Fetch the previous page using `startCursor`:

```graphql
query PreviousPage($cursor: Cursor!) {
  courses(last: 20, before: $cursor) {
    edges {
      node {
        id
        title
      }
      cursor
    }
    pageInfo {
      hasPreviousPage
      startCursor
    }
  }
}
```

### Pagination Limits

| Context | Default `first` | Max `first`/`last` |
|---------|----------------|-------------------|
| Standard lists | 20 | 100 |
| Transcript segments | 50 | 500 |
| Search results | 10 | 50 |
| Agent executions | 20 | 100 |
| Knowledge graph relations | 20 | 200 |

If `first`/`last` exceeds the maximum, the server clamps to max and returns a `PAGINATION_CLAMPED` warning in `extensions`.

### Total Count

The `totalCount` field is computationally expensive and should only be requested when necessary:

```graphql
query CoursesWithTotal {
  courses(first: 20) {
    edges {
      node {
        id
        title
      }
    }
    pageInfo {
      hasNextPage
    }
    totalCount  # Only request if you need it
  }
}
```

### Cursors Are Opaque

**Important:** Cursors are opaque tokens. Clients MUST NOT parse or construct cursors. Treat them as black boxes.

```typescript
// ✅ Correct
const nextPage = await client.request(query, {
  first: 20,
  after: pageInfo.endCursor,
});

// ❌ Incorrect (DO NOT DO THIS)
const cursor = btoa(JSON.stringify({ offset: 20 }));
```

---

## 9. Rate Limiting

The Hive Gateway enforces per-tenant and per-user rate limits to prevent abuse and ensure fair resource allocation.

### Rate Limit Tiers

| Plan | Queries/min | Mutations/min | Subscriptions (concurrent) | Agent Executions/hour |
|------|------------|---------------|---------------------------|---------------------|
| Free | 60 | 20 | 5 | 10 |
| Starter | 300 | 100 | 20 | 30 |
| Professional | 1000 | 500 | 100 | 100 |
| Enterprise | Unlimited | Unlimited | Unlimited | Unlimited |

### Per-Operation Rate Limits

Some operations have additional rate limits:

| Operation | Rate Limit |
|-----------|-----------|
| `initiateMediaUpload` | 20/hour per user |
| `executeAgent` | 30/hour per user |
| `semanticSearch` | 100/hour per user |
| `hybridSearch` | 50/hour per user |

### Rate Limit Headers

Every response includes rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642248000
```

### Handling Rate Limits

When rate-limited, the server returns a `RATE_LIMITED` error:

```json
{
  "errors": [
    {
      "message": "Rate limit exceeded",
      "extensions": {
        "code": "RATE_LIMITED",
        "status": 429,
        "retryAfter": 60,
        "limit": 60,
        "remaining": 0,
        "reset": 1642248000
      }
    }
  ]
}
```

**Client Retry Logic:**
```typescript
async function requestWithRetry(query, variables, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.request(query, variables);
    } catch (error) {
      if (error.response?.errors?.[0]?.extensions?.code === 'RATE_LIMITED') {
        const retryAfter = error.response.errors[0].extensions.retryAfter || 60;
        console.log(`Rate limited. Retrying after ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## 10. Code Generation

EduSphere uses **GraphQL Code Generator** to generate TypeScript types and client code from the schema.

### Installation

```bash
pnpm add -D @graphql-codegen/cli \
  @graphql-codegen/typescript \
  @graphql-codegen/typescript-operations \
  @graphql-codegen/typescript-react-query \
  @graphql-codegen/introspection
```

### Configuration

**File: `codegen.ts`**
```typescript
import { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'https://gateway.edusphere.com/graphql',
  documents: ['src/**/*.graphql', 'src/**/*.tsx'],
  generates: {
    './src/generated/graphql.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-query',
      ],
      config: {
        scalars: {
          UUID: 'string',
          DateTime: 'string',
          JSON: 'Record<string, unknown>',
          Cursor: 'string',
          URL: 'string',
          EmailAddress: 'string',
          NonNegativeInt: 'number',
          PositiveInt: 'number',
          UnitFloat: 'number',
        },
        fetcher: {
          endpoint: 'https://gateway.edusphere.com/graphql',
          fetchParams: {
            headers: {
              authorization: 'Bearer ${TOKEN}',
            },
          },
        },
        exposeFetcher: true,
        exposeQueryKeys: true,
        addSuspenseQuery: true,
      },
    },
  },
};

export default config;
```

### Running Codegen

```bash
# Generate types
pnpm graphql-codegen

# Watch mode during development
pnpm graphql-codegen --watch
```

### Using Generated Types

**Define Operation:**
```graphql
# src/queries/courses.graphql
query GetCourses($first: PositiveInt!) {
  courses(first: $first) {
    edges {
      node {
        id
        title
        description
        creator {
          displayName
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**Use in React:**
```typescript
import { useGetCoursesQuery } from './generated/graphql';

function CourseList() {
  const { data, loading, error } = useGetCoursesQuery({
    variables: { first: 20 },
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.courses.edges.map(({ node }) => (
        <div key={node.id}>
          <h3>{node.title}</h3>
          <p>{node.description}</p>
          <span>by {node.creator.displayName}</span>
        </div>
      ))}
    </div>
  );
}
```

### Fragment Generation

Define reusable fragments:

```graphql
# src/fragments/user.graphql
fragment UserFields on User {
  id
  email
  displayName
  avatarUrl
  role
}
```

Use in queries:

```graphql
query GetMe {
  me {
    ...UserFields
    tenant {
      id
      name
    }
  }
}
```

---

## 11. Client Examples

### 11.1 urql (Recommended)

**Installation:**
```bash
pnpm add urql graphql
```

**Setup:**
```typescript
import { createClient, cacheExchange, fetchExchange } from 'urql';

const client = createClient({
  url: 'https://gateway.edusphere.com/graphql',
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: () => ({
    headers: {
      authorization: `Bearer ${getToken()}`,
    },
  }),
});
```

**React Integration:**
```typescript
import { Provider, useQuery } from 'urql';

function App() {
  return (
    <Provider value={client}>
      <CourseList />
    </Provider>
  );
}

function CourseList() {
  const [result] = useQuery({
    query: `
      query {
        courses(first: 20) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `,
  });

  if (result.fetching) return <div>Loading...</div>;
  if (result.error) return <div>Error: {result.error.message}</div>;

  return (
    <div>
      {result.data.courses.edges.map(({ node }) => (
        <div key={node.id}>{node.title}</div>
      ))}
    </div>
  );
}
```

**Subscriptions with urql:**
```typescript
import { useSubscription } from 'urql';

function TranscriptionProgress({ assetId }) {
  const [result] = useSubscription({
    query: `
      subscription($assetId: UUID!) {
        transcriptionStatusChanged(assetId: $assetId) {
          id
          transcriptionStatus
        }
      }
    `,
    variables: { assetId },
  });

  return <div>Status: {result.data?.transcriptionStatusChanged.transcriptionStatus}</div>;
}
```

---

### 11.2 Apollo Client

**Installation:**
```bash
pnpm add @apollo/client graphql
```

**Setup:**
```typescript
import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient as createWSClient } from 'graphql-ws';

const httpLink = new HttpLink({
  uri: 'https://gateway.edusphere.com/graphql',
  headers: {
    authorization: `Bearer ${getToken()}`,
  },
});

const wsLink = new GraphQLWsLink(
  createWSClient({
    url: 'wss://gateway.edusphere.com/graphql',
    connectionParams: {
      authorization: `Bearer ${getToken()}`,
    },
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
```

**React Integration:**
```typescript
import { ApolloProvider, useQuery, gql } from '@apollo/client';

const GET_COURSES = gql`
  query GetCourses($first: PositiveInt!) {
    courses(first: $first) {
      edges {
        node {
          id
          title
          description
        }
      }
    }
  }
`;

function App() {
  return (
    <ApolloProvider client={client}>
      <CourseList />
    </ApolloProvider>
  );
}

function CourseList() {
  const { data, loading, error } = useQuery(GET_COURSES, {
    variables: { first: 20 },
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data.courses.edges.map(({ node }) => (
        <div key={node.id}>{node.title}</div>
      ))}
    </div>
  );
}
```

---

### 11.3 graphql-request (Lightweight)

**Installation:**
```bash
pnpm add graphql-request graphql
```

**Basic Usage:**
```typescript
import { GraphQLClient, gql } from 'graphql-request';

const client = new GraphQLClient('https://gateway.edusphere.com/graphql', {
  headers: {
    authorization: `Bearer ${getToken()}`,
  },
});

const query = gql`
  query GetCourses($first: PositiveInt!) {
    courses(first: $first) {
      edges {
        node {
          id
          title
        }
      }
    }
  }
`;

const data = await client.request(query, { first: 20 });
console.log(data.courses.edges);
```

**Mutations:**
```typescript
const mutation = gql`
  mutation CreateCourse($input: CreateCourseInput!) {
    createCourse(input: $input) {
      id
      title
      createdAt
    }
  }
`;

const variables = {
  input: {
    title: 'New Course',
    description: 'Course description',
    isPublished: false,
  },
};

const result = await client.request(mutation, variables);
console.log('Created course:', result.createCourse);
```

---

### 11.4 React Native (urql)

```typescript
import { createClient, Provider, useQuery } from 'urql';

const client = createClient({
  url: 'https://gateway.edusphere.com/graphql',
  fetchOptions: () => ({
    headers: {
      authorization: `Bearer ${getToken()}`,
    },
  }),
});

function App() {
  return (
    <Provider value={client}>
      <CourseList />
    </Provider>
  );
}

function CourseList() {
  const [result] = useQuery({
    query: `
      query {
        courses(first: 20) {
          edges {
            node {
              id
              title
            }
          }
        }
      }
    `,
  });

  if (result.fetching) return <ActivityIndicator />;
  if (result.error) return <Text>Error: {result.error.message}</Text>;

  return (
    <FlatList
      data={result.data.courses.edges}
      keyExtractor={(item) => item.node.id}
      renderItem={({ item }) => <Text>{item.node.title}</Text>}
    />
  );
}
```

---

## 12. Testing GraphQL Operations

### 12.1 Unit Testing Queries

**Jest + MSW (Mock Service Worker):**

```typescript
import { graphql } from 'msw';
import { setupServer } from 'msw/node';
import { render, screen } from '@testing-library/react';
import { Provider } from 'urql';
import { createClient } from 'urql';

const server = setupServer(
  graphql.query('GetCourses', (req, res, ctx) => {
    return res(
      ctx.data({
        courses: {
          edges: [
            {
              node: {
                id: '1',
                title: 'Test Course',
                description: 'Test description',
              },
              cursor: 'cursor-1',
            },
          ],
          pageInfo: {
            hasNextPage: false,
            endCursor: 'cursor-1',
          },
        },
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('renders course list', async () => {
  const client = createClient({ url: 'http://localhost/graphql' });

  render(
    <Provider value={client}>
      <CourseList />
    </Provider>
  );

  expect(await screen.findByText('Test Course')).toBeInTheDocument();
});
```

---

### 12.2 Integration Testing

**Testing Mutations:**

```typescript
import { graphql } from 'msw';

test('creates a course', async () => {
  server.use(
    graphql.mutation('CreateCourse', (req, res, ctx) => {
      const { input } = req.variables;

      return res(
        ctx.data({
          createCourse: {
            id: 'new-course-id',
            title: input.title,
            description: input.description,
            createdAt: new Date().toISOString(),
          },
        })
      );
    })
  );

  // Test your mutation logic
  const result = await createCourse({
    title: 'New Course',
    description: 'Description',
  });

  expect(result.createCourse.title).toBe('New Course');
});
```

---

### 12.3 End-to-End Testing (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('user can create a course', async ({ page }) => {
  // Login
  await page.goto('https://app.edusphere.com/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password');
  await page.click('button[type="submit"]');

  // Navigate to create course
  await page.click('text=Create Course');

  // Fill form
  await page.fill('input[name="title"]', 'E2E Test Course');
  await page.fill('textarea[name="description"]', 'Test description');

  // Submit
  await page.click('button[type="submit"]');

  // Verify course created
  await expect(page.locator('text=E2E Test Course')).toBeVisible();
});
```

---

## 13. Performance Optimization

### 13.1 Persisted Queries

Persisted queries reduce bandwidth by sending a query hash instead of the full query string.

**Setup (Hive Gateway):**

```yaml
# gateway.config.yaml
plugins:
  - name: persisted-queries
    config:
      allowArbitraryQueries: true  # Allow non-persisted in dev
      storage: redis
      redis:
        host: localhost
        port: 6379
```

**Client Usage (urql):**

```typescript
import { createClient, cacheExchange, fetchExchange } from 'urql';
import { persistedExchange } from '@urql/exchange-persisted';

const client = createClient({
  url: 'https://gateway.edusphere.com/graphql',
  exchanges: [
    cacheExchange,
    persistedExchange({
      enforcePersistedQueries: true,
      enableForMutation: false,
    }),
    fetchExchange,
  ],
});
```

**How It Works:**

1. Client generates SHA-256 hash of query
2. Client sends hash instead of full query
3. Gateway looks up query by hash
4. If not found, client sends full query + hash
5. Gateway caches the mapping

**Benefits:**
- Reduced request size (especially for large queries)
- Faster parsing on the server
- Better caching

---

### 13.2 Request Batching

Batch multiple queries into a single HTTP request.

**urql:**

```typescript
import { createClient, cacheExchange, fetchExchange } from 'urql';
import { requestPolicyExchange } from '@urql/exchange-request-policy';

const client = createClient({
  url: 'https://gateway.edusphere.com/graphql',
  exchanges: [
    cacheExchange,
    requestPolicyExchange({
      shouldUpgrade: (operation) => operation.context.requestPolicy !== 'cache-only',
    }),
    fetchExchange,
  ],
  fetchOptions: {
    batch: true,
  },
});
```

**Apollo Client:**

```typescript
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { BatchHttpLink } from '@apollo/client/link/batch-http';

const client = new ApolloClient({
  link: new BatchHttpLink({
    uri: 'https://gateway.edusphere.com/graphql',
    batchMax: 10,
    batchInterval: 20,
  }),
  cache: new InMemoryCache(),
});
```

---

### 13.3 Response Caching

**Client-Side Caching (urql):**

```typescript
import { createClient, cacheExchange, fetchExchange } from 'urql';

const client = createClient({
  url: 'https://gateway.edusphere.com/graphql',
  exchanges: [
    cacheExchange,
    fetchExchange,
  ],
  requestPolicy: 'cache-first', // or 'cache-and-network', 'network-only'
});
```

**Custom Cache TTL:**

```typescript
const [result] = useQuery({
  query: coursesQuery,
  requestPolicy: 'cache-first',
  context: useMemo(
    () => ({
      additionalTypenames: ['Course'],
      requestPolicy: 'cache-first',
    }),
    []
  ),
});
```

**Server-Side Caching (Gateway):**

```yaml
# gateway.config.yaml
plugins:
  - name: response-cache
    config:
      ttl: 300000  # 5 minutes in milliseconds
      ttlPerType:
        Query.courses: 60000    # 1 minute
        Query.me: 0             # No cache
      ttlPerSchemaCoordinate:
        Query.semanticSearch: 300000  # 5 minutes
```

---

### 13.4 Query Optimization Tips

**1. Request Only What You Need:**

```graphql
# ❌ Avoid over-fetching
query GetCourses {
  courses(first: 20) {
    edges {
      node {
        id
        title
        description
        creator {
          id
          email
          displayName
          avatarUrl
          role
          preferences {
            language
            theme
          }
        }
        modules {
          edges {
            node {
              id
              title
              mediaAssets {
                edges {
                  node {
                    id
                    title
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

# ✅ Better: Request only what's displayed
query GetCourses {
  courses(first: 20) {
    edges {
      node {
        id
        title
        creator {
          displayName
        }
      }
    }
  }
}
```

**2. Use Fragments for Reusability:**

```graphql
fragment CourseCard on Course {
  id
  title
  thumbnailUrl
  creator {
    displayName
  }
}

query GetCourses {
  courses(first: 20) {
    edges {
      node {
        ...CourseCard
      }
    }
  }
}
```

**3. Paginate Wisely:**

```graphql
# ✅ Good: Reasonable page size
query GetCourses {
  courses(first: 20) {
    edges {
      node {
        id
        title
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}

# ❌ Avoid: Requesting too many items
query GetAllCourses {
  courses(first: 1000) {
    edges {
      node {
        id
        title
      }
    }
  }
}
```

**4. Avoid N+1 Queries with DataLoader:**

The gateway automatically uses DataLoader for entity resolution, but you can optimize further by batching related queries:

```graphql
# Instead of fetching each module separately, batch them:
query GetCourseWithModules($courseId: UUID!) {
  course(id: $courseId) {
    id
    title
    modules(first: 50) {
      edges {
        node {
          id
          title
          mediaAssets(first: 10) {
            edges {
              node {
                id
                title
              }
            }
          }
        }
      }
    }
  }
}
```

**5. Use `@defer` for Progressive Loading (Experimental):**

```graphql
query GetCourseWithDefer($courseId: UUID!) {
  course(id: $courseId) {
    id
    title
    ... @defer {
      modules(first: 50) {
        edges {
          node {
            id
            title
          }
        }
      }
    }
  }
}
```

---

## Conclusion

This guide covers all GraphQL operations available in the EduSphere platform. For questions or issues:

- **Documentation**: [https://docs.edusphere.com](https://docs.edusphere.com)
- **GraphQL Playground**: [https://gateway.edusphere.com/graphql-playground](https://gateway.edusphere.com/graphql-playground)
- **Schema Registry**: [https://app.graphql-hive.com](https://app.graphql-hive.com)
- **Support**: support@edusphere.com

**Next Steps:**

1. Set up code generation with GraphQL Code Generator
2. Explore the GraphQL Playground to test queries interactively
3. Review the API Contracts document for full schema details
4. Implement error handling and retry logic in your client
5. Set up persisted queries for production deployments
