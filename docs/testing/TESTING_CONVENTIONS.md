# EduSphere Testing Conventions

## Document Purpose

This document defines the **comprehensive testing strategy** for EduSphere, a production-scale GraphQL Federation platform targeting 100,000+ concurrent users. It establishes testing patterns, coverage requirements, and quality gates for all code contributions.

**Reference Documents:**
- `CLAUDE.md` — Testing section (§Testing Requirements)
- `IMPLEMENTATION-ROADMAP.md` — Phase-by-phase testing acceptance criteria
- `API-CONTRACTS-GRAPHQL-FEDERATION.md` — GraphQL schema contract

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Categories](#test-categories)
3. [Naming Conventions](#naming-conventions)
4. [Test Structure](#test-structure)
5. [Mocking Strategy](#mocking-strategy)
6. [GraphQL Testing](#graphql-testing)
7. [RLS Testing](#rls-testing)
8. [E2E Testing](#e2e-testing)
9. [Performance Testing](#performance-testing)
10. [Coverage Requirements](#coverage-requirements)
11. [CI/CD Integration](#cicd-integration)
12. [Test Data Management](#test-data-management)
13. [Troubleshooting](#troubleshooting)

---

## Testing Philosophy

### Test Pyramid

EduSphere follows the **inverted pyramid** approach optimized for GraphQL Federation:

```
         /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
        /   E2E Tests    \      ← 10% — Critical user flows only
       /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
      / Integration Tests \     ← 30% — GraphQL + DB + NATS + Redis
     /‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾\
    /     Unit Tests       \    ← 60% — Resolvers, Services, Utilities
   /________________________\
```

**Rationale:**
- **60% Unit Tests**: Fast feedback loop, high coverage of business logic
- **30% Integration Tests**: Validate GraphQL contracts, RLS policies, event flows
- **10% E2E Tests**: Prove core user journeys work end-to-end

### Coverage Targets

| Layer | Target | Critical Path |
|-------|--------|--------------|
| **Backend** (Subgraphs) | >90% line coverage | >95% for RLS-related code |
| **Frontend** (React Components) | >80% component coverage | >90% for auth/payment flows |
| **RLS Policies** | **100% coverage** | Security-critical — zero tolerance |
| **GraphQL Schema** | 100% resolver coverage | All queries/mutations/subscriptions tested |
| **Federation Composition** | 100% entity resolution | All `@key` fields validated |

### When to Test

| Change Type | Required Tests |
|-------------|----------------|
| **New GraphQL type/field** | Unit test for resolver + Integration test for query/mutation |
| **New mutation** | Unit + RLS validation + E2E (if user-facing) |
| **Bug fix** | Regression test + root cause documented in `OPEN_ISSUES.md` |
| **Database schema change** | Migration test + RLS policy test |
| **New subgraph** | Federation composition test + health check test |
| **AI agent template** | Agent workflow test + sandboxing test + token streaming test |
| **Frontend component** | Unit test + visual regression test (if design-critical) |

### Quality Gates (Enforced at Every Phase)

```bash
# 1. TypeScript compilation (zero errors)
pnpm turbo build --filter='./apps/*' --filter='./packages/*'

# 2. Linting (zero warnings in CI mode)
pnpm turbo lint

# 3. Unit tests (100% pass, coverage thresholds met)
pnpm turbo test -- --coverage

# 4. Schema validation (supergraph composes without errors)
pnpm --filter @edusphere/gateway compose

# 5. Docker health (all containers healthy)
./scripts/health-check.sh

# 6. Security scan
pnpm audit --audit-level=high
```

---

## Test Categories

### 1. Unit Tests (Vitest)

**Purpose:** Test individual functions, services, and resolvers in isolation.

**Scope:**
- GraphQL resolvers (per function)
- Service layer business logic
- Utility functions
- Validation schemas (Zod)
- Authentication guards
- Context extractors

**Location Pattern:**
```
apps/subgraph-core/
  src/
    resolvers/
      user.resolver.ts
      user.resolver.spec.ts          ← Unit test
    services/
      user.service.ts
      user.service.spec.ts            ← Unit test
    schemas/
      user.schema.ts
      user.schema.spec.ts             ← Unit test
```

**Example: User Resolver Unit Test**

```typescript
// apps/subgraph-core/src/resolvers/user.resolver.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserResolver } from './user.resolver';
import { UserService } from '../services/user.service';
import { GraphQLContext } from '@edusphere/auth';

describe('UserResolver', () => {
  let resolver: UserResolver;
  let mockUserService: MockUserService;
  let mockContext: GraphQLContext;

  beforeEach(() => {
    mockUserService = {
      findById: vi.fn(),
      updateProfile: vi.fn(),
    };
    resolver = new UserResolver(mockUserService as any);
    mockContext = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      userId: '660e8400-e29b-41d4-a716-446655440001',
      userRole: 'STUDENT',
      scopes: ['user:read', 'user:write'],
      isAuthenticated: true,
    };
  });

  describe('me()', () => {
    it('should return current user with RLS context', async () => {
      // Arrange
      const expectedUser = {
        id: mockContext.userId,
        email: 'student@edusphere.dev',
        displayName: 'Test Student',
        role: 'STUDENT',
      };
      mockUserService.findById.mockResolvedValue(expectedUser);

      // Act
      const result = await resolver.me(mockContext);

      // Assert
      expect(result).toEqual(expectedUser);
      expect(mockUserService.findById).toHaveBeenCalledWith(
        mockContext.userId,
        mockContext.tenantId
      );
    });

    it('should throw UnauthorizedException when not authenticated', async () => {
      // Arrange
      const unauthContext = { ...mockContext, isAuthenticated: false };

      // Act & Assert
      await expect(resolver.me(unauthContext)).rejects.toThrow('UNAUTHENTICATED');
    });
  });

  describe('updateMyProfile()', () => {
    it('should update user profile with RLS context', async () => {
      // Arrange
      const input = { displayName: 'New Name', bio: 'New bio' };
      const updatedUser = { id: mockContext.userId, ...input };
      mockUserService.updateProfile.mockResolvedValue(updatedUser);

      // Act
      const result = await resolver.updateMyProfile(input, mockContext);

      // Assert
      expect(result).toEqual(updatedUser);
      expect(mockUserService.updateProfile).toHaveBeenCalledWith(
        mockContext.userId,
        input,
        mockContext.tenantId
      );
    });
  });
});
```

**Command:**
```bash
# Run unit tests for specific subgraph
pnpm --filter @edusphere/subgraph-core test

# Run with coverage
pnpm --filter @edusphere/subgraph-core test -- --coverage

# Watch mode
pnpm --filter @edusphere/subgraph-core test -- --watch
```

---

### 2. Integration Tests (Vitest + Testcontainers)

**Purpose:** Test interactions between layers (GraphQL → Service → Drizzle → PostgreSQL).

**Scope:**
- Database operations with real PostgreSQL
- NATS event publishing/consuming
- Redis caching
- GraphQL query/mutation execution
- Federation entity resolution

**Location Pattern:**
```
apps/subgraph-core/
  src/
    test/
      integration/
        user.integration.spec.ts      ← Integration test
        auth.integration.spec.ts      ← Integration test
```

**Example: Database Integration Test**

```typescript
// apps/subgraph-core/src/test/integration/user.integration.spec.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { users, tenants } from '@edusphere/db/schema';
import { withTenantContext } from '@edusphere/db/rls';
import { UserService } from '../../services/user.service';

describe('UserService Integration', () => {
  let container: StartedPostgreSqlContainer;
  let db: ReturnType<typeof drizzle>;
  let userService: UserService;
  let testTenantId: string;

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16-bookworm')
      .withDatabase('test_db')
      .start();

    // Connect and migrate
    db = drizzle(container.getConnectionString());
    await migrate(db, { migrationsFolder: './drizzle' });
  }, 60000); // 60s timeout for container startup

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    // Seed test tenant
    const [tenant] = await db.insert(tenants).values({
      name: 'Test Tenant',
      slug: 'test-tenant',
      plan: 'FREE',
    }).returning();
    testTenantId = tenant.id;

    userService = new UserService(db);
  });

  describe('createUser()', () => {
    it('should create user with tenant isolation', async () => {
      // Arrange
      const userData = {
        email: 'newuser@edusphere.dev',
        displayName: 'New User',
        role: 'STUDENT',
      };

      // Act
      const createdUser = await withTenantContext(
        testTenantId,
        'system',
        'SUPER_ADMIN',
        async () => userService.create(userData)
      );

      // Assert
      expect(createdUser).toMatchObject(userData);
      expect(createdUser.tenantId).toBe(testTenantId);

      // Verify in DB
      const [dbUser] = await db.select().from(users).where(eq(users.id, createdUser.id));
      expect(dbUser.tenantId).toBe(testTenantId);
    });
  });

  describe('findById() with RLS', () => {
    it('should return user from same tenant', async () => {
      // Arrange
      const [user] = await db.insert(users).values({
        tenantId: testTenantId,
        email: 'user@edusphere.dev',
        displayName: 'Test User',
        role: 'STUDENT',
      }).returning();

      // Act
      const foundUser = await withTenantContext(
        testTenantId,
        user.id,
        'STUDENT',
        async () => userService.findById(user.id)
      );

      // Assert
      expect(foundUser).toBeTruthy();
      expect(foundUser.id).toBe(user.id);
    });

    it('should NOT return user from different tenant', async () => {
      // Arrange — create second tenant
      const [tenant2] = await db.insert(tenants).values({
        name: 'Tenant 2',
        slug: 'tenant-2',
        plan: 'FREE',
      }).returning();

      const [userTenant1] = await db.insert(users).values({
        tenantId: testTenantId,
        email: 'user1@edusphere.dev',
        displayName: 'User 1',
        role: 'STUDENT',
      }).returning();

      // Act — try to query Tenant 1 user from Tenant 2 context
      const foundUser = await withTenantContext(
        tenant2.id, // Different tenant!
        'system',
        'STUDENT',
        async () => userService.findById(userTenant1.id)
      );

      // Assert — RLS blocks cross-tenant access
      expect(foundUser).toBeNull();
    });
  });
});
```

**Commands:**
```bash
# Run integration tests
pnpm --filter @edusphere/subgraph-core test -- --testPathPattern=integration

# Run all integration tests across all subgraphs
pnpm turbo test -- --testPathPattern=integration
```

---

### 3. RLS Validation Tests (Vitest)

**Purpose:** **Security-critical** — Prove Row-Level Security policies enforce tenant isolation and role-based access.

**Scope:**
- Tenant A cannot read Tenant B data
- Role-based access (STUDENT vs INSTRUCTOR vs ADMIN)
- Owner-only policies (PERSONAL annotations)
- Soft-delete filtering
- Cross-tenant access (SUPER_ADMIN only)

**Location:**
```
packages/db/
  src/
    rls/
      tenant-isolation.test.ts        ← RLS tests
      role-access.test.ts             ← RLS tests
      owner-only.test.ts              ← RLS tests
```

**Example: Tenant Isolation RLS Test**

```typescript
// packages/db/src/rls/tenant-isolation.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { tenants, users, courses } from '../schema';
import { withTenantContext } from './withTenantContext';

describe('RLS: Tenant Isolation', () => {
  let container: StartedPostgreSqlContainer;
  let db: ReturnType<typeof drizzle>;
  let tenantA_id: string;
  let tenantB_id: string;
  let userA_id: string;
  let userB_id: string;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-bookworm').start();
    db = drizzle(container.getConnectionString());
    // Apply migrations including RLS policies
    await migrate(db, { migrationsFolder: './drizzle' });
  }, 60000);

  afterAll(async () => {
    await container.stop();
  });

  beforeEach(async () => {
    // Create two tenants
    const [tenantA] = await db.insert(tenants).values({
      name: 'Tenant A', slug: 'tenant-a', plan: 'FREE',
    }).returning();
    tenantA_id = tenantA.id;

    const [tenantB] = await db.insert(tenants).values({
      name: 'Tenant B', slug: 'tenant-b', plan: 'FREE',
    }).returning();
    tenantB_id = tenantB.id;

    // Create users in each tenant
    const [userA] = await db.insert(users).values({
      tenantId: tenantA_id,
      email: 'userA@edusphere.dev',
      displayName: 'User A',
      role: 'STUDENT',
    }).returning();
    userA_id = userA.id;

    const [userB] = await db.insert(users).values({
      tenantId: tenantB_id,
      email: 'userB@edusphere.dev',
      displayName: 'User B',
      role: 'STUDENT',
    }).returning();
    userB_id = userB.id;
  });

  it('should isolate user queries by tenant', async () => {
    // Act — Query from Tenant A context
    const usersFromA = await withTenantContext(
      tenantA_id,
      userA_id,
      'STUDENT',
      async () => db.select().from(users)
    );

    // Assert — Only sees Tenant A users
    expect(usersFromA).toHaveLength(1);
    expect(usersFromA[0].id).toBe(userA_id);
    expect(usersFromA[0].tenantId).toBe(tenantA_id);
  });

  it('should block cross-tenant course access', async () => {
    // Arrange — Create course in Tenant A
    const [courseA] = await db.insert(courses).values({
      tenantId: tenantA_id,
      title: 'Course A',
      creatorId: userA_id,
    }).returning();

    // Act — Try to query from Tenant B context
    const coursesFromB = await withTenantContext(
      tenantB_id,
      userB_id,
      'STUDENT',
      async () => db.select().from(courses)
    );

    // Assert — Tenant B cannot see Tenant A's course
    expect(coursesFromB).toHaveLength(0);
  });

  it('should allow SUPER_ADMIN to query across tenants', async () => {
    // Arrange — Create SUPER_ADMIN user
    const [admin] = await db.insert(users).values({
      tenantId: tenantA_id, // Belongs to Tenant A
      email: 'admin@edusphere.dev',
      displayName: 'Super Admin',
      role: 'SUPER_ADMIN',
    }).returning();

    // Act — Query all users as SUPER_ADMIN
    const allUsers = await withTenantContext(
      tenantA_id,
      admin.id,
      'SUPER_ADMIN',
      async () => db.select().from(users)
    );

    // Assert — SUPER_ADMIN sees users from ALL tenants
    expect(allUsers.length).toBeGreaterThanOrEqual(2); // At least userA, userB, admin
    const tenantIds = allUsers.map(u => u.tenantId);
    expect(tenantIds).toContain(tenantA_id);
    expect(tenantIds).toContain(tenantB_id);
  });
});
```

**Coverage Requirement:** **100% — Zero Tolerance for RLS Gaps**

```bash
# Run RLS tests
pnpm --filter @edusphere/db test -- --testPathPattern=rls

# Verify 100% coverage
pnpm --filter @edusphere/db test -- --testPathPattern=rls --coverage
# → All RLS policies must have passing tests
```

---

### 4. GraphQL Tests (Vitest + SuperTest)

**Purpose:** Test GraphQL API contracts — all queries, mutations, and subscriptions.

**Scope:**
- All 44 queries (per `API-CONTRACTS.md`)
- All 44 mutations
- All 7 subscriptions
- Authorization (JWT, scopes, roles)
- RLS enforcement at GraphQL layer
- Error responses

**Location:**
```
apps/subgraph-core/
  src/
    test/
      graphql/
        user.graphql.spec.ts          ← GraphQL query/mutation tests
        auth.graphql.spec.ts          ← Auth directive tests
```

**Example: GraphQL Mutation Test**

```typescript
// apps/subgraph-core/src/test/graphql/user.graphql.spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../app.module';

describe('GraphQL: User Mutations', () => {
  let app: INestApplication;
  let authToken: string;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Get auth token from Keycloak (dev environment)
    authToken = await getDevToken('student@edusphere.dev');
    const payload = decodeJWT(authToken);
    tenantId = payload.tenant_id;
    userId = payload.sub;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('updateMyProfile', () => {
    it('should update authenticated user profile', async () => {
      // Arrange
      const mutation = `
        mutation UpdateProfile($input: UpdateProfileInput!) {
          updateMyProfile(input: $input) {
            id
            displayName
            bio
          }
        }
      `;
      const variables = {
        input: {
          displayName: 'Updated Name',
          bio: 'Updated bio',
        },
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateMyProfile).toMatchObject({
        id: userId,
        displayName: 'Updated Name',
        bio: 'Updated bio',
      });
    });

    it('should reject unauthenticated request', async () => {
      // Arrange
      const mutation = `
        mutation UpdateProfile($input: UpdateProfileInput!) {
          updateMyProfile(input: $input) { id }
        }
      `;
      const variables = { input: { displayName: 'Hacker' } };

      // Act
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .send({ query: mutation, variables });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
    });

    it('should validate input with Zod schema', async () => {
      // Arrange
      const mutation = `
        mutation UpdateProfile($input: UpdateProfileInput!) {
          updateMyProfile(input: $input) { id }
        }
      `;
      const variables = {
        input: {
          displayName: '', // Invalid — empty string
        },
      };

      // Act
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query: mutation, variables });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('BAD_USER_INPUT');
      expect(response.body.errors[0].message).toContain('displayName');
    });
  });

  describe('updateUserRole (ADMIN only)', () => {
    it('should reject request without admin role', async () => {
      // Arrange
      const mutation = `
        mutation UpdateRole($userId: ID!, $role: UserRole!) {
          updateUserRole(userId: $userId, role: $role) { id role }
        }
      `;
      const variables = { userId: 'some-user-id', role: 'INSTRUCTOR' };

      // Act
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`) // STUDENT token
        .send({ query: mutation, variables });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    });

    it('should allow ORG_ADMIN to update roles', async () => {
      // Arrange
      const adminToken = await getDevToken('admin@edusphere.dev');
      const mutation = `
        mutation UpdateRole($userId: ID!, $role: UserRole!) {
          updateUserRole(userId: $userId, role: $role) { id role }
        }
      `;
      const variables = { userId: userId, role: 'INSTRUCTOR' };

      // Act
      const response = await request(app.getHttpServer())
        .post('/graphql')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ query: mutation, variables });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.errors).toBeUndefined();
      expect(response.body.data.updateUserRole.role).toBe('INSTRUCTOR');
    });
  });
});
```

**Commands:**
```bash
# Run GraphQL tests for subgraph
pnpm --filter @edusphere/subgraph-core test -- --testPathPattern=graphql

# Test all GraphQL APIs across all subgraphs
pnpm test:graphql  # Custom workspace script
```

---

### 5. Federation Tests (Vitest)

**Purpose:** Validate GraphQL Federation composition and entity resolution across subgraphs.

**Scope:**
- Supergraph composition succeeds
- Entity `@key` resolution (User, Course, MediaAsset, etc.)
- Cross-subgraph field extensions
- Reference resolver execution

**Location:**
```
apps/gateway/
  src/
    test/
      federation/
        composition.spec.ts           ← Composition tests
        entity-resolution.spec.ts     ← Entity resolver tests
```

**Example: Federation Entity Resolution Test**

```typescript
// apps/gateway/src/test/federation/entity-resolution.spec.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createGateway } from '../helpers/gateway-factory';
import request from 'supertest';

describe('Federation: Entity Resolution', () => {
  let gateway: any;
  let authToken: string;

  beforeAll(async () => {
    gateway = await createGateway({
      subgraphs: [
        { name: 'core', url: 'http://localhost:4001/graphql' },
        { name: 'content', url: 'http://localhost:4002/graphql' },
      ],
    });
    authToken = await getDevToken('student@edusphere.dev');
  });

  it('should resolve User entity across Core and Content subgraphs', async () => {
    // Arrange
    const query = `
      query GetCourseWithCreator($courseId: ID!) {
        course(id: $courseId) {
          id
          title
          creator {             # User entity from Core subgraph
            id
            displayName
            email
            createdAt
          }
        }
      }
    `;

    // Act
    const response = await request(gateway.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ query, variables: { courseId: 'known-course-id' } });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.course).toBeDefined();
    expect(response.body.data.course.creator).toMatchObject({
      id: expect.any(String),
      displayName: expect.any(String),
      email: expect.any(String),
    });
  });

  it('should resolve MediaAsset.annotations across Content and Annotation subgraphs', async () => {
    // Arrange
    const query = `
      query GetAssetWithAnnotations($assetId: ID!) {
        mediaAsset(id: $assetId) {
          id
          filename
          annotations(layers: [SHARED, INSTRUCTOR]) {  # From Annotation subgraph
            id
            content
            author {                                    # User from Core subgraph
              displayName
            }
          }
        }
      }
    `;

    // Act
    const response = await request(gateway.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ query, variables: { assetId: 'known-asset-id' } });

    // Assert
    expect(response.status).toBe(200);
    expect(response.body.errors).toBeUndefined();
    expect(response.body.data.mediaAsset.annotations).toBeInstanceOf(Array);
    // Each annotation has resolved User entity from Core
    response.body.data.mediaAsset.annotations.forEach((ann: any) => {
      expect(ann.author.displayName).toBeDefined();
    });
  });

  it('should handle missing entity references gracefully', async () => {
    // Arrange — Query course with deleted creator
    const query = `
      query GetCourse($courseId: ID!) {
        course(id: $courseId) {
          id
          title
          creator { id displayName }
        }
      }
    `;

    // Act
    const response = await request(gateway.getHttpServer())
      .post('/graphql')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ query, variables: { courseId: 'orphaned-course-id' } });

    // Assert — Should return course with null creator (graceful degradation)
    expect(response.status).toBe(200);
    expect(response.body.data.course.creator).toBeNull();
  });
});
```

**Commands:**
```bash
# Run federation tests
pnpm --filter @edusphere/gateway test -- --testPathPattern=federation

