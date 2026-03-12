# ISO 27001:2022 — Information Security Management System (ISMS) Scope

**Clause Reference:** ISO/IEC 27001:2022, Clause 4.3 — Determining the Scope of the ISMS
**Document ID:** ISMS-SCO-001
**Version:** 1.0.0
**Status:** Active
**Owner:** Chief Information Security Officer (CISO)
**Last Review:** 2026-03-11
**Next Review:** 2027-03-11
**Classification:** Internal

---

## 1. Organization Overview (Clause 4.1)

### 1.1 Organization Identity

| Field | Value |
|---|---|
| **Legal Name** | EduSphere Ltd |
| **Industry** | Educational Technology (EdTech) — AI-Powered Learning Management |
| **Business Model** | Multi-tenant SaaS platform, international B2B and B2C |
| **Scale** | Designed for 100,000+ concurrent users |
| **Regulatory Jurisdiction** | Israel (primary), European Union (GDPR), potentially USA (FERPA if US students enrolled) |
| **AI Classification** | High-risk AI system per EU AI Act — used in educational assessment and personalized learning |

### 1.2 External Context (Clause 4.1)

**Market and Regulatory Environment:**
- EdTech sector subject to heightened scrutiny over student data privacy and AI-driven assessment
- Israeli Privacy Protection Authority (PPA) enforces the Privacy Protection Law 5741-1981 and the Privacy Protection Regulations (Data Security) 5777-2017
- EU General Data Protection Regulation (GDPR) 2016/679 applies to all processing of EU data subjects
- EU AI Act (Regulation 2024/1689) classifies AI used in educational institutions as high-risk (Annex III, point 3)
- Israeli National Cyber Directorate (INCD) Cyber Framework applies to critical digital infrastructure
- SOC 2 Type II compliance required by enterprise customers (B2B contracts)
- ISO 27001:2022 certification targeted for Q4 2026

**Technology Context:**
- Cloud-native architecture deployed on managed cloud infrastructure
- Open-source core components (PostgreSQL, Apache AGE, NATS, MinIO, Keycloak) with commercial AI provider integrations
- GraphQL Federation v2 architecture with 6 independent subgraphs
- AI/ML pipeline using both self-hosted (Ollama) and third-party LLM providers (OpenAI, Anthropic)
- Multi-tenant data isolation enforced via PostgreSQL Row Level Security (RLS)

**Competitive Context:**
- Differentiated by AI-powered knowledge graph and Chavruta peer-learning model
- Enterprise sales require security certifications and auditable controls
- GDPR and PDPA compliance as a competitive advantage in privacy-sensitive markets

### 1.3 Internal Context (Clause 4.1)

**Organizational Capabilities:**
- Engineering-led organization with embedded security practices (DevSecOps)
- Security invariants codified in `CLAUDE.md` and enforced by CI/CD pre-commit hooks
- Automated security testing suite: 42+ security test files in `tests/security/`
- All infrastructure defined as code (Docker Compose, Helm/Kubernetes, Terraform TBD)

**Current Security Posture:**
- 10 Security Invariants (SI-1 through SI-10) enforced as non-negotiable code rules
- RLS enabled on all 16+ tenant-scoped tables
- AES-256-GCM encryption for all PII fields (`packages/db/src/helpers/encryption.ts`)
- JWT-based authentication via Keycloak with MFA capability
- Automated vulnerability scanning via `pnpm audit` in CI pipeline

---

## 2. Scope Statement (Clause 4.3)

### 2.1 Formal Scope Statement

> **The ISMS of EduSphere Ltd encompasses all information assets, systems, processes, personnel, and third-party relationships involved in the design, development, deployment, operation, monitoring, and continuous improvement of the EduSphere AI-powered educational platform. This includes all processing of student personal data, course content, AI-generated learning interactions, and associated business data from tenant onboarding through data deletion.**

### 2.2 In-Scope Systems and Components

#### 2.2.1 Application Layer

| Component | Description | Location | Classification |
|---|---|---|---|
| **Hive Gateway v2** | GraphQL Federation gateway, JWT validation, routing | `apps/gateway/` | Critical |
| **Subgraph Core** | Users, roles, tenants, consent, audit log, erasure | `apps/subgraph-core/` | Critical |
| **Subgraph Content** | Courses, lessons, media, ClamAV scanning, certificates | `apps/subgraph-content/` | Critical |
| **Subgraph Annotation** | Personal annotations, knowledge graph anchors | `apps/subgraph-annotation/` | High |
| **Subgraph Collaboration** | Live sessions, peer review, social learning | `apps/subgraph-collaboration/` | High |
| **Subgraph Agent** | LangGraph.js AI agents, LLM consent guard, PII scrubber | `apps/subgraph-agent/` | Critical |
| **Subgraph Knowledge** | pgvector embeddings, Apache AGE graph, cohort insights | `apps/subgraph-knowledge/` | High |
| **Transcription Worker** | faster-whisper audio transcription, MinIO integration | `apps/transcription-worker/` | High |
| **React Web App** | Browser-based UI (React 19 + Vite 6), Keycloak SSO | `apps/web/` | High |
| **Expo Mobile App** | iOS/Android app (Expo SDK 54), offline-first | `apps/mobile/` | High |

