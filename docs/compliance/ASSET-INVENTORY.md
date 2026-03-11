# Asset Inventory — EduSphere Information and Associated Assets

**Document ID:** ISMS-AST-001
**Clause Reference:** ISO/IEC 27001:2022 Annex A, Control A.5.9 — Inventory of Information and Other Associated Assets
**Version:** 1.0.0
**Status:** Active
**Owner:** Chief Information Security Officer (CISO)
**Last Updated:** 2026-03-11
**Next Review:** 2026-09-11 (semi-annual)
**Classification:** Confidential

---

## Purpose

This document provides a comprehensive inventory of all information and associated assets within EduSphere's ISMS scope. Each asset is classified by sensitivity, assigned an owner, and mapped to applicable security controls.

**Classification Scheme:**
- **Public** — Freely disclosed (marketing content, public API docs)
- **Internal** — For EduSphere staff only; not for customer or public disclosure
- **Confidential** — Sensitive business or customer data; restricted access; encryption required
- **Restricted** — Highest sensitivity (credentials, encryption keys, PII); strictly controlled, encrypted at rest and in transit

---

## Category 1: Software Assets

### 1.1 Application Software

| Asset ID | Asset Name | Description | Repository Path | Owner | Classification | Custodian | Security Controls |
|---|---|---|---|---|---|---|---|
| SW-001 | Hive Gateway v2 | GraphQL Federation gateway, JWT validation, rate limiting, query complexity | `apps/gateway/` | Platform Lead | Internal | DevOps | JWT validation, rate limiting, query depth/complexity limits, CORS |
| SW-002 | Subgraph Core | Users, tenants, roles, consent, audit log, erasure, user export | `apps/subgraph-core/` | Backend Lead | Confidential | Backend Engineering | RLS, `@requiresRole`, Pino logging, audit trail |
| SW-003 | Subgraph Content | Courses, lessons, media, ClamAV scanning, certificates, SCORM/xAPI | `apps/subgraph-content/` | Content Engineering | Confidential | Backend Engineering | ClamAV, RLS, image optimizer, file type validation |
| SW-004 | Subgraph Annotation | Personal annotations, visual anchors, knowledge graph anchors | `apps/subgraph-annotation/` | Backend Lead | Confidential | Backend Engineering | RLS, owner-only access, DOMPurify for SVG |
| SW-005 | Subgraph Collaboration | Live sessions, peer review, social learning, group challenges | `apps/subgraph-collaboration/` | Product Lead | Confidential | Backend Engineering | RLS, NATS TLS events, session auth |
| SW-006 | Subgraph Agent | LangGraph.js AI agents, LLM consent guard, PII scrubber, Chavruta | `apps/subgraph-agent/` | AI Lead | Restricted | AI Engineering | SI-10 consent gate, PII scrubber, gVisor sandboxing |
| SW-007 | Subgraph Knowledge | pgvector embeddings, Apache AGE graph, cohort insights, graph credentials | `apps/subgraph-knowledge/` | AI Lead | Confidential | AI Engineering | RLS, vector isolation per tenant, embedding access control |
| SW-008 | Transcription Worker | faster-whisper audio transcription, MinIO integration, job queue | `apps/transcription-worker/` | Platform Lead | Confidential | DevOps | MinIO TLS, audio file validation, job isolation |
| SW-009 | React Web App | Browser-based UI (React 19 + Vite 6), Keycloak SSO, offline support | `apps/web/` | Frontend Lead | Internal | Frontend Engineering | CSP headers, DOMPurify, SRI, HTTPS |
| SW-010 | Expo Mobile App | iOS/Android app (Expo SDK 54), offline-first, push notifications | `apps/mobile/` | Mobile Lead | Internal | Mobile Engineering | Expo secure store, biometric auth, certificate pinning (planned) |

### 1.2 Shared Packages and Libraries

