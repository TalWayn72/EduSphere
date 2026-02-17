# Test Registry

## Overview

This document serves as the central registry of all tests in the EduSphere platform. It tracks test coverage across all components, identifies gaps, and provides execution metrics.

**Status:** All tests marked as "Planned" - Phase 0 not started yet.

**Purpose:**
- Central catalog of all test suites and test counts
- Coverage tracking per package and component
- Identification of testing gaps and priorities
- Test execution time tracking for CI optimization
- Ownership assignment for test maintenance

---

## Unit Tests

### Core Subgraph
**Total Tests:** 150+ (Planned)

| Component | Test Count | Status | Coverage Target |
|-----------|------------|--------|-----------------|
| User Resolvers | 40 | Planned | 90% |
| Tenant Resolvers | 35 | Planned | 90% |
| Authentication | 30 | Planned | 95% |
| Authorization | 25 | Planned | 95% |
| Error Handling | 20 | Planned | 85% |

**Key Test Areas:**
- User CRUD operations
- Tenant management and switching
- JWT token generation and validation
- Role-based access control
- Multi-tenancy isolation

### Content Subgraph
**Total Tests:** 200+ (Planned)

| Component | Test Count | Status | Coverage Target |
|-----------|------------|--------|-----------------|
| Course Resolvers | 50 | Planned | 90% |
| Media Resolvers | 45 | Planned | 90% |
| Transcript Resolvers | 40 | Planned | 90% |
| Content Tree | 35 | Planned | 90% |
| Version Control | 30 | Planned | 85% |

**Key Test Areas:**
- Course creation and management
- Media upload and processing
- Transcript generation and sync
- Content tree operations
- Version history tracking

### Annotation Subgraph
**Total Tests:** 120+ (Planned)

| Component | Test Count | Status | Coverage Target |
|-----------|------------|--------|-----------------|
| Annotation Resolvers | 50 | Planned | 90% |
| Layer Management | 30 | Planned | 90% |
| Anchor Resolution | 25 | Planned | 90% |
| Visibility Rules | 15 | Planned | 85% |

**Key Test Areas:**
- Annotation CRUD operations
- Layer creation and management
- Text/video/PDF anchoring
- Visibility and sharing rules
- Annotation search and filtering

### Collaboration Subgraph
**Total Tests:** 100+ (Planned)

| Component | Test Count | Status | Coverage Target |
|-----------|------------|--------|-----------------|
| CRDT Operations | 40 | Planned | 95% |
| Session Management | 30 | Planned | 90% |
| Conflict Resolution | 20 | Planned | 95% |
| Real-time Sync | 10 | Planned | 85% |

**Key Test Areas:**
- CRDT state merging
- Session creation and joining
- Conflict-free updates
- Real-time collaboration
- Presence tracking

### Agent Subgraph
**Total Tests:** 180+ (Planned)

| Component | Test Count | Status | Coverage Target |
|-----------|------------|--------|-----------------|
| Agent Definitions | 45 | Planned | 90% |
| Executions | 40 | Planned | 90% |
| Workflows | 35 | Planned | 90% |
| Tool Integration | 30 | Planned | 85% |
| Prompt Templates | 30 | Planned | 85% |

**Key Test Areas:**
- Agent definition creation
- Execution lifecycle management
- Workflow orchestration
- Tool calling and validation
- Prompt template rendering

### Knowledge Subgraph
**Total Tests:** 150+ (Planned)

| Component | Test Count | Status | Coverage Target |
|-----------|------------|--------|-----------------|
| Knowledge Graph | 50 | Planned | 90% |
| Embeddings | 40 | Planned | 90% |
| Vector Search | 35 | Planned | 90% |
| Entity Extraction | 25 | Planned | 85% |

**Key Test Areas:**
- Graph node/edge operations
- Embedding generation
- Vector similarity search
- Entity extraction and linking
- Knowledge retrieval

### Gateway
**Total Tests:** 80+ (Planned)

