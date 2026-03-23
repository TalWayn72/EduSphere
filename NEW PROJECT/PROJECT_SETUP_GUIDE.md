# Project Setup Guide — Universal AI Agent Methodology Template

## Overview

This template provides a **universal AI agent methodology for Claude Code** that can be adapted to any software project. It implements a battle-tested 3-level hierarchical agent model (Orchestrator → Division Leads → Specialists) with wave-based parallel execution, test-first bug fixing, and rigorous completion gates.

The methodology was developed and refined over hundreds of sessions on a production-scale project, with every failure mode captured as an iron rule. It is technology-agnostic — all framework-specific references use `{PLACEHOLDER}` tokens that you fill in for your stack.

### What This Template Provides

- **3-level hierarchical agent model** — Orchestrator → 10 Division Leads → 33+ Specialists
- **10 Division Lead prompt templates** — Pre-written prompts for Product, Architecture, UX, Frontend, Backend, Database, Security, QA, Documentation, DevOps
- **Wave-based parallel execution protocol** — Peak ~23 concurrent agents (4.6x vs flat model)
- **Bug fix protocol with test-first approach** — 12-stage protocol with mandatory reproducer tests
- **Session completion gate** — 10-check verification table, never declare "done" without it
- **Memory system with feedback rules** — 14 topic files capturing every learned failure mode
- **Document naming standards** — Folder structure, naming conventions, storage rules
- **Mermaid diagram style guide** — Mandatory visual documentation standards
- **Security shift-left methodology** — Security invariants enforced at every phase
- **UX spec and acceptance criteria templates** — Structured output formats for product/design work
- **Wave handoff templates** — Standardized data flow between execution waves
- **Enterprise execution protocol** — Full autonomous execution with progress reporting

---

## Quick Start

### Step 1: Copy the Template

Copy the entire `NEW PROJECT/` folder into your project root (or your Claude projects directory):

```bash
cp -r "NEW PROJECT/" /path/to/your-project/.claude/methodology/
# or
cp -r "NEW PROJECT/" /path/to/your-project/
```

### Step 2: Rename the Folder

Rename to match your project or keep as a methodology reference:

```bash
mv "NEW PROJECT/" "AI_METHODOLOGY/"
```

### Step 3: Fill In All `{PLACEHOLDER}` Tokens in CLAUDE.md