# Validate supergraph composition
pnpm --filter @edusphere/gateway compose
```

---

### 6. E2E Tests (Playwright)

**Purpose:** Prove critical user flows work end-to-end in real browsers.

**Scope:**
- Authentication flow (Keycloak OIDC)
- Course browsing and creation
- Video playback with annotations
- Semantic search
- AI agent chat
- Mobile responsive views

**Browser Coverage:**
- Chromium (Desktop + Mobile)
- Firefox (Desktop)
- WebKit (Safari simulation)

**Location:**
```
apps/web/
  e2e/
    auth.spec.ts                      ← Login/logout flows
    course-management.spec.ts         ← CRUD operations
    video-annotation.spec.ts          ← Annotation creation
    search.spec.ts                    ← Semantic search
    agent-chat.spec.ts                ← AI agent interaction
```

**Example: E2E Test with Page Object Model**

```typescript
// apps/web/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { DashboardPage } from './pages/dashboard.page';

test.describe('Authentication Flow', () => {
  let loginPage: LoginPage;
  let dashboardPage: DashboardPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    dashboardPage = new DashboardPage(page);
  });

  test('should login via Keycloak and redirect to dashboard', async ({ page }) => {
    // Arrange
    await loginPage.goto();

    // Act
    await loginPage.login('student@edusphere.dev', 'dev-password');

    // Assert
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(dashboardPage.userMenu).toContainText('Test Student');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Arrange
    await loginPage.goto();

    // Act
    await loginPage.login('invalid@example.com', 'wrong-password');

    // Assert
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('Invalid credentials');
  });

  test('should logout and clear session', async ({ page }) => {
    // Arrange — Login first
    await loginPage.goto();
    await loginPage.login('student@edusphere.dev', 'dev-password');
    await expect(page).toHaveURL(/\/dashboard/);

    // Act
    await dashboardPage.logout();

    // Assert
    await expect(page).toHaveURL(/\/login/);
    // Verify session cleared — reload should not auto-login
    await page.reload();
    await expect(page).toHaveURL(/\/login/);
  });
});
```

```typescript
// apps/web/e2e/pages/login.page.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="email"]');
    this.passwordInput = page.locator('input[name="password"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  async goto() {
    await this.page.goto('http://localhost:5173/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
    // Wait for navigation or error
    await this.page.waitForURL(/\/(dashboard|login)/, { timeout: 5000 });
  }
}
```

**Example: Video Annotation E2E Test**

```typescript
// apps/web/e2e/video-annotation.spec.ts
import { test, expect } from '@playwright/test';
import { VideoPlayerPage } from './pages/video-player.page';

