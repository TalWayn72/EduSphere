# SOC 2 Readiness Checklist — EduSphere

**Document ID:** SOC2-READ-001
**Version:** 1.0.0
**Status:** Active — Gap Analysis
**Owner:** Chief Information Security Officer (CISO)
**Prepared:** 2026-03-11
**Target Audit Type:** SOC 2 Type I (readiness assessment, Q3 2026) → Type II (12-month observation period, Q3 2027)
**Trust Service Criteria (TSC) in scope:** Security (CC) + Availability (A1) + Confidentiality (C1) + Privacy (P1–P8)
**Classification:** Confidential

---

## Overview

This document provides a gap analysis of EduSphere's compliance with AICPA Trust Services Criteria (2017 with 2022 updates). Each criterion is assessed against the current implementation state, with evidence references to the codebase and documentation.

**Status Legend:**
- ✅ Implemented — Control is fully operational with documented evidence
- ⚠️ Partial — Control exists but has documented gaps
- ❌ Missing — Control does not exist; remediation required before Type I audit

---

## CC1 — Control Environment

### CC1.1 — COSO Principle 1: Demonstrates Commitment to Integrity and Ethical Values

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `CLAUDE.md` Security Invariants SI-1 through SI-10 codify non-negotiable ethical and security commitments; pre-commit hooks and CI gates enforce these rules automatically; Engineering team required to adhere to secure coding standards as condition of contribution |
| **Gap** | — |

### CC1.2 — COSO Principle 2: Board Exercises Oversight Responsibility

| Field | Detail |
|---|---|
| **Status** | ❌ Missing |
| **Evidence** | None |
| **Gap** | Formal governance committee or board-level security oversight not established. Required: Security steering committee with executive representation, quarterly security review meetings, documented risk appetite statement. Target: Q2 2026 |

### CC1.3 — COSO Principle 3: Management Establishes Structure, Authority, and Responsibility

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | CISO role designated; security responsibilities embedded in `CLAUDE.md` Enterprise Execution Protocol; 11-division organizational structure with Security & Compliance division |
| **Gap** | Formal RACI matrix for all security roles not yet documented; organizational chart for security governance not published |

### CC1.4 — COSO Principle 4: Demonstrates Commitment to Competence

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | Security training embedded in development workflow via `CLAUDE.md` bug fix protocol and security review phases |
| **Gap** | Annual security awareness training program not yet implemented; competency assessments not conducted |

### CC1.5 — COSO Principle 5: Enforces Accountability

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Git commit history provides accountability for all code changes; Pino audit logging (`apps/subgraph-core/src/admin/audit-log.service.ts`) records all sensitive operations with `userId` and `tenantId`; `tests/security/audit-log.spec.ts` validates audit trail completeness |
| **Gap** | — |

---

## CC2 — Communication and Information

### CC2.1 — COSO Principle 13: Uses Relevant Information

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Pino structured JSON logging across all 6 NestJS subgraphs; every log entry includes `tenantId`, `userId`, `requestId`; Jaeger distributed tracing for request correlation; Grafana dashboards (`infrastructure/grafana/dashboards/edusphere-overview.json`) aggregate system metrics |
| **Gap** | — |

### CC2.2 — COSO Principle 14: Communicates Internally

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `CLAUDE.md` documents all security policies and procedures; `OPEN_ISSUES.md` tracks known issues and remediation status; `IMPLEMENTATION_ROADMAP.md` communicates security requirements across development phases |
| **Gap** | — |

### CC2.3 — COSO Principle 15: Communicates Externally

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | `docs/compliance/BREACH-NOTIFICATION-PROCEDURE.md` defines external communication for security incidents; privacy policy accessible to end users |
| **Gap** | Customer-facing security page (trust center) not yet published; SOC 2 Type II report sharing mechanism not established; no public security disclosure policy (responsible disclosure) |

---

## CC3 — Risk Assessment

### CC3.1 — COSO Principle 6: Specifies Suitable Objectives

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | `docs/compliance/DPIA.md` documents data protection objectives; `IMPLEMENTATION_ROADMAP.md` defines phase-gated quality objectives |
| **Gap** | Formal information security objectives aligned to business objectives not yet documented as standalone policy |

### CC3.2 — COSO Principle 7: Identifies and Analyzes Risk

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | `docs/compliance/DPIA.md` includes risk analysis for data processing activities; `CLAUDE.md` Security Invariants derived from threat analysis |
| **Gap** | Formal risk register with likelihood/impact scoring not yet maintained; no annual risk assessment process defined |

