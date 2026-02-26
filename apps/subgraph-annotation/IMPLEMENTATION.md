# Annotation Subgraph Implementation

## Overview

Complete implementation of the Annotation subgraph (port 4003) with RLS, JWT authentication, and GraphQL Federation v2.7 support.

## Files Created/Updated

### Core Files

1. **package.json** - Updated with @edusphere/auth dependency
2. **tsconfig.json** - Extends @edusphere/tsconfig/nestjs.json
3. **nest-cli.json** - NestJS CLI configuration
4. **vitest.config.ts** - Testing configuration
5. **.env** - Environment variables (DATABASE_URL, KEYCLOAK_URL, etc.)

### Source Files

#### Authentication

- `src/auth/auth.middleware.ts` - JWT validation middleware using Keycloak JWKS

#### GraphQL Schema

- `src/annotation/annotation.graphql` - Complete SDL with Federation v2.7 directives
  - Types: Annotation, AnnotationLayer, AnnotationType
  - Queries: annotation, annotations, annotationsByAsset, annotationsByUser
  - Mutations: createAnnotation, updateAnnotation, deleteAnnotation, resolveAnnotation
  - Entity stubs: User @external, ContentItem @external

#### Business Logic

- `src/annotation/annotation.service.ts` - RLS-enforced service layer
  - All methods use `withTenantContext()` for tenant isolation
  - Pino logger integration
  - Soft delete support
  - Full CRUD operations

#### Resolvers

- `src/annotation/annotation.resolver.ts` - GraphQL resolvers with auth context
  - All mutations require authentication
  - Zod validation for inputs
  - Federation @ResolveReference support

#### Validation

- `src/annotation/annotation.schemas.ts` - Zod schemas
  - CreateAnnotationInputSchema
  - UpdateAnnotationInputSchema
  - Type exports for TypeScript

#### Module Configuration

- `src/annotation/annotation.module.ts` - NestJS module
- `src/app.module.ts` - Root module with GraphQL Yoga Federation driver
- `src/main.ts` - Bootstrap with CORS and Pino logger

#### Tests

- `src/annotation/__tests__/annotation.service.spec.ts` - Unit tests for service

### Documentation

- `README.md` - Complete subgraph documentation
- `IMPLEMENTATION.md` - This file

## Database Schema Mapping

Maps to `packages/db/src/schema/annotation.ts`:

```typescript
annotations table:
- id: pk()
- tenant_id: tenantId()
- asset_id: uuid (references media_assets)
- user_id: uuid (references users)
- annotation_type: enum (TEXT, SKETCH, LINK, BOOKMARK, SPATIAL_COMMENT)
- layer: enum (PERSONAL, SHARED, INSTRUCTOR, AI_GENERATED)
- content: jsonb
- spatial_data: jsonb
- parent_id: uuid (self-reference)
- is_resolved: boolean
- created_at, updated_at, deleted_at
```

## Key Features Implemented

### 1. Row-Level Security (RLS)

All database queries wrapped in `withTenantContext()`:

```typescript
return withTenantContext(
  this.db,
  { tenantId, userId, userRole },
  async (tx) => {
    return tx.select().from(schema.annotations);
  }
);
```

### 2. JWT Authentication

- Keycloak JWKS validation
- Bearer token extraction
- Auth context propagation to all resolvers
- Role-based access control

### 3. Soft Deletes

- All queries filter `deleted_at IS NULL`
- Delete mutations set `deleted_at` timestamp
- Data preservation for audit trails

### 4. Input Validation

- Zod schemas for all mutations
- UUID validation for IDs
- Enum validation for types and layers
- JSON validation for content/spatial data

### 5. Federation v2.7

- `@key` directives for entity resolution
- `@external` stubs for User and ContentItem
- `@ResolveReference` for cross-subgraph queries
- Proper SDL schema composition

### 6. Logging

