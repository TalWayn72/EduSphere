# HECVAT Lite — EduSphere

**Higher Education Community Vendor Assessment Toolkit — Lite Version**
**Vendor:** EduSphere
**Product:** EduSphere Learning Platform
**Assessment Date:** February 2026
**Assessment Version:** HECVAT Lite 3.x
**Contact:** security@edusphere.io

---

## How to Read This Document

| Answer | Meaning |
|---|---|
| **Yes** | Control is implemented and operational. |
| **No** | Control is not implemented. |
| **In Progress** | Control is planned or partially implemented. |
| **N/A** | Control is not applicable to this product/service. |
| **See Notes** | Refer to the Remarks column for context. |

---

## Section 1 — Product Information

| # | Question | Answer | Remarks |
|---|---|---|---|
| 1.1 | What is the name of your product/service? | EduSphere | Cloud-native educational platform |
| 1.2 | What type of service is this? | SaaS | Multi-tenant Software-as-a-Service |
| 1.3 | Is this a cloud-based service? | Yes | Containerized microservices deployed on Kubernetes |
| 1.4 | Describe the product architecture. | See Notes | GraphQL Federation with 6 NestJS subgraphs (Core 4001, Content 4002, Annotation 4003, Collaboration 4004, Agent 4005, Knowledge 4006), React 19 frontend, Apache AGE knowledge graph, pgvector semantic search, NATS JetStream event bus. |
| 1.5 | Is this service multi-tenant? | Yes | PostgreSQL Row-Level Security (RLS) enforces tenant isolation at the database layer. Each request carries a `tenant_id` from the JWT propagated through all subgraphs. |
| 1.6 | Where is data hosted? | See Notes | Infrastructure is containerized (Docker/Kubernetes). Customers choose their deployment region. Default infrastructure spec uses PostgreSQL 16, NATS JetStream, and MinIO object storage — all self-hosted or cloud-provider-managed. |
| 1.7 | Is sub-processor or third-party hosting used? | In Progress | Customers may configure OpenAI or Anthropic as LLM providers. LLM calls require explicit user consent check (SI-10 security invariant). FERPA/privacy addenda with sub-processors are in progress. |
| 1.8 | Does the product integrate with institutional systems? | Yes | LTI 1.3 integration for LMS (Canvas, Moodle, Blackboard). SCIM 2.0 provisioning. OIDC federation via Keycloak. |

---

## Section 2 — Data Classification

| # | Question | Answer | Remarks |
|---|---|---|---|
| 2.1 | Does your product collect or store personally identifiable information (PII)? | Yes | Stores display name, email address, and profile data. All PII fields are encrypted at rest with AES-256-GCM using tenant-scoped encryption keys before write, decrypted on read within the service layer. |
| 2.2 | Does your product collect or store student educational records (FERPA)? | Yes | Course enrollment, quiz scores, assignment submissions, and learning progress are stored. Governed as education records under FERPA. Multi-tenant RLS ensures cross-institution isolation. |
| 2.3 | Does your product collect health or medical information (HIPAA)? | No | No health or medical data is collected or stored. |
| 2.4 | Does your product collect payment card data (PCI DSS)? | No | No payment processing. Billing, if applicable, is handled by a PCI-compliant payment processor and is out of scope for this assessment. |
| 2.5 | Does your product store biometric data? | No | No biometric data is collected. |
| 2.6 | Does your product use AI/ML models that process student data? | Yes | AI Chavruta agent uses Vercel AI SDK with LangGraph.js workflows. Student messages are only forwarded to configured LLM providers after explicit consent check (see Section 8). Embeddings are generated locally using nomic-embed-text via Ollama in development; production can use text-embedding-3-small. |
| 2.7 | What is the data retention policy? | See Notes | Data retention schedules are configurable per tenant. GDPR-required erasure is implemented via F-003 retention cleanup. Default: active data retained while tenant is active; deleted data removed within 30 days of deletion request. Detailed policy in `docs/policies/DATA_RETENTION.md`. |
| 2.8 | Is data pseudonymized or anonymized where possible? | Yes | Analytics and reporting use aggregated, pseudonymized data. Direct PII is not exposed in analytics exports. |

---

## Section 3 — Data Handling

