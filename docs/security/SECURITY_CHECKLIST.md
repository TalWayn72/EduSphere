# EduSphere Security Checklist

> **Purpose**: Comprehensive security validation checklist for EduSphere multi-tenant SaaS platform.
>
> **Scale**: 100,000+ concurrent users | **Architecture**: GraphQL Federation + RLS + AI Agents
>
> **Usage**: Review this checklist before every code change, deployment, and during security audits.

---

## Table of Contents

1. [Pre-Commit Security Gate](#pre-commit-security-gate)
2. [Authentication & Authorization](#authentication--authorization)
3. [Database Security](#database-security)
4. [GraphQL Security](#graphql-security)
5. [API Security](#api-security)
6. [AI Agent Security](#ai-agent-security)
7. [File Upload Security](#file-upload-security)
8. [Secrets Management](#secrets-management)
9. [Monitoring & Auditing](#monitoring--auditing)
10. [Compliance](#compliance)
11. [Incident Response](#incident-response)

---

## Pre-Commit Security Gate

**Severity**: CRITICAL

Every code change MUST pass ALL of these checks before commit:

### XSS Prevention
- [ ] **No unsanitized user input in GraphQL responses**
  - Example: All user-generated content (annotations, course titles, etc.) sanitized via `escape-html` or DOMPurify
  - Check: Search codebase for direct variable interpolation in responses without sanitization
  - Command: `pnpm grep "innerHTML\|dangerouslySetInnerHTML" --output_mode=files_with_matches`

- [ ] **React components use safe rendering patterns**
  - Example: Use `textContent` or `{variable}` JSX syntax, never `dangerouslySetInnerHTML` without sanitization
  - Check: All `dangerouslySetInnerHTML` usage has DOMPurify sanitization
  - File: Review all `.tsx` files with innerHTML patterns

### SQL Injection Prevention
- [ ] **ALL database queries use Drizzle ORM parameterized queries**
  - Example: `db.select().from(users).where(eq(users.id, userId))` NOT raw SQL
  - Check: No `db.execute(...)` calls with string concatenation
  - Command: `pnpm grep "db.execute.*\+" --output_mode=files_with_matches`
  - **EXCEPTION**: Apache AGE Cypher queries via graph helpers ONLY

- [ ] **Drizzle prepared statements for all dynamic queries**
  - Example: Use `db.query.users.findFirst({ where: eq(users.id, $1) })`
  - Check: All user input is parameterized, never interpolated into SQL strings

### NoSQL Injection Prevention (Cypher Queries)
- [ ] **ALL Cypher queries use parameterized prepared statements**
  - Example:
    ```typescript
    const query = `
      SELECT * FROM cypher('edusphere_graph', $$
        MATCH (c:Concept {id: $concept_id})
        RETURN c
      $$, $1) as (concept agtype);
    `;
    await executeCypher(query, [conceptId]);
    ```
  - Check: No string concatenation in Cypher queries
  - File: `packages/db/src/graph/client.ts` and all graph helpers

### Row-Level Security (RLS) Validation
- [ ] **All tenant-scoped tables have RLS enabled**
  - Example: 16 tables (tenants, users, courses, modules, media_assets, transcripts, transcript_segments, annotations, collab_documents, crdt_updates, collab_sessions, agent_definitions, agent_executions, content_embeddings, annotation_embeddings, concept_embeddings)
  - Check: Run RLS validation tests
  - Command: `pnpm --filter @edusphere/db test -- --testPathPattern=rls`

- [ ] **All tenant-scoped queries use `withTenantContext()` wrapper**
  - Example:
    ```typescript
    await withTenantContext(tenantId, userId, role, async () => {
      return db.select().from(courses).where(eq(courses.tenantId, tenantId));
    });
    ```
  - Check: No direct Drizzle queries in resolvers without `withTenantContext()`
  - File: Review all resolver files in `apps/subgraph-*/src/resolvers/`

- [ ] **Cross-tenant tests verify isolation**
  - Example: Tenant A cannot read Tenant B's courses/users/annotations
  - Check: Integration tests exist for cross-tenant isolation
  - Command: `pnpm --filter @edusphere/db test -- --testPathPattern=tenant-isolation`

- [ ] **Personal annotations only visible to owner or instructors**
  - Example: PERSONAL layer RLS policy checks `user_id = current_setting('app.current_user_id')::uuid OR current_setting('app.current_user_role') IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')`
  - Check: Annotation layer RLS policies are correct
  - File: `packages/db/src/schema/annotation.ts` RLS policies

### JWT Validation & Scopes
- [ ] **All mutations use `@authenticated` directive**
  - Example: `type Mutation { createCourse(...): Course! @authenticated }`
  - Check: Search for mutations without `@authenticated`
  - File: All `.graphql` SDL files in `apps/subgraph-*/src/graphql/`

- [ ] **Sensitive mutations use `@requiresScopes` directive**
  - Example: `createCourse(...): Course! @authenticated @requiresScopes(scopes: ["course:write"])`
  - Check: Write operations have appropriate scopes
  - Scopes: `org:manage`, `org:users`, `course:write`, `media:upload`, `annotation:write`, `agent:write`, `agent:execute`, `knowledge:write`

- [ ] **Admin-only mutations use `@requiresRole` directive**
  - Example: `deleteUser(...): Boolean! @authenticated @requiresRole(roles: [SUPER_ADMIN, ORG_ADMIN])`
  - Check: Admin operations restricted to SUPER_ADMIN or ORG_ADMIN roles
  - Roles: `SUPER_ADMIN`, `ORG_ADMIN`, `INSTRUCTOR`, `STUDENT`, `RESEARCHER`

### Input Validation
- [ ] **All mutations have Zod schemas for input validation**
  - Example:
    ```typescript
    const CreateCourseInputSchema = z.object({
      title: z.string().min(1).max(200),
      description: z.string().max(5000).optional(),
      tags: z.array(z.string()).max(20).optional(),
    });
    ```
  - Check: Every mutation resolver validates input with Zod
  - File: `apps/subgraph-*/src/schemas/*.schemas.ts`

- [ ] **File paths validated to prevent directory traversal**
  - Example: Use `path.basename()` and whitelist allowed characters
  - Check: All file upload/download operations sanitize paths

### Secrets in Code
- [ ] **No API keys, passwords, tokens, or secrets in code**
  - Example: Use `process.env.KEYCLOAK_CLIENT_SECRET`, never hardcoded strings
  - Check: Search for common secret patterns
  - Command: `pnpm grep -i "password.*=|api_key.*=|secret.*=|token.*=" --output_mode=content`
  - Review output for hardcoded secrets

- [ ] **No secrets in Git history**
  - Check: Run git-secrets or gitleaks scanner
  - Command: `git secrets --scan` or `gitleaks detect`

---

## Authentication & Authorization

**Severity**: CRITICAL

### Keycloak OIDC/JWT Configuration

- [ ] **Gateway validates JWT via Keycloak JWKS**
  - Example: `KEYCLOAK_JWKS_URL=http://keycloak:8080/realms/edusphere/protocol/openid-connect/certs`
  - Check: Gateway config includes JWKS endpoint
  - File: `apps/gateway/gateway.config.ts`

- [ ] **JWT signature verification enabled**
  - Example: Use `jsonwebtoken.verify()` with public key from JWKS
  - Check: JWT validation does NOT skip signature verification
  - File: `packages/auth/src/jwt-validator.ts`

- [ ] **JWT expiration enforced**
  - Example: Check `exp` claim and reject expired tokens
  - Check: JWT validator rejects tokens past expiration
  - Test: Send request with expired token, expect 401

### JWT Claims Validation

- [ ] **Required claims present in all JWTs**
  - Claims: `tenant_id` (UUID), `user_id` (UUID), `role` (enum), `scopes` (array), `sub` (subject), `iss` (issuer), `exp` (expiration)
  - Check: Context extractor validates all required claims exist
  - File: `packages/auth/src/context-extractor.ts`

- [ ] **Tenant ID extracted from JWT, NOT from GraphQL arguments**
  - Example:
    ```typescript
    // CORRECT: Use context.tenantId from JWT
    const courses = await getCourses(context.tenantId);

    // WRONG: Accept tenantId from client
    const courses = await getCourses(args.tenantId); // DANGEROUS!
    ```
  - Check: No resolvers accept `tenantId` as GraphQL argument
  - File: Review all resolver signatures

- [ ] **User ID and role validated against database**
  - Example: After JWT validation, verify user still exists and is active
  - Check: Auth middleware queries database to confirm user status
  - File: `packages/auth/src/guards/authenticated.guard.ts`

### GraphQL Directives Implementation

- [ ] **`@authenticated` directive enforced at gateway**
  - Example: All non-public queries/mutations require valid JWT
  - Check: Unauthenticated requests return `UNAUTHENTICATED` error
  - Test: `curl http://localhost:4000/graphql -d '{"query":"{ me { id } }"}' | jq .errors[0].extensions.code` → "UNAUTHENTICATED"

- [ ] **`@requiresScopes` directive validates JWT scopes**
  - Example: Mutation requires `course:write` scope, JWT must include it
  - Check: Requests without required scopes return `FORBIDDEN` error
  - Test: Use JWT without `course:write`, attempt `createCourse` mutation, expect 403

- [ ] **`@requiresRole` directive validates user role**
  - Example: `deleteUser` requires `SUPER_ADMIN` or `ORG_ADMIN` role
  - Check: Students cannot access admin-only operations
  - Test: Student JWT attempts admin mutation, expect `FORBIDDEN`

- [ ] **`@ownerOnly` directive validates resource ownership**
  - Example: User can only update their own PERSONAL annotations
  - Check: Owner validation logic in place
  - File: `packages/auth/src/guards/owner-only.guard.ts`

### Session & Token Management

- [ ] **JWT refresh token flow implemented**
  - Example: Access token (15 min expiry) + refresh token (7 days)
  - Check: Frontend handles token refresh before expiration
  - File: `apps/web/src/lib/auth.ts`

- [ ] **Logout invalidates tokens**
  - Example: Keycloak token revocation endpoint called on logout
  - Check: Logout clears local tokens and calls Keycloak revoke
  - File: `apps/web/src/lib/auth.ts` logout function

- [ ] **Concurrent session limits enforced (optional per tenant plan)**
  - Example: FREE plan allows 1 concurrent session, PROFESSIONAL allows 5
  - Check: Session tracking in Redis or database
  - File: `packages/auth/src/session-manager.ts`

---

## Database Security

**Severity**: CRITICAL

### Row-Level Security (RLS) Policies

- [ ] **RLS enabled on all 16 tenant-scoped tables**
  - Tables: `tenants`, `users`, `courses`, `modules`, `media_assets`, `transcripts`, `transcript_segments`, `annotations`, `collab_documents`, `crdt_updates`, `collab_sessions`, `agent_definitions`, `agent_executions`, `content_embeddings`, `annotation_embeddings`, `concept_embeddings`
  - Check: Query `pg_class` for `relrowsecurity = true`
  - Command:
    ```sql
    SELECT relname, relrowsecurity
    FROM pg_class
    JOIN pg_namespace ON pg_namespace.oid = relnamespace
    WHERE nspname = 'public' AND relkind = 'r'
    ORDER BY relname;
    ```
  - Expected: All 16 tables show `relrowsecurity = true`

- [ ] **Tenant isolation policy on every tenant-scoped table**
  - Example:
    ```sql
    CREATE POLICY tenant_isolation ON courses
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);
    ```
  - Check: Every table has tenant isolation policy
  - File: `packages/db/src/migrations/*.sql`

- [ ] **Super admin bypass policy for cross-tenant access**
  - Example:
    ```sql
    CREATE POLICY super_admin_all_access ON users
    USING (
      tenant_id = current_setting('app.current_tenant', true)::uuid
      OR current_setting('app.current_user_role', true) = 'SUPER_ADMIN'
    );
    ```
  - Check: SUPER_ADMIN role can query across tenants when explicitly needed
  - File: `packages/db/src/rls/policies.sql`

### Tenant Isolation Validation

- [ ] **Cross-tenant access blocked in all queries**
  - Example: Tenant A user cannot read Tenant B courses
  - Check: Integration tests verify tenant isolation
  - Command: `pnpm --filter @edusphere/db test -- --testPathPattern=tenant-isolation`

- [ ] **`withTenantContext()` sets session variables correctly**
  - Example:
    ```typescript
    await db.execute(sql`SET LOCAL app.current_tenant = ${tenantId}`);
    await db.execute(sql`SET LOCAL app.current_user_id = ${userId}`);
    await db.execute(sql`SET LOCAL app.current_user_role = ${role}`);
    ```
  - Check: Session variables set before every query
  - File: `packages/db/src/rls/withTenantContext.ts`

- [ ] **No direct database queries bypass RLS**
  - Example: All queries go through Drizzle ORM with RLS context
  - Check: No raw SQL that bypasses RLS (except AGE graph queries with explicit tenant filtering)
  - File: Search for `db.execute(sql\`...`)` and verify tenant filtering

### Annotation Layer Access Control

- [ ] **PERSONAL annotations only visible to owner**
  - Example: RLS policy checks `user_id = current_setting('app.current_user_id')::uuid`
  - Check: Student A cannot see Student B's personal annotations
  - Test: Query annotations with different user context, verify isolation

- [ ] **INSTRUCTOR annotations visible to instructors and admins**
  - Example: RLS policy checks `layer != 'PERSONAL' OR role IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')`
  - Check: Students can see INSTRUCTOR layer, cannot modify
  - Test: Student queries instructor annotations, verify read-only access

- [ ] **AI_GENERATED annotations visible to all in tenant**
  - Example: RLS policy allows read for AI_GENERATED layer
  - Check: All tenant users can see AI-generated annotations
  - Test: Query AI_GENERATED annotations from different user contexts

### SQL Injection Prevention

- [ ] **ALL database queries use parameterized queries**
  - Example: Use Drizzle's query builder or prepared statements
  - Check: No string concatenation in database queries
  - Command: `pnpm grep "db.execute.*\${" --output_mode=files_with_matches`

- [ ] **Drizzle ORM used for all relational queries**
  - Example: `db.select().from(courses).where(eq(courses.id, courseId))`
  - Check: No raw SQL except for AGE Cypher queries
  - File: Review all resolver database calls

- [ ] **Apache AGE Cypher queries use prepared statements**
  - Example:
    ```typescript
    const query = `SELECT * FROM cypher('edusphere_graph', $$
      MATCH (c:Concept {id: $concept_id}) RETURN c
    $$, $1) as (concept agtype);`;
    await db.execute(query, [conceptId]);
    ```
  - Check: All Cypher queries use `$1`, `$2` parameters, never string interpolation
  - File: `packages/db/src/graph/client.ts`

### Database Connection Security

- [ ] **Connection pooling configured correctly**
  - Example: Max 100 connections per subgraph, idle timeout 30s
  - Check: Drizzle pool configuration in each subgraph
  - File: `apps/subgraph-*/src/database.module.ts`

- [ ] **Database credentials stored in environment variables**
  - Example: `DATABASE_URL=postgresql://user:pass@localhost:5432/edusphere`
  - Check: No hardcoded connection strings in code
  - File: `.env.example` and all subgraph configs

- [ ] **SSL/TLS enforced for production database connections**
  - Example: `DATABASE_URL=postgresql://...?sslmode=require`
  - Check: Production database URL includes SSL mode
  - File: Production environment configuration

### Soft Delete Enforcement

- [ ] **Soft-deleted records invisible in all queries**
  - Example: Drizzle query includes `.where(isNull(schema.deletedAt))`
  - Check: All queries filter out soft-deleted records
  - File: `packages/db/src/schema/_shared.ts` helper functions

- [ ] **Hard delete only for GDPR compliance (explicit user request)**
  - Example: `permanentlyDeleteUser()` function for GDPR right to be forgotten
  - Check: Hard delete operations logged and audited
  - File: `apps/subgraph-core/src/services/user.service.ts`

---

## GraphQL Security

**Severity**: HIGH

### Query Depth Limiting

- [ ] **Maximum query depth set to 10**
  - Example: Prevents deeply nested queries that cause DoS
    ```graphql
    # BLOCKED: Depth > 10
    query {
      course { modules { course { modules { course { ... } } } } }
    }
    ```
  - Check: Gateway enforces depth limit
  - File: `apps/gateway/gateway.config.ts` - `depthLimit: 10`
  - Test: Send query with depth > 10, expect error

### Query Complexity Limiting

- [ ] **Maximum query complexity set to 1000**
  - Example: Each field has a complexity cost, total capped at 1000
  - Check: Gateway calculates and enforces complexity
  - File: `apps/gateway/gateway.config.ts` - `complexityLimit: 1000`
  - Test: Send expensive query (e.g., 50 courses with 100 modules each), expect rejection

- [ ] **Complex fields assigned higher costs**
  - Example: `semanticSearch` = 50 cost, `hybridSearch` = 100 cost
  - Check: Complexity map configured for expensive operations
  - File: `apps/gateway/src/complexity-map.ts`

### Rate Limiting

- [ ] **Per-tenant rate limiting configured**
  - Example:
    - FREE: 100 requests/min
    - STARTER: 500 requests/min
    - PROFESSIONAL: 2000 requests/min
    - ENTERPRISE: 10000 requests/min
  - Check: Gateway enforces tenant-specific rate limits
  - File: `apps/gateway/src/rate-limiter.ts`
  - Test: Exceed tenant limit, expect `TOO_MANY_REQUESTS` error

- [ ] **Per-IP rate limiting configured (global)**
  - Example: 1000 requests/min per IP address
  - Check: Protects against DDoS from single source
  - File: `apps/gateway/src/rate-limiter.ts`
  - Middleware: Use `@rateLimit` directive or gateway-level middleware

- [ ] **Per-operation rate limiting for expensive operations**
  - Example: `executeAgent` limited to 10/min per user (FREE), 100/min (PRO)
  - Check: Specific mutations have stricter rate limits
  - File: GraphQL schema `@rateLimit(limit: 10, duration: 60)` directive

### Input Validation

- [ ] **Zod schemas validate all mutation inputs**
  - Example:
    ```typescript
    const CreateAnnotationInputSchema = z.object({
      content: z.string().min(1).max(10000),
      startTime: z.number().min(0),
      endTime: z.number().min(0),
      layer: z.enum(['PERSONAL', 'SHARED', 'INSTRUCTOR', 'AI_GENERATED']),
    }).refine(data => data.endTime >= data.startTime, {
      message: 'endTime must be >= startTime'
    });
    ```
  - Check: Every mutation validates input before processing
  - File: `apps/subgraph-*/src/schemas/*.schemas.ts`

- [ ] **Input sanitization for user-generated content**
  - Example: HTML sanitization for annotation content, course descriptions
  - Check: DOMPurify or similar used on all rich text inputs
  - File: Resolver validation middleware

- [ ] **Maximum input sizes enforced**
  - Example:
    - String fields: 10,000 characters max
    - Array fields: 100 items max
    - File uploads: Size limits per tenant plan
  - Check: Zod schemas include max constraints
  - File: All schema definition files

### Error Handling

- [ ] **No sensitive data exposed in GraphQL errors**
  - Example: Database errors sanitized, internal paths hidden
  - Check: Production error formatter redacts sensitive info
  - File: `apps/gateway/src/error-formatter.ts`

- [ ] **Error responses follow standard format**
  - Example:
    ```json
    {
      "errors": [{
        "message": "Not authorized",
        "extensions": {
          "code": "FORBIDDEN",
          "timestamp": "2026-02-17T10:00:00Z"
        }
      }]
    }
    ```
  - Check: All errors include `code` in extensions
  - File: Global exception filter in each subgraph

- [ ] **Stack traces disabled in production**
  - Example: `NODE_ENV=production` hides stack traces
  - Check: Production config does not expose stack traces
  - File: `apps/gateway/src/config/production.ts`

### Schema Security

- [ ] **Introspection disabled in production**
  - Example: Prevents attackers from discovering full schema
  - Check: Gateway config `introspection: false` in production
  - File: `apps/gateway/gateway.config.ts`

- [ ] **Field-level `@deprecated` directives for breaking changes**
  - Example: `field: String @deprecated(reason: "Use newField instead")`
  - Check: Breaking changes marked as deprecated before removal
  - File: All GraphQL SDL files

---

## API Security

**Severity**: HIGH

### CORS Configuration

- [ ] **CORS restricted to allowed origins**
  - Example:
    ```typescript
    cors: {
      origin: [
        'https://edusphere.com',
        'https://app.edusphere.com',
        'http://localhost:5173' // Dev only
      ],
      credentials: true
    }
    ```
  - Check: No `origin: '*'` in production
  - File: `apps/gateway/src/config/cors.ts`

- [ ] **Credentials enabled only for trusted origins**
  - Example: `credentials: true` only with whitelisted origins
  - Check: CORS config matches production domains
  - File: Gateway CORS configuration

### Content Security Policy (CSP)

- [ ] **CSP headers configured for web app**
  - Example:
    ```
    Content-Security-Policy:
      default-src 'self';
      script-src 'self' 'unsafe-inline' https://cdn.edusphere.com;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      connect-src 'self' https://api.edusphere.com wss://api.edusphere.com;
      frame-ancestors 'none';
    ```
  - Check: CSP header present in production responses
  - File: `apps/web/index.html` or Nginx/Traefik config

- [ ] **No `unsafe-eval` in CSP (blocks XSS)**
  - Check: CSP does not include `unsafe-eval`
  - File: CSP header configuration

### HTTPS Enforcement

- [ ] **HTTPS enforced in production**
  - Example: Redirect HTTP → HTTPS, HSTS header set
  - Check: All production endpoints use HTTPS
  - File: Traefik or Nginx configuration

- [ ] **HSTS header configured**
  - Example: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
  - Check: HSTS header present in all responses
  - File: Reverse proxy configuration

- [ ] **TLS 1.2+ only, TLS 1.0/1.1 disabled**
  - Check: Reverse proxy SSL configuration
  - File: Traefik or Nginx TLS settings

### Persisted Queries (Production)

- [ ] **Persisted queries enabled in production**
  - Example: Only allow queries from pre-registered query hashes
  - Check: Gateway config `allowArbitraryQueries: false` in production
  - File: `apps/gateway/gateway.config.ts`

- [ ] **Query whitelist updated via CI/CD**
  - Example: Extract queries from frontend, publish to gateway on deploy
  - Check: Deployment pipeline includes query extraction step
  - File: `.github/workflows/deploy.yml`

### Security Headers

- [ ] **`X-Frame-Options: DENY` set**
  - Check: Prevents clickjacking attacks
  - File: Gateway or reverse proxy headers

- [ ] **`X-Content-Type-Options: nosniff` set**
  - Check: Prevents MIME sniffing attacks
  - File: Gateway or reverse proxy headers

- [ ] **`Referrer-Policy: strict-origin-when-cross-origin` set**
  - Check: Controls referrer information leakage
  - File: Gateway or reverse proxy headers

- [ ] **`Permissions-Policy` configured**
  - Example: `Permissions-Policy: geolocation=(), camera=(), microphone=()`
  - Check: Restricts browser feature access
  - File: Gateway or reverse proxy headers

---

## AI Agent Security

**Severity**: CRITICAL

### gVisor Sandboxing

- [ ] **gVisor sandbox enabled for all agent executions**
  - Example: Agent code runs in isolated gVisor container
  - Check: Agent execution environment uses gVisor runtime
  - File: `apps/subgraph-agent/src/execution/sandbox.ts`
  - Test: Attempt file system access from agent, verify blocked

- [ ] **No direct filesystem access from agents**
  - Example: Agents cannot read/write host filesystem
  - Check: gVisor configuration blocks filesystem access
  - File: `infrastructure/k8s/agent-worker-deployment.yaml` - runtime class

- [ ] **No direct network access from agents (except whitelisted APIs)**
  - Example: Agents can only call MCP proxy, not external internet
  - Check: Network policies restrict agent egress
  - File: Kubernetes NetworkPolicy for agent pods

### Resource Limits per Tenant Plan

- [ ] **Execution limits enforced per plan**
  - Limits:
    - FREE: 10 executions/day, 30s timeout, 256MB memory
    - STARTER: 100 executions/day, 60s timeout, 512MB
    - PROFESSIONAL: 1000 executions/day, 120s timeout, 1GB
    - ENTERPRISE: unlimited, 300s timeout, 2GB
  - Check: Agent execution service validates limits before queueing
  - File: `apps/subgraph-agent/src/services/agent-execution.service.ts`

- [ ] **Timeout kills runaway agents**
  - Example: Agent exceeds timeout → execution cancelled, resources released
  - Check: Timeout mechanism tested
  - Test: Create agent with infinite loop, verify timeout cancellation

- [ ] **Memory limits enforced**
  - Example: Agent exceeds memory limit → OOM kill, error logged
  - Check: Kubernetes pod resource limits configured
  - File: `infrastructure/k8s/agent-worker-deployment.yaml` - `resources.limits.memory`

- [ ] **CPU limits prevent resource exhaustion**
  - Example: Each agent execution limited to 1 CPU core
  - Check: Kubernetes CPU limits configured
  - File: `infrastructure/k8s/agent-worker-deployment.yaml` - `resources.limits.cpu`

### MCP Proxy Mediation

- [ ] **Agents CANNOT directly access databases**
  - Example: No database connection strings available to agent code
  - Check: Agent environment variables do NOT include DATABASE_URL
  - File: Agent execution sandbox configuration

- [ ] **All database access via MCP tools**
  - Example: Agent calls `knowledge_graph.query()` MCP tool → proxy validates → executes with RLS
  - Check: MCP proxy enforces authentication and RLS context
  - File: `apps/subgraph-agent/src/mcp/proxy.ts`

- [ ] **MCP tools validate tenant context**
  - Example: Every MCP tool call includes tenant_id, user_id from execution context
  - Check: MCP proxy rejects calls without valid tenant context
  - File: `apps/subgraph-agent/src/mcp/tools/*.ts`

- [ ] **MCP tools enforce rate limiting**
  - Example: Agent can call semantic_search max 10 times per execution
  - Check: MCP proxy tracks and limits tool calls
  - File: `apps/subgraph-agent/src/mcp/rate-limiter.ts`

### Input/Output Sanitization

- [ ] **Agent inputs sanitized before execution**
  - Example: User prompts validated, escaped for code injection
  - Check: Zod schema validates agent execution inputs
  - File: `apps/subgraph-agent/src/schemas/execution.schemas.ts`

- [ ] **Agent outputs sanitized before returning to client**
  - Example: HTML content sanitized with DOMPurify
  - Check: Output formatter sanitizes all agent responses
  - File: `apps/subgraph-agent/src/formatters/output-sanitizer.ts`

- [ ] **Prompt injection defenses in place**
  - Example: System prompts protected from user manipulation
  - Check: LangGraph.js state machine validates state transitions
  - File: `apps/subgraph-agent/src/workflows/*.graph.ts`

### Model Security

- [ ] **Model API keys secured per tenant (ENTERPRISE plan)**
  - Example: ENTERPRISE tenants can use their own OpenAI/Anthropic keys
  - Check: Tenant-specific API keys stored encrypted in database
  - File: `apps/subgraph-core/src/services/tenant.service.ts`

- [ ] **Model responses logged for audit (optional per tenant)**
  - Example: All agent interactions logged with tenant_id, user_id
  - Check: Audit log includes model requests and responses
  - File: `apps/subgraph-agent/src/logging/audit-logger.ts`

---

## File Upload Security

**Severity**: HIGH

### File Type Validation

- [ ] **Magic byte validation for all uploads**
  - Example: Check first bytes match declared MIME type
  - Check: Use `file-type` npm package for validation
  - File: `apps/subgraph-content/src/services/upload.service.ts`
  - Test: Upload `.exe` renamed to `.mp4`, verify rejection

- [ ] **Allowed file types whitelisted**
  - Allowed: `video/mp4`, `video/webm`, `audio/mpeg`, `audio/wav`, `application/pdf`, `image/jpeg`, `image/png`
  - Check: Reject all non-whitelisted MIME types
  - File: Upload validation schema

- [ ] **File extension validation**
  - Example: Only allow `.mp4`, `.webm`, `.mp3`, `.wav`, `.pdf`, `.jpg`, `.png`
  - Check: Reject dangerous extensions (`.exe`, `.sh`, `.bat`, etc.)
  - File: Upload input validation

### Size Limits

- [ ] **Size limits enforced per tenant plan**
  - Limits:
    - FREE: 100MB per file, 1GB total
    - STARTER: 500MB per file, 10GB total
    - PROFESSIONAL: 2GB per file, 100GB total
    - ENTERPRISE: 10GB per file, unlimited total
  - Check: Upload service validates file size and tenant quota
  - File: `apps/subgraph-content/src/services/upload.service.ts`

- [ ] **Quota tracking per tenant**
  - Example: Track total storage used, reject uploads exceeding quota
  - Check: Quota stored in `tenants.storage_used` column
  - File: Database schema and upload service

### Virus Scanning

- [ ] **Virus scanning for all uploads**
  - Example: ClamAV integration before finalizing upload
  - Check: Upload marked `SCANNING` → virus scan → `COMPLETED` or `REJECTED`
  - File: `apps/subgraph-content/src/services/virus-scanner.ts`

- [ ] **Quarantine infected files**
  - Example: Infected files moved to quarantine bucket, not deleted immediately
  - Check: Quarantine policy configured in MinIO
  - File: MinIO bucket lifecycle policy

### S3 Presigned URLs (MinIO)

- [ ] **Presigned URLs expire within 15 minutes**
  - Example: Upload URL valid for 900 seconds only
  - Check: Presigned URL generation sets `expiresIn: 900`
  - File: `apps/subgraph-content/src/services/minio.service.ts`

- [ ] **Presigned URLs scoped to specific object**
  - Example: URL allows PUT only to specific key, not entire bucket
  - Check: Presigned URL includes object key in path
  - File: MinIO presigned URL generation

- [ ] **Bucket policies enforce authentication**
  - Example: No public read/write access to buckets
  - Check: MinIO bucket policies require authentication
  - File: `infrastructure/minio/bucket-policies.json`

- [ ] **File deletion uses presigned DELETE URLs**
  - Example: Client cannot directly delete files from MinIO
  - Check: Deletion via GraphQL mutation → generates presigned DELETE URL
  - File: Media asset deletion resolver

### Download Security

- [ ] **Download URLs require authentication**
  - Example: Query `mediaAsset(id)` returns presigned GET URL valid for 1 hour
  - Check: Unauthenticated users cannot access media URLs
  - Test: Attempt to access media URL without JWT, expect 403

- [ ] **Content-Disposition header prevents XSS**
  - Example: Set `Content-Disposition: attachment; filename="safe_name.mp4"`
  - Check: MinIO presigned URLs include safe filename header
  - File: Presigned URL generation with custom headers

---

## Secrets Management

**Severity**: CRITICAL

### No Secrets in Code

- [ ] **All secrets stored in environment variables**
  - Example: `KEYCLOAK_CLIENT_SECRET`, `MINIO_SECRET_KEY`, `DATABASE_URL`
  - Check: No hardcoded secrets in codebase
  - Command: `pnpm grep -i "password.*=.*['\"]|secret.*=.*['\"]|api_key.*=.*['\"]" --output_mode=files_with_matches`

- [ ] **`.env` files in `.gitignore`**
  - Check: `.env`, `.env.local`, `.env.production` are gitignored
  - File: `.gitignore`

- [ ] **`.env.example` documents all required variables (no secrets)**
  - Example: `DATABASE_URL=postgresql://user:password@localhost:5432/edusphere`
  - Check: Example values are placeholders, not real secrets
  - File: `.env.example`

### Environment Variables Only

- [ ] **Production secrets stored in secure vault**
  - Example: Use Kubernetes Secrets, AWS Secrets Manager, HashiCorp Vault
  - Check: No `.env` files in production, all from vault
  - File: Kubernetes deployment manifests use `secretRef`

- [ ] **Secrets rotated regularly**
  - Example: Database passwords, API keys rotated every 90 days
  - Check: Rotation policy documented and enforced
  - File: `docs/security/secrets-rotation-policy.md`

### Keycloak for OAuth Secrets

- [ ] **OAuth client secrets managed by Keycloak**
  - Example: `KEYCLOAK_CLIENT_SECRET` for backend, no client secret for public frontend
  - Check: Frontend uses public OIDC client (PKCE flow)
  - File: Keycloak realm configuration

- [ ] **API scopes managed in Keycloak**
  - Example: All scopes (`org:manage`, `course:write`, etc.) defined in Keycloak realm
  - Check: Gateway validates scopes against Keycloak configuration
  - File: Keycloak client scope mappings

### Secret Scanning

- [ ] **Git hooks scan for secrets before commit**
  - Example: Use `git-secrets` or `gitleaks` pre-commit hook
  - Check: Commits with secrets are blocked
  - File: `.git/hooks/pre-commit`

- [ ] **CI/CD pipeline scans for leaked secrets**
  - Example: GitHub Actions secret scanning enabled
  - Check: Pipeline fails if secrets detected in code
  - File: `.github/workflows/security-scan.yml`

---

## Monitoring & Auditing

**Severity**: MEDIUM

### Security Event Logging

- [ ] **All authentication events logged**
  - Events: Login success/failure, token refresh, logout, session expiration
  - Check: Pino logger emits structured auth events
  - File: `packages/auth/src/logging/auth-logger.ts`
  - Example:
    ```typescript
    logger.info({
      event: 'auth.login.success',
      tenantId: context.tenantId,
      userId: context.userId,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    ```

- [ ] **All authorization failures logged**
  - Events: Forbidden scope, forbidden role, RLS violation
  - Check: Log includes user_id, tenant_id, attempted operation
  - File: GraphQL error formatter

- [ ] **All admin operations logged**
  - Events: User role change, tenant settings update, cross-tenant query
  - Check: Audit log for SUPER_ADMIN and ORG_ADMIN actions
  - File: `apps/subgraph-core/src/logging/audit-logger.ts`

### Failed Authentication Tracking

- [ ] **Failed login attempts tracked per user**
  - Example: Track in Redis, 5 failed attempts → lock account for 15 minutes
  - Check: Rate limiting on login endpoint
  - File: Keycloak brute force detection configuration

- [ ] **Failed JWT validation logged**
  - Example: Invalid signature, expired token, missing claims
  - Check: Log includes IP address, attempted operation
  - File: `packages/auth/src/jwt-validator.ts`

### Suspicious Activity Detection

- [ ] **Unusual query patterns detected**
  - Example: 100 requests in 10 seconds from single user
  - Check: Anomaly detection alerts on spike
  - File: Monitoring dashboard with alerting rules

- [ ] **Cross-tenant access attempts logged**
  - Example: User attempts to query resources from different tenant
  - Check: RLS violation logged with alert
  - File: Database RLS policy violation logging

- [ ] **Large data export attempts logged**
  - Example: Query requesting 10,000+ records
  - Check: Complexity limiter logs expensive queries
  - File: Gateway complexity analyzer

### Log Aggregation

- [ ] **All logs aggregated to centralized system**
  - Example: ELK stack (Elasticsearch, Logstash, Kibana) or Loki + Grafana
  - Check: All subgraphs send logs to aggregator
  - File: Logging configuration in each subgraph

- [ ] **Logs retained per compliance requirements**
  - Example: Security logs retained 1 year, access logs 90 days
  - Check: Log retention policy configured
  - File: Log aggregation system retention settings

- [ ] **Logs searchable and queryable**
  - Example: Search for all failed login attempts for user_id
  - Check: Kibana or similar UI available
  - Tool: Kibana, Grafana Loki

### Alerting

- [ ] **Security alerts configured**
  - Alerts:
    - Failed login rate > 10/min → warning
    - RLS violation → critical
    - JWT validation failure rate > 5% → critical
    - Admin operation → info (notification)
  - Check: Alerting rules configured in monitoring system
  - File: Prometheus alerting rules or similar

- [ ] **Alert escalation paths defined**
  - Example: Critical → PagerDuty → on-call engineer
  - Check: Incident response plan includes escalation
  - File: `docs/security/incident-response.md`

---

## Compliance

**Severity**: MEDIUM

### GDPR Considerations

- [ ] **Data minimization enforced**
  - Example: Only collect necessary user data (email, name, role)
  - Check: No unnecessary PII fields in database schema
  - File: `packages/db/src/schema/core.ts` - users table

- [ ] **User consent tracked for data processing**
  - Example: `users.consent_marketing`, `users.consent_analytics` fields
  - Check: User preferences stored and respected
  - File: User profile management

- [ ] **Right to access implemented**
  - Example: `exportMyData` mutation returns all user data in JSON
  - Check: User can download all personal data
  - File: `apps/subgraph-core/src/resolvers/user.resolver.ts`

- [ ] **Right to be forgotten implemented**
  - Example: `deleteMyAccount` mutation hard-deletes user and anonymizes content
  - Check: Permanent deletion removes all PII
  - File: `apps/subgraph-core/src/services/user.service.ts` - GDPR deletion

- [ ] **Right to data portability implemented**
  - Example: Export data in machine-readable JSON format
  - Check: Export includes courses, annotations, agent executions
  - File: Data export service

- [ ] **Data processing agreements (DPA) with third parties**
  - Example: DPA with Keycloak, MinIO, LLM providers
  - Check: Legal agreements in place
  - File: `docs/legal/data-processing-agreements/`

### Data Retention Policy

- [ ] **Retention periods defined per data type**
  - Policy:
    - Active user data: Retained while account active
    - Soft-deleted data: 30 days, then hard-deleted
    - Audit logs: 1 year
    - Agent execution logs: 90 days (FREE), 1 year (PRO), 3 years (ENTERPRISE)
    - Anonymized analytics: Indefinite
  - Check: Retention policy documented
  - File: `docs/security/data-retention-policy.md`

- [ ] **Automated deletion jobs for expired data**
  - Example: Cron job runs daily to purge soft-deleted records > 30 days
  - Check: Scheduled job configured
  - File: `scripts/cron/purge-deleted-records.sh`

- [ ] **User notifications before data deletion**
  - Example: Email 7 days before account deletion
  - Check: Notification service sends reminders
  - File: Account deletion workflow

### Privacy by Design

- [ ] **Default privacy settings are strictest**
  - Example: New annotations default to PERSONAL layer
  - Check: User must explicitly share data
  - File: Default values in database schema

- [ ] **Encryption at rest for sensitive data**
  - Example: Database volume encrypted with LUKS or cloud provider encryption
  - Check: Production database uses encryption
  - File: Kubernetes PVC configuration or cloud DB settings

- [ ] **Encryption in transit for all communications**
  - Example: TLS for all HTTP, WSS for WebSockets, SSL for database
  - Check: No unencrypted communication in production
  - File: TLS configuration across all services

---

## Incident Response

**Severity**: CRITICAL

### Steps for Security Incidents

1. **Detection & Identification**
   - [ ] Incident detected via monitoring alert or user report
   - [ ] Severity assessed: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
   - [ ] Incident logged in tracking system (JIRA, PagerDuty, etc.)

2. **Containment**
   - [ ] **P0/P1**: Immediately disable affected service/tenant if necessary
   - [ ] Isolate compromised systems from network
   - [ ] Revoke compromised credentials (JWT secrets, API keys, database passwords)
   - [ ] Enable temporary rate limiting or IP blocking

3. **Investigation**
   - [ ] Collect logs from affected timeframe (gateway, subgraphs, database, Keycloak)
   - [ ] Identify attack vector (SQL injection, XSS, RLS bypass, etc.)
   - [ ] Determine scope: affected tenants, users, data
   - [ ] Document timeline of events

4. **Eradication**
   - [ ] Patch vulnerability (code fix, config change, dependency update)
   - [ ] Deploy fix to production via emergency deployment process
   - [ ] Run security tests to verify fix
   - [ ] Update RLS policies, JWT validation, or other security mechanisms as needed

5. **Recovery**
   - [ ] Restore service to normal operation
   - [ ] Verify monitoring shows no ongoing attack
   - [ ] Communicate status to affected users/tenants

6. **Post-Incident Review**
   - [ ] Write incident report with root cause analysis
   - [ ] Update security checklist with new controls
   - [ ] Update monitoring/alerting to detect similar incidents
   - [ ] Conduct team retrospective

### Escalation Paths

| Severity | Response Time | Escalation |
|----------|--------------|------------|
| **P0 - Critical** (Data breach, RLS bypass, production down) | 15 minutes | On-call engineer → Engineering lead → CTO → CEO (if data breach) |
| **P1 - High** (Auth bypass, XSS, SQL injection) | 1 hour | On-call engineer → Engineering lead |
| **P2 - Medium** (Rate limit bypass, CSP violation) | 4 hours | Assigned engineer → Engineering lead |
| **P3 - Low** (Deprecated API usage, minor config issue) | 24 hours | Assigned engineer |

### Communication Plan

- [ ] **Internal communication via Slack #incidents channel**
- [ ] **External communication (data breach only)**
  - Notify affected tenants/users within 72 hours (GDPR requirement)
  - Publish security advisory on status page
  - Coordinate with legal team for regulatory reporting

### Incident Playbooks

- [ ] **RLS Bypass Playbook**
  - Immediately disable affected subgraph
  - Audit all database queries from timeframe
  - Identify tenant data accessed
  - Notify affected tenants
  - File: `docs/security/playbooks/rls-bypass.md`

- [ ] **SQL Injection Playbook**
  - Block malicious IP addresses
  - Audit database for unauthorized modifications
  - Restore from backup if data corrupted
  - File: `docs/security/playbooks/sql-injection.md`

- [ ] **JWT Secret Leak Playbook**
  - Immediately rotate JWT signing secret
  - Invalidate all existing tokens
  - Force re-authentication for all users
  - File: `docs/security/playbooks/jwt-secret-leak.md`

- [ ] **Data Breach Playbook**
  - Follow GDPR breach notification requirements
  - Notify regulatory authorities within 72 hours
  - Notify affected individuals without undue delay
  - Engage legal counsel
  - File: `docs/security/playbooks/data-breach.md`

### Security Contacts

- **Security Team Email**: security@edusphere.com
- **On-call Engineer**: [PagerDuty rotation]
- **Engineering Lead**: [Name/Contact]
- **CTO**: [Name/Contact]
- **Legal Counsel**: [Name/Contact]
- **External Security Consultant**: [Name/Contact]

---

## Security Review Cadence

| Review Type | Frequency | Responsible |
|-------------|-----------|-------------|
| **Code Review (Security Focus)** | Every PR | Senior Engineer + Security Champion |
| **Dependency Audit** | Weekly | Automated (Renovate bot + manual review) |
| **Penetration Testing** | Quarterly | External security firm |
| **Security Checklist Review** | Monthly | Security team |
| **Incident Response Drill** | Quarterly | Engineering team |
| **Compliance Audit (GDPR)** | Annually | Legal + Engineering |
| **Secrets Rotation** | Every 90 days | DevOps team |

---

## Additional Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **GraphQL Security Best Practices**: https://www.apollographql.com/docs/technotes/TN0021-graphql-security-best-practices/
- **PostgreSQL RLS Documentation**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Keycloak Security Hardening**: https://www.keycloak.org/docs/latest/server_admin/#_hardening
- **GDPR Compliance Guide**: https://gdpr.eu/

---

**Document Version**: 1.0.0
**Last Updated**: 2026-02-17
**Maintained By**: EduSphere Security Team
**Review Cycle**: Monthly
