# EduSphere Development Guidelines

> **Purpose**: This document defines development standards, best practices, and conventions for the EduSphere platform.
> Every team member must adhere to these guidelines to ensure code quality, maintainability, and consistency across the codebase.
>
> **Scale Target**: 100,000+ concurrent users — every decision must consider performance, security, and scalability.
>
> **Last Updated**: February 2026

---

## Table of Contents

1. [Development Philosophy](#1-development-philosophy)
2. [Code Organization](#2-code-organization)
3. [TypeScript Standards](#3-typescript-standards)
4. [File Size Guidelines](#4-file-size-guidelines)
5. [Naming Conventions](#5-naming-conventions)
6. [GraphQL Conventions](#6-graphql-conventions)
7. [NestJS Patterns](#7-nestjs-patterns)
8. [Database Patterns](#8-database-patterns)
9. [Multi-tenancy](#9-multi-tenancy)
10. [Authentication & Authorization](#10-authentication--authorization)
11. [Error Handling](#11-error-handling)
12. [Logging](#12-logging)
13. [Testing](#13-testing)
14. [Git Workflow](#14-git-workflow)
15. [Code Review Guidelines](#15-code-review-guidelines)
16. [Performance Optimization](#16-performance-optimization)
17. [Security Best Practices](#17-security-best-practices)
18. [Documentation](#18-documentation)

---

## 1. Development Philosophy

EduSphere follows industry-standard principles for clean, maintainable, and scalable code:

### 1.1 Clean Code Principles

**Write code for humans first, computers second.**

- **Readability**: Code is read 10x more than it's written. Optimize for clarity.
- **Self-documenting**: Variable and function names should explain their purpose.
- **Single Responsibility**: Each function/class does one thing well.
- **DRY (Don't Repeat Yourself)**: Extract duplicate logic into reusable utilities.
- **KISS (Keep It Simple, Stupid)**: Favor simple solutions over clever ones.
- **YAGNI (You Aren't Gonna Need It)**: Don't add features until they're needed.

### 1.2 SOLID Principles

For object-oriented code (especially NestJS services):

- **S**ingle Responsibility: One class, one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes must be substitutable for base types
- **I**nterface Segregation: Many specific interfaces > one general interface
- **D**ependency Inversion: Depend on abstractions, not concretions

### 1.3 Examples

**✅ DO**: Write clear, self-documenting code

```typescript
// Good: Clear intent, single responsibility
async function getUserCoursesWithProgress(
  userId: string,
  tenantId: string
): Promise<CourseProgress[]> {
  return withTenantContext(tenantId, userId, UserRole.STUDENT, async () => {
    const courses = await db.query.courses.findMany({
      with: { modules: true },
      where: eq(courses.creatorId, userId),
    });

    return courses.map(calculateCourseProgress);
  });
}
```

**❌ DON'T**: Write cryptic, multi-responsibility code

```typescript
// Bad: Unclear names, doing too much
async function getData(id: string, tid: string): Promise<any> {
  const data = await db.query.courses.findMany({
    with: { modules: true },
    where: eq(courses.creatorId, id),
  });

  // Mixing data fetching with business logic
  return data.map((c) => ({
    ...c,
    progress:
      (c.modules.filter((m) => m.completed).length / c.modules.length) * 100,
    formattedDate: new Date(c.createdAt).toLocaleDateString(),
  }));
}
```

---

## 2. Code Organization

### 2.1 Monorepo Structure

EduSphere uses **pnpm workspaces + Turborepo** for efficient monorepo management:

```
edusphere/
├── apps/                          # Application packages
│   ├── gateway/                   # Hive Gateway v2 (port 4000)
│   ├── subgraph-core/             # Core subgraph (port 4001)
│   ├── subgraph-content/          # Content subgraph (port 4002)
│   ├── subgraph-annotation/       # Annotation subgraph (port 4003)
│   ├── subgraph-collaboration/    # Collaboration subgraph (port 4004)
│   ├── subgraph-agent/            # Agent subgraph (port 4005)
│   ├── subgraph-knowledge/        # Knowledge subgraph (port 4006)
│   ├── web/                       # React SPA (Vite)
│   ├── mobile/                    # Expo SDK 54
│   └── transcription-worker/      # faster-whisper worker
├── packages/                      # Shared libraries
│   ├── db/                        # Drizzle schemas, migrations, RLS
│   ├── graphql-shared/            # Shared SDL (scalars, enums, directives)
│   ├── graphql-types/             # Generated TypeScript types
│   ├── auth/                      # JWT validation, guards
│   ├── nats-client/               # NATS JetStream wrapper
│   ├── eslint-config/             # Shared ESLint rules
│   └── tsconfig/                  # Shared TypeScript configs
├── infrastructure/                # Infrastructure as code
│   ├── docker/                    # Dockerfiles
│   ├── docker-compose.yml         # Local dev stack
│   └── k8s/                       # Kubernetes manifests
└── scripts/                       # Utility scripts
```

### 2.2 Subgraph File Organization

Each subgraph follows a consistent structure:

```
apps/subgraph-core/
├── src/
│   ├── main.ts                    # Entry point (NestJS bootstrap)
│   ├── app.module.ts              # Root module
│   ├── graphql/
│   │   ├── schema.graphql         # SDL schema file
│   │   └── generated.ts           # Codegen output (gitignored)
│   ├── users/
│   │   ├── user.resolver.ts       # GraphQL resolvers
│   │   ├── user.service.ts        # Business logic
│   │   ├── user.validation.ts     # Zod schemas
│   │   ├── user.types.ts          # TypeScript types (non-GraphQL)
│   │   ├── user.resolver.spec.ts  # Unit tests
│   │   └── index.ts               # Barrel export
│   ├── tenants/
│   │   └── (same structure as users/)
│   └── test/
│       ├── integration/           # Integration tests
│       └── e2e/                   # E2E tests
├── test/                          # Vitest config
└── package.json
```

### 2.3 Module Boundaries

**Rule**: Packages can only import from:

- Their own code
- Shared packages (`@edusphere/*`)
- External dependencies (npm)

**✅ DO**: Import from shared packages

```typescript
import { withTenantContext } from '@edusphere/db/rls';
import { GraphQLContext } from '@edusphere/auth';
```

**❌ DON'T**: Import directly between apps

```typescript
// BAD: Subgraphs should NEVER import from each other
import { UserService } from '../../../subgraph-core/src/users/user.service';
```

### 2.4 Barrel Files (`index.ts`)

Use barrel files to simplify imports and preserve API boundaries:

```typescript
// packages/db/src/index.ts
export * from './schema';
export * from './rls';
export * from './graph';

// Now consumers can do:
import { users, withTenantContext, executeCypher } from '@edusphere/db';
```

---

## 3. TypeScript Standards

### 3.1 Compiler Options

**All packages MUST use `strict: true`** with the following `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  }
}
```

### 3.2 The `any` Type is Forbidden

**Never use `any`**. Use proper types or `unknown` for truly dynamic data.

**✅ DO**: Use proper types or `unknown`

```typescript
// Good: Typed properly
interface UserUpdateInput {
  displayName?: string;
  email?: string;
}

async function updateUser(input: UserUpdateInput): Promise<User> {
  // Implementation
}

// Good: Use unknown for truly dynamic data, then validate
function parseJSON(text: string): unknown {
  return JSON.parse(text);
}

const data = parseJSON('{"name": "Alice"}');
// Must validate before use
if (typeof data === 'object' && data !== null && 'name' in data) {
  console.log(data.name);
}
```

**❌ DON'T**: Use `any`

```typescript
// BAD
async function updateUser(input: any): Promise<any> {
  // Loses all type safety
}
```

### 3.3 Explicit Return Types

**Always declare return types** for functions (except trivial one-liners).

**✅ DO**: Declare return types

```typescript
// Good: Explicit return type
function calculateProgress(completed: number, total: number): number {
  return (completed / total) * 100;
}

// Good: Async functions with Promise<T>
async function getCourse(id: string): Promise<Course | null> {
  return db.query.courses.findFirst({ where: eq(courses.id, id) });
}
```

**❌ DON'T**: Rely on inference for public APIs

```typescript
// BAD: Return type is inferred, harder to maintain
async function getCourse(id: string) {
  return db.query.courses.findFirst({ where: eq(courses.id, id) });
}
```

### 3.4 Type Inference (When to Use)

**Type inference is acceptable** for:

- Local variables with obvious types
- Array methods (map, filter, etc.) where type is clear from context

```typescript
// Good: Inference is clear from context
const users = await db.query.users.findMany();
const activeUsers = users.filter((u) => u.status === 'active');
const userNames = activeUsers.map((u) => u.displayName);
```

### 3.5 Union Types and Discriminated Unions

Use **union types** for values that can be one of several types:

```typescript
// Good: Union type for status
type ExecutionStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

// Good: Discriminated union for type-safe handling
type Result<T> = { success: true; data: T } | { success: false; error: string };

function handleResult<T>(result: Result<T>): void {
  if (result.success) {
    console.log(result.data); // TypeScript knows data exists
  } else {
    console.error(result.error); // TypeScript knows error exists
  }
}
```

### 3.6 Generic Utilities

Create **generic utilities** for reusable patterns:

```typescript
// Good: Generic pagination helper
interface Page<T> {
  items: T[];
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
}

function paginateArray<T>(items: T[], first: number, after?: string): Page<T> {
  // Implementation
}

// Usage
const coursePage = paginateArray(courses, 10, cursor);
const userPage = paginateArray(users, 20, cursor);
```

---

## 4. File Size Guidelines

### 4.1 Target: 150 Lines Per File

**Keep files focused and modular** — aim for **maximum 150 lines** per file.

**Why?**

- Easier to understand and test
- Reduces merge conflicts
- Encourages single responsibility
- Faster to review

### 4.2 Allowed Exceptions

Files **may exceed 150 lines** for:

1. **Complex GraphQL resolvers** with RLS + JWT + NATS integration
2. **AI agent workflows** (LangGraph.js state machines with many nodes)
3. **Apache AGE graph queries** with multiple Cypher patterns
4. **Integration test suites** covering multiple scenarios
5. **Entry points** (`main.ts`, `app.module.ts`) that wire up many modules
6. **Generated code** (GraphQL types from codegen)

**Use good judgment** — don't split artificially, but don't let files balloon.

### 4.3 How to Split Large Files

**When a file exceeds 150 lines**, consider these strategies:

#### Strategy 1: Extract Services

```typescript
// BEFORE: user.resolver.ts (250 lines)
@Resolver(() => User)
export class UserResolver {
  async getUser(@Args('id') id: string): Promise<User> {
    // 50 lines of business logic
  }

  async updateUser(@Args('input') input: UpdateUserInput): Promise<User> {
    // 50 lines of validation + updates
  }

  async deleteUser(@Args('id') id: string): Promise<boolean> {
    // 30 lines of soft-delete logic
  }
}

// AFTER: Split into resolver + service
// user.resolver.ts (80 lines)
@Resolver(() => User)
export class UserResolver {
  constructor(private userService: UserService) {}

  async getUser(@Args('id') id: string): Promise<User> {
    return this.userService.findById(id);
  }

  async updateUser(@Args('input') input: UpdateUserInput): Promise<User> {
    return this.userService.update(id, input);
  }
}

// user.service.ts (120 lines)
@Injectable()
export class UserService {
  findById(id: string): Promise<User> {
    /* ... */
  }
  update(id: string, input: UpdateUserInput): Promise<User> {
    /* ... */
  }
  softDelete(id: string): Promise<boolean> {
    /* ... */
  }
}
```

#### Strategy 2: Extract Validation

```typescript
// user.validation.ts
import { z } from 'zod';

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
```

#### Strategy 3: Use Barrel Files

When splitting preserves backward compatibility:

```typescript
// user/index.ts (barrel file)
export * from './user.resolver';
export * from './user.service';
export * from './user.validation';
export * from './user.types';

// Now consumers can still import from:
import { UserResolver, UserService } from './user';
```

---

## 5. Naming Conventions

Consistent naming makes code predictable and searchable.

### 5.1 Files

**Use kebab-case** for all file names:

```
✅ user-resolver.ts
✅ course.service.ts
✅ authentication.guard.ts
✅ tenant-context.middleware.ts

❌ UserResolver.ts
❌ courseService.ts
❌ Authentication_Guard.ts
```

### 5.2 Classes and Interfaces

**Use PascalCase**:

```typescript
✅ class UserResolver { }
✅ class CourseService { }
✅ interface GraphQLContext { }
✅ type ExecutionStatus = '...'

❌ class userResolver { }
❌ interface graphqlContext { }
```

### 5.3 Functions and Variables

**Use camelCase**:

```typescript
✅ async function getUserById(id: string): Promise<User> { }
✅ const currentUser = await findUser();
✅ let isAuthenticated = false;

❌ async function GetUserById() { }
❌ const CurrentUser = ...;
```

### 5.4 Constants

**Use SCREAMING_SNAKE_CASE** for true constants:

```typescript
✅ const MAX_FILE_SIZE = 100_000_000; // 100 MB
✅ const DEFAULT_PAGINATION_LIMIT = 20;
✅ const JWT_EXPIRY_SECONDS = 3600;

❌ const maxFileSize = 100_000_000;
❌ const defaultPaginationLimit = 20;
```

**Note**: `const` variables that are not constants (e.g., runtime values) use camelCase:

```typescript
const user = await getUser(); // NOT A_CONSTANT — camelCase is correct
```

### 5.5 GraphQL Naming

Follow GraphQL best practices:

| Element           | Convention                  | Example                                          |
| ----------------- | --------------------------- | ------------------------------------------------ |
| **Types**         | PascalCase                  | `User`, `Course`, `MediaAsset`                   |
| **Fields**        | camelCase                   | `displayName`, `createdAt`, `mediaAssets`        |
| **Enums**         | SCREAMING_SNAKE_CASE        | `USER_ROLE`, `MEDIA_TYPE`                        |
| **Enum values**   | SCREAMING_SNAKE_CASE        | `SUPER_ADMIN`, `ORG_ADMIN`, `STUDENT`            |
| **Input types**   | PascalCase + `Input` suffix | `CreateCourseInput`, `UpdateUserInput`           |
| **Queries**       | camelCase (verb-noun)       | `getUser`, `listCourses`, `searchContent`        |
| **Mutations**     | camelCase (verb-noun)       | `createCourse`, `updateUser`, `deleteAnnotation` |
| **Subscriptions** | camelCase (past tense)      | `courseCreated`, `annotationChanged`             |

**Examples**:

```graphql
# Types: PascalCase
type User {
  id: ID!
  displayName: String! # Fields: camelCase
  role: UserRole!
  createdAt: DateTime!
}

# Enums: SCREAMING_SNAKE_CASE
enum UserRole {
  SUPER_ADMIN
  ORG_ADMIN
  INSTRUCTOR
  STUDENT
}

# Input: PascalCase + Input suffix
input CreateCourseInput {
  title: String!
  description: String
}

# Queries: camelCase
type Query {
  me: User!
  user(id: ID!): User
  courses(first: Int!): CourseConnection!
}

# Mutations: camelCase (verb-first)
type Mutation {
  createCourse(input: CreateCourseInput!): Course!
  updateUser(id: ID!, input: UpdateUserInput!): User!
}

# Subscriptions: camelCase (event-based)
type Subscription {
  courseCreated(tenantId: ID!): Course!
  annotationChanged(assetId: ID!): Annotation!
}
```

---

## 6. GraphQL Conventions

### 6.1 Schema-First Design

**SDL files are the source of truth** — resolvers implement the contract defined in `.graphql` files.

**Process**:

1. Define types in `schema.graphql`
2. Run codegen to generate TypeScript types
3. Implement resolvers matching the schema
4. Test with integration tests

**✅ DO**: Define schema first

```graphql
# schema.graphql
type Course @key(fields: "id") {
  id: ID!
  title: String!
  description: String
  creator: User!
  modules: [Module!]!
  createdAt: DateTime!
}

type Query {
  course(id: ID!): Course
}
```

```typescript
// course.resolver.ts
@Resolver(() => Course)
export class CourseResolver {
  @Query(() => Course, { nullable: true })
  async course(@Args('id') id: string): Promise<Course | null> {
    return this.courseService.findById(id);
  }
}
```

### 6.2 Entity Ownership and Federation

**Each entity is owned by exactly one subgraph.** Other subgraphs extend with `@key` stubs.

**Example**: `User` is owned by Core subgraph, extended by Content subgraph

```graphql
# Core subgraph (owner)
type User @key(fields: "id") {
  id: ID!
  email: String!
  displayName: String!
  role: UserRole!
}

# Content subgraph (extension)
extend type User @key(fields: "id") {
  id: ID! @external
  createdCourses: [Course!]!
}
```

### 6.3 Pagination: Relay Cursor Connection

**All list fields** use the **Relay Cursor Connection** spec:

```graphql
# Shared pagination types (packages/graphql-shared/src/pagination.graphql)
type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

input ConnectionArgs {
  first: Int
  after: String
  last: Int
  before: String
}

# Usage in schema
type CourseConnection {
  edges: [CourseEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type CourseEdge {
  node: Course!
  cursor: String!
}

type Query {
  courses(
    first: Int
    after: String
    filter: CourseFilter
    orderBy: CourseOrderBy
  ): CourseConnection!
}
```

### 6.4 Error Handling

Return **structured errors** with `extensions`:

```typescript
throw new GraphQLError('User not found', {
  extensions: {
    code: 'USER_NOT_FOUND',
    userId: id,
    timestamp: new Date().toISOString(),
  },
});
```

**Error codes** (from API-CONTRACTS §6):

- `UNAUTHENTICATED` — Missing or invalid JWT
- `FORBIDDEN` — Insufficient permissions
- `NOT_FOUND` — Resource doesn't exist
- `BAD_USER_INPUT` — Validation failed
- `INTERNAL_SERVER_ERROR` — Unexpected error
- `RATE_LIMITED` — Too many requests

### 6.5 Directive Usage

Use **custom directives** for cross-cutting concerns:

```graphql
# Authentication
type Query {
  me: User! @authenticated
}

# Authorization with scopes
type Mutation {
  createCourse(input: CreateCourseInput!): Course!
    @authenticated
    @requiresScopes(scopes: ["course:write"])
}

# Role-based access
type Mutation {
  updateTenantSettings(input: TenantSettingsInput!): Tenant!
    @authenticated
    @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])
}

# Rate limiting
type Mutation {
  executeAgent(input: ExecuteAgentInput!): AgentExecution!
    @authenticated
    @rateLimit(limit: 10, window: 60)
}
```

---

## 7. NestJS Patterns

### 7.1 Module Structure

Each feature has its own **module** with clear boundaries:

```typescript
// users/users.module.ts
@Module({
  imports: [DatabaseModule],
  providers: [UserResolver, UserService],
  exports: [UserService], // Export for other modules
})
export class UsersModule {}
```

### 7.2 Dependency Injection

**Use constructor injection** for all dependencies:

**✅ DO**: Constructor injection

```typescript
@Injectable()
export class UserService {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: Logger
  ) {}

  async findById(id: string): Promise<User | null> {
    this.logger.debug({ userId: id }, 'Finding user by ID');
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
  }
}
```

**❌ DON'T**: Manual instantiation

```typescript
// BAD
export class UserService {
  private db = new DatabaseService();

  async findById(id: string): Promise<User | null> {
    return this.db.query.users.findFirst({ where: eq(users.id, id) });
  }
}
```

### 7.3 Guards

Use **guards** for authentication and authorization:

```typescript
// auth/authenticated.guard.ts
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const gqlContext =
      GqlExecutionContext.create(context).getContext<GraphQLContext>();
    return gqlContext.isAuthenticated;
  }
}

// Apply to resolver
@Resolver(() => User)
export class UserResolver {
  @UseGuards(AuthenticatedGuard)
  @Query(() => User)
  async me(@Context() ctx: GraphQLContext): Promise<User> {
    return this.userService.findById(ctx.userId);
  }
}
```

### 7.4 Interceptors

Use **interceptors** for cross-cutting concerns (logging, transformations):

```typescript
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: Logger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - now;
        this.logger.info({ duration }, 'Request completed');
      })
    );
  }
}
```

### 7.5 Pipes

Use **pipes** for validation:

```typescript
// validation.pipe.ts
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: z.ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      throw new BadRequestException('Validation failed');
    }
  }
}

// Usage
@Mutation(() => User)
async updateUser(
  @Args('input', new ZodValidationPipe(updateUserSchema)) input: UpdateUserInput
): Promise<User> {
  return this.userService.update(input);
}
```

### 7.6 Exception Filters

Use **exception filters** for centralized error handling:

```typescript
@Catch()
export class GraphQLExceptionFilter implements GqlExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      return new GraphQLError(exception.message, {
        extensions: {
          code:
            exception.getStatus() === 400
              ? 'BAD_USER_INPUT'
              : 'INTERNAL_SERVER_ERROR',
        },
      });
    }

    return new GraphQLError('Internal server error', {
      extensions: { code: 'INTERNAL_SERVER_ERROR' },
    });
  }
}
```

---

## 8. Database Patterns

### 8.1 Drizzle Schema Organization

**Organize schemas by domain**:

```typescript
// packages/db/src/schema/core.ts
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: tenantPlanEnum('plan').notNull().default('FREE'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  role: userRoleEnum('role').notNull().default('STUDENT'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

// Indexes
export const usersIndexes = {
  tenantIdIdx: index('users_tenant_id_idx').on(users.tenantId),
  emailIdx: index('users_email_idx').on(users.email),
  deletedAtIdx: index('users_deleted_at_idx')
    .on(users.deletedAt)
    .where(isNull(users.deletedAt)),
};
```

### 8.2 RLS Enforcement

**Always use `withTenantContext` wrapper** for database queries:

```typescript
// packages/db/src/rls/with-tenant-context.ts
export async function withTenantContext<T>(
  tenantId: string,
  userId: string,
  userRole: UserRole,
  callback: () => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set RLS context variables
    await tx.execute(sql`SET LOCAL app.current_tenant = ${tenantId}`);
    await tx.execute(sql`SET LOCAL app.current_user_id = ${userId}`);
    await tx.execute(sql`SET LOCAL app.current_user_role = ${userRole}`);

    return callback();
  });
}
```

**✅ DO**: Wrap all queries

```typescript
@Resolver(() => Course)
export class CourseResolver {
  @Query(() => [Course])
  async myCourses(@Context() ctx: GraphQLContext): Promise<Course[]> {
    return withTenantContext(
      ctx.tenantId,
      ctx.userId,
      ctx.userRole,
      async () => {
        return db.query.courses.findMany({
          where: eq(courses.creatorId, ctx.userId),
        });
      }
    );
  }
}
```

**❌ DON'T**: Query without RLS context

```typescript
// BAD: Bypasses RLS — potential data leak!
@Query(() => [Course])
async myCourses(@Context() ctx: GraphQLContext): Promise<Course[]> {
  return db.query.courses.findMany({
    where: eq(courses.creatorId, ctx.userId),
  });
}
```

### 8.3 Migration Strategy

**Use Drizzle migrations** for all schema changes:

```bash
# Generate migration
pnpm --filter @edusphere/db exec drizzle-kit generate

# Apply migration
pnpm --filter @edusphere/db exec drizzle-kit migrate
```

**Migration files** are auto-generated but can be edited:

```sql
-- drizzle/migrations/0001_add_courses_table.sql
CREATE TABLE IF NOT EXISTS "courses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "title" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE "courses" ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policy
CREATE POLICY "tenant_isolation_courses" ON "courses"
  USING (tenant_id = current_setting('app.current_tenant')::uuid);
```

### 8.4 Seed Data Patterns

**Make seeds idempotent** using `onConflictDoNothing`:

```typescript
// packages/db/src/seed/index.ts
export async function seed() {
  // Insert tenant (idempotent)
  await db
    .insert(tenants)
    .values({
      id: DEMO_TENANT_ID,
      name: 'Demo Organization',
      slug: 'demo',
      plan: 'PROFESSIONAL',
    })
    .onConflictDoNothing();

  // Insert admin user (idempotent)
  await db
    .insert(users)
    .values({
      id: ADMIN_USER_ID,
      tenantId: DEMO_TENANT_ID,
      email: 'admin@demo.edusphere.dev',
      displayName: 'Admin User',
      role: 'ORG_ADMIN',
    })
    .onConflictDoNothing();
}
```

---

## 9. Multi-tenancy

### 9.1 Tenant Context Propagation

**JWT → GraphQL Context → RLS**

```
┌─────────┐      ┌─────────┐      ┌──────────────┐      ┌──────────┐
│ Client  │ JWT  │ Gateway │ HTTP │  Subgraph    │ RLS  │ Database │
│         ├─────>│         ├─────>│              ├─────>│          │
│         │      │ (JWKS)  │header│ (extract ctx)│ SET  │ (policy) │
└─────────┘      └─────────┘      └──────────────┘      └──────────┘
```

**JWT claims** (extracted at gateway):

```json
{
  "sub": "user-uuid",
  "tenant_id": "tenant-uuid",
  "role": "INSTRUCTOR",
  "scopes": ["course:write", "annotation:write"]
}
```

**GraphQL context** (propagated to subgraphs):

```typescript
interface GraphQLContext {
  tenantId: string;
  userId: string;
  userRole: UserRole;
  scopes: string[];
  isAuthenticated: boolean;
}
```

**RLS enforcement** (at database level):

```sql
-- Set by withTenantContext wrapper
SET LOCAL app.current_tenant = 'tenant-uuid';
SET LOCAL app.current_user_id = 'user-uuid';
SET LOCAL app.current_user_role = 'INSTRUCTOR';
```

### 9.2 Tenant Isolation Validation

**Test tenant isolation** for every multi-tenant table:

```typescript
// Test: Tenant A cannot read Tenant B's data
describe('Tenant Isolation - Courses', () => {
  it('prevents cross-tenant access', async () => {
    const tenantACourse = await createCourse(TENANT_A_ID, 'Course A');

    // Try to access from Tenant B context
    const result = await withTenantContext(
      TENANT_B_ID,
      USER_B_ID,
      UserRole.STUDENT,
      async () => {
        return db.query.courses.findFirst({
          where: eq(courses.id, tenantACourse.id),
        });
      }
    );

    expect(result).toBeNull(); // RLS blocks access
  });
});
```

### 9.3 Cross-Tenant Access

**Only `SUPER_ADMIN` role** can query across tenants:

```typescript
@Query(() => [User])
@UseGuards(AuthenticatedGuard, SuperAdminGuard)
async allUsersAcrossTenants(@Context() ctx: GraphQLContext): Promise<User[]> {
  if (ctx.userRole !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenException('Only SUPER_ADMIN can query across tenants');
  }

  // Query without tenant context — only allowed for SUPER_ADMIN
  return db.query.users.findMany();
}
```

---

## 10. Authentication & Authorization

### 10.1 Keycloak Integration

**Gateway validates JWT** via Keycloak JWKS endpoint:

```typescript
// apps/gateway/src/auth/jwt-validator.ts
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS = createRemoteJWKSet(
  new URL('http://keycloak:8080/realms/edusphere/protocol/openid-connect/certs')
);

export async function validateJWT(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: 'http://keycloak:8080/realms/edusphere',
    audience: 'edusphere-app',
  });

  return payload;
}
```

### 10.2 JWT Claims Extraction

**Extract claims into GraphQL context**:

```typescript
// packages/auth/src/context-extractor.ts
export function extractContext(jwt: JWTPayload): GraphQLContext {
  return {
    tenantId: jwt.tenant_id as string,
    userId: jwt.sub as string,
    userRole: jwt.role as UserRole,
    scopes: (jwt.scopes as string)?.split(' ') || [],
    isAuthenticated: true,
  };
}
```

### 10.3 GraphQL Directive Implementation

**Implement custom directives** for authorization:

```typescript
// @authenticated directive
@Directive('@authenticated')
export class AuthenticatedDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;

    field.resolve = async function (...args) {
      const context = args[2] as GraphQLContext;

      if (!context.isAuthenticated) {
        throw new GraphQLError('Unauthenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      return resolve.apply(this, args);
    };
  }
}
```

### 10.4 RLS Policy Enforcement

**Database RLS policies** provide defense-in-depth:

```sql
-- All tenant-scoped tables have this policy
CREATE POLICY "tenant_isolation" ON courses
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

-- Super admin bypass
CREATE POLICY "super_admin_access" ON courses
  USING (current_setting('app.current_user_role')::text = 'SUPER_ADMIN');

-- Personal annotations: owner-only
CREATE POLICY "personal_annotations_owner_only" ON annotations
  USING (
    layer = 'PERSONAL' AND
    created_by = current_setting('app.current_user_id')::uuid
  );
```

---

## 11. Error Handling

### 11.1 NestJS Exceptions

Use **built-in NestJS exceptions**:

```typescript
import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';

// Usage
if (!user) {
  throw new NotFoundException(`User with ID ${id} not found`);
}

if (ctx.userRole !== UserRole.INSTRUCTOR) {
  throw new ForbiddenException('Only instructors can create courses');
}
```

### 11.2 GraphQL Errors

Return **structured GraphQL errors**:

```typescript
import { GraphQLError } from 'graphql';

throw new GraphQLError('Course not found', {
  extensions: {
    code: 'COURSE_NOT_FOUND',
    courseId: id,
    tenantId: ctx.tenantId,
    timestamp: new Date().toISOString(),
  },
});
```

### 11.3 Frontend Error Boundaries

Use **React Error Boundaries** for UI crashes:

```typescript
// ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

### 11.4 Logging with Pino

**Log errors with context**:

```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class CourseService {
  private readonly logger = new Logger(CourseService.name);

  async findById(id: string): Promise<Course | null> {
    try {
      return await this.db.query.courses.findFirst({
        where: eq(courses.id, id),
      });
    } catch (error) {
      this.logger.error(
        { courseId: id, error: error.message, stack: error.stack },
        'Failed to fetch course'
      );
      throw new InternalServerErrorException('Failed to fetch course');
    }
  }
}
```

---

## 12. Logging

### 12.1 Structured Logging (JSON)

**All logs MUST be JSON** for machine parsing:

```typescript
// Good: Structured JSON log
logger.info({ userId, tenantId, duration: 123 }, 'User fetched successfully');

// Output:
// {"level":"info","time":1697645123456,"userId":"...","tenantId":"...","duration":123,"msg":"User fetched successfully"}
```

### 12.2 Log Levels

Use **appropriate log levels**:

| Level   | When to Use                     | Example                               |
| ------- | ------------------------------- | ------------------------------------- |
| `error` | Failures that prevent operation | Database connection failed            |
| `warn`  | Recoverable issues              | Rate limit approached                 |
| `info`  | Key business events             | User logged in, course created        |
| `debug` | Development debugging           | Query parameters, intermediate values |
| `trace` | Very verbose debugging          | Every function call                   |

```typescript
logger.error({ error: err.message }, 'Database connection failed');
logger.warn({ count: 95, limit: 100 }, 'Approaching rate limit');
logger.info({ userId, courseId }, 'User enrolled in course');
logger.debug({ query: 'SELECT * FROM users' }, 'Executing query');
```

### 12.3 Context Inclusion

**Always include context** in logs:

```typescript
// Required context
logger.info(
  {
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    requestId: ctx.requestId, // From tracing
    // ... event-specific data
  },
  'Event description'
);
```

### 12.4 Never `console.log` in Production

**Forbidden**: `console.log`, `console.error`, `console.warn`

**✅ DO**: Use Pino logger

```typescript
import { Logger } from '@nestjs/common';

export class UserService {
  private readonly logger = new Logger(UserService.name);

  async create(input: CreateUserInput): Promise<User> {
    this.logger.info({ input }, 'Creating user');
    // ...
  }
}
```

**❌ DON'T**: Use console methods

```typescript
// BAD: Will not appear in production logs
console.log('Creating user', input);
```

---

## 13. Testing

### 13.1 Test-Driven Development (TDD)

**TDD is encouraged** but not mandatory. When practicing TDD:

1. Write failing test
2. Implement minimum code to pass
3. Refactor
4. Repeat

### 13.2 Unit Tests

**Test every resolver and service**:

```typescript
// user.service.spec.ts
describe('UserService', () => {
  let service: UserService;
  let db: MockDatabase;

  beforeEach(() => {
    db = createMockDatabase();
    service = new UserService(db);
  });

  describe('findById', () => {
    it('returns user when found', async () => {
      const user = { id: '123', email: 'test@example.com' };
      db.query.users.findFirst.mockResolvedValue(user);

      const result = await service.findById('123');

      expect(result).toEqual(user);
    });

    it('returns null when not found', async () => {
      db.query.users.findFirst.mockResolvedValue(null);

      const result = await service.findById('999');

      expect(result).toBeNull();
    });
  });
});
```

### 13.3 Integration Tests

**Test every database operation**:

```typescript
// user.integration.spec.ts
describe('User Integration Tests', () => {
  let db: Database;

  beforeAll(async () => {
    db = await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase(db);
  });

  it('creates user with RLS context', async () => {
    const user = await withTenantContext(
      TENANT_ID,
      ADMIN_ID,
      UserRole.ORG_ADMIN,
      async () => {
        return db
          .insert(users)
          .values({
            tenantId: TENANT_ID,
            email: 'test@example.com',
            displayName: 'Test User',
          })
          .returning();
      }
    );

    expect(user).toBeDefined();
    expect(user.tenantId).toBe(TENANT_ID);
  });
});
```

### 13.4 E2E Tests

**Test every user flow**:

```typescript
// course-creation.e2e.spec.ts
describe('Course Creation E2E', () => {
  it('allows instructor to create course', async () => {
    // Login
    await page.goto('/login');
    await page.fill('[name=email]', 'instructor@demo.edu');
    await page.fill('[name=password]', 'password');
    await page.click('button[type=submit]');

    // Navigate to course creation
    await page.click('text=Create Course');

    // Fill form
    await page.fill('[name=title]', 'Introduction to Philosophy');
    await page.fill('[name=description]', 'A course on philosophy');
    await page.click('button:has-text("Create")');

    // Verify creation
    await expect(
      page.locator('text=Course created successfully')
    ).toBeVisible();
  });
});
```

### 13.5 Coverage Targets

| Component           | Target | Required     |
| ------------------- | ------ | ------------ |
| Backend services    | >90%   | Yes          |
| Frontend components | >80%   | Yes          |
| RLS policies        | 100%   | **Critical** |

**Run coverage**:

```bash
pnpm turbo test -- --coverage
```

---

## 14. Git Workflow

### 14.1 Branch Naming

Use **conventional branch names**:

| Type          | Prefix      | Example                       |
| ------------- | ----------- | ----------------------------- |
| Feature       | `feat/`     | `feat/chavruta-agent`         |
| Bug fix       | `fix/`      | `fix/rls-annotation-layer`    |
| Refactor      | `refactor/` | `refactor/user-service-split` |
| Documentation | `docs/`     | `docs/update-api-contracts`   |
| Tests         | `test/`     | `test/add-rls-integration`    |
| Chore         | `chore/`    | `chore/update-dependencies`   |

**Examples**:

```bash
git checkout -b feat/hybrid-search-fusion
git checkout -b fix/jwt-validation-error
git checkout -b docs/add-guidelines
```

### 14.2 Commit Messages

Follow **Conventional Commits** format:

```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types**: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`

**Scopes**: `core`, `content`, `annotation`, `collab`, `agent`, `knowledge`, `gateway`, `web`, `mobile`, `db`, `infra`

**Examples**:

```
feat(agent): add Chavruta debate agent template

Implements dialectical debate using knowledge graph CONTRADICTS edges.
Agent presents both sides of contradictions and facilitates synthesis.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

```
fix(db): correct RLS policy for annotation layer filtering

Personal annotations were visible to other users due to missing
owner check in RLS policy. Added owner validation to policy.

Fixes #123

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

### 14.3 Pull Request Requirements

**Before creating a PR**:

- [ ] All tests pass (`pnpm turbo test`)
- [ ] No linting errors (`pnpm turbo lint`)
- [ ] TypeScript compiles (`pnpm turbo build`)
- [ ] Supergraph composes (`pnpm --filter @edusphere/gateway compose`)
- [ ] Documentation updated (if API changed)
- [ ] `OPEN_ISSUES.md` updated (if fixing a bug)

**PR template**:

```markdown
## Summary

Brief description of changes

## Changes

- Bullet point list of changes

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Screenshots (if UI change)

[Add screenshots]

## Related Issues

Fixes #123
```

---

## 15. Code Review Guidelines

### 15.1 What to Look For

**Correctness**:

- [ ] Does the code do what it claims?
- [ ] Are edge cases handled?
- [ ] Is error handling appropriate?
- [ ] Are tests comprehensive?

**Readability**:

- [ ] Is the code easy to understand?
- [ ] Are variable/function names descriptive?
- [ ] Is the logic clear and straightforward?
- [ ] Are comments used appropriately (why, not what)?

**Performance**:

- [ ] Are there any N+1 queries?
- [ ] Is caching used appropriately?
- [ ] Are database indexes present?
- [ ] Is pagination used for large lists?

**Security**:

- [ ] Is input validated (Zod schemas)?
- [ ] Is RLS context used for all queries?
- [ ] Are JWT scopes/roles checked?
- [ ] Are secrets excluded from code?

**Maintainability**:

- [ ] Does the code follow project conventions?
- [ ] Is the code properly organized?
- [ ] Are files under 150 lines (or justified exceptions)?
- [ ] Is documentation updated?

### 15.2 How to Give Feedback

**Be constructive, specific, and actionable**:

**✅ Good feedback**:

````
The `getUserCourses` function is doing two things: fetching data
and calculating progress. Consider extracting progress calculation
into a separate `calculateCourseProgress` function for better testability.

Example:
```typescript
function calculateCourseProgress(course: Course): number {
  return (course.completedModules / course.totalModules) * 100;
}
````

```

**❌ Poor feedback**:
```

This code is bad.

````

**Use prefixes** to indicate severity:
- `[nit]` — Minor suggestion, not blocking
- `[question]` — Clarification needed
- `[blocking]` — Must be addressed before merge

---

## 16. Performance Optimization

### 16.1 N+1 Query Prevention

**Use Drizzle relations** or **DataLoader**:

**❌ N+1 problem**:
```typescript
// BAD: Fetches courses, then 1 query per course for creator
const courses = await db.query.courses.findMany();
for (const course of courses) {
  course.creator = await db.query.users.findFirst({
    where: eq(users.id, course.creatorId),
  });
}
````

**✅ Solution 1: Drizzle relations**:

```typescript
// Good: Single query with JOIN
const courses = await db.query.courses.findMany({
  with: { creator: true },
});
```

**✅ Solution 2: DataLoader**:

```typescript
// Good: Batches user fetches
const userLoader = new DataLoader(async (ids: string[]) => {
  const users = await db.query.users.findMany({
    where: inArray(users.id, ids),
  });
  return ids.map((id) => users.find((u) => u.id === id));
});

const courses = await db.query.courses.findMany();
for (const course of courses) {
  course.creator = await userLoader.load(course.creatorId);
}
```

### 16.2 Caching Strategies

**Use Redis** for frequently accessed data:

```typescript
// Cache user by ID
async function getUserById(id: string): Promise<User | null> {
  const cacheKey = `user:${id}`;

  // Try cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });

  // Cache for 5 minutes
  if (user) {
    await redis.setex(cacheKey, 300, JSON.stringify(user));
  }

  return user;
}
```

### 16.3 GraphQL Query Optimization

**Use field-level resolvers** to avoid over-fetching:

```typescript
@Resolver(() => Course)
export class CourseResolver {
  // Only fetch modules if requested in query
  @ResolveField(() => [Module])
  async modules(@Parent() course: Course): Promise<Module[]> {
    return db.query.modules.findMany({
      where: eq(modules.courseId, course.id),
    });
  }
}
```

### 16.4 Database Indexing

**Add indexes** for commonly filtered/sorted columns:

```typescript
// Drizzle schema
export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    title: text('title').notNull(),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => ({
    // Index for tenant filtering
    tenantIdIdx: index('courses_tenant_id_idx').on(table.tenantId),

    // Composite index for tenant + created_at (for sorting)
    tenantCreatedAtIdx: index('courses_tenant_created_at_idx').on(
      table.tenantId,
      table.createdAt
    ),

    // Partial index for non-deleted courses
    activeCoursesIdx: index('courses_active_idx')
      .on(table.tenantId)
      .where(sql`deleted_at IS NULL`),
  })
);
```

---

## 17. Security Best Practices

### 17.1 Input Validation

**Validate all user input** with Zod:

```typescript
// user.validation.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  displayName: z.string().min(1, 'Display name required').max(100, 'Display name too long'),
  role: z.enum(['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR', 'STUDENT', 'RESEARCHER']),
});

// Mutation
@Mutation(() => User)
async createUser(
  @Args('input', new ZodValidationPipe(createUserSchema)) input: CreateUserInput
): Promise<User> {
  return this.userService.create(input);
}
```

### 17.2 RLS Enforcement

**All tenant-scoped queries** must use RLS:

```typescript
// ✅ Correct
async function getCourses(ctx: GraphQLContext): Promise<Course[]> {
  return withTenantContext(ctx.tenantId, ctx.userId, ctx.userRole, async () => {
    return db.query.courses.findMany();
  });
}

// ❌ DANGEROUS: Bypasses RLS
async function getCourses(): Promise<Course[]> {
  return db.query.courses.findMany();
}
```

### 17.3 No Secrets in Code

**Use environment variables** for all secrets:

```typescript
// ✅ Correct
const jwtSecret = process.env.JWT_SECRET;
const dbUrl = process.env.DATABASE_URL;

// ❌ NEVER COMMIT
const jwtSecret = 'super-secret-key-123';
const dbUrl = 'postgresql://user:password@localhost:5432/db';
```

### 17.4 Rate Limiting

**Apply rate limits** to sensitive operations:

```graphql
type Mutation {
  executeAgent(input: ExecuteAgentInput!): AgentExecution!
    @authenticated
    @rateLimit(limit: 10, window: 60) # 10 requests per minute
}
```

---

## 18. Documentation

### 18.1 JSDoc for Public APIs

**Document all public functions**:

````typescript
/**
 * Finds a user by their unique ID.
 *
 * @param id - The user's UUID
 * @returns The user object if found, null otherwise
 * @throws {NotFoundException} If the user doesn't exist
 *
 * @example
 * ```typescript
 * const user = await getUserById('123e4567-e89b-12d3-a456-426614174000');
 * ```
 */
export async function getUserById(id: string): Promise<User | null> {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}
````

### 18.2 GraphQL Schema Descriptions

**Document all types and fields**:

```graphql
"""
A user account within a tenant organization.
Users can have different roles (student, instructor, admin) with varying permissions.
"""
type User @key(fields: "id") {
  id: ID!

  """
  The user's email address (unique within tenant)
  """
  email: String!

  """
  Display name shown in the UI
  """
  displayName: String!

  """
  User's role determining their permissions
  """
  role: UserRole!

  """
  Timestamp when the user account was created
  """
  createdAt: DateTime!
}
```

### 18.3 README per Package

**Every package needs a README**:

````markdown
# @edusphere/db

Database layer for EduSphere — Drizzle ORM schemas, migrations, and RLS helpers.

## Features

- PostgreSQL 16+ with Drizzle ORM
- Row-level security (RLS) helpers
- Apache AGE graph database integration
- pgvector for semantic search

## Usage

```typescript
import { db, users, withTenantContext } from '@edusphere/db';

const user = await withTenantContext(tenantId, userId, role, async () => {
  return db.query.users.findFirst({ where: eq(users.id, userId) });
});
```
````

## Commands

- `pnpm generate` — Generate migrations
- `pnpm migrate` — Apply migrations
- `pnpm seed` — Seed database with demo data

````

### 18.4 Update OPEN_ISSUES.md

**Track all issues** with structured format:

```markdown
## 🔴 Critical Issues

### [CRITICAL] RLS Policy Missing on Annotations Table
**Status:** 🟡 In Progress
**Assigned:** @developer
**Files:** `packages/db/src/schema/annotation.ts`, `drizzle/migrations/0005_add_annotation_rls.sql`
**Problem:** Annotations table missing tenant isolation policy, potential data leak
**Solution:** Add RLS policy with tenant_id check
**Tests:** `packages/db/src/rls/annotation.test.ts`
**Created:** 2026-02-15
**Updated:** 2026-02-16
````

---

## Summary: Key Principles

1. **Clean Code**: Write for humans, optimize for readability
2. **Type Safety**: Strict TypeScript, no `any`, explicit return types
3. **File Size**: Keep files under 150 lines (with justified exceptions)
4. **Naming**: Consistent conventions (kebab-case files, PascalCase classes, camelCase functions)
5. **GraphQL**: Schema-first, entity ownership, Relay pagination, structured errors
6. **NestJS**: Dependency injection, guards, interceptors, pipes
7. **Database**: Drizzle ORM, RLS enforcement via `withTenantContext`, migrations
8. **Multi-tenancy**: JWT → GraphQL Context → RLS, tenant isolation validation
9. **Auth**: Keycloak JWT, directive-based authorization, scope checking
10. **Errors**: Structured GraphQL errors, NestJS exceptions, error boundaries
11. **Logging**: Pino structured JSON, no `console.log`, include context
12. **Testing**: TDD encouraged, >90% backend coverage, 100% RLS coverage
13. **Git**: Conventional commits, branch naming, PR requirements
14. **Reviews**: Constructive, specific, actionable feedback
15. **Performance**: Prevent N+1, use caching, optimize queries, index properly
16. **Security**: Validate input, enforce RLS, no secrets in code, rate limiting
17. **Docs**: JSDoc, GraphQL descriptions, READMEs, update OPEN_ISSUES.md

---

## Related Documents

- [CLAUDE.md](../../CLAUDE.md) — AI assistant configuration and work rules
- [IMPLEMENTATION_ROADMAP.md](../../IMPLEMENTATION_ROADMAP.md) — Phased build plan
- [API_CONTRACTS_GRAPHQL_FEDERATION.md](../api/API_CONTRACTS_GRAPHQL_FEDERATION.md) — GraphQL schema definitions
- [docs/database/DATABASE_SCHEMA.md](../database/DATABASE_SCHEMA.md) — Database design and RLS policies
- [OPEN_ISSUES.md](../../OPEN_ISSUES.md) — Issue tracking

---

**Last Updated**: February 2026 | **Version**: 1.0.0