| Component | Test Count | Status | Coverage Target |
|-----------|------------|--------|-----------------|
| Schema Composition | 30 | Planned | 90% |
| Request Routing | 25 | Planned | 90% |
| Error Handling | 15 | Planned | 85% |
| Caching | 10 | Planned | 85% |

**Key Test Areas:**
- Federated schema composition
- Subgraph routing
- Error propagation
- Response caching
- Query planning

---

## Integration Tests

### Database (RLS, Transactions)
**Total Tests:** 100+ (Planned)

| Test Category | Test Count | Status | Priority |
|---------------|------------|--------|----------|
| RLS Policies | 40 | Planned | High |
| Transactions | 25 | Planned | High |
| Migrations | 20 | Planned | Medium |
| Constraints | 15 | Planned | Medium |

**Key Test Areas:**
- Row-level security enforcement
- Multi-tenant isolation
- Transaction rollback
- Migration integrity
- Foreign key constraints

### NATS (Pub/Sub, Streams)
**Total Tests:** 50+ (Planned)

| Test Category | Test Count | Status | Priority |
|---------------|------------|--------|----------|
| Pub/Sub | 20 | Planned | High |
| JetStream | 15 | Planned | High |
| Message Ordering | 10 | Planned | Medium |
| Error Recovery | 5 | Planned | Medium |

**Key Test Areas:**
- Event publishing
- Subscription handling
- Stream persistence
- Message ordering
- Connection recovery

### Redis (Caching)
**Total Tests:** 40+ (Planned)

| Test Category | Test Count | Status | Priority |
|---------------|------------|--------|----------|
| Cache Operations | 20 | Planned | High |
| Invalidation | 10 | Planned | High |
| TTL Management | 5 | Planned | Medium |
| Connection Pool | 5 | Planned | Low |

**Key Test Areas:**
- Cache hit/miss behavior
- Cache invalidation
- TTL expiration
- Connection pooling
- Redis cluster failover

### MinIO (Uploads)
**Total Tests:** 30+ (Planned)

| Test Category | Test Count | Status | Priority |
|---------------|------------|--------|----------|
| Upload/Download | 15 | Planned | High |
| Presigned URLs | 8 | Planned | High |
| Bucket Policies | 7 | Planned | Medium |

**Key Test Areas:**
- File upload/download
- Presigned URL generation
- Bucket policy enforcement
- Multi-part uploads
- Storage quota management

### Keycloak (Auth)
**Total Tests:** 50+ (Planned)

| Test Category | Test Count | Status | Priority |
|---------------|------------|--------|----------|
| Token Validation | 20 | Planned | High |
| Role Mapping | 15 | Planned | High |
| SSO Flow | 10 | Planned | Medium |
| Token Refresh | 5 | Planned | Medium |

**Key Test Areas:**
- JWT token validation
- Role and permission mapping
- SSO authentication flow
- Token refresh logic
- User session management

---

## GraphQL Tests

### Queries
**Total Tests:** 44 (Planned)

One test per query operation defined in API-CONTRACTS.md.

| Subgraph | Query Count | Status | Coverage |
|----------|-------------|--------|----------|
| Core | 8 | Planned | 100% |
| Content | 12 | Planned | 100% |
| Annotation | 8 | Planned | 100% |
| Collaboration | 4 | Planned | 100% |
| Agent | 8 | Planned | 100% |
| Knowledge | 4 | Planned | 100% |

**Test Coverage:**
- Field resolution
- Argument validation
- Error handling
- Authorization checks
- Performance benchmarks

### Mutations
**Total Tests:** 44 (Planned)

One test per mutation operation defined in API-CONTRACTS.md.

| Subgraph | Mutation Count | Status | Coverage |
|----------|----------------|--------|----------|
| Core | 6 | Planned | 100% |
| Content | 14 | Planned | 100% |
| Annotation | 8 | Planned | 100% |
| Collaboration | 4 | Planned | 100% |
| Agent | 8 | Planned | 100% |
| Knowledge | 4 | Planned | 100% |

**Test Coverage:**
- Input validation
- Database mutations
- Event publishing
- Error states
- Transaction handling

### Subscriptions
**Total Tests:** 7 (Planned)