| # | Question | Answer | Remarks |
|---|---|---|---|
| 3.1 | Is data encrypted in transit? | Yes | All inter-service communication uses TLS. The gateway enforces HTTPS. Production subgraph-to-subgraph traffic uses mTLS via Linkerd service mesh (SI-6). |
| 3.2 | Is data encrypted at rest? | Yes | PostgreSQL storage is encrypted at the volume level. Application-level AES-256-GCM encryption is applied to PII fields before database write (SI-3). MinIO object storage uses server-side encryption. |
| 3.3 | Describe your database architecture. | See Notes | PostgreSQL 16 with extensions: `age` (Apache AGE graph), `vector` (pgvector), `uuid-ossp`, `pgcrypto`. Row-Level Security policies enforce tenant isolation on all 16 tenant-scoped tables. Drizzle ORM is the sole query path; raw SQL is prohibited except for Apache AGE Cypher queries via parameterized graph helpers. |
| 3.4 | Is authentication federated (SSO/SAML/OIDC)? | Yes | Keycloak (OIDC/OAuth 2.0) handles all authentication. Brute-force protection is enabled with failure factor 5 (SI-4). No CAPTCHA is used (supports WCAG 3.3.8 Accessible Authentication). |
| 3.5 | Does the product support multi-factor authentication (MFA)? | Yes | Keycloak supports TOTP (Google Authenticator, FreeOTP) and WebAuthn/FIDO2 as second factors. MFA policy enforcement is configurable per tenant. |
| 3.6 | Is role-based access control (RBAC) implemented? | Yes | Roles: `SUPER_ADMIN`, `ORG_ADMIN`, `INSTRUCTOR`, `STUDENT`. JWT carries role and scopes. GraphQL resolvers enforce `@authenticated`, `@requiresScopes`, and `@requiresRole` directives. |
| 3.7 | Is data segregation between tenants enforced? | Yes | PostgreSQL RLS enforces `tenant_id` isolation at the database layer. The `withTenantContext()` helper sets `app.current_tenant` and `app.current_user_id` session variables before every query. Cross-tenant queries are prohibited except for `SUPER_ADMIN` role with explicit role check. |
| 3.8 | Does the product support data export? | Yes | Users can export their own learning history and submissions in JSON format. Tenant admins can export course and enrollment data. GDPR data portability is supported via F-003. |
| 3.9 | Does the product support data deletion requests (right to erasure)? | Yes | GDPR erasure is implemented via F-003 retention cleanup. Personal data can be permanently deleted on request within 30 days. Deletion propagates to backups on the next rotation cycle. |

---

## Section 4 — Availability and Business Continuity

| # | Question | Answer | Remarks |
|---|---|---|---|
| 4.1 | What is the target service availability SLA? | 99.9% | Three nines uptime for production deployments. Downtime allowance: ~8.7 hours/year. |
| 4.2 | Is the service designed for high availability? | Yes | All microservices are containerized and run with minimum 2 replicas in Kubernetes. PostgreSQL is deployed with streaming replication. NATS JetStream uses clustered mode. Gateway uses Hive Gateway v2 with health-based routing. |
| 4.3 | Are health checks implemented for all services? | Yes | `/health/live` and `/health/ready` endpoints on all subgraphs. `health-check.sh` validates PostgreSQL, Apache AGE, pgvector, Keycloak, NATS, MinIO, and Jaeger. Kubernetes liveness/readiness probes configured. |
| 4.4 | Is there a disaster recovery (DR) plan? | In Progress | DR runbooks are in `docs/deployment/`. PostgreSQL point-in-time recovery (PITR) is configured. Full DR testing schedule is being defined. |
| 4.5 | What is the recovery time objective (RTO)? | In Progress | Target RTO: 4 hours. DR automation is in progress. |
| 4.6 | What is the recovery point objective (RPO)? | See Notes | PostgreSQL WAL archiving is configured with 5-minute WAL segments. Target RPO: 5 minutes. MinIO versioning enables object-level recovery. |
| 4.7 | Are system updates performed with zero downtime? | Yes | Rolling deployments via Kubernetes (`RollingUpdate` strategy). Database migrations use Drizzle ORM's backward-compatible migration approach (no breaking schema changes without deprecation cycle). |
| 4.8 | Are memory limits enforced on all containers? | Yes | All Docker services have `mem_limit` and `mem_reservation` configured (Memory Safety iron rule). Node.js services set `NODE_OPTIONS=--max-old-space-size` ≤ 75% of container `mem_limit`. |

---

## Section 5 — Incident Response and Monitoring

