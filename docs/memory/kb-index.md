# EduSphere Knowledge Base Index
## Last Updated: 2026-04-06

## Architecture Overview
- **Gateway:** Hive Gateway v2 (port 4000) — Federation v2.7, MIT-licensed
- **6 Subgraphs:** Core (4001), Content (4002), Annotation (4003), Collaboration (4004), Agent (4005), Knowledge (4006)
- **Frontend:** React 19 + Vite 6 (port 5173)
- **Mobile:** Expo SDK 54 (React Native 0.81)
- **DB:** PostgreSQL 16 + Apache AGE (graph) + pgvector (embeddings, 768-dim)
- **AI:** Vercel AI SDK v6 + LangGraph.js + LlamaIndex.TS (HybridRAG)
- **Messaging:** NATS JetStream
- **Auth:** Keycloak OIDC — client `edusphere-web`, realm `edusphere`

## Division Map (12 Divisions)
| # | Division | Lead | Specialists |
|---|----------|------|-------------|
| 1 | Orchestrator | — (L0) | Coordinates all leads |
| 2 | Product & Requirements | ProductLead | PRD-Analyst, EdgeCase-Analyst, AccCriteria-Eng, Risk-Analyst |
| 3 | Software Architecture | ArchLead | SystemImpact-Analyst, Perf-Architect, DomainModeler |
| 4 | UX/UI Design | UXLead | FlowDesigner, A11y-Auditor, DesignSys-Eng, Microcopy-Reviewer |
| 5 | Frontend Engineering | FELead | Component-Architect, StatePerf-Eng, ResponsiveA11y-Eng, Mobile-Engineer |
| 6a | API Engineering | API-Lead | API-Architect, GraphQL-ContractTester |
| 6b | Services Engineering | ServicesLead | DomainLogic-Eng, BackgroundJobs-Eng, AIAgent-Specialist |
| 7 | Database & Data | DBLead | Schema-Architect, QueryOptimizer, Migration-Eng, GraphDB-Specialist |
| 8 | Security & Compliance | SecurityLead | AppSec-Analyst, PenTest-Spec, AuthPrivacy-Eng, InfraSec-Specialist |
| 9 | QA & Validation | QALead | UnitInteg-Eng, E2EPlaywright-Eng, LoadCompat-Eng, Regression-Eng, Mobile-E2E-Eng |
| 10 | Documentation | DocLead | APIDocs-Writer, UserGuide-Writer, ArchDocs-Writer |
| 11 | DevOps & Release | DevOpsLead | CICD-Eng, Deploy-Validator, GitOps-Eng, Observability-Eng |
| 12 | PMO & Wave Management | PMOLead | Wave-Planner, Risk-Dependency-Tracker, Progress-Reporter, Resource-Monitor |

Full reference: `docs/architecture/AGENT-HIERARCHY.md`

## MCP Server Matrix (14 Servers)
| Server | Purpose | Used By |
|--------|---------|---------|
| `memory` | Persistent entity storage across sessions | Orchestrator |
| `sequential-thinking` | Complex multi-step reasoning | Arch, DB, Security |
| `eslint` | Per-file lint after writes | FE, BE, QA |
| `github` | CI status, PR reviews, commits | DevOps, Docs |
| `tavily` | Technical doc & pattern search | All leads |
| `postgres` | DB queries, RLS validation, AGE graph | DB, Security |
| `graphql` | Schema inspection, query testing | API, FE |
| `nats` | Event monitoring, stream inspection | Services, DevOps |
| `typescript-diagnostics` | Per-file TS errors (fast) | FE, BE, QA |
| `playwright` | E2E browser testing | QA, UX |
| `context7` | Live NestJS/Drizzle/GraphQL docs | FE, BE |
| `coordination-bridge` | Agent coordination (Orchestrator-only) | Orchestrator |
| `vector-memory` | Semantic memory via ChromaDB (Orchestrator-only) | Orchestrator |
| `exa` | Academic/code pattern research | Arch, Research |

Full reference: `docs/operations/MCP_DECISION_MATRIX.md`

## Project Folder Map
```
apps/
  gateway/              — Hive Gateway v2 (port 4000)
  subgraph-core/        — Core subgraph (port 4001)
  subgraph-content/     — Content subgraph (port 4002)
  subgraph-annotation/  — Annotation subgraph (port 4003)
  subgraph-collaboration/ — Collaboration subgraph (port 4004)
  subgraph-agent/       — Agent subgraph (port 4005)
  subgraph-knowledge/   — Knowledge subgraph (port 4006)
  web/                  — React 19 + Vite 6 frontend (port 5173)
  mobile/               — Expo SDK 54 mobile app
packages/
  db/                   — Drizzle schema, migrations, RLS, Apache AGE helpers
  auth/                 — JWT validation, NestJS guards
  graphql-shared/       — Shared SDL (scalars, enums, directives, pagination)
  graphql-types/        — Generated TypeScript types (codegen output)
  nats-client/          — NATS JetStream wrapper
  eslint-config/        — Shared ESLint rules
  tsconfig/             — Shared TypeScript configs
```

## Key Service Ports
| Service | Port | Health Check |
|---------|------|-------------|
| Gateway | 4000 | GET /graphql |
| Core | 4001 | GET /graphql |
| Content | 4002 | GET /graphql |
| Annotation | 4003 | GET /graphql |
| Collaboration | 4004 | GET /graphql |
| Agent | 4005 | GET /graphql |
| Knowledge | 4006 | GET /graphql |
| Frontend | 5173 | GET / |
| PostgreSQL | 5432 | pg_isready |
| Keycloak | 8080 | /realms/edusphere |
| NATS | 4222 | nats pub test |
| MinIO | 9000 | /minio/health/live |
| Jaeger | 16686 | GET /api/traces |

## Test Users
| Username | Role | Notes |
|----------|------|-------|
| super.admin | SUPER_ADMIN | Cross-tenant access |
| instructor | INSTRUCTOR | Content creation |
| org.admin | ORG_ADMIN | Organization management |
| researcher | RESEARCHER | Analytics access |
| student | STUDENT | Default learner |

Password reset: `scripts/reset-keycloak-passwords.cjs`
Keycloak client: `edusphere-web` (NOT `edusphere-app`)

## Key Commands
| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start all services (turbo) |
| `pnpm turbo test` | All tests |
| `pnpm turbo build` | Build all workspaces |
| `pnpm turbo lint` | Lint all (zero warnings in CI) |
| `pnpm turbo typecheck` | TypeScript strict (zero errors) |
| `docker-compose up -d` | Start infrastructure |
| `./scripts/health-check.sh` | Validate all services |
| `pnpm --filter @edusphere/db migrate` | Apply DB migrations |
| `pnpm codegen` | Regenerate GraphQL TypeScript types |

## Test Counts (as of 2026-04-06)
- Web unit tests: 4,424+
- Security tests: 1,370
- E2E tests: 134
- Total: ~8,000+
- Coverage targets: Backend >90%, Frontend >80%, RLS 100%
