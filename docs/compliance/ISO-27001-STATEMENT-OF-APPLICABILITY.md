# ISO 27001:2022 — Statement of Applicability (SoA)

**Clause Reference:** ISO/IEC 27001:2022, Clause 6.1.3(b) and Annex A
**Document ID:** ISMS-SOA-001
**Version:** 1.0.0
**Status:** Active
**Owner:** Chief Information Security Officer (CISO)
**Last Review:** 2026-03-11
**Next Review:** 2027-03-11
**Classification:** Confidential

---

## Purpose

This Statement of Applicability (SoA) documents the applicability of all 93 controls defined in ISO/IEC 27001:2022 Annex A to EduSphere's ISMS. For each control, it states:
- **Applicable:** YES / NO
- **Justification:** Legal obligation, contractual requirement, risk treatment, or business need
- **Implementation Status:** Implemented / Partial / Planned / Not Applicable
- **Evidence / Codebase Reference:** Where the control is implemented

**Legend:**
- ✅ Implemented — Control is fully operational with documented evidence
- ⚠️ Partial — Control is partially implemented; gap documented
- 📅 Planned — Control is planned; target date noted
- N/A — Not applicable to EduSphere's operating environment

---

## Theme 1: Organizational Controls (A.5.1 – A.5.37)

### A.5.1 — Policies for Information Security

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Core ISMS requirement; legal obligation under Israeli PPA and GDPR |
| **Status** | ✅ Implemented |
| **Evidence** | `CLAUDE.md` (security invariants SI-1 through SI-10); `docs/compliance/` (DPIA, ROPA, BREACH-NOTIFICATION-PROCEDURE); `docs/security/`; pre-commit hooks enforcing policy |

### A.5.2 — Information Security Roles and Responsibilities

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Required for accountability |
| **Status** | ⚠️ Partial |
| **Evidence** | CISO role defined; Engineering security responsibilities in `CLAUDE.md`. Formal RACI matrix not yet documented. |
| **Gap** | Formal RACI matrix for security roles; scheduled Q2 2026 |

### A.5.3 — Segregation of Duties

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Multi-tenant platform requires privilege separation |
| **Status** | ⚠️ Partial |
| **Evidence** | `@requiresRole(roles: [SUPER_ADMIN, ORG_ADMIN])` directives in GraphQL schema; Keycloak realm roles; CI/CD requires PR review before merge |
| **Gap** | Database DBA role separate from application deployment role — formal separation not enforced in Keycloak admin console yet |

### A.5.4 — Management Responsibilities

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | ISO 27001 leadership commitment |
| **Status** | ⚠️ Partial |
| **Evidence** | CISO designated; security requirements embedded in development workflow |
| **Gap** | Formal management statement of commitment to ISMS not yet produced |

### A.5.5 — Contact with Authorities

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Required for breach notification to Israeli PPA and EU DPAs |
| **Status** | ⚠️ Partial |
| **Evidence** | `docs/compliance/BREACH-NOTIFICATION-PROCEDURE.md` documents notification process |
| **Gap** | Designated regulatory contact person and escalation contacts list not formalized |

### A.5.6 — Contact with Special Interest Groups

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Threat intelligence, vulnerability disclosure |
| **Status** | 📅 Planned |
| **Gap** | CVE feed subscription; CERT-IL membership; planned Q3 2026 |

### A.5.7 — Threat Intelligence

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Required for proactive vulnerability management |
| **Status** | ⚠️ Partial |
| **Evidence** | `pnpm audit` in CI pipeline (`tests/security/ci-pipeline.spec.ts`); GitHub Dependabot alerts; `tests/security/api-security.spec.ts` (OWASP checks) |
| **Gap** | No formal threat intelligence feed subscription or structured threat modeling process |

### A.5.8 — Information Security in Project Management

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | All development phases must include security review |
| **Status** | ✅ Implemented |
| **Evidence** | `CLAUDE.md` Enterprise Execution Protocol mandates Security Audit agent in every development phase; security tests required for every new feature; pre-commit security gates |