One test per subscription operation defined in API-CONTRACTS.md.

| Subgraph | Subscription Count | Status | Coverage |
|----------|-------------------|--------|----------|
| Annotation | 2 | Planned | 100% |
| Collaboration | 2 | Planned | 100% |
| Agent | 2 | Planned | 100% |
| Knowledge | 1 | Planned | 100% |

**Test Coverage:**
- Real-time event delivery
- Subscription filtering
- Connection handling
- Error propagation
- Unsubscribe behavior

---

## Federation Tests

**Total Tests:** 30+ (Planned)

| Test Category | Test Count | Status | Priority |
|---------------|------------|--------|----------|
| Entity Resolution | 12 | Planned | High |
| Cross-Subgraph Queries | 10 | Planned | High |
| Type Merging | 5 | Planned | Medium |
| Reference Resolution | 3 | Planned | Medium |

**Key Test Areas:**
- `@key` directive resolution
- Entity reference resolution across subgraphs
- Cross-subgraph query execution
- Type merging and conflicts
- Query planning optimization
- Error handling in federated queries

**Example Scenarios:**
- Fetching Course with User (Core + Content)
- Annotation with Media (Annotation + Content)
- Agent with Knowledge Graph (Agent + Knowledge)
- Collaboration Session with Users (Collaboration + Core)

---

## RLS Tests

**Total Tests:** 50+ (Planned)

| Test Category | Test Count | Status | Priority |
|---------------|------------|--------|----------|
| Tenant Isolation | 20 | Planned | Critical |
| Role Access | 15 | Planned | Critical |
| Owner Policies | 10 | Planned | High |
| Cross-Tenant Checks | 5 | Planned | High |

**Key Test Areas:**
- Tenant data isolation
- Role-based row filtering
- Owner-only access policies
- Admin bypass rules
- Cross-tenant leak prevention

**Test Scenarios:**
- User A cannot access User B's tenant data
- Student cannot access teacher-only content
- Annotation owner can delete, others cannot
- Admin can access all tenant data
- RLS policies apply to all CRUD operations

---

## E2E Tests

**Total Tests:** 30+ User Flows (Planned)

| Flow Category | Test Count | Status | Priority |
|---------------|------------|--------|----------|
| Authentication | 5 | Planned | Critical |
| Course Management | 8 | Planned | High |
| Annotation | 6 | Planned | High |
| AI Chat | 4 | Planned | High |
| Search | 4 | Planned | Medium |
| Collaboration | 3 | Planned | Medium |

### Authentication Flows
1. User login with Keycloak
2. Token refresh flow
3. Logout and session cleanup
4. SSO authentication
5. Role-based access enforcement

### Course Management Flows
1. Create course with media upload
2. Edit course content tree
3. Publish course version
4. Delete course (soft delete)
5. Enroll in course
6. View course as student
7. View course analytics
8. Export course content

### Annotation Flows
1. Create text annotation
2. Create video annotation with timestamp
3. Reply to annotation
4. Share annotation layer
5. Search annotations
6. Delete annotation

### AI Chat Flows
1. Start chat with default agent
2. Ask question about course content
3. Use RAG with knowledge graph
4. Stream agent response
5. View execution history

### Search Flows
1. Full-text search across courses
2. Vector search for similar content
3. Filter by metadata
4. Search annotations

### Collaboration Flows
1. Join collaboration session
2. Real-time cursor tracking
3. CRDT conflict resolution

---

## Load Tests

**Total Tests:** 5 K6 Scenarios (Planned)

| Scenario | Duration | VUs | Status | Priority |
|----------|----------|-----|--------|----------|
| Smoke Test | 1 min | 1-10 | Planned | High |
| Load Test | 10 min | 50-100 | Planned | High |
| Stress Test | 15 min | 100-200 | Planned | Medium |
| Spike Test | 5 min | 0-500 | Planned | Medium |
| Soak Test | 2 hours | 50 | Planned | Low |

### Smoke Test
- **Purpose:** Verify system handles minimal load
- **VUs:** 1-10
- **Duration:** 1 minute
- **Success Criteria:** 0% errors, p95 < 500ms