| Asset ID | Asset Name | Description | Repository Path | Owner | Classification | Security Controls |
|---|---|---|---|---|---|---|
| SW-011 | `packages/db` | Drizzle schema, RLS helpers, `encryption.ts`, `getOrCreatePool()`, migrations | `packages/db/` | Backend Lead | Restricted | AES-256-GCM encryption, RLS enforcement, pool management |
| SW-012 | `packages/auth` | JWT validation, NestJS guards, `@requiresRole`, `@requiresScopes` | `packages/auth/` | Security Lead | Restricted | JWT RS256 validation, scope enforcement |
| SW-013 | `packages/nats-client` | NATS JetStream client wrapper with TLS and authentication | `packages/nats-client/` | Platform Lead | Internal | NATS TLS + auth per SI-7 |
| SW-014 | `packages/graphql-shared` | Shared SDL: security directives, scalars, enums | `packages/graphql-shared/` | Backend Lead | Internal | `@authenticated`, `@requiresScopes`, `@requiresRole` directives |
| SW-015 | `packages/rag` | LlamaIndex.TS RAG pipeline, embedding management, HybridRAG | `packages/rag/` | AI Lead | Confidential | No PII in embeddings (content-only vectors) |

### 1.3 Infrastructure and Tooling Software

| Asset ID | Asset Name | Description | Owner | Classification | Security Controls |
|---|---|---|---|---|---|
| SW-016 | Docker Compose | Local/staging orchestration configuration | DevOps | Internal | Network isolation, mem_limit per service |
| SW-017 | Helm Charts | Production Kubernetes deployment configuration | DevOps | Internal | NetworkPolicy, RBAC, secret management |
| SW-018 | GitHub Actions workflows | CI/CD: lint, test, build, deploy, security scan | DevOps | Internal | Secret management, branch protection |
| SW-019 | Husky + ESLint | Pre-commit hooks, automated security policy enforcement | Engineering | Internal | Security invariant checks at commit time |
| SW-020 | Drizzle ORM v1 | Database ORM with native RLS support | Backend Lead | Internal | Prevents raw SQL injection (SI-8 pattern) |

---

## Category 2: Data Assets

### 2.1 Personal Data (Restricted / Confidential)

| Asset ID | Asset Name | Data Elements | Classification | Legal Basis (GDPR) | Retention Period | Storage Location | Security Controls |
|---|---|---|---|---|---|---|---|
| DA-001 | User PII | Name (encrypted), email (encrypted), phone (if provided, encrypted), profile photo URL | Restricted | Contract + Legitimate Interest | Account lifetime + 90 days post-deletion | PostgreSQL `users` table (encrypted columns) | AES-256-GCM (`packages/db/src/helpers/encryption.ts`); RLS; user-erasure.service.ts |
| DA-002 | Authentication Credentials | Password hash (Keycloak only), JWT tokens (transient), refresh tokens | Restricted | Contract | Session lifetime; refresh tokens 30 days | Keycloak database (not EduSphere DB) | bcrypt hashing; Keycloak brute-force protection; never stored in EduSphere application DB |
| DA-003 | Learning Progress Data | Course completion, quiz scores, assessment results, learning velocity | Confidential | Contract + Legitimate Interest | Account lifetime + 2 years | PostgreSQL `progress`, `quiz_attempts`, `assessment_results` tables | RLS per tenant and user; instructor-only scope for aggregate data |
| DA-004 | Personal Annotations | Private notes, highlights, bookmarks attached to course content | Confidential | Contract | Account lifetime | PostgreSQL `annotations` table | RLS with owner-only read; instructor read via scope |
| DA-005 | AI Interaction Logs | Chavruta dialogue sessions, agent conversation history | Confidential | Contract + Consent (SI-10) | 90 days post-session | PostgreSQL `agent_sessions` table | Consent-gated (SI-10); PII scrubbed before LLM transmission |
| DA-006 | Consent Records | Records of user consent decisions for AI processing | Restricted | Legal Obligation (GDPR Art. 7) | 5 years post-consent withdrawal | PostgreSQL `consents` table (`apps/subgraph-core/src/consent/`) | Immutable records; append-only design |
| DA-007 | Audit Logs | All privileged operations with userId, tenantId, action, timestamp | Restricted | Legal Obligation | 3 years | PostgreSQL `audit_logs` table | Append-only design; `apps/subgraph-core/src/admin/audit-log.service.ts` |
| DA-008 | Minor User Data | Data for users under 16 (if enrolled) | Restricted | Parental Consent (planned) | Account lifetime | Same tables as DA-001 to DA-005 | Enhanced erasure; parental consent mechanism (planned Q2 2026) |

### 2.2 Course and Educational Content