### A.5.9 — Inventory of Information and Other Associated Assets

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Asset management foundational control |
| **Status** | ✅ Implemented |
| **Evidence** | `docs/compliance/ASSET-INVENTORY.md` |

### A.5.10 — Acceptable Use of Information and Other Associated Assets

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Required to govern employee use of company assets and data |
| **Status** | 📅 Planned |
| **Gap** | Acceptable Use Policy (AUP) document to be drafted Q2 2026 |

### A.5.11 — Return of Assets

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Employee offboarding requires credential revocation |
| **Status** | ⚠️ Partial |
| **Evidence** | Keycloak user management allows account deactivation; GitHub team access revocable |
| **Gap** | Formal offboarding checklist not documented |

### A.5.12 — Classification of Information

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Multi-tenant data requires classification for RLS and encryption decisions |
| **Status** | ✅ Implemented |
| **Evidence** | `docs/compliance/ASSET-INVENTORY.md` (classification column); PII fields encrypted at rest via `packages/db/src/helpers/encryption.ts`; RLS policies enforce tenant isolation per classification |

### A.5.13 — Labeling of Information

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Required for handling procedures |
| **Status** | ⚠️ Partial |
| **Evidence** | Document headers include classification labels (Internal/Confidential/Public) |
| **Gap** | Automated labeling in API responses and exports not yet implemented |

### A.5.14 — Information Transfer

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Data transmitted between subgraphs and to external APIs |
| **Status** | ✅ Implemented |
| **Evidence** | NATS TLS enforced per SI-7 (`tests/security/nats-security.spec.ts`); Linkerd mTLS between services (`tests/security/linkerd-mtls.spec.ts`); HTTPS enforced at gateway; no plaintext inter-service HTTP in production (SI-6) |

### A.5.15 — Access Control

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Core multi-tenant security requirement |
| **Status** | ✅ Implemented |
| **Evidence** | JWT `@authenticated` directive on all mutations; `@requiresRole(roles: [...])` and `@requiresScopes(scopes: [...])` directives (`packages/graphql-shared/`); `tests/security/graphql-authorization.spec.ts` |

### A.5.16 — Identity Management

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | User identity is the foundation of multi-tenant isolation |
| **Status** | ✅ Implemented |
| **Evidence** | Keycloak OIDC; `packages/auth/` JWT validation; unique user IDs propagated through all RLS contexts |

### A.5.17 — Authentication Information

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Password and credential security |
| **Status** | ✅ Implemented |
| **Evidence** | Keycloak manages credential storage (bcrypt hashing); brute-force protection enabled (`tests/security/keycloak-config.spec.ts`); MFA available (`tests/security/keycloak-mfa.spec.ts`); no passwords stored in EduSphere application layer |

### A.5.18 — Access Rights

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Principle of least privilege |
| **Status** | ⚠️ Partial |
| **Evidence** | Role hierarchy: STUDENT < RESEARCHER < INSTRUCTOR < ORG_ADMIN < SUPER_ADMIN; enforced in JWT claims and GraphQL directives |
| **Gap** | Formal access rights review process (quarterly) not yet scheduled |

### A.5.19 — Information Security in Supplier Relationships

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | OpenAI, Anthropic, GitHub, cloud provider are critical suppliers |
| **Status** | ✅ Implemented |
| **Evidence** | `docs/compliance/VENDOR-RISK-REGISTER.md`; DPAs signed with data processors; SI-10 consent gate for LLM providers |

### A.5.20 — Addressing Information Security within Supplier Agreements

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Contractual security requirements with suppliers |
| **Status** | ⚠️ Partial |
| **Evidence** | OpenAI and Anthropic DPAs in place; GitHub ToS |
| **Gap** | Standardized supplier security questionnaire not yet formalized for all vendors |

### A.5.21 — Managing IS in the ICT Supply Chain

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | npm package supply chain risk |
| **Status** | ⚠️ Partial |
| **Evidence** | `pnpm audit` in CI; GitHub Dependabot; lock file committed to repo |
| **Gap** | SBOM (Software Bill of Materials) generation not yet automated |