- Pino structured logging
- All CRUD operations logged with context
- Error logging with stack traces
- Debug logging for auth flow

## GraphQL Queries Examples

### Create Annotation

```graphql
mutation {
  createAnnotation(
    input: {
      assetId: "123e4567-e89b-12d3-a456-426614174000"
      annotationType: TEXT
      layer: PERSONAL
      content: { text: "Important concept here!", color: "#FFD700" }
      spatialData: { x: 100, y: 200, page: 1 }
    }
  ) {
    id
    annotationType
    layer
    content
    createdAt
  }
}
```

### Query Annotations by Asset

```graphql
query {
  annotationsByAsset(
    assetId: "123e4567-e89b-12d3-a456-426614174000"
    layer: SHARED
  ) {
    id
    userId
    user {
      id
      email
      firstName
    }
    annotationType
    content
    spatialData
    createdAt
  }
}
```

### Update Annotation

```graphql
mutation {
  updateAnnotation(
    id: "123e4567-e89b-12d3-a456-426614174001"
    input: { content: { text: "Updated annotation text" }, isResolved: true }
  ) {
    id
    content
    isResolved
    updatedAt
  }
}
```

## Environment Setup

Required services:

1. PostgreSQL 16+ with annotations table
2. Keycloak 23+ with edusphere realm
3. NATS JetStream (optional for events)

Environment variables in `.env`:

```env
PORT=4003
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/edusphere
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=edusphere
KEYCLOAK_CLIENT_ID=edusphere-backend
```

## Running the Subgraph

```bash
# Development mode (with hot reload)
pnpm --filter @edusphere/subgraph-annotation dev

# Production mode
pnpm --filter @edusphere/subgraph-annotation build
pnpm --filter @edusphere/subgraph-annotation start
```

## Testing

```bash
# Run unit tests
pnpm --filter @edusphere/subgraph-annotation test

# Run tests with coverage
pnpm --filter @edusphere/subgraph-annotation test:cov

# Type checking
pnpm --filter @edusphere/subgraph-annotation typecheck

# Linting
pnpm --filter @edusphere/subgraph-annotation lint
```

## Integration with Gateway

Gateway configuration in `apps/gateway/src/gateway.config.ts`:

```typescript
{
  name: 'annotation',
  url: process.env.SUBGRAPH_ANNOTATION_URL || 'http://localhost:4003/graphql',
}
```

## Security Checklist

- [x] RLS enabled on all queries
- [x] JWT validation on all mutations
- [x] Input validation with Zod schemas
- [x] Tenant isolation enforced
- [x] Soft deletes implemented
- [x] No raw SQL (except via sql`` template)
- [x] Pino logger (no console.log)
- [x] Auth context required for all operations
- [x] Federation entity stubs properly marked @external

## Future Enhancements

1. **Real-time subscriptions** - GraphQL subscriptions for live annotation updates
2. **Annotation embeddings** - Vector search for semantic annotation discovery
3. **Layer permissions** - Fine-grained control over who can see/edit which layers
4. **Annotation analytics** - Track annotation engagement and patterns
5. **Export functionality** - Export annotations to PDF/Word with highlights
6. **Annotation threads** - Full comment threading with parent_id relationships
7. **AI annotation suggestions** - Automatic annotation generation based on content

## Performance Considerations

- Database indexes on: tenant_id, asset_id, user_id, layer, created_at
- Pagination on all list queries (default limit: 20)
- Soft deletes avoid expensive hard deletes
- RLS policies optimized with proper indexes
- Connection pooling (max: 20 connections)

## Compliance

- GDPR: Soft deletes allow data retention policies
- SOC 2: Audit logs via Pino structured logging
- Multi-tenancy: Complete tenant isolation via RLS
- Authentication: Industry-standard JWT/OIDC

## Status

✅ **COMPLETE** - All features implemented, tested, and documented.

Ready for integration with Gateway and other subgraphs.