#### 2.2.2 Data Layer

| Component | Description | Location | Classification |
|---|---|---|---|
| **PostgreSQL 18** | Primary relational database with RLS, uuid-ossp, pgcrypto | `infrastructure/docker/` | Critical |
| **Apache AGE 1.5.0** | Graph database extension for knowledge graph (Concept, Person, Term, Source) | `packages/db/src/` | High |
| **pgvector 0.8.0** | Vector similarity search, HNSW indexes, 768-dim embeddings | `packages/db/src/` | High |
| **Drizzle ORM v1** | ORM layer with native RLS support, all DB queries | `packages/db/src/schema/` | High |
| **Database Migrations** | Drizzle migration files 0001–0019+ | `packages/db/src/migrations/` | High |

#### 2.2.3 Infrastructure Layer

| Component | Description | Location | Classification |
|---|---|---|---|
| **NATS JetStream** | Event streaming: content.created, annotation.added, agent.message | `packages/nats-client/` | High |
| **MinIO** | Object storage for course media, transcriptions, exports | Docker Compose / K8s | High |
| **Keycloak** | Identity provider, OIDC, MFA, realm management | `infrastructure/docker/keycloak-realm.json` | Critical |
| **Docker Compose** | Local and staging orchestration | `docker-compose.yml` | Internal |
| **Kubernetes + Helm** | Production orchestration, HPA, NetworkPolicy | `infrastructure/k8s/helm/edusphere/` | Critical |
| **Jaeger** | Distributed tracing, OpenTelemetry | `infrastructure/` | Internal |
| **Grafana + Prometheus** | Metrics dashboards | `infrastructure/grafana/` | Internal |
| **Falco** | Runtime security monitoring | `infrastructure/falco/edusphere-rules.yaml` | High |
| **Linkerd** | mTLS service mesh for inter-subgraph communication | K8s annotations | High |
| **PgBouncer** | PostgreSQL connection pooling | `infrastructure/docker-compose.pgbouncer.yml` | High |

#### 2.2.4 CI/CD and Development Infrastructure

| Component | Description | Classification |
|---|---|---|
| **GitHub Actions** | CI/CD workflows: lint, typecheck, test, build, deploy | High |
| **GitHub Repository** | Source code, secrets management, branch protection | Critical |
| **pnpm + Turborepo** | Monorepo build system, dependency management | Internal |
| **Husky + ESLint** | Pre-commit hooks, automated code quality gates | Internal |

#### 2.2.5 AI/ML Pipeline

| Component | Description | Classification |
|---|---|---|
| **Vercel AI SDK v6** | LLM abstraction layer (Ollama ↔ OpenAI/Anthropic) | High |
| **LangGraph.js** | Agent state machine (assess → quiz → explain → debate) | High |
| **LlamaIndex.TS** | RAG pipeline, knowledge graph indexing | High |
| **Ollama (self-hosted)** | Local LLM inference (development and on-prem) | High |
| **OpenAI API** | Cloud LLM (production, consent-gated per SI-10) | Critical |
| **Anthropic API** | Cloud LLM (production, consent-gated per SI-10) | Critical |
| **nomic-embed-text** | Embedding model, 768 dimensions | High |

### 2.3 Exclusions and Justifications

| Excluded Item | Justification | Compensating Control |
|---|---|---|
| **Physical office security** | EduSphere operates as a cloud-native company; no on-premises servers. Physical office security is managed by the building management company under a separate contract. | Building management SLA + visitor log maintained by facilities |
| **Personal devices of employees (BYOD)** | A formal BYOD policy is under development (planned Q3 2026). Personal devices are not authorized to store production data. | MDM enrollment required for email access; production secrets only in approved vaults |
| **Third-party data centers (physical layer)** | EduSphere does not own or operate physical data center infrastructure. Physical controls are delegated to the cloud provider under shared responsibility model. | Cloud provider SOC 2 Type II + ISO 27001 certificates reviewed annually |
| **Employee personal tax and payroll systems** | Payroll processed by an external HR/accounting firm under separate DPA | Vendor assessment conducted; DPA signed |