test.describe('Video Annotation', () => {
  test.use({ storageState: 'e2e/.auth/student.json' }); // Reuse auth state

  test('should create text annotation at current timestamp', async ({ page }) => {
    // Arrange
    const videoPage = new VideoPlayerPage(page);
    await videoPage.goto('known-course-id', 'known-asset-id');
    await videoPage.waitForPlayerReady();

    // Act
    await videoPage.seekTo(30); // 30 seconds
    await videoPage.openAnnotationPanel();
    await videoPage.createTextAnnotation('This is an important point!');

    // Assert
    await expect(videoPage.annotationList).toContainText('This is an important point!');
    await expect(videoPage.getAnnotationTimestamp(0)).toContain('00:30');

    // Verify annotation persists after reload
    await page.reload();
    await videoPage.waitForPlayerReady();
    await expect(videoPage.annotationList).toContainText('This is an important point!');
  });

  test('should filter annotations by layer', async ({ page }) => {
    // Arrange
    const videoPage = new VideoPlayerPage(page);
    await videoPage.goto('course-id', 'asset-id');
    await videoPage.waitForPlayerReady();
    await videoPage.openAnnotationPanel();

    // Act — Filter to INSTRUCTOR layer only
    await videoPage.selectLayerFilter(['INSTRUCTOR']);

    // Assert — Only instructor annotations visible
    const annotations = await videoPage.getVisibleAnnotations();
    for (const ann of annotations) {
      const layer = await ann.getAttribute('data-layer');
      expect(layer).toBe('INSTRUCTOR');
    }
  });

  test('should create sketch annotation with canvas', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Sketch annotation requires mouse events');

    // Arrange
    const videoPage = new VideoPlayerPage(page);
    await videoPage.goto('course-id', 'asset-id');
    await videoPage.waitForPlayerReady();
    await videoPage.pauseVideo();

    // Act
    await videoPage.selectAnnotationType('SKETCH');
    await videoPage.drawOnCanvas([
      { x: 100, y: 100 },
      { x: 200, y: 150 },
      { x: 150, y: 200 },
    ]);
    await videoPage.saveSketchAnnotation();

    // Assert
    await expect(videoPage.annotationList).toContainText('Sketch');
    // Verify canvas snapshot saved
    const sketchData = await videoPage.getAnnotationData(0);
    expect(sketchData.canvasSnapshot).toBeDefined();
  });
});
```

**Commands:**
```bash
# Run E2E tests
pnpm --filter @edusphere/web test:e2e

# Run in headed mode (see browser)
pnpm --filter @edusphere/web test:e2e -- --headed

# Run specific browser
pnpm --filter @edusphere/web test:e2e -- --project=firefox

# Debug mode
pnpm --filter @edusphere/web test:e2e -- --debug

# Generate test report
pnpm --filter @edusphere/web test:e2e -- --reporter=html
```

---

### 7. Load Tests (k6)

**Purpose:** Validate system performance under production-scale load (100,000+ concurrent users).

**Scope:**
- Smoke test (1-10 users, validate no errors)
- Load test (sustained 10K-50K users)
- Stress test (ramp to 100K+ users)
- Spike test (sudden traffic bursts)
- Soak test (sustained load for 6+ hours)

**Location:**
```
scripts/
  load-tests/
    smoke.js                          ← Smoke test
    load.js                           ← Load test
    stress.js                         ← Stress test
    spike.js                          ← Spike test