### Load Test
- **Purpose:** Test normal production load
- **VUs:** 50-100
- **Duration:** 10 minutes
- **Success Criteria:** < 1% errors, p95 < 1s

### Stress Test
- **Purpose:** Find breaking point
- **VUs:** 100-200
- **Duration:** 15 minutes
- **Success Criteria:** Graceful degradation, no data loss

### Spike Test
- **Purpose:** Test sudden traffic spike
- **VUs:** 0-500 (rapid ramp)
- **Duration:** 5 minutes
- **Success Criteria:** Recovery after spike, no crashes

### Soak Test
- **Purpose:** Detect memory leaks and stability issues
- **VUs:** 50 constant
- **Duration:** 2 hours
- **Success Criteria:** Stable performance, no memory growth

---

## Coverage Tracking

### Current Coverage (Planned Targets)

| Package | Unit Coverage | Integration Coverage | Target |
|---------|---------------|---------------------|--------|
| Core Subgraph | 0% (Target: 90%) | 0% (Target: 85%) | 90% |
| Content Subgraph | 0% (Target: 90%) | 0% (Target: 85%) | 90% |
| Annotation Subgraph | 0% (Target: 90%) | 0% (Target: 85%) | 90% |
| Collaboration Subgraph | 0% (Target: 90%) | 0% (Target: 85%) | 90% |
| Agent Subgraph | 0% (Target: 90%) | 0% (Target: 85%) | 90% |
| Knowledge Subgraph | 0% (Target: 90%) | 0% (Target: 85%) | 90% |
| Gateway | 0% (Target: 85%) | 0% (Target: 80%) | 85% |
| Shared Packages | 0% (Target: 85%) | 0% (Target: 80%) | 85% |

### Coverage Gaps (To Be Identified)

**Critical Gaps:**
- TBD after Phase 0 implementation

**Medium Priority Gaps:**
- TBD after Phase 0 implementation

**Low Priority Gaps:**
- TBD after Phase 0 implementation

### Coverage Tools
- **Unit/Integration:** Vitest with c8 coverage
- **E2E:** Playwright with Istanbul
- **GraphQL:** Custom coverage tracking
- **Reporting:** Codecov for CI integration

---

## Test Execution Time

### Per Test Suite (Estimated)

| Suite | Test Count | Execution Time | Status |
|-------|------------|----------------|--------|
| Core Unit | 150 | ~2 min | Planned |
| Content Unit | 200 | ~3 min | Planned |
| Annotation Unit | 120 | ~2 min | Planned |
| Collaboration Unit | 100 | ~2 min | Planned |
| Agent Unit | 180 | ~3 min | Planned |
| Knowledge Unit | 150 | ~2 min | Planned |
| Gateway Unit | 80 | ~1 min | Planned |
| Integration Tests | 270 | ~5 min | Planned |
| GraphQL Tests | 95 | ~3 min | Planned |
| Federation Tests | 30 | ~2 min | Planned |
| RLS Tests | 50 | ~2 min | Planned |
| E2E Tests | 30 | ~15 min | Planned |
| Load Tests | 5 | ~3 hours (on-demand) | Planned |

### Total CI Time
- **Unit + Integration:** ~25 minutes
- **E2E:** ~15 minutes
- **Full Suite:** ~40 minutes (parallel execution)
- **Target CI Time:** < 30 minutes

### Optimization Strategies
1. Parallel test execution across subgraphs
2. Shared database fixtures
3. Test database pooling
4. Smart test selection (only run affected tests)
5. Caching of test dependencies

---

## Flaky Tests

**Definition:** Tests that intermittently fail without code changes.

### Known Flaky Tests (To Be Tracked)

| Test Name | Suite | Flake Rate | Skip Status | Fix Priority |
|-----------|-------|------------|-------------|--------------|
| TBD | TBD | TBD | No | TBD |