---

## 3. Interested Parties (Clause 4.2)

### 3.1 Internal Interested Parties

| Party | Information Security Interests | Relevant ISMS Clause |
|---|---|---|
| **Engineering Team** | Secure development practices, no production secrets in code, audit trail for deployments | 4.3, A.8.25 |
| **CISO / Security Team** | Overall ISMS governance, risk treatment decisions, security metrics | 5.1, 6.1 |
| **Product Management** | Privacy by design in feature development, AI Act compliance for new AI features | 4.1, A.5.34 |
| **DevOps / SRE** | Infrastructure availability, incident response, DR/BCP | A.5.29, A.5.30, A.8.16 |
| **Executive Leadership** | Risk appetite, regulatory exposure, reputation protection | 5.1, 6.1.1 |
| **Legal / Compliance** | GDPR, Israeli PPA, EU AI Act, SOC 2, ISO 27001 obligations | 4.1, 4.2 |

### 3.2 External Interested Parties

| Party | Information Security Interests | Engagement Mechanism |
|---|---|---|
| **Students** | Privacy of learning data, AI interaction data, assessment results; right to erasure | Privacy policy, consent management, GDPR rights portal |
| **Instructors / Educators** | Integrity of course content; access to own students only (RLS); no cross-tenant leakage | Role-based access controls (`@requiresRole`), tenant isolation |
| **Organizational Administrators** | Tenant data isolation, audit logs, user management, compliance reports | Admin dashboard, audit-log GraphQL API |
| **Parents / Guardians (minors)** | COPPA/GDPR-K compliance for users under 16; parental consent mechanisms | Age verification at registration (planned), consent forms |
| **Israeli Privacy Protection Authority (PPA)** | Compliance with Privacy Protection Regulations (Data Security) 5777-2017 | Annual self-assessment, breach notification within 72 hours |
| **EU Data Protection Authorities (DPAs)** | GDPR compliance: lawful basis, data subject rights, cross-border transfers | ROPA (`docs/compliance/ROPA.md`), DPIA (`docs/compliance/DPIA.md`) |
| **Enterprise Customers (B2B)** | SOC 2 Type II reports, penetration test results, DPA execution | Customer security questionnaire (HECVAT Lite), vendor portal |
| **Cloud Infrastructure Provider** | Shared responsibility model compliance, incident notification SLA | Cloud provider BAA/DPA, annual SLA review |
| **OpenAI / Anthropic** | Data processing terms, no training on customer data (DPA), retention limits | API DPA, SI-10 consent gate |
| **GitHub** | Source code security, secret scanning, dependency vulnerability alerts | GitHub Advanced Security, Dependabot alerts |
| **Auditors / Certification Body** | Evidence of ISMS implementation, control effectiveness | Annual audit, evidence repository |

---

## 4. Interfaces and Dependencies (Clause 4.3)

### 4.1 External Service Dependencies

| Service | Purpose | Data Shared | Security Control | SLA/DPA |
|---|---|---|---|---|
| **Keycloak (self-hosted)** | OIDC identity provider, MFA, realm management | User credentials (hashed), JWT tokens | Self-hosted; `infrastructure/docker/keycloak-realm.json` enforces brute-force protection | Internal control |
| **MinIO (self-hosted)** | Object storage for media, exports, transcriptions | Course media files, export archives | TLS in transit, AES encryption at rest; `tests/security/minio-config.spec.ts` | Internal control |
| **NATS JetStream (self-hosted)** | Async event streaming between subgraphs | Event payloads (no raw PII) | TLS + authentication per SI-7; `tests/security/nats-security.spec.ts` | Internal control |
| **OpenAI API** | Cloud LLM inference (production, consent-gated) | Anonymized prompt context only (PII scrubbed by `apps/subgraph-agent/src/ai/pii-scrubber.ts`) | SI-10 consent gate; `apps/subgraph-agent/src/ai/llm-consent.guard.ts`; DPA signed | OpenAI DPA |
| **Anthropic API** | Cloud LLM inference (production, consent-gated) | Same as OpenAI — PII-scrubbed prompts only | Same SI-10 controls | Anthropic DPA |
| **Ollama (self-hosted)** | Local LLM inference (development + on-prem) | Full prompt context (local, no data leaves org) | Self-hosted; no external transmission | Internal control |
| **GitHub Actions** | CI/CD: lint, test, build, deploy | Source code, environment variable names (not values) | Secrets stored in GitHub Secrets; branch protection rules; `tests/security/ci-pipeline.spec.ts` | GitHub DPA |
| **Jaeger / OpenTelemetry** | Distributed tracing | Trace spans with service names, request IDs (no PII) | Internal deployment; trace sampling configured | Internal control |
| **Grafana + Prometheus** | Metrics and alerting | Aggregate metrics, no individual user data | Internal deployment; role-based dashboard access | Internal control |
| **Falco** | Runtime security monitoring | Kernel syscall events, process names | Internal deployment; `infrastructure/falco/edusphere-rules.yaml` | Internal control |
| **Linkerd (mTLS)** | Inter-service encrypted communication | All inter-subgraph traffic | mTLS, automatic certificate rotation; `tests/security/linkerd-mtls.spec.ts` | Internal control |