### CC3.3 — COSO Principle 8: Assesses Fraud Risk

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | RLS prevents cross-tenant data access (`tests/security/cross-tenant-isolation.spec.ts`); audit log records all sensitive operations |
| **Gap** | Fraud risk assessment not formally conducted; no anti-fraud controls beyond access control documented |

### CC3.4 — COSO Principle 9: Identifies and Analyzes Significant Change

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Git PR review process with mandatory CI gates; `IMPLEMENTATION_ROADMAP.md` phase acceptance criteria; schema breaking change detection via GraphQL Hive; `tests/security/ci-pipeline.spec.ts` |
| **Gap** | — |

---

## CC4 — Monitoring Activities

### CC4.1 — COSO Principle 16: Conducts Ongoing or Separate Evaluations

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | 42 automated security test files run on every CI pipeline trigger; `scripts/health-check.sh` validates all services; Falco runtime monitoring (`infrastructure/falco/edusphere-rules.yaml`) |
| **Gap** | Annual independent security assessment not yet conducted; no internal audit function established |

### CC4.2 — COSO Principle 17: Evaluates and Communicates Deficiencies

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | `OPEN_ISSUES.md` tracks all deficiencies; bug fix protocol in `CLAUDE.md` requires root cause documentation |
| **Gap** | No formal deficiency reporting process to executive leadership; no remediation tracking metrics dashboard |

---

## CC5 — Control Activities

### CC5.1 — COSO Principle 10: Selects and Develops Control Activities

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Controls selected based on risk analysis in DPIA; Security Invariants SI-1 through SI-10 are automated controls; pre-commit hooks enforce control activities at development time |
| **Gap** | — |

### CC5.2 — COSO Principle 11: Selects and Develops General Controls over Technology

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Keycloak for IAM; RLS for data access; NATS TLS for messaging; ClamAV for malware; `pnpm audit` for vulnerability management; all controls defined as code |
| **Gap** | — |

### CC5.3 — COSO Principle 12: Deploys through Policies and Procedures

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `CLAUDE.md` is the authoritative policy document; CI/CD enforces deployment procedures; Helm charts codify production deployment configuration (`infrastructure/k8s/helm/`) |
| **Gap** | — |

---

## CC6 — Logical and Physical Access Controls

### CC6.1 — Implements Logical Access Security Software, Infrastructure, and Architectures

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | JWT `@authenticated` directive on all GraphQL mutations; `@requiresRole(roles: [...])` and `@requiresScopes(scopes: [...])` directives; `packages/auth/` NestJS guards; `tests/security/graphql-authorization.spec.ts` |
| **Gap** | — |

### CC6.2 — Prior to Issuing System Credentials and Granting System Access

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Keycloak manages user registration; MFA available (`tests/security/keycloak-mfa.spec.ts`); email verification required; Keycloak brute-force protection (`tests/security/keycloak-config.spec.ts`); `infrastructure/docker/keycloak-realm.json` |
| **Gap** | — |

### CC6.3 — Role-based Access and Appropriate Access Provisioning

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | Role hierarchy (STUDENT/RESEARCHER/INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN) enforced in Keycloak and GraphQL directives; Keycloak realm admin UI for user management |
| **Gap** | User offboarding checklist not formalized — revocation of access on termination not documented as a procedure; access provisioning approval workflow not documented |

### CC6.4 — Restricts Physical Access

| Field | Detail |
|---|---|
| **Status** | N/A |
| **Evidence** | Cloud-native; no physical servers owned by EduSphere |
| **Gap** | — |

### CC6.5 — Identifies and Authenticates with Accounts

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Unique user IDs (UUID) per Keycloak account; JWT sub claim propagated to all subgraphs; no shared accounts; service accounts use distinct identities |
| **Gap** | — |

### CC6.6 — Restricts Access to System Boundaries and External Systems

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Rate limiting at Hive Gateway (per-tenant, per-IP); query depth limit 10; complexity limit 1000 (`tests/security/query-hardening.spec.ts`; `tests/security/api-security.spec.ts`); CORS restricted to known origins (`tests/security/cors-config.spec.ts`) |
| **Gap** | — |

### CC6.7 — Restricts Transmission, Movement, and Removal of Information

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Linkerd mTLS for inter-service communication (`tests/security/linkerd-mtls.spec.ts`); TLS enforced at ingress (Traefik); NATS TLS per SI-7 (`tests/security/nats-security.spec.ts`); HTTPS for all external communications; no plaintext HTTP in production (SI-6) |
| **Gap** | — |