| Asset ID | Asset Name | Data Elements | Classification | Retention | Storage Location | Security Controls |
|---|---|---|---|---|---|---|
| DA-010 | Course Content | Course metadata, lessons, modules, SCORM packages, videos | Confidential | Tenant contract lifetime | PostgreSQL `courses`, `lessons`; MinIO (media) | RLS per tenant; ClamAV scan on upload; instructor-only write |
| DA-011 | Assessment Content | Quiz questions, scenario assessments, rubrics | Confidential | Tenant contract lifetime | PostgreSQL `quizzes`, `assessments` | RLS; instructor-only write; prevent answer leak to students |
| DA-012 | Certificates and Credentials | Completion certificates, open badges, graph credentials | Confidential | Indefinite (portable credential) | PostgreSQL + MinIO (PDF) | RLS; verifiable via Open Badges standard |
| DA-013 | Course Media Files | Videos, images, PDFs, audio recordings | Internal | Tenant contract lifetime | MinIO object storage | ClamAV scan; MIME type validation; pre-signed URLs (15-min TTL) |
| DA-014 | Knowledge Graph Data | Concept nodes, relationship edges, semantic connections | Internal | Tenant contract lifetime | Apache AGE graph (`edusphere_graph`) | Cypher parameterized queries; RLS on AGE views |

### 2.3 Operational and System Data

| Asset ID | Asset Name | Data Elements | Classification | Retention | Storage Location | Security Controls |
|---|---|---|---|---|---|---|
| DA-020 | Vector Embeddings | 768-dim nomic-embed-text embeddings for semantic search | Internal | Content lifetime | PostgreSQL pgvector tables | HNSW index; tenant-scoped embedding tables |
| DA-021 | NATS Event Stream | Async event payloads (content.created, annotation.added, agent.message) | Internal | Per stream retention policy (max_age + max_bytes) | NATS JetStream | TLS + auth; no raw PII in event payloads |
| DA-022 | Application Logs | Pino structured JSON logs from all subgraphs | Internal | 90 days | Log aggregation (centralized logging — ELK planned) | Structured format; no PII in log fields |
| DA-023 | Distributed Traces | Jaeger trace spans for all GraphQL operations | Internal | 7 days | Jaeger storage | No PII in trace attributes; sampling configured |
| DA-024 | Metrics Data | Prometheus time-series metrics for all services | Internal | 15 days | Prometheus/Grafana | Aggregate only; no user-level metrics |
| DA-025 | Database Migration History | Drizzle migration records (schema changes) | Internal | Indefinite | PostgreSQL `drizzle.__drizzle_migrations` | Access restricted to DBA role |

---

## Category 3: Infrastructure Assets

### 3.1 Compute and Database

| Asset ID | Asset Name | Version | Purpose | Owner | Classification | Security Controls |
|---|---|---|---|---|---|---|
| IA-001 | PostgreSQL | 18 (with uuid-ossp, pgcrypto, age 1.5.0, vector 0.8.0) | Primary database | DBA / DevOps | Restricted | RLS on all tables; pgcrypto for UUID generation; TLS connections; PgBouncer connection pooling |
| IA-002 | Apache AGE | 1.5.0 | Graph database for knowledge graph | DBA / DevOps | Confidential | Cypher parameterized queries; `edusphere_graph` namespace isolation |
| IA-003 | pgvector | 0.8.0 | Vector similarity search for RAG | DBA / DevOps | Confidential | HNSW indexes; tenant-scoped tables |
| IA-004 | PgBouncer | Latest | PostgreSQL connection pooling | DevOps | Internal | `infrastructure/docker-compose.pgbouncer.yml`; `tests/security/pgbouncer-config.spec.ts` |
| IA-005 | Read Replica (PostgreSQL) | 18 | Read-only replica for analytics queries | DBA / DevOps | Restricted | Same RLS policies as primary; `tests/security/read-replica.spec.ts` |

### 3.2 Messaging and Storage

| Asset ID | Asset Name | Version | Purpose | Owner | Classification | Security Controls |
|---|---|---|---|---|---|---|
| IA-010 | NATS JetStream | Latest | Async event streaming | DevOps | Internal | TLS + authentication (SI-7); stream retention limits (`max_age` + `max_bytes`); `tests/security/nats-security.spec.ts` |
| IA-011 | MinIO | Latest | Object storage for media and exports | DevOps | Confidential | TLS in transit; AES encryption at rest; bucket policies; pre-signed URL TTL 15 min; `tests/security/minio-config.spec.ts` |

### 3.3 Identity and Security