Open `CLAUDE.md` and replace every `{PLACEHOLDER}` with your project-specific values. Use the [Complete Placeholder Reference](#complete-placeholder-reference) table below.

### Step 4: Customize Lead Prompts

Edit files in `docs/architecture/agent-prompts/` to reference your specific tech stack, file paths, and patterns.

### Step 5: Update MEMORY.md

Replace `{PROJECT_NAME}` with your project name. Update `{CURRENT_BRANCH}`, `{PROJECT_STATUS}`, and `{TEST_COUNTS}` as your project evolves.

### Step 6: Create Memory Topic Files

Populate the `memory/` folder with the 14+ topic files referenced in MEMORY.md. Start with empty stubs and let them grow as the AI agent learns from your project.

### Step 7: Define Security Invariants

Create your project-specific security invariants (SI-1 through SI-N) in the Security Invariants section of CLAUDE.md.

### Step 8: Configure MCP Servers

Update the MCP Tools section in CLAUDE.md to match your installed MCP servers and their division assignments.

---

## Complete Placeholder Reference

Every `{PLACEHOLDER}` used across all template files, organized by category.

### Project Identity

| Placeholder | Description | Example Values |
|-------------|-------------|----------------|
| `{PROJECT_NAME}` | Your project name | "MyApp", "DataPlatform", "EduSphere" |
| `{PROJECT_ROOT}` | Absolute path to project | `/home/user/myapp`, `C:\Users\dev\myapp` |
| `{PROJECT_PACKAGE_PREFIX}` | Package scope prefix | `@myapp/`, `@company/`, `@edusphere/` |
| `{LANGUAGE}` | Communication language with user | "English", "Hebrew", "Spanish" |
| `{SCALE_TARGET}` | Target scale | "100,000+ users", "10M requests/day" |

### Architecture & Services

| Placeholder | Description | Example Values |
|-------------|-------------|----------------|
| `{API_FRAMEWORK}` | API framework/protocol | "GraphQL Federation", "REST", "gRPC", "tRPC" |
| `{SERVICE_COUNT}` | Number of backend services | "6", "3", "12" |
| `{SERVICE_PORTS}` | Service port range | "4001-4006", "8001-8003" |
| `{FRONTEND_PORT}` | Frontend dev port | "5173", "3000", "8080" |
| `{FRONTEND_APP}` | Frontend app path | "apps/web", "packages/client" |
| `{MOBILE_APP}` | Mobile app path | "apps/mobile", "packages/mobile" |
| `{GATEWAY_APP}` | API gateway path | "apps/gateway", "packages/api" |
| `{BACKEND_SERVICES_DIR}` | Backend services path pattern | "apps/subgraph-*", "services/*" |
| `{PACKAGES_DIR}` | Shared packages path | "packages/*", "libs/*" |
| `{INFRA_DIR}` | Infrastructure path | "infrastructure/", "infra/" |

### Backend Stack

| Placeholder | Description | Example Values |
|-------------|-------------|----------------|
| `{BACKEND_FRAMEWORK}` | Backend framework | "NestJS", "Express", "FastAPI", "Spring Boot" |
| `{DATABASE}` | Primary database | "PostgreSQL", "MySQL", "MongoDB" |
| `{ORM}` | ORM/query builder | "Drizzle", "Prisma", "TypeORM", "SQLAlchemy" |
| `{AUTH_PROVIDER}` | Authentication provider | "Keycloak", "Auth0", "Firebase Auth", "Supabase Auth" |
| `{EVENT_BUS}` | Event/message bus | "NATS", "Kafka", "RabbitMQ", "Redis Pub/Sub" |
| `{LOGGER}` | Logging library | "Pino", "Winston", "Bunyan", "structlog" |
| `{VALIDATION_LIB}` | Validation library | "Zod", "Yup", "Joi", "class-validator" |
| `{LIFECYCLE_CLEANUP_HOOK}` | Service cleanup hook | "OnModuleDestroy", "onBeforeUnmount", "@PreDestroy" |
| `{TENANT_CONTEXT_WRAPPER}` | Multi-tenant wrapper function | "withTenantContext()", "setTenantScope()" |

### Frontend Stack

| Placeholder | Description | Example Values |
|-------------|-------------|----------------|
| `{FRONTEND_FRAMEWORK}` | Frontend framework | "React", "Vue", "Angular", "Svelte" |
| `{BUILD_TOOL}` | Frontend bundler | "Vite", "webpack", "esbuild", "Parcel" |
| `{UI_LIBRARY}` | UI component library | "shadcn/ui", "MUI", "Ant Design", "Chakra UI" |
| `{PRIMITIVE_UI_LIB}` | Primitive UI library | "Radix UI", "Headless UI", "React Aria" |
| `{CSS_FRAMEWORK}` | CSS framework | "Tailwind CSS", "CSS Modules", "styled-components" |
| `{SERVER_STATE_LIB}` | Server state management | "TanStack Query", "SWR", "Apollo Client" |
| `{CLIENT_STATE_LIB}` | Client state management | "Zustand", "Redux", "Jotai", "MobX" |
| `{FORM_LIB}` | Form library | "React Hook Form", "Formik" |
| `{GRAPHQL_CLIENT}` | GraphQL client lib | "urql", "Apollo Client", "graphql-request" |
| `{MOBILE_FRAMEWORK}` | Mobile framework | "Expo", "React Native CLI", "Flutter" |

### AI/ML Stack (optional — remove section if not applicable)

| Placeholder | Description | Example Values |
|-------------|-------------|----------------|
| `{GRAPH_DB}` | Graph database | "Apache AGE", "Neo4j", "ArangoDB" |
| `{VECTOR_DB}` | Vector database/extension | "pgvector", "Pinecone", "Weaviate", "Milvus" |
| `{AGENT_FRAMEWORK}` | AI agent framework | "LangGraph", "CrewAI", "AutoGen" |
| `{RAG_FRAMEWORK}` | RAG framework | "LlamaIndex", "LangChain" |
| `{AI_SDK}` | AI SDK | "Vercel AI SDK", "LangChain", "Semantic Kernel" |
| `{LOCAL_LLM}` | Local LLM runner | "Ollama", "vLLM", "llama.cpp" |
| `{EMBEDDING_MODEL}` | Embedding model | "nomic-embed-text", "text-embedding-3-small" |
| `{EMBEDDING_DIMENSIONS}` | Embedding vector dimensions | "768", "1536", "384" |
| `{GRAPH_QUERY_LANG}` | Graph query language | "Cypher", "Gremlin", "SPARQL" |
| `{SANDBOX_RUNTIME}` | Sandbox runtime for agents | "gVisor", "Firecracker", "Docker" |

### Build & Tooling

| Placeholder | Description | Example Values |
|-------------|-------------|----------------|
| `{PACKAGE_MANAGER}` | Package manager | "pnpm", "npm", "yarn", "bun" |
| `{BUILD_ORCHESTRATOR}` | Monorepo build tool | "Turborepo", "Nx", "Lerna", "Bazel" |
| `{TEST_FRAMEWORK}` | Unit test framework | "Vitest", "Jest", "Mocha", "pytest" |
| `{E2E_FRAMEWORK}` | E2E test framework | "Playwright", "Cypress", "Puppeteer" |
| `{OBJECT_STORAGE}` | Object storage | "MinIO", "S3", "GCS", "Azure Blob" |
| `{TRACING_TOOL}` | Distributed tracing | "Jaeger", "Zipkin", "Datadog APM" |
| `{CONTAINER_ORCHESTRATION}` | Container tool | "docker-compose", "Kubernetes", "Podman" |
| `{CI_PLATFORM}` | CI/CD platform | "GitHub Actions", "GitLab CI", "CircleCI" |

### Commands

| Placeholder | Description | Example Values |
|-------------|-------------|----------------|
| `{TEST_COMMAND}` | Run all tests | "pnpm turbo test", "npm test", "pytest" |
| `{TYPECHECK_COMMAND}` | Type checking | "pnpm turbo typecheck", "tsc --noEmit", "mypy ." |
| `{LINT_COMMAND}` | Linting | "pnpm turbo lint", "eslint .", "ruff check" |
| `{HEALTH_CHECK_COMMAND}` | Health check script | "./scripts/health-check.sh", "make health" |

### Security & Auth

| Placeholder | Description | Example Values |
|-------------|-------------|----------------|
| `{AUTH_DIRECTIVE}` | Auth check directive/decorator | "@authenticated", "@Authorized", "requireAuth" |
| `{SCOPE_DIRECTIVE}` | Scope check directive | "@requiresScopes", "hasScope" |
| `{ROLE_DIRECTIVE}` | Role check directive | "@requiresRole", "hasRole" |
| `{SI-1}` through `{SI-N}` | Security invariants | Define per project security policy |
| `{TEST_USERS}` | Test user accounts table | Define per project auth setup |

### Documentation

| Placeholder | Description | Example Values |
|-------------|-------------|----------------|
| `{ROADMAP_FILE}` | Roadmap document | "IMPLEMENTATION_ROADMAP.md", "ROADMAP.md" |
| `{API_CONTRACTS_FILE}` | API contracts document | "API_CONTRACTS.md", "docs/api/README.md" |
| `{MCP_SERVERS}` | MCP server list and config | Project-specific MCP configuration |

---

## Customization Checklist

Work through this checklist when adapting the template for your project:

### Core Setup
- [ ] Replace ALL `{PLACEHOLDER}` tokens in CLAUDE.md (use search to find them all)
- [ ] Update `{PROJECT_NAME}` in MEMORY.md
- [ ] Set `{PROJECT_ROOT}` to your actual project path
- [ ] Set `{LANGUAGE}` for user communication preference
- [ ] Define `{PROJECT_PACKAGE_PREFIX}` for your monorepo scope

### Architecture
- [ ] Define your service architecture: service names, ports, paths
- [ ] Update the Architecture & Patterns section with your actual stack
- [ ] Update Shared Packages section to match your monorepo structure
- [ ] Configure the Environment Variables section for your services

### Lead Prompts
- [ ] Update all 10 Lead prompt templates in `docs/architecture/agent-prompts/`
- [ ] Replace framework-specific references with your stack
- [ ] Update the MCP Division Matrix with your installed MCP servers
- [ ] Customize Skills per Wave for your available skills

### Security
- [ ] Define your security invariants (SI-1 through SI-N) — minimum 5 recommended
- [ ] Configure test user accounts for auth verification
- [ ] Set up pre-commit security checks for your stack
- [ ] Define RLS/authorization patterns for your database

### Testing & CI
- [ ] Set `{TEST_COMMAND}`, `{TYPECHECK_COMMAND}`, `{LINT_COMMAND}`
- [ ] Configure `{HEALTH_CHECK_COMMAND}` — write the health check script
- [ ] Define coverage targets for your project
- [ ] Set up CI/CD workflow references
- [ ] Configure E2E test paths and patterns

### Infrastructure
- [ ] Configure `{CONTAINER_ORCHESTRATION}` commands (docker-compose, k8s, etc.)
- [ ] Update Service Startup table with your actual services
- [ ] Define the Troubleshooting table for your common errors
- [ ] Set up MCP servers and verify connectivity

### Bug Fix Protocol
- [ ] Customize the Wave 2 directory checklist for your project structure
- [ ] Update test file location table for your test conventions
- [ ] Configure the Round Completion Gate with your specific checks
- [ ] Set up test user accounts for auth verification in gates

### Documentation
- [ ] Create `docs/INDEX.md` with your folder structure
- [ ] Set up doc storage rules matching your conventions
- [ ] Configure the Documentation Sync table for your key files
- [ ] Create initial `OPEN_ISSUES.md` for issue tracking

---

## Template File Structure

```
NEW PROJECT/
├── CLAUDE.md                          # Main AI assistant configuration (largest file)
├── MEMORY.md                          # Memory index — under 200 lines
├── PROJECT_SETUP_GUIDE.md             # This file
├── memory/                            # Memory topic files (populated over time)
│   ├── enterprise-execution.md        # Full execution protocol
│   ├── doc-pipeline.md                # Documentation sync pipeline
│   ├── vscode-tooling.md              # IDE setup and extensions
│   ├── user_role.md                   # User preferences
│   ├── feedback_orchestrator_role.md  # Orchestrator iron rule
│   ├── feedback_lead_must_delegate.md # Lead delegation iron rule
│   ├── feedback_mermaid_diagrams.md   # Mermaid requirement
│   ├── feedback_never_ask_fix_all.md  # No asking — fix everything
│   ├── feedback_bugfix_protocol.md    # Test-first bug fix
│   ├── feedback_container_verification.md
│   ├── feedback_honest_verification.md
│   ├── feedback_service_restoration.md
│   ├── feedback_visual_verification_mandatory.md
│   ├── feedback_never_stop.md
│   ├── feedback_no_questions_rounds.md
│   ├── feedback_progress_reports.md
│   └── feedback_new_agent_onboarding.md
└── docs/
    ├── architecture/
    │   ├── AGENT-HIERARCHY.md         # 3-level agent model reference
    │   └── agent-prompts/             # 10 Division Lead prompt templates
    │       ├── ProductLead.md
    │       ├── ArchLead.md
    │       ├── UXLead.md
    │       ├── FELead.md
    │       ├── BELead.md
    │       ├── DBLead.md
    │       ├── SecurityLead.md
    │       ├── QALead.md
    │       ├── DocLead.md
    │       └── DevOpsLead.md
    └── reference/
        ├── MERMAID_STYLE_GUIDE.md     # Diagram standards
        └── WAVE_HANDOFF_TEMPLATE.md   # Inter-wave data handoff format
```

---

## Adapting for Different Project Types

### Monorepo (Full Stack)
Use the template as-is. Fill in all placeholders. All 10 divisions are relevant.

### Backend-Only API
- Remove or minimize: UXLead, FELead sections
- Focus on: BELead, DBLead, SecurityLead, QALead
- Reduce Wave 1 to: ProductLead + ArchLead
- Reduce Wave 2 to: BELead + DBLead + SecurityLead + QALead

### Frontend-Only SPA
- Remove or minimize: BELead, DBLead sections
- Focus on: FELead, UXLead, QALead
- Simplify security invariants to client-side concerns
- Reduce Wave 2 to: FELead + SecurityLead + QALead

### Microservices (Many Services)
- Increase `{SERVICE_COUNT}` and expand service tables
- Each microservice may need its own Lead or Specialist
- Consider splitting BELead into multiple domain-specific Leads
- Increase parallel wave capacity

### Python/Go/Rust Projects
- Replace TypeScript-specific rules (typecheck, ESLint) with language equivalents
- Update `{TEST_FRAMEWORK}`: pytest, go test, cargo test
- Update `{LINT_COMMAND}`: ruff, golangci-lint, clippy
- Update `{TYPECHECK_COMMAND}`: mypy, go vet, cargo check
- Adjust memory safety rules for language-specific patterns

### No AI/ML Components
- Remove the entire AI/ML Architecture section from CLAUDE.md
- Remove AI-related placeholders (`{AGENT_FRAMEWORK}`, `{RAG_FRAMEWORK}`, etc.)
- Remove AI/ML Commands section
- Simplify to core web/API development divisions

---

## Tips for Success

1. **Start small** — You don't need all 10 divisions on day one. Start with FELead + BELead + QALead and add divisions as complexity grows.

2. **Let memory grow organically** — The `memory/` topic files should capture real failures and learnings from your project, not hypothetical ones.

3. **Enforce the iron rules from day one** — The Orchestrator and Lead delegation rules prevent the most common failure mode: the AI doing everything itself instead of delegating.

4. **Customize security invariants early** — These are your project's non-negotiable safety rails. Define them before writing production code.

5. **Use the Session Completion Gate** — It catches 90% of "forgot to test" and "forgot to verify" issues.

6. **Keep MEMORY.md under 200 lines** — The system only loads the first 200 lines. Index detailed content in topic files.

7. **Update CLAUDE.md as you learn** — The template is a starting point. Your project will develop its own patterns and rules. Capture them.