### CC6.8 — Implements Controls to Prevent or Detect and Act Upon Unauthorized or Malicious Software

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | ClamAV scanning on all uploads (`apps/subgraph-content/src/clamav/clamav.service.ts`; `tests/security/clamav-upload.spec.ts`); Falco runtime security monitoring (`infrastructure/falco/edusphere-rules.yaml`); DOMPurify sanitization for SVG content (`tests/security/svg-sanitization.spec.ts`); `pnpm audit` blocks high-severity dependency vulnerabilities in CI |
| **Gap** | — |

---

## CC7 — System Operations

### CC7.1 — Detects and Monitors for New Vulnerabilities

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | `pnpm audit --audit-level=high` in CI pipeline; GitHub Dependabot alerts; `tests/security/ci-pipeline.spec.ts` validates audit runs |
| **Gap** | No SAST (static application security testing) tool integrated (e.g., Semgrep, Snyk Code); no container image scanning (e.g., Trivy) in CI; no SBOM generation |

### CC7.2 — Monitors System Components for Anomalous Behavior

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | Jaeger distributed tracing for request anomalies; Grafana dashboards for metrics; Falco runtime rules for syscall anomalies; Prometheus metrics collection |
| **Gap** | No automated alerting rules (Grafana Alerting or Prometheus Alertmanager) configured; no anomaly detection thresholds defined; no PagerDuty/OpsGenie on-call integration |

### CC7.3 — Evaluates Security Events

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `apps/subgraph-core/src/admin/audit-log.service.ts` records all sensitive operations with structured context; `audit_logs` table queryable via GraphQL (`apps/subgraph-core/src/admin/audit-log.resolver.ts`); `tests/security/audit-log.spec.ts`; E2E: `apps/web/e2e/audit-log-export.spec.ts` |
| **Gap** | — |

### CC7.4 — Responds to Security Incidents

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | `docs/compliance/BREACH-NOTIFICATION-PROCEDURE.md` defines notification chain; `tests/security/incident-response.spec.ts` validates incident detection controls |
| **Gap** | Incident response playbooks for specific scenarios (ransomware, credential theft, data breach, DDoS) not yet written; no incident severity classification matrix; no post-incident review process documented |

### CC7.5 — Identifies and Addresses Known Vulnerabilities

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | GitHub Security Advisories for dependency CVEs; `pnpm audit` blocks CI on high-severity vulnerabilities; `OPEN_ISSUES.md` tracks known issues |
| **Gap** | No formal vulnerability disclosure policy (responsible disclosure program); no SLA for vulnerability remediation by severity (e.g., Critical: 24h, High: 7 days) |

---

## CC8 — Change Management

### CC8.1 — Authorizes, Designs, Develops or Acquires, Configures, Documents, Tests, Approves, and Deploys

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Git PR review process (minimum 1 reviewer required); CI pipeline gates (lint + typecheck + test + security); `IMPLEMENTATION_ROADMAP.md` phase acceptance criteria; semantic commit messages; `tests/security/ci-pipeline.spec.ts` validates CI gates; Helm-based deployment with rollback capability |
| **Gap** | — |

---

## CC9 — Risk Mitigation

### CC9.1 — Identifies, Selects, and Develops Risk Mitigation Activities

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | `docs/compliance/DPIA.md` documents risk mitigation for data processing; Security Invariants SI-1 through SI-10 are codified risk mitigations |
| **Gap** | Formal risk treatment plan (ISO 27001 A.6.1.3) not yet documented as standalone artifact |

### CC9.2 — Assesses and Manages Risks from Vendors and Business Partners

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `docs/compliance/VENDOR-RISK-REGISTER.md`; DPAs with OpenAI, Anthropic, GitHub; SI-10 consent gate prevents unauthorized data sharing with LLM providers; `tests/security/vendor-compliance.spec.ts` |
| **Gap** | — |

---

## A1 — Availability

### A1.1 — Maintains, Monitors, and Evaluates Current Processing Capacity

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `mem_limit` and `mem_reservation` set for all Docker services; Kubernetes HPA configured for auto-scaling (`infrastructure/k8s/helm/edusphere/templates/*/hpa.yaml`); `NODE_OPTIONS=--max-old-space-size` per service; Grafana dashboards monitor resource consumption |
| **Gap** | — |

### A1.2 — Recovery from Environmental Threats

| Field | Detail |
|---|---|
| **Status** | ❌ Missing |
| **Evidence** | None formalized |
| **Gap** | Disaster Recovery (DR) plan not documented; RTO/RPO targets not defined; PostgreSQL backup strategy not documented; DR restore testing not scheduled. Required before Type I audit. Target: Q3 2026 |