| # | Question | Answer | Remarks |
|---|---|---|---|
| 5.1 | Is structured logging implemented? | Yes | All services use Pino logger (JSON structured output). Log fields include `tenantId`, `userId`, `requestId`, `level`, `timestamp`. `console.log` is prohibited in production code by ESLint rule. |
| 5.2 | Is distributed tracing implemented? | Yes | OpenTelemetry tracing is configured for all NestJS subgraphs. Traces are exported to Jaeger (`JAEGER_ENDPOINT` env var). Trace context propagates through GraphQL Federation via HTTP headers. |
| 5.3 | Do you have a documented incident response plan? | In Progress | Incident response procedures are being formalized. Current escalation path: on-call engineer → security team → institutional notification. |
| 5.4 | What is your breach notification timeline? | See Notes | Institutions will be notified within 72 hours of confirmed breach, in accordance with GDPR Article 33. FERPA breach notification timeline follows 34 CFR Part 99. |
| 5.5 | Are audit logs maintained? | Yes | All mutations that modify educational records, user data, or tenant configuration are logged with actor identity (`userId`, `tenantId`), action type, target resource, and timestamp. Audit logs are stored in a append-only table with RLS preventing self-modification. |
| 5.6 | Are vulnerability scans performed regularly? | Yes | Trivy container security scanning is integrated into the `docker-build.yml` CI workflow. `pnpm audit --audit-level=high` runs on every CI gate. Dependabot alerts are reviewed weekly. |
| 5.7 | Is there a vulnerability disclosure policy? | In Progress | A responsible disclosure policy and security@edusphere.io contact are being published. |

---

## Section 6 — Security Controls

| # | Question | Answer | Remarks |
|---|---|---|---|
| 6.1 | Is JWT-based authentication used for all API requests? | Yes | Hive Gateway v2 validates JWT signatures against Keycloak JWKS (`KEYCLOAK_JWKS_URL`). All GraphQL resolvers receive extracted claims (tenant_id, user_id, role, scopes) via context. |
| 6.2 | Is CORS configured to a restrictive allow-list? | Yes | CORS origin uses `process.env.CORS_ORIGIN?.split(',') ?? []` — never wildcard in production (SI-2 security invariant). |
| 6.3 | Is rate limiting implemented? | Yes | Rate limiting is applied at the gateway level, per tenant and per IP. GraphQL query depth is limited to 10. Query complexity is limited to 1000. |
| 6.4 | Is input validation applied to all mutations? | Yes | All GraphQL mutations are guarded by Zod schemas defined in `*.schemas.ts` files. Input sanitization middleware is applied globally in each NestJS subgraph. |
| 6.5 | Is SQL injection prevented? | Yes | All database queries use Drizzle ORM's parameterized query builder. Raw SQL is prohibited (SI-8). Apache AGE Cypher queries use parameterized prepared statements. |
| 6.6 | Is XSS prevented? | Yes | React's JSX escaping prevents DOM XSS. Content rendered by the TipTap rich-text editor is sanitized through DOMPurify before display. The gateway applies Content-Security-Policy headers. |
| 6.7 | Are secrets managed securely? | Yes | No secrets in code. All credentials are injected as environment variables. CI uses GitHub Actions secrets. Production uses Kubernetes Secrets (planned migration to HashiCorp Vault). |
| 6.8 | Is NATS messaging secured with TLS and authentication? | Yes | NATS JetStream connection uses `connect({ servers, tls, authenticator })` — bare connections are prohibited (SI-7). |
| 6.9 | Are database connections managed safely? | Yes | All DB connections use `getOrCreatePool()` from `@edusphere/db`. Direct `new Pool()` is prohibited (SI-8). All services implement `OnModuleDestroy` calling `closeAllPools()` (Memory Safety iron rule). |
| 6.10 | Is a Content Security Policy (CSP) configured? | Yes | CSP headers restrict script sources to `self` and configured CDN origins. `unsafe-inline` is not used for scripts. |
| 6.11 | Are API keys and tokens rotated? | In Progress | Keycloak client secrets are rotated quarterly. A formal key rotation schedule for all service credentials is being established. |
| 6.12 | Is penetration testing performed? | In Progress | Initial penetration test is planned for Q2 2026. |

---

## Section 7 — Accessibility