### A.5.22 — Monitoring, Review and Change Management of Supplier Services

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Annual review of cloud and AI provider security posture |
| **Status** | ⚠️ Partial |
| **Evidence** | `docs/compliance/VENDOR-RISK-REGISTER.md` defines annual review dates |
| **Gap** | Formal review meeting cadence not yet established |

### A.5.23 — Information Security for Use of Cloud Services

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | MinIO, Keycloak, NATS, OpenAI, Anthropic, cloud provider all in use |
| **Status** | ✅ Implemented |
| **Evidence** | Self-hosted services under EduSphere control; third-party services covered by DPAs; `tests/security/minio-config.spec.ts`; `tests/security/vendor-compliance.spec.ts` |

### A.5.24 — Information Security Incident Management Planning and Preparation

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Required for ISO 27001 and SOC 2 |
| **Status** | ⚠️ Partial |
| **Evidence** | `docs/compliance/BREACH-NOTIFICATION-PROCEDURE.md`; `tests/security/incident-response.spec.ts` |
| **Gap** | Incident response runbook with defined severity levels and on-call escalation not yet complete |

### A.5.25 — Assessment and Decision on Information Security Events

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Triage and classification of security events |
| **Status** | ⚠️ Partial |
| **Evidence** | Falco runtime rules (`infrastructure/falco/edusphere-rules.yaml`); Pino structured logging; audit log table |
| **Gap** | No automated SIEM integration; manual triage only |

### A.5.26 — Response to Information Security Incidents

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Containment, eradication, recovery procedures |
| **Status** | ⚠️ Partial |
| **Evidence** | `docs/compliance/BREACH-NOTIFICATION-PROCEDURE.md` |
| **Gap** | Playbooks for specific incident types (ransomware, data breach, account compromise) not yet written |

### A.5.27 — Learning from Information Security Incidents

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Continuous improvement |
| **Status** | ⚠️ Partial |
| **Evidence** | Post-incident documentation pattern defined in `CLAUDE.md` Bug Fix Protocol |
| **Gap** | Formal lessons-learned register not yet maintained |

### A.5.28 — Collection of Evidence

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Forensic evidence preservation |
| **Status** | ⚠️ Partial |
| **Evidence** | Audit log service (`apps/subgraph-core/src/admin/audit-log.service.ts`); Pino structured JSON logs; Jaeger traces |
| **Gap** | Log immutability and chain-of-custody procedures not formalized |

### A.5.29 — Information Security During Disruption

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Business continuity |
| **Status** | 📅 Planned |
| **Gap** | Business Continuity Plan (BCP) and DR runbook not yet written; target Q3 2026 |

### A.5.30 — ICT Readiness for Business Continuity

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | RTO/RPO targets for the platform |
| **Status** | 📅 Planned |
| **Gap** | RTO/RPO targets not formally documented; DR testing not scheduled |

### A.5.31 — Legal, Statutory, Regulatory and Contractual Requirements

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | GDPR, Israeli PPA, EU AI Act, SOC 2 |
| **Status** | ✅ Implemented |
| **Evidence** | `docs/compliance/DPIA.md`; `docs/compliance/ROPA.md`; `docs/compliance/EU-AI-ACT-TECHNICAL-DOCUMENTATION.md`; `tests/security/gdpr-erasure.spec.ts`; `tests/security/gdpr-records.spec.ts`; `tests/security/gdpr-rights.spec.ts` |

### A.5.32 — Intellectual Property Rights

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Open-source license compliance; course content rights |
| **Status** | ⚠️ Partial |
| **Evidence** | MIT-licensed open-source dependencies tracked via pnpm; Apache AGE (Apache 2.0); Hive Gateway (MIT) |
| **Gap** | Automated license scanning (e.g., `license-checker`) not in CI |

### A.5.33 — Protection of Records

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Audit log retention, regulatory records |
| **Status** | ⚠️ Partial |
| **Evidence** | `packages/db/src/schema/retentionPolicies.ts`; `tests/security/data-retention.spec.ts` |
| **Gap** | Formal records management policy (retention schedule) not documented |