### A1.3 — Environmental Protections (Physical)

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Cloud provider manages physical data center protections (power, cooling, fire suppression); EduSphere verifies cloud provider SOC 2 Type II certification annually |
| **Gap** | — |

---

## C1 — Confidentiality

### C1.1 — Identifies and Maintains Confidential Information

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `docs/compliance/ASSET-INVENTORY.md` classifies all data assets; PII fields encrypted at rest with AES-256-GCM (`packages/db/src/helpers/encryption.ts`); RLS enforces tenant-level data isolation; `tests/security/pii-encryption.spec.ts`; `tests/security/cross-tenant-isolation.spec.ts` |
| **Gap** | — |

### C1.2 — Disposes of Confidential Information

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `apps/subgraph-core/src/user/user-erasure.service.ts` implements GDPR right to erasure; `packages/db/src/schema/retentionPolicies.ts` defines retention rules; `tests/security/gdpr-erasure.spec.ts`; `tests/security/data-retention.spec.ts` |
| **Gap** | — |

---

## P1 — Privacy — Notice and Communication

### P1.1 — Provides Notice about Privacy Practices

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | `apps/web/src/pages/AccessibilityStatementPage.tsx` references privacy statement; `docs/compliance/ROPA.md` documents data processing purposes |
| **Gap** | Dedicated Privacy Policy page accessible from application footer not yet published; privacy notice at data collection points (registration, consent) not yet fully implemented |

---

## P2 — Privacy — Choice and Consent

### P2.1 — Communicates Choices and Obtains Consent

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `apps/subgraph-core/src/consent/consent.service.ts` manages user consent; `apps/subgraph-agent/src/ai/llm-consent.guard.ts` enforces SI-10 (third-party LLM consent gate); `apps/mobile/src/lib/ai-consent.ts` for mobile consent flow; `tests/security/consent-management.spec.ts` |
| **Gap** | — |

---

## P3 — Privacy — Collection

### P3.1 — Collects Personal Information Consistent with Objectives

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Zod validation schemas limit data collection to declared fields only; `docs/compliance/DPIA.md` documents collection purposes and lawful bases; `docs/compliance/ROPA.md` records all processing activities |
| **Gap** | — |

### P3.2 — Collects Information from Reliable Sources

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | User-provided data validated via Zod; third-party data (if any) documented in ROPA with source identified |
| **Gap** | — |

---

## P4 — Privacy — Use, Retention, and Disposal