### 4.2 Internal Package Dependencies

| Package | Purpose | Security Relevance |
|---|---|---|
| `packages/db` | Drizzle schema, RLS helpers, encryption, `getOrCreatePool()` | `encryption.ts` (AES-256-GCM), `withTenantContext()` enforces SI-9 |
| `packages/auth` | JWT validation, NestJS guards, context extraction | Enforces SI-1 (RLS variable name), `@requiresRole` and `@requiresScopes` directives |
| `packages/nats-client` | NATS JetStream client wrapper with TLS | Enforces SI-7 (NATS auth/TLS) |
| `packages/graphql-shared` | Shared SDL: `@authenticated`, `@requiresScopes`, `@requiresRole` directives | Security directives applied at schema layer |
| `packages/rag` | LlamaIndex.TS RAG pipeline, embedding management | HybridRAG — no PII in vector embeddings (content-only) |

### 4.3 Network Boundaries

```
Internet
    │
    ▼
[Traefik Ingress] ── TLS termination (Let's Encrypt / corporate cert)
    │
    ▼
[Hive Gateway :4000] ── JWT validation, rate limiting, query complexity
    │  (mTLS via Linkerd)
    ├──► [Subgraph Core :4001]
    ├──► [Subgraph Content :4002]
    ├──► [Subgraph Annotation :4003]
    ├──► [Subgraph Collaboration :4004]
    ├──► [Subgraph Agent :4005] ──► [OpenAI/Anthropic APIs] (consent-gated)
    └──► [Subgraph Knowledge :4006]
              │
              ▼
    [PostgreSQL 18 + AGE + pgvector]
    [NATS JetStream]
    [MinIO Object Storage]
    [Keycloak OIDC]
    [Jaeger Tracing]
```

---

## 5. ISMS Boundaries

### 5.1 Physical Boundaries

The ISMS covers all logical systems regardless of physical location. EduSphere is cloud-native; no physical server rooms are in scope. The cloud provider's data center physical controls are verified annually via their SOC 2 Type II and ISO 27001 certificates.

### 5.2 Organizational Boundaries

The ISMS applies to:
- All EduSphere Ltd employees with access to production systems
- All contractors with access to production systems (subject to signed NDA and security training)
- All automated systems (CI/CD, monitoring agents) operating on behalf of EduSphere

### 5.3 Logical Boundaries

- **In scope:** All systems reachable via the production network described in Section 4.3
- **In scope:** All source code in the EduSphere monorepo (GitHub)
- **In scope:** All secrets managed in GitHub Secrets, environment variables, and `.env` files (values only in approved vaults)
- **Out of scope:** Personal employee devices (pending BYOD policy)
- **Out of scope:** Third-party SaaS tools used for business operations (e.g., email, project management) — covered by vendor risk register (`docs/compliance/VENDOR-RISK-REGISTER.md`)

---

## 6. Document Control

| Field | Value |
|---|---|
| **Document Owner** | CISO |
| **Review Frequency** | Annual, or on significant architectural change |
| **Approval Authority** | Executive Leadership + CISO |
| **Distribution** | Internal — Engineering, Legal, Compliance, Auditors |
| **Related Documents** | `docs/compliance/ISO-27001-STATEMENT-OF-APPLICABILITY.md` |
| | `docs/compliance/DPIA.md` |
| | `docs/compliance/ROPA.md` |
| | `docs/compliance/VENDOR-RISK-REGISTER.md` |
| | `docs/compliance/ASSET-INVENTORY.md` |
| | `docs/compliance/SOC2-READINESS-CHECKLIST.md` |
| | `docs/compliance/BREACH-NOTIFICATION-PROCEDURE.md` |

---

*This document satisfies ISO/IEC 27001:2022 Clause 4.3 requirements for documenting the scope of the ISMS. Version controlled in git; change history available via `git log docs/compliance/ISO-27001-ISMS-SCOPE.md`.*