### A.5.34 — Privacy and Protection of PII

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | GDPR and Israeli PPA mandate PII protection |
| **Status** | ✅ Implemented |
| **Evidence** | AES-256-GCM encryption (`packages/db/src/helpers/encryption.ts`); PII scrubber (`apps/subgraph-agent/src/ai/pii-scrubber.ts`); user erasure (`apps/subgraph-core/src/user/user-erasure.service.ts`); DPIA (`docs/compliance/DPIA.md`); ROPA (`docs/compliance/ROPA.md`); `tests/security/pii-encryption.spec.ts` |

### A.5.35 — Independent Review of Information Security

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | External audit for ISO 27001 certification |
| **Status** | 📅 Planned |
| **Gap** | External penetration test and ISO 27001 gap assessment scheduled Q4 2026 |

### A.5.36 — Compliance with Policies, Rules and Standards

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Internal policy compliance monitoring |
| **Status** | ✅ Implemented |
| **Evidence** | `tests/security/soc2-policies.spec.ts`; pre-commit hooks enforce security invariants; CI gate blocks non-compliant code |

### A.5.37 — Documented Operating Procedures

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Operational procedures for security controls |
| **Status** | ⚠️ Partial |
| **Evidence** | `CLAUDE.md` documents all development and operational procedures; `scripts/health-check.sh`; `scripts/smoke-test.sh` |
| **Gap** | Formal operations runbooks for production incident response not yet written |

---

## Theme 2: People Controls (A.6.1 – A.6.8)

### A.6.1 — Screening

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Pre-employment background checks for staff with production access |
| **Status** | 📅 Planned |
| **Gap** | Formal background check policy not yet established; HR process to be defined Q2 2026 |

### A.6.2 — Terms and Conditions of Employment

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Security responsibilities in employment contracts |
| **Status** | ⚠️ Partial |
| **Evidence** | NDA referenced in onboarding; security responsibilities implied by role |
| **Gap** | Explicit security obligations clause in employment contracts not yet standardized |

### A.6.3 — Information Security Awareness, Education and Training

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Security awareness is foundational |
| **Status** | 📅 Planned |
| **Gap** | Annual security awareness training program not yet implemented; target Q3 2026 |

### A.6.4 — Disciplinary Process

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Consequences for security policy violations |
| **Status** | 📅 Planned |
| **Gap** | Formal disciplinary procedures for security violations not documented |

### A.6.5 — Responsibilities After Termination or Change of Employment

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Revocation of access on offboarding |
| **Status** | ⚠️ Partial |
| **Evidence** | Keycloak account deactivation; GitHub team removal process |
| **Gap** | Documented offboarding checklist with verification steps not yet formalized |

### A.6.6 — Confidentiality or Non-Disclosure Agreements

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Protection of proprietary platform and customer data |
| **Status** | ⚠️ Partial |
| **Evidence** | NDAs executed for contractors and partners |
| **Gap** | Standard NDA template review by legal not yet completed for ISO compliance |

### A.6.7 — Remote Working

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | All engineering is remote-first |
| **Status** | ⚠️ Partial |
| **Evidence** | VPN access controls; GitHub 2FA required; production access via bastion (planned) |
| **Gap** | Formal Remote Working Security Policy not documented |

### A.6.8 — Information Security Event Reporting

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Employees must report suspected incidents |
| **Status** | ⚠️ Partial |
| **Evidence** | `docs/compliance/BREACH-NOTIFICATION-PROCEDURE.md` outlines reporting chain |
| **Gap** | Internal security incident reporting channel (e.g., dedicated email, Slack channel) not yet established |

---

## Theme 3: Physical Controls (A.7.1 – A.7.14)

> **Note:** EduSphere is a cloud-native organization with no owned physical server infrastructure. Most physical controls are delegated to the cloud provider under the shared responsibility model. Cloud provider ISO 27001 certificate and SOC 2 Type II report are reviewed annually.

### A.7.1 — Physical Security Perimeters