### Flakiness Tracking Process
1. **Detection:** CI runs track failure patterns
2. **Reporting:** Auto-create issue for tests with >5% flake rate
3. **Quarantine:** Mark as flaky, skip in CI
4. **Fix:** Assign owner, prioritize based on impact
5. **Verification:** Re-enable after 10 consecutive passes

### Common Flakiness Causes
- Race conditions in async code
- Timing issues in E2E tests
- Database state leakage between tests
- Network timeouts
- External service dependencies

---

## Test Ownership

### Subgraph Ownership

| Component | Owner | Backup |
|-----------|-------|--------|
| Core Subgraph | TBD | TBD |
| Content Subgraph | TBD | TBD |
| Annotation Subgraph | TBD | TBD |
| Collaboration Subgraph | TBD | TBD |
| Agent Subgraph | TBD | TBD |
| Knowledge Subgraph | TBD | TBD |
| Gateway | TBD | TBD |

### Test Type Ownership

| Test Type | Owner | Backup |
|-----------|-------|--------|
| Unit Tests | TBD | TBD |
| Integration Tests | TBD | TBD |
| GraphQL Tests | TBD | TBD |
| Federation Tests | TBD | TBD |
| RLS Tests | TBD | TBD |
| E2E Tests | TBD | TBD |
| Load Tests | TBD | TBD |

### Responsibilities
- **Owner:** Write, maintain, review test PRs
- **Backup:** Secondary reviewer, owner when primary unavailable
- **All:** Report flaky tests, maintain test quality

---

## Missing Tests

### Areas Without Coverage (To Be Assessed)

#### Critical Priority
1. **TBD** - To be identified during Phase 0 implementation

#### High Priority
1. **TBD** - To be identified during Phase 0 implementation

#### Medium Priority
1. **TBD** - To be identified during Phase 0 implementation

#### Low Priority
1. **TBD** - To be identified during Phase 0 implementation

### Coverage Assessment Process
1. Code review identifies untested paths
2. Create test task in backlog
3. Prioritize based on risk and usage
4. Assign to component owner
5. Track in this registry

### Target Timeline
- **Critical gaps:** Fix within 1 sprint
- **High priority:** Fix within 2 sprints
- **Medium priority:** Fix within 1 quarter
- **Low priority:** Backlog

---

## Appendix

### Test File Locations

```
packages/
├── subgraphs/
│   ├── core/
│   │   ├── src/**/*.test.ts
│   │   └── tests/
│   ├── content/
│   │   ├── src/**/*.test.ts
│   │   └── tests/
│   ├── annotation/
│   │   ├── src/**/*.test.ts
│   │   └── tests/
│   ├── collaboration/
│   │   ├── src/**/*.test.ts
│   │   └── tests/
│   ├── agent/
│   │   ├── src/**/*.test.ts
│   │   └── tests/
│   └── knowledge/
│       ├── src/**/*.test.ts
│       └── tests/
├── gateway/
│   ├── src/**/*.test.ts
│   └── tests/
└── shared/
    └── */src/**/*.test.ts

tests/
├── integration/
├── e2e/
├── load/
└── fixtures/
```

### Test Naming Conventions

**Unit Tests:**
- File: `*.test.ts` (colocated with source)
- Suite: `describe('[ComponentName]')`
- Test: `it('should [behavior] when [condition]')`

**Integration Tests:**
- File: `*.integration.test.ts`
- Suite: `describe('[Integration: ComponentA + ComponentB]')`
- Test: `it('should [behavior] when [condition]')`

**E2E Tests:**
- File: `*.e2e.test.ts`
- Suite: `describe('[E2E: User Flow Name]')`
- Test: `it('should [complete flow step]')`

### CI Configuration

```yaml
# .github/workflows/test.yml
jobs:
  unit:
    strategy:
      matrix:
        package: [core, content, annotation, collaboration, agent, knowledge, gateway]
    steps:
      - run: pnpm test --filter @edusphere/${{ matrix.package }}

  integration:
    steps:
      - run: pnpm test:integration

  e2e:
    steps:
      - run: pnpm test:e2e
```

---

**Last Updated:** 2026-02-17
**Next Review:** After Phase 0 completion
**Maintainer:** TBD
