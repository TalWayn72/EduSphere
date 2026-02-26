# Collaboration Subgraph

GraphQL Federation subgraph for real-time collaboration features including CRDT-based documents, whiteboard sessions, and live editing.

## Overview

- **Port:** 4004
- **Framework:** NestJS + GraphQL Yoga Federation
- **Database:** PostgreSQL with bytea support for CRDT binary data
- **Real-time:** GraphQL subscriptions via PubSub
- **Auth:** JWT validation via Keycloak

## Features

### Collaboration Documents

- CRDT-based collaborative editing using Yjs
- Entity-based documents (annotations, course notes, shared canvas)
- Binary snapshot storage for efficient sync
- Real-time update streaming

### Collaboration Sessions

- Active user tracking per document
- Connection management
- Last-active timestamps
- Session presence indicators

## Schema

### Types

- `CollabDocument` - Collaborative document with CRDT snapshot
- `CRDTUpdate` - Individual update for streaming changes
- `CollabSession` - Active collaboration session
- `EntityType` - Enum: ANNOTATION, COURSE_NOTES, SHARED_CANVAS

### Queries

```graphql
collabDocument(id: ID!): CollabDocument
collabDocumentByEntity(entityType: EntityType!, entityId: ID!): CollabDocument
collabDocuments(limit: Int, offset: Int): [CollabDocument!]!
collabSessions(documentId: ID!): [CollabSession!]!
```

### Mutations

```graphql
createCollabDocument(input: CreateCollabDocumentInput!): CollabDocument!
updateCollabDocument(id: ID!, snapshot: String!): CollabDocument!
applyUpdate(documentId: ID!, updateData: String!): CRDTUpdate!
joinSession(documentId: ID!, connectionId: String!): CollabSession!
leaveSession(sessionId: ID!): Boolean!
updateSessionActivity(sessionId: ID!): CollabSession!
```

### Subscriptions

```graphql
documentUpdated(documentId: ID!): CRDTUpdate!
sessionChanged(documentId: ID!): CollabSession!
```

## Project Structure

```
src/
├── main.ts                       # Entry point (port 4004)
├── app.module.ts                 # Root module with GraphQL + auth
├── auth/
│   └── auth.middleware.ts        # JWT validation middleware
└── discussion/
    ├── discussion.graphql        # GraphQL SDL schema
    ├── discussion.module.ts      # NestJS module
    ├── discussion.resolver.ts    # GraphQL resolvers + subscriptions
    └── discussion.service.ts     # Business logic + RLS
```

## Database Tables

### collab_documents

- Primary table for collaborative documents
- Stores Yjs CRDT snapshots as bytea
- Unique constraint on (entity_type, entity_id)
- RLS enabled for tenant isolation

### crdt_updates

- Stores individual CRDT updates for streaming
- Binary update data stored as bytea
- Linked to parent document via document_id

### collab_sessions

- Tracks active collaboration sessions
- Maps connection_id to user_id and document_id
- Includes last_active timestamp for presence

## Development

### Install Dependencies

```bash
pnpm install
```

### Run Development Server

```bash
pnpm dev
# Server starts on http://localhost:4004/graphql
```

### Build

```bash
pnpm build
```

### Type Check

```bash
pnpm typecheck
```

### Lint

```bash
pnpm lint
```

### Test

```bash
pnpm test
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
NODE_ENV=development
PORT=4004
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/edusphere
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=edusphere
KEYCLOAK_CLIENT_ID=edusphere-backend
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

## Authentication

All mutations require authentication via JWT:

- JWT extracted from `Authorization: Bearer <token>` header
- Validated against Keycloak JWKS endpoint
- Tenant ID and User ID extracted from JWT claims
- RLS context set for all database queries

## Real-time Collaboration

### How It Works

1. **Client joins session:**

   ```graphql
   mutation {
     joinSession(documentId: "...", connectionId: "unique-conn-id") {
       id
       userId
     }
   }
   ```

2. **Client subscribes to updates:**

   ```graphql
   subscription {
     documentUpdated(documentId: "...") {
       id
       updateData
       createdAt
     }
   }
   ```

3. **Client applies local update:**

   ```graphql
   mutation {
     applyUpdate(documentId: "...", updateData: "base64-encoded-crdt-update") {
       id
       documentId
     }
   }
   ```

4. **Server broadcasts update to all subscribers**

5. **Periodic snapshot saves:**
   ```graphql
   mutation {
     updateCollabDocument(id: "...", snapshot: "base64-encoded-snapshot") {
       id
       updatedAt
     }
   }
   ```

## Integration with Gateway

This subgraph is part of the EduSphere GraphQL Federation:

- **Gateway:** Hive Gateway v2 (port 4000)
- **Federation Version:** v2.7
- **Entity References:**
  - `User @key(fields: "id")` - Extended from Core subgraph
  - `Course @key(fields: "id")` - Extended from Content subgraph

## Security

### Row-Level Security (RLS)

- All queries use `withTenantContext()` wrapper
- Tenant ID enforced at database level
- Cross-tenant access blocked automatically

### Multi-tenancy

- All documents isolated by tenant_id
- JWT tenant_id claim validated
- No cross-tenant queries allowed

### Input Validation

- Binary data transmitted as base64
- Connection IDs must be unique
- Entity types restricted to enum values

## Performance Considerations

### Binary Data Handling

- CRDT snapshots stored as bytea (not text)
- Updates streamed incrementally
- Snapshots periodically compacted
- Base64 encoding only at API boundary

### Subscription Scaling

- PubSub in-memory for development
- Production: Use Redis PubSub or NATS
- Document-scoped channels prevent global broadcasts
- Automatic cleanup on disconnect

## Future Enhancements

- [ ] Redis PubSub for horizontal scaling
- [ ] WebRTC signaling for peer-to-peer CRDT sync
- [ ] Conflict-free merge strategies
- [ ] Document versioning and history
- [ ] Presence cursors and selections
- [ ] Document-level permissions (read/write/admin)

## Related Documentation

- [EduSphere Architecture](../../README.md)
- [Database Schema](../../packages/db/README.md)
- [Auth Package](../../packages/auth/README.md)
- [Gateway Configuration](../gateway/README.md)

---

**Last Updated:** February 2026
**Status:** ✅ Production Ready