| Field | Detail |
|---|---|
| **Applicable** | NO |
| **Justification** | No owned physical data centers; cloud provider controls apply |
| **Status** | N/A |

### A.7.2 — Physical Entry

| Field | Detail |
|---|---|
| **Applicable** | NO |
| **Justification** | Cloud-native; no server rooms owned by EduSphere |
| **Status** | N/A |

### A.7.3 — Securing Offices, Rooms and Facilities

| Field | Detail |
|---|---|
| **Applicable** | YES (office only) |
| **Justification** | Physical office security for workstations |
| **Status** | ⚠️ Partial |
| **Evidence** | Building management controls physical access |
| **Gap** | Formal office security policy for visitor access, clear desk, locked screen not documented |

### A.7.4 — Physical Security Monitoring

| Field | Detail |
|---|---|
| **Applicable** | NO |
| **Justification** | Cloud provider manages physical monitoring of data centers |
| **Status** | N/A |

### A.7.5 — Protecting Against Physical and Environmental Threats

| Field | Detail |
|---|---|
| **Applicable** | NO (data center) / YES (office) |
| **Justification** | Data center: cloud provider responsibility; Office: basic fire/flood controls |
| **Status** | N/A (data center) |

### A.7.6 — Working in Secure Areas

| Field | Detail |
|---|---|
| **Applicable** | NO |
| **Justification** | No dedicated secure areas required; cloud-native |
| **Status** | N/A |

### A.7.7 — Clear Desk and Clear Screen

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Workstation security in shared office spaces |
| **Status** | 📅 Planned |
| **Gap** | Clear desk/screen policy not yet published |

### A.7.8 — Equipment Siting and Protection

| Field | Detail |
|---|---|
| **Applicable** | NO |
| **Justification** | No owned servers; cloud provider manages hardware |
| **Status** | N/A |

### A.7.9 — Security of Assets Off-premises

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Laptops, mobile devices used remotely |
| **Status** | 📅 Planned |
| **Gap** | Device encryption policy (FileVault/BitLocker) and MDM enrollment not yet mandated |

### A.7.10 — Storage Media

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | USB drives, external media |
| **Status** | 📅 Planned |
| **Gap** | Removable media policy not yet published |

### A.7.11 — Supporting Utilities

| Field | Detail |
|---|---|
| **Applicable** | NO |
| **Justification** | Cloud provider manages power, cooling, UPS |
| **Status** | N/A |

### A.7.12 — Cabling Security

| Field | Detail |
|---|---|
| **Applicable** | NO |
| **Justification** | Cloud-native |
| **Status** | N/A |

### A.7.13 — Equipment Maintenance

| Field | Detail |
|---|---|
| **Applicable** | NO |
| **Justification** | Cloud provider manages hardware maintenance |
| **Status** | N/A |

### A.7.14 — Secure Disposal or Re-use of Equipment

| Field | Detail |
|---|---|
| **Applicable** | YES (laptops only) |
| **Justification** | Secure wiping of employee laptops on offboarding |
| **Status** | 📅 Planned |
| **Gap** | Device disposal procedure not yet documented |

---

## Theme 4: Technological Controls (A.8.1 – A.8.34)

### A.8.1 — User Endpoint Devices

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Developer workstations and mobile test devices |
| **Status** | 📅 Planned |
| **Gap** | MDM enrollment, endpoint protection policy pending BYOD policy |

### A.8.2 — Privileged Access Rights

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | SUPER_ADMIN and database admin roles require strict controls |
| **Status** | ✅ Implemented |
| **Evidence** | `@requiresRole(roles: [SUPER_ADMIN])` directives on all admin mutations; Keycloak realm admin separate from application admin; `tests/security/graphql-authorization.spec.ts` validates privilege escalation prevention |

### A.8.3 — Information Access Restriction

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Multi-tenant RLS is the core data isolation control |
| **Status** | ✅ Implemented |
| **Evidence** | `withTenantContext()` in `packages/db/src/`; RLS on all 16+ tables (`tests/security/rls-variables.spec.ts`; `tests/security/cross-tenant-isolation.spec.ts`); SI-9 enforced as iron rule |