### P4.1 — Uses Personal Information Consistent with Objectives

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `packages/db/src/schema/retentionPolicies.ts` defines retention periods per data category; `tests/security/data-retention.spec.ts` validates retention enforcement; purpose limitation enforced via RLS (users cannot access other users' data) |
| **Gap** | — |

### P4.2 — Retains Personal Information Consistent with Objectives

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Retention policies in `packages/db/src/schema/retentionPolicies.ts`; automated deletion via erasure service; `tests/security/gdpr-records.spec.ts` |
| **Gap** | — |

### P4.3 — Disposes of Personal Information

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `apps/subgraph-core/src/user/user-erasure.service.ts`; `tests/security/gdpr-erasure.spec.ts` |
| **Gap** | — |

---

## P5 — Privacy — Access

### P5.1 — Grants Data Subjects Access Rights

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Data export functionality (`apps/subgraph-core/src/user/` — user-export service); GDPR rights portal (`tests/security/gdpr-rights.spec.ts`); `docs/compliance/ROPA.md` documents data subject rights handling |
| **Gap** | — |

### P5.2 — Corrects Personal Information

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | User profile update mutations available in Core subgraph |
| **Gap** | No formal DSAR (Data Subject Access Request) handling procedure documented; correction request SLA not defined |

---

## P6 — Privacy — Disclosure and Notification

### P6.1 — Discloses Personal Information to Third Parties Consistent with Objectives

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | `withTenantContext()` enforces SI-9 (no cross-tenant data access); SI-10 consent gate blocks LLM data sharing without consent; `tests/security/ai-compliance.spec.ts`; `tests/security/consent-management.spec.ts` |
| **Gap** | — |

### P6.2 — Discloses Special Category Personal Information

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | Health/disability data not explicitly collected but may arise in accessibility features |
| **Gap** | Special category data handling policy not documented |

### P6.3 — Notifies Data Subjects of Breaches

| Field | Detail |
|---|---|
| **Status** | ⚠️ Partial |
| **Evidence** | `docs/compliance/BREACH-NOTIFICATION-PROCEDURE.md` defines notification process to authorities and customers |
| **Gap** | Individual data subject breach notification procedure not fully documented; notification templates not prepared |

---

## P7 — Privacy — Quality

### P7.1 — Ensures Accuracy and Completeness of Personal Information

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | Zod validation on all mutations ensures data quality at input; `encryptField()` validates non-null values before encryption; TypeScript strict mode prevents type coercion errors |
| **Gap** | — |

---

## P8 — Privacy — Monitoring and Enforcement

### P8.1 — Monitors Compliance with Privacy Objectives

| Field | Detail |
|---|---|
| **Status** | ✅ Implemented |
| **Evidence** | 42 automated security test files including: `tests/security/pii-encryption.spec.ts`, `tests/security/gdpr-erasure.spec.ts`, `tests/security/gdpr-records.spec.ts`, `tests/security/gdpr-rights.spec.ts`, `tests/security/consent-management.spec.ts`, `tests/security/data-retention.spec.ts`, `tests/security/ai-compliance.spec.ts`; `pnpm test:security` gates every deployment |
| **Gap** | — |

---

## Readiness Score Summary

### By Trust Service Category

| TSC Category | Total Criteria Assessed | ✅ Implemented | ⚠️ Partial | ❌ Missing | Score |
|---|---|---|---|---|---|
| **CC1 Control Environment** | 5 | 2 | 2 | 1 | 40% |
| **CC2 Communication** | 3 | 2 | 1 | 0 | 67% |
| **CC3 Risk Assessment** | 4 | 1 | 3 | 0 | 25% |
| **CC4 Monitoring** | 2 | 0 | 2 | 0 | 0% |
| **CC5 Control Activities** | 3 | 3 | 0 | 0 | 100% |
| **CC6 Logical Access** | 8 | 6 | 2 | 0 | 75% |
| **CC7 System Operations** | 5 | 1 | 4 | 0 | 20% |
| **CC8 Change Management** | 1 | 1 | 0 | 0 | 100% |
| **CC9 Risk Mitigation** | 2 | 1 | 1 | 0 | 50% |
| **A1 Availability** | 3 | 2 | 0 | 1 | 67% |
| **C1 Confidentiality** | 2 | 2 | 0 | 0 | 100% |
| **P1–P8 Privacy** | 12 | 7 | 4 | 0 | 58% |
| **TOTAL** | **50** | **28 (56%)** | **19 (38%)** | **2 (4%)** | **56%** |

### Overall Readiness

**Readiness Score: 28/50 criteria fully implemented (56%)**

- **Estimated SOC 2 Type I readiness:** Q3 2026 (after resolving 2 missing controls and closing priority partial gaps)
- **Estimated SOC 2 Type II readiness:** Q3 2027 (12-month observation period after Type I opinion)

### Critical Gaps (must close before Type I audit)

| # | Gap | Target Date | Owner |
|---|---|---|---|
| 1 | Board/governance committee not established (CC1.2) | Q2 2026 | CEO + CISO |
| 2 | Disaster Recovery plan not documented (A1.2) | Q3 2026 | DevOps + CISO |
| 3 | No automated alerting for anomalous behavior (CC7.2) | Q2 2026 | SRE |
| 4 | Incident response playbooks not complete (CC7.4) | Q2 2026 | CISO |
| 5 | No DSAR handling procedure (P5.2) | Q2 2026 | Legal + Engineering |

### High-Priority Partial Gaps (close within 90 days)

| # | Gap | Target Date |
|---|---|---|
| 1 | Security awareness training program | Q3 2026 |
| 2 | Formal RACI matrix for security roles | Q2 2026 |
| 3 | User offboarding checklist formalized | Q2 2026 |
| 4 | Vulnerability remediation SLAs by severity | Q2 2026 |
| 5 | Container image scanning (Trivy) in CI | Q2 2026 |
| 6 | Privacy Policy published to application | Q2 2026 |

---

## Document Control

| Field | Value |
|---|---|
| **Owner** | CISO |
| **Review Frequency** | Quarterly gap reassessment; annual full review |
| **Next Review** | 2026-06-11 (90-day follow-up on critical gaps) |
| **Related Documents** | `docs/compliance/ISO-27001-STATEMENT-OF-APPLICABILITY.md` |
| | `docs/compliance/DPIA.md` |
| | `docs/compliance/ROPA.md` |
| | `docs/compliance/BREACH-NOTIFICATION-PROCEDURE.md` |
| | `docs/compliance/VENDOR-RISK-REGISTER.md` |
| | `tests/security/soc2-policies.spec.ts` |

*Version controlled in git. Full change history: `git log docs/compliance/SOC2-READINESS-CHECKLIST.md`*
