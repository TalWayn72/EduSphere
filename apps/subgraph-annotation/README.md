# Annotation Subgraph

GraphQL Federation subgraph for managing annotations, layers, and spatial comments on media assets.

## Features

- **Multi-layer annotations**: Personal, Shared, Instructor, AI-Generated
- **Annotation types**: Text, Sketch, Link, Bookmark, Spatial Comment
- **RLS-enforced**: Row-level security with tenant isolation
- **Soft deletes**: Non-destructive annotation removal
- **Parent-child relationships**: Support for threaded annotation discussions

## Port

**4003**

## Schema

### Types

- `Annotation`: Core annotation entity with content, spatial data, and layer
- `AnnotationLayer`: PERSONAL | SHARED | INSTRUCTOR | AI_GENERATED
- `AnnotationType`: TEXT | SKETCH | LINK | BOOKMARK | SPATIAL_COMMENT

### Queries

```graphql
query {
  annotation(id: ID!): Annotation
  annotations(assetId: ID, userId: ID, layer: AnnotationLayer, limit: Int, offset: Int): [Annotation!]!
  annotationsByAsset(assetId: ID!, layer: AnnotationLayer): [Annotation!]!
  annotationsByUser(userId: ID!, limit: Int, offset: Int): [Annotation!]!
}
```

### Mutations

```graphql
mutation {
  createAnnotation(input: CreateAnnotationInput!): Annotation!
  updateAnnotation(id: ID!, input: UpdateAnnotationInput!): Annotation!
  deleteAnnotation(id: ID!): Boolean!
  resolveAnnotation(id: ID!): Annotation!
}
```

## Database Tables

- `annotations`: Main annotation data (asset_id, user_id, annotation_type, layer, content, spatial_data)
- `annotation_embeddings`: Vector embeddings for semantic search (future)
- `annotation_layers`: Layer configuration and permissions (future)

## Development

```bash
# Start subgraph (requires PostgreSQL + Keycloak)
pnpm --filter @edusphere/subgraph-annotation dev

# Build
pnpm --filter @edusphere/subgraph-annotation build

# Type check
pnpm --filter @edusphere/subgraph-annotation typecheck

# Lint
pnpm --filter @edusphere/subgraph-annotation lint

# Test
pnpm --filter @edusphere/subgraph-annotation test
```

## Environment Variables

See `.env` file:

```env
PORT=4003
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/edusphere
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=edusphere
KEYCLOAK_CLIENT_ID=edusphere-backend
```

## RLS Implementation

All queries enforce tenant isolation via `withTenantContext()`:

```typescript
withTenantContext(db, { tenantId, userId, userRole }, async (tx) => {
  // PostgreSQL RLS policies automatically filter by tenant_id
  return tx.select().from(schema.annotations);
});
```

## Federation

Entity stubs for cross-subgraph references:

```graphql
type User @key(fields: "id") @external {
  id: ID!
}

type ContentItem @key(fields: "id") @external {
  id: ID!
}
```

Annotations can be federated from Core (User) and Content (ContentItem) subgraphs.

## Authentication

JWT validation via `@edusphere/auth` package:

- Bearer token extraction from `Authorization` header
- Keycloak JWKS validation
- Role-based access control (RBAC)
- Tenant context propagation

## Logging

Pino logger with structured output:

```typescript
this.logger.log(`Annotation created: ${id} by user ${userId}`);
this.logger.error(`Failed to update annotation: ${error.message}`);
```

## Architecture

```
┌─────────────────┐
│   Gateway       │
│   (Port 4000)   │
└────────┬────────┘
         │
    ┌────┴──────────────────────────┐
    │                               │
┌───▼──────────┐          ┌────────▼────────┐
│ Core (4001)  │          │ Content (4002)  │
│ - User       │          │ - ContentItem   │
└──────────────┘          └─────────────────┘
         │                         │
         └─────────┬───────────────┘
                   │
        ┌──────────▼────────────┐
        │ Annotation (4003)     │
        │ - Annotations         │
        │ - RLS Enforcement     │
        │ - Layer Management    │
        └───────────────────────┘
```

## Layer Permissions

- **PERSONAL**: Only visible to annotation creator
- **SHARED**: Visible to all course participants
- **INSTRUCTOR**: Created by instructor, visible to all
- **AI_GENERATED**: System-generated annotations

RLS policies enforce visibility based on layer and user role.

## Future Enhancements

- [ ] Real-time annotation updates via GraphQL subscriptions
- [ ] Annotation embeddings for semantic search
- [ ] Annotation layer configuration per course
- [ ] Annotation analytics and insights
- [ ] Export annotations to PDF/Word