| # | Question | Answer | Remarks |
|---|---|---|---|
| 7.1 | Does the product conform to WCAG 2.2 Level AA? | Yes | EduSphere targets and substantially conforms to WCAG 2.2 Level AA. A full VPAT v2.5 is available in `docs/compliance/VPAT_v2.5.md` and at `/accessibility`. |
| 7.2 | Is keyboard navigation supported throughout the application? | Yes | All interactive elements are reachable via Tab and operable with Enter/Space/Escape/arrow keys. No keyboard traps. Radix UI primitives implement ARIA Authoring Practices Guide patterns. |
| 7.3 | Are screen readers supported? | Yes | Semantic HTML5, ARIA roles, states, and properties are used throughout. Tested with NVDA/Firefox and VoiceOver/Safari. Status messages use `role="status"` and `role="alert"` for live announcements. |
| 7.4 | Are captions provided for video content? | Yes | WebVTT captions are loaded via `<track kind="subtitles">`. All prerecorded course videos must have captions; enforcement is at course upload. |
| 7.5 | Does the product support right-to-left (RTL) languages? | Yes | Hebrew (`he`, `dir="rtl"`) is a fully supported language. The `<html lang dir>` attributes are set dynamically. All layout components are RTL-compatible using CSS logical properties and `direction: rtl`. |
| 7.6 | Does the product support multiple languages? | Yes | Supported: English (`en`), Hebrew (`he`). i18n infrastructure uses `react-i18next`. Additional languages can be added by contributing a locale JSON file. |
| 7.7 | Does the authentication flow meet WCAG 2.2 SC 3.3.8 (no CAPTCHA)? | Yes | No cognitive function test (CAPTCHA) is required. Keycloak brute-force protection uses time-delay lockout only. |
| 7.8 | Is reduced motion preference respected? | Yes | All CSS animations and transitions are disabled when `prefers-reduced-motion: reduce` is set. Implemented via Tailwind configuration. |
| 7.9 | Do interactive targets meet minimum size requirements? | Yes | All interactive targets have a minimum 24×24 CSS pixel activation area (WCAG 2.2 SC 2.5.8). A global CSS floor rule is enforced in `globals.css`. |
| 7.10 | Is there a public accessibility statement? | Yes | Available at `/accessibility`. Includes conformance level, key features, known limitations, and contact for accessibility support (accessibility@edusphere.io). |
| 7.11 | Is there a mechanism to report accessibility issues? | Yes | Email: accessibility@edusphere.io. Response commitment: 2 business days. Issues are tracked in the OPEN_ISSUES.md backlog. |

---

## Section 8 — Privacy and Data Governance

| # | Question | Answer | Remarks |
|---|---|---|---|
| 8.1 | Is the product GDPR compliant? | Yes | PII encrypted with AES-256-GCM (SI-3). Right to erasure implemented via F-003 retention cleanup. Data portability supported via export API. Consent management tracks user consent for third-party LLM providers (SI-10). Privacy impact assessments are in `docs/security/`. |
| 8.2 | Is FERPA compliance maintained? | Yes | Educational records are tenant-isolated via RLS. Only authorized users (instructors, admins) can access student records. Audit logging records all access to educational records. |
| 8.3 | Is explicit consent obtained before forwarding data to third-party LLMs? | Yes | SI-10 security invariant: before any student message is forwarded to OpenAI or Anthropic, the platform checks `THIRD_PARTY_LLM` consent. If consent is missing, a `CONSENT_REQUIRED` error is returned. Consent is stored per user per provider and can be revoked. |
| 8.4 | Are data processing agreements (DPAs) in place with sub-processors? | In Progress | DPAs with LLM providers (OpenAI, Anthropic) are being finalized. Existing DPAs: MinIO (self-hosted), Keycloak (self-hosted), NATS (self-hosted). |
| 8.5 | Is there a privacy policy? | Yes | Privacy policy is available at `/privacy` and in `docs/legal/`. It covers data types collected, retention, sharing, and user rights. |
| 8.6 | Is data minimization practiced? | Yes | Only data necessary for the educational function is collected. Optional profile fields (bio, avatar) are not required. Analytics use pseudonymized identifiers. |
| 8.7 | Is user data processed only in approved jurisdictions? | See Notes | Deployment region is customer-controlled. Data residency can be enforced by configuring the Kubernetes cluster in the appropriate region. The platform does not transmit data to regions outside the configured deployment unless a third-party LLM provider is configured by the tenant. |
| 8.8 | Are privacy-by-design principles followed? | Yes | RLS is the primary data boundary, not application-layer filtering. Encryption is applied before database write, not as a post-processing step. Data is pseudonymized in analytics pipelines at generation time. |

---

## Attestation

*I certify that the responses in this HECVAT Lite document are accurate to the best of my knowledge as of February 2026. EduSphere will update this assessment annually or upon significant product or security changes.*

**Contact:** security@edusphere.io
**Accessibility contact:** accessibility@edusphere.io
**Date:** February 2026

---

*HECVAT is developed and maintained by EDUCAUSE and Internet2. This document follows the HECVAT Lite format. A full HECVAT assessment is available upon request.*