```

**Example: k6 Load Test Script**

```javascript
// scripts/load-tests/load.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const queryLatency = new Trend('query_latency');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 1000 },   // Ramp up to 1K users
    { duration: '5m', target: 10000 },  // Ramp to 10K users
    { duration: '10m', target: 10000 }, // Stay at 10K for 10 min
    { duration: '2m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],    // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],       // Error rate < 1%
    errors: ['rate<0.01'],
  },
};

// Test data
const GRAPHQL_URL = 'http://localhost:4000/graphql';
const AUTH_TOKEN = __ENV.TEST_AUTH_TOKEN; // Pass via env var

export default function () {
  // Query 1: Get user courses
  const coursesQuery = {
    query: `
      query GetMyCourses {
        me {
          id
          enrolledCourses(first: 10) {
            edges {
              node {
                id
                title
                creator { displayName }
              }
            }
          }
        }
      }
    `,
  };

  const start = Date.now();
  const res = http.post(GRAPHQL_URL, JSON.stringify(coursesQuery), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });
  const duration = Date.now() - start;

  // Record metrics
  queryLatency.add(duration);
  errorRate.add(res.status !== 200 || res.json('errors') !== undefined);

  // Assertions
  check(res, {
    'status is 200': (r) => r.status === 200,
    'no GraphQL errors': (r) => r.json('errors') === undefined,
    'has data': (r) => r.json('data.me') !== undefined,
  });

  // Query 2: Semantic search (simulating user searching)
  const searchQuery = {
    query: `
      query Search($query: String!) {
        semanticSearch(query: $query, first: 5) {
          edges {
            node {
              id
              content
              similarity
            }
          }
        }
      }
    `,
    variables: {
      query: 'Rambam divine attributes',
    },
  };

  const searchRes = http.post(GRAPHQL_URL, JSON.stringify(searchQuery), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${AUTH_TOKEN}`,
    },
  });

  check(searchRes, {
    'search status is 200': (r) => r.status === 200,
    'search returns results': (r) => r.json('data.semanticSearch.edges').length > 0,
  });

  // Think time — simulate user reading results
  sleep(Math.random() * 3 + 1); // 1-4 seconds
}
```

**Example: Stress Test (100K Users)**

```javascript
// scripts/load-tests/stress.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 10000 },   // Ramp to 10K
    { duration: '10m', target: 50000 },  // Ramp to 50K
    { duration: '10m', target: 100000 }, // Ramp to 100K (stress point)
    { duration: '5m', target: 100000 },  // Sustain 100K
    { duration: '5m', target: 0 },       // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],   // Relaxed threshold for stress test
    http_req_failed: ['rate<0.05'],      // Allow up to 5% errors at peak
  },
};

// ... (similar test logic as load.js)
```

**Metrics to Track:**

| Metric | Target (Normal Load) | Target (Stress) |
|--------|---------------------|-----------------|
| **p50 latency** | <100ms | <200ms |
| **p95 latency** | <500ms | <1000ms |
| **p99 latency** | <1000ms | <2000ms |
| **Error rate** | <0.1% | <5% |
| **Throughput** | 10K RPS | 50K RPS |
| **Active WebSocket connections** | 100K sustained | 100K sustained |

**Commands:**
```bash
# Smoke test (quick validation)
k6 run scripts/load-tests/smoke.js

# Load test (10K users)
k6 run scripts/load-tests/load.js

# Stress test (100K users)
k6 run --out influxdb=http://localhost:8086/k6 scripts/load-tests/stress.js

# View results in Grafana dashboard
open http://localhost:3000/d/k6
```

---

## Naming Conventions

### File Naming

| Test Type | Pattern | Example |
|-----------|---------|---------|
| **Unit Tests** | `*.spec.ts` | `user.resolver.spec.ts` |
| **Integration Tests** | `*.integration.spec.ts` | `user.integration.spec.ts` |
| **GraphQL Tests** | `*.graphql.spec.ts` | `user.graphql.spec.ts` |
| **RLS Tests** | `*.rls.test.ts` or `*.test.ts` | `tenant-isolation.test.ts` |
| **E2E Tests** | `*.spec.ts` (in `e2e/` directory) | `auth.spec.ts` |
| **Load Tests** | `*.js` (in `scripts/load-tests/`) | `load.js` |

### Test Suite Naming

```typescript
// Format: describe('<EntityName><LayerName>', () => { ... })

describe('UserResolver', () => {
  // Tests for UserResolver class
});

describe('UserService', () => {
  // Tests for UserService class
});

describe('GraphQL: User Mutations', () => {
  // GraphQL API tests for User mutations
});

describe('RLS: Tenant Isolation', () => {
  // RLS policy tests for tenant isolation
});
```

### Test Case Naming

**Format:** `it('should [action] [context/condition]', async () => { ... })`

```typescript
// ✅ Good
it('should create user with RLS context', async () => { ... });
it('should reject unauthenticated request', async () => { ... });
it('should return 404 when course not found', async () => { ... });

// ❌ Bad
it('creates user', async () => { ... });            // Missing "should"
it('test authentication', async () => { ... });     // Vague
it('should work', async () => { ... });             // Too generic
```

**BDD-Style Naming (Given-When-Then):**

```typescript
describe('UserResolver.updateMyProfile()', () => {
  it('should update profile when user is authenticated', async () => {
    // Given: authenticated user
    // When: updateMyProfile is called
    // Then: profile is updated
  });

  it('should throw error when displayName is empty', async () => {
    // Given: invalid input (empty displayName)
    // When: updateMyProfile is called
    // Then: validation error is thrown
  });
});
```

---

## Test Structure

### Arrange-Act-Assert (AAA) Pattern

**Standard for all unit and integration tests:**

```typescript
it('should create course with tenant isolation', async () => {
  // Arrange — Set up test data and mocks
  const tenantId = '550e8400-e29b-41d4-a716-446655440000';
  const userId = '660e8400-e29b-41d4-a716-446655440001';
  const courseData = {
    title: 'Test Course',
    description: 'Test description',
  };
  const mockContext = { tenantId, userId, role: 'INSTRUCTOR' };

  // Act — Execute the code under test
  const createdCourse = await courseService.create(courseData, mockContext);

  // Assert — Verify the results
  expect(createdCourse).toMatchObject(courseData);
  expect(createdCourse.tenantId).toBe(tenantId);
  expect(createdCourse.creatorId).toBe(userId);
});
```

### Given-When-Then (BDD Style)

**Use for complex business logic and E2E tests:**

```typescript
test('should complete course enrollment flow', async ({ page }) => {
  // Given: user is logged in and viewing course catalog
  await loginPage.login('student@edusphere.dev', 'password');
  await catalogPage.goto();

  // When: user enrolls in a course
  await catalogPage.selectCourse('Introduction to Talmud');
  await coursePage.clickEnroll();

  // Then: user should see course in "My Courses"
  await dashboardPage.goto();
  await expect(dashboardPage.myCourses).toContainText('Introduction to Talmud');
});
```

### Setup and Teardown Best Practices

```typescript
describe('UserService with Database', () => {
  let db: Database;
  let userService: UserService;
  let testTenantId: string;

  // Run once before all tests in this suite
  beforeAll(async () => {
    db = await createTestDatabase();
    await runMigrations(db);
  }, 60000); // 60s timeout for DB setup

  // Run before each test
  beforeEach(async () => {
    // Seed test tenant (fresh for each test)
    const tenant = await db.insert(tenants).values({
      name: 'Test Tenant',
      slug: 'test-tenant',
    }).returning();
    testTenantId = tenant.id;

    userService = new UserService(db);
  });

  // Run after each test
  afterEach(async () => {
    // Clean up test data
    await db.delete(users).where(eq(users.tenantId, testTenantId));
    await db.delete(tenants).where(eq(tenants.id, testTenantId));
  });

  // Run once after all tests
  afterAll(async () => {
    await db.close();
  });

  it('should create user', async () => {
    // Test uses testTenantId from beforeEach
  });
});
```

**Anti-Patterns to Avoid:**

```typescript
// ❌ BAD: Shared mutable state between tests
let sharedUser: User; // DO NOT DO THIS

beforeAll(() => {
  sharedUser = createUser(); // Mutated by tests → flaky
});

it('test 1', () => {
  sharedUser.name = 'Changed'; // Affects test 2!
});

it('test 2', () => {
  expect(sharedUser.name).toBe('Original'); // FAILS due to test 1
});

// ✅ GOOD: Each test gets fresh data
beforeEach(() => {
  const user = createUser(); // New instance per test
});
```

---

## Mocking Strategy

### Mock External Services in Unit Tests

**Mock:** Keycloak, MinIO, NATS, External APIs

```typescript
// ✅ Unit Test: Mock external NATS client
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseService } from './course.service';
import { NatsClient } from '@edusphere/nats-client';

describe('CourseService', () => {
  let courseService: CourseService;
  let mockNatsClient: MockNatsClient;

  beforeEach(() => {
    mockNatsClient = {
      publish: vi.fn().mockResolvedValue(undefined),
    };
    courseService = new CourseService(db, mockNatsClient as any);
  });

  it('should publish event on course creation', async () => {
    // Arrange
    const courseData = { title: 'New Course' };

    // Act
    const course = await courseService.create(courseData);

    // Assert
    expect(mockNatsClient.publish).toHaveBeenCalledWith(
      `edusphere.${tenantId}.course.created`,
      expect.objectContaining({ courseId: course.id })
    );
  });
});
```

### Use Real Services in Integration Tests (Testcontainers)

**Real:** PostgreSQL, NATS, Redis (via Testcontainers)

```typescript
// ✅ Integration Test: Real PostgreSQL + Real NATS
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer } from 'testcontainers';

describe('Course Creation with Events (Integration)', () => {
  let postgresContainer: StartedPostgreSqlContainer;
  let natsContainer: StartedGenericContainer;
  let db: Database;
  let natsClient: NatsClient;

  beforeAll(async () => {
    // Start real PostgreSQL
    postgresContainer = await new PostgreSqlContainer('postgres:16').start();
    db = drizzle(postgresContainer.getConnectionString());

    // Start real NATS
    natsContainer = await new GenericContainer('nats:latest')
      .withExposedPorts(4222)
      .withCommand(['-js']) // Enable JetStream
      .start();
    natsClient = await NatsClient.connect(`nats://localhost:${natsContainer.getMappedPort(4222)}`);
  }, 120000); // 2 min timeout

  afterAll(async () => {
    await natsClient.close();
    await postgresContainer.stop();
    await natsContainer.stop();
  });

  it('should create course and publish event to NATS', async () => {
    // Arrange
    const subscription = await natsClient.subscribe('edusphere.*.course.created');
    const courseService = new CourseService(db, natsClient);

    // Act
    const course = await courseService.create({ title: 'Integration Test Course' });

    // Assert — Wait for event
    const event = await subscription.nextMessage(5000); // 5s timeout
    expect(event.data.courseId).toBe(course.id);
  });
});
```

### No Mocking in E2E Tests

**E2E tests use real backend, real database, real services:**

```typescript
// ✅ E2E Test: No mocks — full stack running
test('should create annotation via UI', async ({ page }) => {
  // Real login to Keycloak
  await page.goto('http://localhost:5173/login');
  await page.fill('input[name="email"]', 'student@edusphere.dev');
  await page.fill('input[name="password"]', 'dev-password');
  await page.click('button[type="submit"]');

  // Real GraphQL mutation to real backend
  await page.goto('http://localhost:5173/courses/some-course-id');
  await page.click('[data-testid="create-annotation"]');
  await page.fill('textarea', 'This is a test annotation');
  await page.click('button:has-text("Save")');

  // Verify data in real database
  const annotations = await db.select().from(annotationsTable);
  expect(annotations).toHaveLength(1);
  expect(annotations[0].content).toBe('This is a test annotation');
});
```

---

## GraphQL Testing

### Test Query and Mutation Separately

```typescript
describe('GraphQL: Course Queries', () => {
  it('should fetch course by ID', async () => {
    const query = `query GetCourse($id: ID!) { course(id: $id) { id title } }`;
    // Test query...
  });

  it('should fetch courses with pagination', async () => {
    const query = `query GetCourses($first: Int!) { courses(first: $first) { edges { node { id } } } }`;
    // Test pagination...
  });
});