| Asset ID | Asset Name | Version | Purpose | Owner | Classification | Security Controls |
|---|---|---|---|---|---|---|
| IA-020 | Keycloak | Latest | OIDC identity provider, MFA | Security / DevOps | Restricted | Brute-force protection (5 failures); MFA available; realm per environment; `infrastructure/docker/keycloak-realm.json`; `tests/security/keycloak-config.spec.ts`; `tests/security/keycloak-mfa.spec.ts` |
| IA-021 | Linkerd (mTLS) | Latest | Service mesh for inter-service encryption | DevOps | Internal | Automatic mTLS between all pods; certificate rotation; `tests/security/linkerd-mtls.spec.ts` |
| IA-022 | Traefik Ingress | Latest | TLS termination and routing | DevOps | Internal | TLS 1.2+ enforcement; `infrastructure/k8s/helm/edusphere/templates/ingress/` |

### 3.4 Observability

| Asset ID | Asset Name | Version | Purpose | Owner | Classification | Security Controls |
|---|---|---|---|---|---|---|
| IA-030 | Jaeger | Latest | Distributed tracing (OpenTelemetry) | DevOps | Internal | No PII in traces; internal access only; `tests/security/observability-config.spec.ts` |
| IA-031 | Grafana | Latest | Metrics dashboards and alerting | DevOps | Internal | Role-based access; `infrastructure/grafana/`; no PII in dashboards |
| IA-032 | Prometheus | Latest | Metrics collection | DevOps | Internal | Internal access only; aggregate metrics only |
| IA-033 | Falco | Latest | Runtime security monitoring | Security / DevOps | Internal | `infrastructure/falco/edusphere-rules.yaml`; syscall-level anomaly detection |

### 3.5 Container and Orchestration

| Asset ID | Asset Name | Version | Purpose | Owner | Classification | Security Controls |
|---|---|---|---|---|---|---|
| IA-040 | Docker Engine | Latest | Container runtime | DevOps | Internal | Non-root containers; read-only filesystems where possible; `tests/security/dockerfile-security.spec.ts` |
| IA-041 | Kubernetes | Latest | Production orchestration | DevOps | Internal | NetworkPolicy; RBAC; PodSecurityPolicy; HPA; PDB |
| IA-042 | Helm | Latest | K8s package manager | DevOps | Internal | `infrastructure/k8s/helm/edusphere/`; version-controlled values |
| IA-043 | gVisor | Latest | AI agent sandbox isolation | DevOps / AI Lead | Internal | Multi-tenant agent execution isolation; kernel syscall interception |

---

## Category 4: Third-Party Services

### 4.1 AI/LLM Providers

| Asset ID | Vendor | Service | Data Shared | Risk Level | Security Certification | DPA Status | Review Date |
|---|---|---|---|---|---|---|---|
| TP-001 | OpenAI | GPT-4/GPT-4o LLM inference | PII-scrubbed prompt context only (after `pii-scrubber.ts`); requires explicit user consent (SI-10) | HIGH | SOC 2 Type II | DPA signed | 2027-03-11 |
| TP-002 | Anthropic | Claude LLM inference | Same as OpenAI — PII-scrubbed prompts only; consent-gated | HIGH | SOC 2 Type II | DPA signed | 2027-03-11 |

### 4.2 Development and CI/CD

| Asset ID | Vendor | Service | Data Shared | Risk Level | Security Certification | DPA Status | Review Date |
|---|---|---|---|---|---|---|---|
| TP-010 | GitHub | Source code hosting, CI/CD (GitHub Actions), secret management | Source code, environment variable names (not values), build artifacts | HIGH | SOC 2 Type II | DPA/ToS accepted | 2027-03-11 |
| TP-011 | GraphQL Hive | Schema registry, breaking change detection | GraphQL SDL schema (no user data) | LOW | N/A (schema only) | ToS accepted | 2027-03-11 |

### 4.3 Cloud Provider

| Asset ID | Vendor | Service | Data Shared | Risk Level | Security Certification | DPA Status | Review Date |
|---|---|---|---|---|---|---|---|
| TP-020 | Cloud Provider (TBD) | Managed Kubernetes, managed PostgreSQL (optional), object storage, CDN | All production data (encrypted at rest; TLS in transit) | CRITICAL | SOC 2 Type II + ISO 27001 | DPA/BAA signed | 2027-03-11 |

---

## Category 5: AI/ML Model Assets