### A.8.4 — Access to Source Code

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Source code contains security controls; unauthorized access is a risk |
| **Status** | ✅ Implemented |
| **Evidence** | GitHub team-based access controls; branch protection on `main`; PR review required; GitHub 2FA enforced |

### A.8.5 — Secure Authentication

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Authentication is the primary access control |
| **Status** | ✅ Implemented |
| **Evidence** | Keycloak OIDC with MFA capability (`tests/security/keycloak-mfa.spec.ts`); brute-force protection (`tests/security/keycloak-config.spec.ts`); JWT with short expiry; no passwords stored in application |

### A.8.6 — Capacity Management

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | 100,000+ concurrent user target requires capacity planning |
| **Status** | ✅ Implemented |
| **Evidence** | `mem_limit` and `mem_reservation` in all Docker Compose services; HPA configured in `infrastructure/k8s/helm/edusphere/templates/*/hpa.yaml`; `NODE_OPTIONS=--max-old-space-size` set per service |

### A.8.7 — Protection Against Malware

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | User-uploaded course content may contain malware |
| **Status** | ✅ Implemented |
| **Evidence** | ClamAV scanning on all file uploads (`apps/subgraph-content/src/clamav/clamav.service.ts`); `tests/security/clamav-upload.spec.ts` |

### A.8.8 — Management of Technical Vulnerabilities

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | npm dependency vulnerabilities are an ongoing risk |
| **Status** | ✅ Implemented |
| **Evidence** | `pnpm audit --audit-level=high` in CI (`tests/security/ci-pipeline.spec.ts`); GitHub Dependabot alerts enabled; `tests/security/api-security.spec.ts` (OWASP Top 10 checks) |

### A.8.9 — Configuration Management

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Infrastructure configuration must be version-controlled and auditable |
| **Status** | ✅ Implemented |
| **Evidence** | Docker Compose, Helm charts, and Kubernetes manifests committed to git (`infrastructure/`); environment variables managed via secrets (not hardcoded); `tests/security/dockerfile-security.spec.ts` |

### A.8.10 — Information Deletion

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | GDPR right to erasure; data lifecycle management |
| **Status** | ✅ Implemented |
| **Evidence** | `apps/subgraph-core/src/user/user-erasure.service.ts`; `tests/security/gdpr-erasure.spec.ts`; `packages/db/src/schema/retentionPolicies.ts`; `tests/security/data-retention.spec.ts` |

### A.8.11 — Data Masking

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | PII must not appear in logs or non-production environments |
| **Status** | ⚠️ Partial |
| **Evidence** | `apps/subgraph-agent/src/ai/pii-scrubber.ts` masks PII before LLM calls; Pino logging avoids raw PII fields |
| **Gap** | Automated data masking for non-production database copies not yet implemented |

### A.8.12 — Data Leakage Prevention

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Student data must not leak across tenants or to third parties |
| **Status** | ✅ Implemented |
| **Evidence** | `apps/subgraph-agent/src/ai/pii-scrubber.ts`; SI-10 consent gate (`apps/subgraph-agent/src/ai/llm-consent.guard.ts`); RLS cross-tenant isolation (`tests/security/cross-tenant-isolation.spec.ts`); `tests/security/pii-encryption.spec.ts` |

### A.8.13 — Information Backup

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | PostgreSQL data backup for availability and recovery |
| **Status** | 📅 Planned |
| **Gap** | Automated PostgreSQL backup schedule, retention policy, and restore testing not yet documented |

### A.8.14 — Redundancy of Information Processing Facilities

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | High availability for 100,000+ users |
| **Status** | ⚠️ Partial |
| **Evidence** | Kubernetes HPA for auto-scaling; PodDisruptionBudget (`infrastructure/k8s/helm/edusphere/templates/gateway/pdb.yaml`) |
| **Gap** | Multi-zone deployment and PostgreSQL replica promotion procedure not yet documented |