describe('GraphQL: Course Mutations', () => {
  it('should create course', async () => {
    const mutation = `mutation CreateCourse($input: CreateCourseInput!) { createCourse(input: $input) { id title } }`;
    // Test mutation...
  });
});
```

### Test Authorization (JWT, Scopes, Roles)

```typescript
describe('GraphQL Authorization', () => {
  it('should require authentication for protected queries', async () => {
    const query = `query { me { id } }`;

    // Act — No auth token
    const response = await request(app)
      .post('/graphql')
      .send({ query });

    // Assert
    expect(response.body.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });

  it('should enforce @requiresScopes directive', async () => {
    const mutation = `mutation { deleteUser(id: "some-id") { id } }`;
    const studentToken = await getDevToken('student@edusphere.dev'); // No 'user:delete' scope

    // Act
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ query: mutation });

    // Assert
    expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(response.body.errors[0].message).toContain('scope');
  });

  it('should enforce @requiresRole directive', async () => {
    const mutation = `mutation { updateTenantPlan(plan: ENTERPRISE) { id plan } }`;
    const instructorToken = await getDevToken('instructor@edusphere.dev'); // Not SUPER_ADMIN

    // Act
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({ query: mutation });

    // Assert
    expect(response.body.errors[0].extensions.code).toBe('FORBIDDEN');
    expect(response.body.errors[0].message).toContain('role');
  });
});
```

### Test RLS Enforcement at GraphQL Layer

```typescript
describe('GraphQL RLS Enforcement', () => {
  it('should only return courses from current tenant', async () => {
    // Arrange — Create courses in two tenants
    const tenant1Token = await getDevToken('user1@tenant1.com');
    const tenant2Token = await getDevToken('user2@tenant2.com');

    // Create course in Tenant 1
    await createCourse({ title: 'Tenant 1 Course' }, tenant1Token);

    // Create course in Tenant 2
    await createCourse({ title: 'Tenant 2 Course' }, tenant2Token);

    // Act — Query as Tenant 1 user
    const query = `query { courses { edges { node { id title } } } }`;
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${tenant1Token}`)
      .send({ query });

    // Assert — Only sees Tenant 1 courses
    const courses = response.body.data.courses.edges.map(e => e.node);
    expect(courses).toHaveLength(1);
    expect(courses[0].title).toBe('Tenant 1 Course');
  });
});
```

### Test Error Responses

```typescript
describe('GraphQL Error Handling', () => {
  it('should return structured error for invalid input', async () => {
    const mutation = `
      mutation CreateCourse($input: CreateCourseInput!) {
        createCourse(input: $input) { id }
      }
    `;
    const variables = { input: { title: '' } }; // Invalid — empty title

    // Act
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ query: mutation, variables });

    // Assert
    expect(response.body.errors).toBeDefined();
    expect(response.body.errors[0]).toMatchObject({
      message: expect.stringContaining('title'),
      extensions: {
        code: 'BAD_USER_INPUT',
        details: expect.any(Object),
      },
    });
  });

  it('should return 404 error for non-existent resource', async () => {
    const query = `query { course(id: "non-existent-id") { id } }`;

    // Act
    const response = await request(app)
      .post('/graphql')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ query });

    // Assert
    expect(response.body.errors[0].extensions.code).toBe('NOT_FOUND');
  });
});
```

---

## RLS Testing

### Test Tenant Isolation

**Critical:** Tenant A **MUST NOT** see Tenant B data.

```typescript
describe('RLS: Tenant Isolation', () => {
  it('should block cross-tenant user queries', async () => {
    // Arrange
    const [tenantA] = await createTenant('Tenant A');
    const [tenantB] = await createTenant('Tenant B');
    const [userA] = await createUser({ tenantId: tenantA.id, email: 'a@example.com' });
    const [userB] = await createUser({ tenantId: tenantB.id, email: 'b@example.com' });

    // Act — Query as Tenant A
    const users = await withTenantContext(tenantA.id, userA.id, 'STUDENT', async () => {
      return db.select().from(usersTable);
    });

    // Assert — Only sees Tenant A users
    expect(users).toHaveLength(1);
    expect(users[0].id).toBe(userA.id);
  });

  it('should block cross-tenant course enrollment', async () => {
    // Arrange
    const [tenantA] = await createTenant('Tenant A');
    const [tenantB] = await createTenant('Tenant B');
    const [courseB] = await createCourse({ tenantId: tenantB.id, title: 'Tenant B Course' });

    // Act — Try to enroll Tenant A user in Tenant B course
    const enrollmentAttempt = withTenantContext(tenantA.id, 'user-a-id', 'STUDENT', async () => {
      return db.insert(enrollments).values({
        userId: 'user-a-id',
        courseId: courseB.id, // Cross-tenant!
      });
    });

    // Assert — RLS blocks insert
    await expect(enrollmentAttempt).rejects.toThrow(); // Or returns 0 rows affected
  });
});
```

### Test Role-Based Access

**Student vs Instructor vs Admin:**

```typescript
describe('RLS: Role-Based Access', () => {
  it('should allow INSTRUCTOR to see all course annotations', async () => {
    // Arrange
    const [tenant] = await createTenant('Test Tenant');
    const [instructor] = await createUser({ tenantId: tenant.id, role: 'INSTRUCTOR' });
    const [student] = await createUser({ tenantId: tenant.id, role: 'STUDENT' });
    const [annotation] = await createAnnotation({
      tenantId: tenant.id,
      authorId: student.id,
      layer: 'SHARED',
    });

    // Act — Query as INSTRUCTOR
    const annotations = await withTenantContext(tenant.id, instructor.id, 'INSTRUCTOR', async () => {
      return db.select().from(annotationsTable);
    });

    // Assert — Sees student's annotation
    expect(annotations).toHaveLength(1);
    expect(annotations[0].id).toBe(annotation.id);
  });

  it('should block STUDENT from seeing INSTRUCTOR layer', async () => {
    // Arrange
    const [tenant] = await createTenant('Test Tenant');
    const [instructor] = await createUser({ tenantId: tenant.id, role: 'INSTRUCTOR' });
    const [student] = await createUser({ tenantId: tenant.id, role: 'STUDENT' });
    const [annotation] = await createAnnotation({
      tenantId: tenant.id,
      authorId: instructor.id,
      layer: 'INSTRUCTOR', // Instructor-only
    });

    // Act — Query as STUDENT
    const annotations = await withTenantContext(tenant.id, student.id, 'STUDENT', async () => {
      return db.select().from(annotationsTable);
    });

    // Assert — RLS hides INSTRUCTOR layer
    expect(annotations).toHaveLength(0);
  });
});
```

### Test Owner-Only Policies (PERSONAL Annotations)

```typescript
describe('RLS: Owner-Only Access', () => {
  it('should allow owner to see PERSONAL annotations', async () => {
    // Arrange
    const [tenant] = await createTenant('Test Tenant');
    const [owner] = await createUser({ tenantId: tenant.id, role: 'STUDENT' });
    const [annotation] = await createAnnotation({
      tenantId: tenant.id,
      authorId: owner.id,
      layer: 'PERSONAL',
    });

    // Act
    const annotations = await withTenantContext(tenant.id, owner.id, 'STUDENT', async () => {
      return db.select().from(annotationsTable);
    });

    // Assert
    expect(annotations).toHaveLength(1);
    expect(annotations[0].id).toBe(annotation.id);
  });

  it('should block other students from seeing PERSONAL annotations', async () => {
    // Arrange
    const [tenant] = await createTenant('Test Tenant');
    const [owner] = await createUser({ tenantId: tenant.id, role: 'STUDENT' });
    const [otherStudent] = await createUser({ tenantId: tenant.id, role: 'STUDENT' });
    await createAnnotation({
      tenantId: tenant.id,
      authorId: owner.id,
      layer: 'PERSONAL',
    });

    // Act — Query as different student
    const annotations = await withTenantContext(tenant.id, otherStudent.id, 'STUDENT', async () => {
      return db.select().from(annotationsTable);
    });

    // Assert — RLS hides owner's PERSONAL annotation
    expect(annotations).toHaveLength(0);
  });

  it('should allow INSTRUCTOR to see PERSONAL annotations', async () => {
    // Arrange
    const [tenant] = await createTenant('Test Tenant');
    const [student] = await createUser({ tenantId: tenant.id, role: 'STUDENT' });
    const [instructor] = await createUser({ tenantId: tenant.id, role: 'INSTRUCTOR' });
    const [annotation] = await createAnnotation({
      tenantId: tenant.id,
      authorId: student.id,
      layer: 'PERSONAL',
    });

    // Act — Query as INSTRUCTOR
    const annotations = await withTenantContext(tenant.id, instructor.id, 'INSTRUCTOR', async () => {
      return db.select().from(annotationsTable);
    });

    // Assert — Instructors can see student PERSONAL annotations
    expect(annotations).toHaveLength(1);
    expect(annotations[0].layer).toBe('PERSONAL');
  });
});
```

---

## E2E Testing

### Page Object Model (POM) Pattern

**Encapsulate page interactions in reusable classes:**

```typescript
// apps/web/e2e/pages/course-management.page.ts
import { Page, Locator } from '@playwright/test';

export class CourseManagementPage {
  readonly page: Page;
  readonly createCourseButton: Locator;
  readonly courseTitleInput: Locator;
  readonly courseDescriptionInput: Locator;
  readonly submitButton: Locator;
  readonly courseList: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createCourseButton = page.locator('[data-testid="create-course-btn"]');
    this.courseTitleInput = page.locator('input[name="title"]');
    this.courseDescriptionInput = page.locator('textarea[name="description"]');
    this.submitButton = page.locator('button[type="submit"]');
    this.courseList = page.locator('[data-testid="course-list"]');
  }

  async goto() {
    await this.page.goto('http://localhost:5173/courses');
  }

  async createCourse(title: string, description: string) {
    await this.createCourseButton.click();
    await this.courseTitleInput.fill(title);
    await this.courseDescriptionInput.fill(description);
    await this.submitButton.click();
    // Wait for navigation or success message
    await this.page.waitForURL(/\/courses\/[a-f0-9-]+/);
  }

  async getCourseByTitle(title: string): Promise<Locator> {
    return this.courseList.locator(`text=${title}`);
  }
}
```

### Fixtures for Common Setups

**Reusable test fixtures:**

```typescript
// apps/web/e2e/fixtures/auth.fixture.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/login.page';

type AuthFixtures = {
  authenticatedPage: Page;
  studentContext: BrowserContext;
  instructorContext: BrowserContext;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.login('student@edusphere.dev', 'dev-password');
    await use(page);
  },

  studentContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/student.json' });
    await use(context);
    await context.close();
  },

  instructorContext: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: 'e2e/.auth/instructor.json' });
    await use(context);
    await context.close();
  },
});

export { expect };
```

**Usage:**

```typescript
// apps/web/e2e/course-management.spec.ts
import { test, expect } from './fixtures/auth.fixture';
import { CourseManagementPage } from './pages/course-management.page';

test.describe('Course Management (Authenticated)', () => {
  test('should create new course as instructor', async ({ authenticatedPage }) => {
    const coursePage = new CourseManagementPage(authenticatedPage);
    await coursePage.goto();
    await coursePage.createCourse('New Course', 'Test description');

    await expect(coursePage.getCourseByTitle('New Course')).toBeVisible();
  });
});
```

### Test Data Seeding

**Seed data before E2E tests:**

```typescript
// apps/web/e2e/helpers/seed-data.ts
import { db } from '@edusphere/db';
import { tenants, users, courses } from '@edusphere/db/schema';

export async function seedTestData() {
  // Clear existing test data
  await db.delete(courses).where(like(courses.title, 'E2E Test%'));
  await db.delete(users).where(like(users.email, '%@e2e-test.dev'));

  // Create test tenant
  const [tenant] = await db.insert(tenants).values({
    name: 'E2E Test Tenant',
    slug: 'e2e-test-tenant',
    plan: 'PROFESSIONAL',
  }).returning();

  // Create test users
  const [instructor] = await db.insert(users).values({
    tenantId: tenant.id,
    email: 'instructor@e2e-test.dev',
    displayName: 'Test Instructor',
    role: 'INSTRUCTOR',
  }).returning();

  const [student] = await db.insert(users).values({
    tenantId: tenant.id,
    email: 'student@e2e-test.dev',
    displayName: 'Test Student',
    role: 'STUDENT',
  }).returning();

  // Create test course
  const [course] = await db.insert(courses).values({
    tenantId: tenant.id,
    creatorId: instructor.id,
    title: 'E2E Test Course',
    description: 'Course for E2E testing',
  }).returning();

  return { tenant, instructor, student, course };
}
```

**Use in global setup:**

```typescript
// apps/web/e2e/global-setup.ts
import { seedTestData } from './helpers/seed-data';

export default async function globalSetup() {
  console.log('Seeding E2E test data...');
  await seedTestData();
  console.log('E2E test data seeded successfully.');
}
```

**Configure in `playwright.config.ts`:**

```typescript
export default defineConfig({
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  // ...
});
```

### Cleanup After Tests

```typescript
// apps/web/e2e/global-teardown.ts
import { db } from '@edusphere/db';
import { tenants, users, courses } from '@edusphere/db/schema';

export default async function globalTeardown() {
  console.log('Cleaning up E2E test data...');

  // Delete test data
  await db.delete(courses).where(like(courses.title, 'E2E Test%'));
  await db.delete(users).where(like(users.email, '%@e2e-test.dev'));
  await db.delete(tenants).where(eq(tenants.slug, 'e2e-test-tenant'));

  console.log('E2E test data cleaned up.');
}
```

---

## Performance Testing

### k6 Test Scenarios

#### 1. Smoke Test (Sanity Check)

**Goal:** Verify system works with minimal load.

```javascript
// scripts/load-tests/smoke.js
export const options = {
  vus: 1,        // 1 virtual user
  duration: '1m', // 1 minute
  thresholds: {
    http_req_failed: ['rate<0.01'], // Less than 1% errors
  },
};
```

#### 2. Load Test (Expected Traffic)

**Goal:** Validate performance under normal load.

```javascript
// scripts/load-tests/load.js
export const options = {
  stages: [
    { duration: '5m', target: 10000 },  // Ramp to 10K users
    { duration: '30m', target: 10000 }, // Sustain 10K
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95th percentile < 500ms
    http_req_failed: ['rate<0.01'],     // Error rate < 1%
  },
};
```

#### 3. Stress Test (Breaking Point)

**Goal:** Find system limits.

```javascript
// scripts/load-tests/stress.js
export const options = {
  stages: [
    { duration: '10m', target: 50000 },  // Ramp to 50K
    { duration: '10m', target: 100000 }, // Ramp to 100K
    { duration: '5m', target: 100000 },  // Sustain 100K
    { duration: '10m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // Relaxed threshold
    http_req_failed: ['rate<0.05'],      // Allow 5% errors at peak
  },
};
```

#### 4. Spike Test (Sudden Traffic Burst)

**Goal:** Test autoscaling response.

```javascript
// scripts/load-tests/spike.js
export const options = {
  stages: [
    { duration: '1m', target: 1000 },   // Normal load
    { duration: '30s', target: 50000 }, // Sudden spike!
    { duration: '2m', target: 50000 },  // Sustain spike
    { duration: '1m', target: 1000 },   // Back to normal
    { duration: '1m', target: 0 },      // Ramp down
  ],
};
```

### Metrics to Track

| Metric | Description | Normal Load Target | Stress Target |
|--------|-------------|-------------------|--------------|
| **http_req_duration (p50)** | Median response time | <100ms | <200ms |
| **http_req_duration (p95)** | 95th percentile latency | <500ms | <1000ms |
| **http_req_duration (p99)** | 99th percentile latency | <1000ms | <2000ms |
| **http_req_failed** | Error rate | <0.1% | <5% |
| **http_reqs** | Requests per second | 10K RPS | 50K RPS |
| **ws_connecting** | WebSocket connection time | <200ms | <500ms |
| **ws_sessions** | Active WebSocket sessions | 100K sustained | 100K sustained |

### Acceptance Criteria Per Phase

**Phase 7.5: Load Testing**

```bash
# Smoke test must pass
k6 run scripts/load-tests/smoke.js
# → 0 errors, all thresholds green

# Load test (10K users)
k6 run scripts/load-tests/load.js
# → p95 < 500ms, error rate < 0.1%

# Stress test (100K users)
k6 run scripts/load-tests/stress.js
# → p95 < 1000ms at peak, error rate < 5%

# Spike test (sudden 50K users)
k6 run scripts/load-tests/spike.js
# → System recovers within 30s, no crashes
```

---

## Coverage Requirements

### Backend Coverage

**Target:** >90% line coverage per subgraph

```json
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      lines: 90,
      functions: 90,
      branches: 85,
      statements: 90,
      exclude: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/test/**',
        '**/generated/**',
        '**/*.d.ts',
      ],
    },
  },
});
```

**Commands:**

```bash
# Run with coverage
pnpm --filter @edusphere/subgraph-core test -- --coverage

# View HTML report
open apps/subgraph-core/coverage/index.html
```

### Frontend Coverage

**Target:** >80% component coverage

```typescript
// apps/web/vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.stories.tsx',
        'src/**/*.spec.{ts,tsx}',
        'src/main.tsx',
      ],
    },
  },
});
```

### RLS Coverage

**Target:** **100% coverage (security-critical)**

```bash
# RLS tests must have 100% coverage
pnpm --filter @edusphere/db test -- --testPathPattern=rls --coverage

# CI enforces 100% threshold
if [ "$RLS_COVERAGE" -lt 100 ]; then
  echo "ERROR: RLS coverage is ${RLS_COVERAGE}%. Must be 100%."
  exit 1
fi
```

### Coverage Enforcement in CI

```yaml
# .github/workflows/test.yml
- name: Run tests with coverage
  run: pnpm turbo test -- --coverage

- name: Check coverage thresholds
  run: |
    pnpm --filter @edusphere/subgraph-core exec vitest --coverage --reporter=json
    # Parse coverage JSON and fail if below thresholds

- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
    fail_ci_if_error: true
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        package:
          - '@edusphere/subgraph-core'
          - '@edusphere/subgraph-content'
          - '@edusphere/subgraph-annotation'
          - '@edusphere/subgraph-collaboration'
          - '@edusphere/subgraph-agent'
          - '@edusphere/subgraph-knowledge'
          - '@edusphere/web'
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run unit tests
        run: pnpm --filter ${{ matrix.package }} test -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: ${{ matrix.package }}

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-bookworm
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      nats:
        image: nats:latest
        options: >-
          --health-cmd "nats server check jetstream"
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run migrations
        run: pnpm --filter @edusphere/db migrate
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test_db

      - name: Run integration tests
        run: pnpm turbo test -- --testPathPattern=integration
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test_db
          NATS_URL: nats://localhost:4222

  rls-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Start PostgreSQL with Testcontainers
        run: docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:16

      - name: Run RLS tests
        run: pnpm --filter @edusphere/db test -- --testPathPattern=rls --coverage

      - name: Enforce 100% RLS coverage
        run: |
          RLS_COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$RLS_COVERAGE < 100" | bc -l) )); then
            echo "ERROR: RLS coverage is ${RLS_COVERAGE}%. Must be 100%."
            exit 1
          fi

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
      - name: Install Playwright
        run: pnpm --filter @edusphere/web exec playwright install --with-deps

      - name: Start full stack (docker-compose)
        run: docker-compose -f docker-compose.test.yml up -d

      - name: Wait for services
        run: ./scripts/health-check.sh

      - name: Run E2E tests
        run: pnpm --filter @edusphere/web test:e2e

      - name: Upload Playwright report
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: apps/web/playwright-report/

  federation-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Compose supergraph
        run: pnpm --filter @edusphere/gateway compose

      - name: Run federation tests
        run: pnpm --filter @edusphere/gateway test -- --testPathPattern=federation
```

### Parallel Execution Per Package

```json
// turbo.json
{
  "pipeline": {
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "cache": false // Tests should always run fresh
    },
    "test:integration": {
      "dependsOn": ["^build"],
      "cache": false
    },
    "test:e2e": {
      "dependsOn": ["build"],
      "cache": false
    }
  }
}
```

**Run tests in parallel:**

```bash
# All unit tests across all packages in parallel
pnpm turbo test -- --coverage

# All integration tests in parallel
pnpm turbo test -- --testPathPattern=integration
```

### Test Reports and Artifacts

```yaml
# Upload test reports
- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: test-results
    path: |
      **/coverage/
      **/test-results/
      **/playwright-report/
```

---

## Test Data Management

### Seed Scripts for Development

```typescript
// packages/db/src/seed.ts
import { db } from './client';
import { tenants, users, courses, modules, mediaAssets } from './schema';
import { withTenantContext } from './rls';

export async function seed() {
  console.log('🌱 Seeding database...');

  // Create default tenant
  const [tenant] = await db.insert(tenants).values({
    id: '550e8400-e29b-41d4-a716-446655440000', // Known UUID for dev
    name: 'EduSphere Demo',
    slug: 'edusphere-demo',
    plan: 'PROFESSIONAL',
  }).onConflictDoNothing().returning();

  console.log(`✅ Created tenant: ${tenant.name}`);

  // Create users
  await withTenantContext(tenant.id, 'system', 'SUPER_ADMIN', async () => {
    const [admin] = await db.insert(users).values({
      email: 'admin@edusphere.dev',
      displayName: 'Admin User',
      role: 'SUPER_ADMIN',
    }).onConflictDoNothing().returning();

    const [instructor] = await db.insert(users).values({
      email: 'instructor@edusphere.dev',
      displayName: 'Test Instructor',
      role: 'INSTRUCTOR',
    }).onConflictDoNothing().returning();

    const [student] = await db.insert(users).values({
      email: 'student@edusphere.dev',
      displayName: 'Test Student',
      role: 'STUDENT',
    }).onConflictDoNothing().returning();

    console.log(`✅ Created users: ${admin.email}, ${instructor.email}, ${student.email}`);

    // Create sample course
    const [course] = await db.insert(courses).values({
      title: 'Introduction to Talmud',
      description: 'Learn the basics of Talmudic study',
      creatorId: instructor.id,
      isPublished: true,
    }).returning();

    console.log(`✅ Created course: ${course.title}`);

    // Create modules
    const [module1] = await db.insert(modules).values({
      courseId: course.id,
      title: 'Module 1: Foundations',
      orderIndex: 1,
    }).returning();

    // Create media asset
    await db.insert(mediaAssets).values({
      courseId: course.id,
      filename: 'lecture-1.mp4',
      mimeType: 'video/mp4',
      size: 1024000,
      storageUrl: 'https://minio:9000/edusphere/demo/lecture-1.mp4',
      status: 'READY',
    });

    console.log(`✅ Created modules and media`);
  });

  console.log('🎉 Seeding complete!');
}

seed().catch(console.error);
```

**Run seed script:**

```bash
pnpm --filter @edusphere/db seed
```

### Factory Functions for Test Data

```typescript
// packages/db/src/test/factories/user.factory.ts
import { db } from '../../client';
import { users } from '../../schema';
import { faker } from '@faker-js/faker';

export async function createUser(overrides?: Partial<typeof users.$inferInsert>) {
  const [user] = await db.insert(users).values({
    email: faker.internet.email(),
    displayName: faker.person.fullName(),
    role: 'STUDENT',
    ...overrides,
  }).returning();

  return user;
}

export async function createInstructor(overrides?: Partial<typeof users.$inferInsert>) {
  return createUser({ role: 'INSTRUCTOR', ...overrides });
}

export async function createAdmin(overrides?: Partial<typeof users.$inferInsert>) {
  return createUser({ role: 'SUPER_ADMIN', ...overrides });
}
```

**Usage in tests:**

```typescript
import { createUser, createInstructor } from '../factories/user.factory';
import { createCourse } from '../factories/course.factory';

it('should enroll student in course', async () => {
  // Arrange
  const instructor = await createInstructor({ tenantId });
  const student = await createUser({ tenantId });
  const course = await createCourse({ creatorId: instructor.id, tenantId });

  // Act
  const enrollment = await enrollmentService.enroll(student.id, course.id);

  // Assert
  expect(enrollment).toBeDefined();
});
```

### Cleanup Strategies

**Strategy 1: Delete in `afterEach`**

```typescript
afterEach(async () => {
  await db.delete(enrollments).where(eq(enrollments.tenantId, testTenantId));
  await db.delete(courses).where(eq(courses.tenantId, testTenantId));
  await db.delete(users).where(eq(users.tenantId, testTenantId));
  await db.delete(tenants).where(eq(tenants.id, testTenantId));
});
```

**Strategy 2: Transactional Rollback (Faster)**

```typescript
import { db } from './client';

let transaction: any;

beforeEach(async () => {
  transaction = await db.transaction();
});

afterEach(async () => {
  await transaction.rollback(); // All changes rolled back
});

it('should create user', async () => {
  const user = await transaction.insert(users).values({...}).returning();
  // Changes only visible within transaction
});
```

**Strategy 3: Testcontainers (Isolated)**

```typescript
// Each test suite gets fresh database
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  db = drizzle(container.getConnectionString());
  await migrate(db, { migrationsFolder: './drizzle' });
}, 60000);

afterAll(async () => {
  await container.stop(); // Entire DB destroyed
});
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: Tests fail with "Connection refused" to PostgreSQL

**Solution:**

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Start PostgreSQL via docker-compose
docker-compose up -d postgres

# Verify connection
psql postgres://postgres:password@localhost:5432/edusphere -c "SELECT 1"
```

#### Issue: RLS tests fail with "Tenant isolation broken"

**Checklist:**

1. Verify RLS is enabled on table:
   ```sql
   SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'users';
   ```

2. Check RLS policy exists:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

3. Verify `withTenantContext()` sets session variables:
   ```typescript
   // Add debug logging
   console.log('Setting tenant context:', tenantId);
   await db.execute(sql`SET LOCAL app.current_tenant = ${tenantId}`);
   const result = await db.execute(sql`SHOW app.current_tenant`);
   console.log('Current tenant:', result.rows[0]);
   ```

#### Issue: GraphQL tests fail with "UNAUTHENTICATED"

**Solution:**

```typescript
// Verify JWT token generation
const token = await getDevToken('student@edusphere.dev');
console.log('Token:', token);

// Decode and verify claims
const payload = decodeJWT(token);
console.log('Payload:', payload);
expect(payload.tenant_id).toBeDefined();
expect(payload.sub).toBeDefined();

// Check Authorization header
const response = await request(app)
  .post('/graphql')
  .set('Authorization', `Bearer ${token}`)  // Must include "Bearer "
  .send({ query });
```

#### Issue: E2E tests timeout waiting for page

**Solution:**

```typescript
// Increase timeout for slow operations
test('should upload video', async ({ page }) => {
  test.setTimeout(120000); // 2 minutes

  await page.goto('/courses/upload', { waitUntil: 'networkidle' });
  // ...
});

// Wait for specific network conditions
await page.waitForLoadState('domcontentloaded');
await page.waitForSelector('[data-testid="video-player"]', { state: 'visible' });
```

#### Issue: Integration tests fail with Testcontainers startup timeout

**Solution:**

```typescript
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-bookworm')
    .withStartupTimeout(120000) // 2 minutes
    .withExposedPorts(5432)
    .withEnvironment({ POSTGRES_PASSWORD: 'test' })
    .start();
}, 150000); // Give beforeAll extra time
```

#### Issue: Load tests show high error rate

**Debugging:**

```javascript
// Add detailed error logging to k6 script
import { check } from 'k6';

const res = http.post(GRAPHQL_URL, payload, { headers });

const passed = check(res, {
  'status is 200': (r) => r.status === 200,
  'no errors': (r) => {
    if (r.json('errors')) {
      console.error('GraphQL Error:', JSON.stringify(r.json('errors'), null, 2));
      return false;
    }
    return true;
  },
});

if (!passed) {
  console.error('Request failed:', res.status, res.body);
}
```

**Common causes:**
- Connection pool exhaustion → Increase `DATABASE_POOL_SIZE`
- Rate limiting → Adjust rate limit thresholds
- Memory leaks → Profile with `NODE_OPTIONS=--max-old-space-size=4096`

#### Issue: Coverage report shows uncovered RLS code

**Solution:**

```typescript
// Ensure all RLS paths are tested
describe('RLS: Comprehensive Coverage', () => {
  it('should test SUPER_ADMIN cross-tenant access', async () => { /* ... */ });
  it('should test ORG_ADMIN within tenant', async () => { /* ... */ });
  it('should test INSTRUCTOR role', async () => { /* ... */ });
  it('should test STUDENT role', async () => { /* ... */ });
  it('should test RESEARCHER role', async () => { /* ... */ });
  it('should test soft-deleted records hidden', async () => { /* ... */ });
});
```

---

## Best Practices Summary

### DO

- ✅ Write tests **before** pushing code (Test-Driven Development)
- ✅ Use **Arrange-Act-Assert** pattern consistently
- ✅ Mock external services in **unit tests**
- ✅ Use **real services** (Testcontainers) in **integration tests**
- ✅ Test **tenant isolation** for every new RLS-enabled table
- ✅ Test **authorization** (JWT scopes, roles) for every mutation
- ✅ Use **Page Object Model** for E2E tests
- ✅ Run **load tests** before major releases
- ✅ Aim for **>90% backend coverage, >80% frontend coverage, 100% RLS coverage**
- ✅ Use **factories** for test data generation
- ✅ Clean up test data in `afterEach` or use transactions

### DON'T

- ❌ Don't skip tests because "it's just a small change"
- ❌ Don't commit code with failing tests
- ❌ Don't share mutable state between tests
- ❌ Don't test implementation details — test **behavior**
- ❌ Don't mock the database in integration tests
- ❌ Don't use `any` types in test files
- ❌ Don't copy-paste test code — use **helpers and factories**
- ❌ Don't ignore flaky tests — **fix them immediately**
- ❌ Don't merge PRs without CI passing

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Testing Implementation Instead of Behavior

```typescript
// ❌ BAD: Testing internal state
it('should set isLoading to true', () => {
  component.fetchData();
  expect(component.isLoading).toBe(true); // Implementation detail
});

// ✅ GOOD: Testing user-facing behavior
it('should show loading spinner while fetching', async () => {
  render(<Component />);
  expect(screen.getByRole('progressbar')).toBeInTheDocument();
});
```

### Anti-Pattern 2: Overly Complex Test Setup

```typescript
// ❌ BAD: 50 lines of setup
beforeEach(async () => {
  // 50 lines of complex setup...
  // Hard to understand what's being tested
});

// ✅ GOOD: Use factory functions
beforeEach(async () => {
  const scenario = await createTestScenario('instructor-with-course');
  // Clear and reusable
});
```

### Anti-Pattern 3: Testing Multiple Things in One Test

```typescript
// ❌ BAD: Testing create, update, delete in one test
it('should CRUD course', async () => {
  const course = await create();
  const updated = await update(course.id);
  await delete(course.id);
  // If update fails, delete never runs — test is flaky
});

// ✅ GOOD: Separate tests
it('should create course', async () => { /* ... */ });
it('should update course', async () => { /* ... */ });
it('should delete course', async () => { /* ... */ });
```

---

## Appendix: Test File Locations Reference

| Test Type | Location Pattern | Example |
|-----------|-----------------|---------|
| **Subgraph Unit Tests** | `apps/subgraph-*/src/**/*.spec.ts` | `apps/subgraph-core/src/resolvers/user.resolver.spec.ts` |
| **Subgraph Integration Tests** | `apps/subgraph-*/src/test/integration/*.spec.ts` | `apps/subgraph-core/src/test/integration/user.integration.spec.ts` |
| **GraphQL API Tests** | `apps/subgraph-*/src/test/graphql/*.spec.ts` | `apps/subgraph-core/src/test/graphql/user.graphql.spec.ts` |
| **RLS Validation Tests** | `packages/db/src/rls/*.test.ts` | `packages/db/src/rls/tenant-isolation.test.ts` |
| **Federation Tests** | `apps/gateway/src/test/federation/*.spec.ts` | `apps/gateway/src/test/federation/entity-resolution.spec.ts` |
| **Frontend Unit Tests** | `apps/web/src/**/*.test.{ts,tsx}` | `apps/web/src/components/CourseCard.test.tsx` |
| **E2E Tests** | `apps/web/e2e/*.spec.ts` | `apps/web/e2e/auth.spec.ts` |
| **Load Tests** | `scripts/load-tests/*.js` | `scripts/load-tests/stress.js` |
| **Test Helpers** | `**/test/helpers/*.ts` | `apps/subgraph-core/src/test/helpers/auth.helper.ts` |
| **Test Fixtures** | `**/test/fixtures/*.ts` | `apps/web/e2e/fixtures/auth.fixture.ts` |
| **Test Factories** | `packages/db/src/test/factories/*.ts` | `packages/db/src/test/factories/user.factory.ts` |

---

**Last Updated:** February 2026
**Version:** 1.0.0
**Maintained By:** EduSphere Development Team

For questions or clarifications, refer to:
- `CLAUDE.md` — AI assistant configuration
- `IMPLEMENTATION-ROADMAP.md` — Phase-by-phase testing acceptance criteria
- `API-CONTRACTS-GRAPHQL-FEDERATION.md` — GraphQL schema contracts