### 5.1 Deployed Models

| Asset ID | Model Name | Type | Provider | Purpose | EU AI Act Classification | Risk Level | Owner | Monitoring |
|---|---|---|---|---|---|---|---|---|
| ML-001 | nomic-embed-text | Text embedding | Nomic AI (self-hosted via Ollama) | 768-dim semantic embeddings for RAG and knowledge graph | Limited risk (informational) | LOW | AI Lead | Embedding drift detection (planned) |
| ML-002 | Ollama local models (e.g., llama3.2) | Generative LLM | Meta / open-source (self-hosted) | Development and on-premise LLM inference | High risk (educational assessment) — Annex III(3) | MEDIUM | AI Lead | Hallucination monitoring (planned) |
| ML-003 | GPT-4 / GPT-4o | Generative LLM | OpenAI (cloud) | Production LLM inference — Chavruta, assessment explanation | High risk (educational assessment) — Annex III(3) | HIGH | AI Lead | Pino logging of all LLM responses; consent gate; `tests/security/ai-compliance.spec.ts` |
| ML-004 | Claude 3.5 Sonnet | Generative LLM | Anthropic (cloud) | Production LLM inference — alternative to GPT-4 | High risk (educational assessment) — Annex III(3) | HIGH | AI Lead | Same as ML-003 |
| ML-005 | LangGraph.js Agents | Agent workflow | Open-source (self-hosted) | State machine: assess → quiz → explain → debate | High risk (automated decision support in education) | HIGH | AI Lead | Agent workflow audit log; gVisor sandboxing; `apps/subgraph-agent/` |
| ML-006 | LlamaIndex RAG pipeline | RAG | Open-source (self-hosted) | Knowledge retrieval for grounded LLM responses | Limited risk (retrieval, not decision) | LOW | AI Lead | Vector store query logging |
| ML-007 | faster-whisper | Speech-to-text | OpenAI Whisper (self-hosted) | Audio transcription for video content | Limited risk (transcription) | LOW | Platform Lead | `apps/transcription-worker/`; GPU isolation |

### 5.2 EU AI Act Compliance Notes for ML Models

Per EU AI Act Regulation 2024/1689, Annex III, point 3 — AI systems used in educational institutions for assessment of learning outcomes are classified as **high-risk**. This applies to ML-003, ML-004, ML-005.

Required controls for high-risk AI systems:
- Human oversight mechanisms ✅ (instructors can override AI assessments)
- Transparency to users ✅ (`docs/compliance/EU-AI-ACT-TECHNICAL-DOCUMENTATION.md`)
- Technical documentation ✅ (`docs/compliance/EU-AI-ACT-TECHNICAL-DOCUMENTATION.md`)
- Accuracy, robustness, cybersecurity ⚠️ (monitoring framework planned Q3 2026)
- Conformity assessment ❌ (required before EU market deployment; target Q4 2026)

---

## Asset Register Maintenance

### Review Cadence

| Asset Category | Review Frequency | Trigger for Ad-hoc Review |
|---|---|---|
| Software assets | Semi-annual | Major architectural change, new subgraph added |
| Data assets | Annual | New data type collected, GDPR obligation change |
| Infrastructure assets | Quarterly | Infrastructure change, new service deployed |
| Third-party services | Annual | Vendor security incident, DPA renewal, new vendor |
| AI/ML models | Quarterly | Model upgrade, new model deployed |

### Change Control

Changes to this inventory must be:
1. Proposed via pull request to the git repository
2. Reviewed and approved by the CISO
3. Reflected in the DPIA and ROPA if data processing activities change
4. Communicated to relevant data protection contacts if required by GDPR

---

## Document Control

| Field | Value |
|---|---|
| **Owner** | CISO |
| **Custodian** | Engineering Lead (technical details); Legal (data asset classifications) |
| **Review Frequency** | Semi-annual |
| **Next Review** | 2026-09-11 |
| **Related Documents** | `docs/compliance/ISO-27001-ISMS-SCOPE.md` |
| | `docs/compliance/DPIA.md` |
| | `docs/compliance/ROPA.md` |
| | `docs/compliance/VENDOR-RISK-REGISTER.md` |
| | `docs/compliance/EU-AI-ACT-TECHNICAL-DOCUMENTATION.md` |

*Version controlled in git. Full change history: `git log docs/compliance/ASSET-INVENTORY.md`*