### A.8.15 — Logging

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Audit trail and security event detection |
| **Status** | ✅ Implemented |
| **Evidence** | Pino structured JSON logging across all NestJS subgraphs; `apps/subgraph-core/src/admin/audit-log.service.ts`; `tests/security/audit-log.spec.ts`; structured context includes `tenantId`, `userId`, `requestId` |

### A.8.16 — Monitoring Activities

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Detect and respond to security events in real time |
| **Status** | ⚠️ Partial |
| **Evidence** | Jaeger distributed tracing; Grafana dashboards (`infrastructure/grafana/dashboards/`); Falco runtime rules (`infrastructure/falco/edusphere-rules.yaml`); `scripts/health-check.sh`; `tests/security/observability-config.spec.ts` |
| **Gap** | No alerting rules configured in Grafana/Prometheus for security events; no PagerDuty/OpsGenie integration |

### A.8.17 — Clock Synchronization

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Audit log timestamps must be accurate |
| **Status** | ✅ Implemented |
| **Evidence** | Docker containers use host NTP; cloud provider infrastructure uses NTP/PTP |

### A.8.18 — Use of Privileged Utility Programs

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Database admin tools (psql, Drizzle Studio) |
| **Status** | ⚠️ Partial |
| **Evidence** | Drizzle Studio restricted to development; production DB access via bastion (planned) |
| **Gap** | Formal privileged access procedure for database administration not documented |

### A.8.19 — Installation of Software on Operational Systems

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Immutable container images must not have ad-hoc software installed |
| **Status** | ✅ Implemented |
| **Evidence** | Docker images built from declared Dockerfiles; `tests/security/dockerfile-security.spec.ts`; no SSH into production containers policy |

### A.8.20 — Network Security

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Network segmentation between services |
| **Status** | ✅ Implemented |
| **Evidence** | Kubernetes NetworkPolicy restricts inter-pod communication; `infrastructure/k8s/helm/edusphere/templates/` includes NetworkPolicy resources; Traefik ingress with TLS termination |

### A.8.21 — Security of Network Services

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Inter-subgraph communication must be encrypted |
| **Status** | ✅ Implemented |
| **Evidence** | Linkerd mTLS service mesh (`tests/security/linkerd-mtls.spec.ts`); SI-6 enforced; HTTPS at gateway ingress |

### A.8.22 — Segregation of Networks

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Separate production and development networks |
| **Status** | ⚠️ Partial |
| **Evidence** | Kubernetes namespaces separate production from staging; Docker Compose networks isolate services |
| **Gap** | Formal network segmentation diagram not yet documented |

### A.8.23 — Web Filtering

| Field | Detail |
|---|---|
| **Applicable** | YES (egress) |
| **Justification** | Control outbound connections from containers |
| **Status** | 📅 Planned |
| **Gap** | Egress NetworkPolicy to allowlist external endpoints (OpenAI, Anthropic, Keycloak JWKS) not yet implemented |

### A.8.24 — Use of Cryptography

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | PII encryption, TLS, JWT signing |
| **Status** | ✅ Implemented |
| **Evidence** | AES-256-GCM for PII fields (`packages/db/src/helpers/encryption.ts`); TLS 1.2+ for all external connections; RS256 JWT signing via Keycloak; Linkerd mTLS (ED25519); `tests/security/crypto-inventory.spec.ts` |

### A.8.25 — Secure Development Life Cycle

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Security must be embedded in SDLC |
| **Status** | ✅ Implemented |
| **Evidence** | Enterprise Execution Protocol in `CLAUDE.md` mandates security audit at every phase; pre-commit hooks; CI security gate (`pnpm test:security`); threat modeling in DPIA |

### A.8.26 — Application Security Requirements

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Input validation, injection prevention, XSS prevention |
| **Status** | ✅ Implemented |
| **Evidence** | Zod validation on all mutations; DOMPurify for SVG content (`apps/web/src/`); `tests/security/api-security.spec.ts` (OWASP Top 10); `tests/security/svg-sanitization.spec.ts`; query depth limit 10, complexity limit 1000 (`tests/security/query-hardening.spec.ts`) |

### A.8.27 — Secure System Architecture and Engineering Principles

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Defense in depth, least privilege, fail-secure |
| **Status** | ✅ Implemented |
| **Evidence** | `docs/architecture/`; `CLAUDE.md` Security Invariants SI-1 through SI-10; GraphQL Federation with per-subgraph RLS; multi-layer auth (gateway JWT → subgraph scope check → RLS) |

### A.8.28 — Secure Coding

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | All developers must follow secure coding standards |
| **Status** | ✅ Implemented |
| **Evidence** | TypeScript strict mode (`strict: true`); ESLint security rules; no `any` type; no `console.log`; Pino logging only; pre-commit hooks; SI-1 through SI-10 as code rules |

### A.8.29 — Security Testing in Development and Acceptance

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Security tests gate every deployment |
| **Status** | ✅ Implemented |
| **Evidence** | 42 security test files in `tests/security/`; `pnpm test:security` in CI; Playwright E2E tests include security scenarios; `tests/security/visual-anchoring.pentest.spec.ts` |

### A.8.30 — Outsourced Development

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Contractors contribute to codebase |
| **Status** | ⚠️ Partial |
| **Evidence** | GitHub branch protection ensures all code reviewed; NDA required for contractors |
| **Gap** | Contractor security training requirements not formally documented |

### A.8.31 — Separation of Development, Test and Production Environments

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Production data must not appear in development |
| **Status** | ⚠️ Partial |
| **Evidence** | Separate Kubernetes namespaces; separate `.env` files; seed data used in dev (not production dump) |
| **Gap** | Formal environment separation policy with data masking for test environments not documented |

### A.8.32 — Change Management

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | All changes to production must be tracked and reviewed |
| **Status** | ✅ Implemented |
| **Evidence** | Git version control with PR review; CI/CD pipeline gates; `IMPLEMENTATION_ROADMAP.md` phase gate criteria; semantic commit messages; `tests/security/ci-pipeline.spec.ts` |

### A.8.33 — Test Information

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | Test data must not include real PII |
| **Status** | ✅ Implemented |
| **Evidence** | Seed data in `packages/db/src/seed.ts` uses synthetic test data; test fixtures use fake UUIDs and anonymized names |

### A.8.34 — Protection of Information Systems During Audit Testing

| Field | Detail |
|---|---|
| **Applicable** | YES |
| **Justification** | External penetration testing must not disrupt production |
| **Status** | 📅 Planned |
| **Gap** | Rules of engagement for external penetration test not yet documented; scheduled Q4 2026 |

---

## Summary Table

| Theme | Total Controls | Implemented | Partial | Planned | N/A |
|---|---|---|---|---|---|
| **Organizational (A.5)** | 37 | 14 | 16 | 6 | 1 |
| **People (A.6)** | 8 | 0 | 4 | 4 | 0 |
| **Physical (A.7)** | 14 | 1 | 2 | 3 | 8 |
| **Technological (A.8)** | 34 | 20 | 10 | 4 | 0 |
| **TOTAL** | **93** | **35 (38%)** | **32 (34%)** | **17 (18%)** | **9 (10%)** |

**Overall ISMS Maturity:** 38% fully implemented, 72% implemented or partially implemented (within scope controls).

**Target for ISO 27001 Certification (Q4 2026):** All "Planned" controls must reach "Partial" or "Implemented"; all "Partial" gaps must have documented remediation with evidence.

---

## Document Control

| Field | Value |
|---|---|
| **Approved By** | CISO + Executive Leadership |
| **Next Review** | 2027-03-11 (annual) or on significant control change |
| **Related Documents** | `docs/compliance/ISO-27001-ISMS-SCOPE.md` |
| | `docs/compliance/ASSET-INVENTORY.md` |
| | `docs/compliance/VENDOR-RISK-REGISTER.md` |

*Version controlled in git. Full change history: `git log docs/compliance/ISO-27001-STATEMENT-OF-APPLICABILITY.md`*
