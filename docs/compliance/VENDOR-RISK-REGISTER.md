# Vendor Risk Register — EduSphere

**Document ID:** ISMS-VRR-001
**Clause Reference:** ISO/IEC 27001:2022 Annex A, Controls A.5.19, A.5.20, A.5.21, A.5.22, A.5.23
**SOC 2 Reference:** CC9.2 — Vendor and business partner risk assessment
**Version:** 1.0.0
**Status:** Active
**Owner:** Chief Information Security Officer (CISO)
**Last Updated:** 2026-03-11
**Next Full Review:** 2027-03-11 (annual)
**Classification:** Confidential

---

## Purpose

This register documents EduSphere's third-party vendor relationships, the associated information security and privacy risks, and the controls in place to mitigate those risks. It satisfies ISO 27001:2022 A.5.19 (Information security in supplier relationships) and A.5.22 (Monitoring, review and change management of supplier services).

**Risk Levels:**
- **CRITICAL** — Vendor has access to production PII or encryption keys; breach would trigger GDPR notification
- **HIGH** — Vendor has access to sensitive or confidential data; breach would require internal incident response
- **MEDIUM** — Vendor has access to internal/operational data; limited PII exposure
- **LOW** — Vendor has no access to EduSphere or customer data; open-source self-hosted tools

---

## Vendor Registry

### V-001: OpenAI

| Field | Detail |
|---|---|
| **Vendor** | OpenAI, L.L.C. |
| **Headquarters** | San Francisco, CA, USA |
| **Service** | GPT-4 / GPT-4o large language model API |
| **Service Tier** | Conditional — enabled only in production with explicit user consent |
| **Data Shared** | PII-scrubbed prompt context only. Raw user data is never sent. The PII scrubber (`apps/subgraph-agent/src/ai/pii-scrubber.ts`) strips all personal identifiers before any data reaches OpenAI. The LLM consent guard (`apps/subgraph-agent/src/ai/llm-consent.guard.ts`) blocks API calls when user has not granted `THIRD_PARTY_LLM` consent (SI-10). |
| **Risk Level** | HIGH |
| **Security Certifications** | SOC 2 Type II (verified); ISO 27001 (in progress as of 2025) |
| **DPA Status** | DPA signed; OpenAI Data Processing Addendum executed; zero data retention option enabled for API customers |
| **Data Retention at Vendor** | 0 days for API inputs (zero data retention DPA addendum); model training opt-out confirmed |
| **Sub-processors** | Microsoft Azure (OpenAI infrastructure); disclosed in OpenAI DPA |
| **Encryption** | TLS 1.2+ in transit; AES-256 at rest (OpenAI infrastructure) |
| **Incident Notification SLA** | 72 hours per DPA |
| **Annual Review Date** | 2027-03-11 |
| **Review Contact** | legal@openai.com |
| **Risk Mitigations** | (1) SI-10 consent gate — user must opt-in; (2) `pii-scrubber.ts` strips PII from all prompts; (3) Zero data retention DPA addendum; (4) `tests/security/ai-compliance.spec.ts` validates consent gate is enforced; (5) Fallback to Ollama (self-hosted) when consent not granted |
| **Residual Risk** | MEDIUM — Prompt content could contain indirect PII (e.g., course descriptions with personal examples) despite scrubbing; mitigated by content-based scrubbing rules |

---

### V-002: Anthropic

| Field | Detail |
|---|---|
| **Vendor** | Anthropic, PBC |
| **Headquarters** | San Francisco, CA, USA |
| **Service** | Claude 3.5 Sonnet / Claude 3 Opus LLM API |
| **Service Tier** | Conditional — enabled only in production with explicit user consent |
| **Data Shared** | Same as OpenAI (V-001): PII-scrubbed prompts only, consent-gated via SI-10 |
| **Risk Level** | HIGH |
| **Security Certifications** | SOC 2 Type II (verified) |
| **DPA Status** | DPA signed; Anthropic Data Processing Agreement executed; no training on customer data confirmed |
| **Data Retention at Vendor** | 30 days for abuse monitoring (configurable); model training opt-out confirmed |
| **Sub-processors** | Amazon Web Services (Anthropic infrastructure) |
| **Encryption** | TLS 1.2+ in transit; AES-256 at rest |
| **Incident Notification SLA** | 72 hours per DPA |
| **Annual Review Date** | 2027-03-11 |
| **Review Contact** | privacy@anthropic.com |
| **Risk Mitigations** | Same as V-001 (SI-10, pii-scrubber, DPA, consent tests, Ollama fallback) |
| **Residual Risk** | MEDIUM — Same as V-001 |

---

### V-003: Ollama (Self-Hosted)

| Field | Detail |
|---|---|
| **Vendor** | Ollama (open-source — MIT license) |
| **Headquarters** | N/A (open-source project) |
| **Service** | Self-hosted LLM inference runtime (development and on-premise deployments) |
| **Service Tier** | Active — default in development; on-premise production option |
| **Data Shared** | None — all computation occurs locally within EduSphere-controlled infrastructure. No data leaves the organization. |
| **Risk Level** | LOW |
| **Security Certifications** | N/A (self-hosted) |
| **DPA Status** | N/A — no data sharing with external party |
| **Data Retention at Vendor** | N/A — self-hosted; data retention under EduSphere control |
| **Sub-processors** | None |
| **Encryption** | Data processed in-memory on EduSphere infrastructure; no external transmission |
| **Annual Review Date** | 2027-03-11 (model version review) |
| **Risk Mitigations** | (1) Isolated network namespace; (2) GPU memory isolation; (3) No external network egress from Ollama container; (4) Model files stored in controlled MinIO or local volume |
| **Residual Risk** | LOW — Model output quality risk (hallucination); mitigated by RAG grounding and human oversight |
| **Notes** | Preferred provider for development and privacy-sensitive deployments. PII scrubber still applied for consistency even in self-hosted mode. |

---

### V-004: GitHub

| Field | Detail |
|---|---|
| **Vendor** | GitHub, Inc. (subsidiary of Microsoft Corporation) |
| **Headquarters** | San Francisco, CA, USA |
| **Service** | Source code hosting, GitHub Actions CI/CD, GitHub Secrets management, Dependabot, GitHub Advanced Security, GitHub Packages |
| **Service Tier** | Active — critical dependency |
| **Data Shared** | Source code (including infrastructure configuration); environment variable names (values stored as GitHub Secrets, encrypted); build artifacts; GitHub Actions runner logs |
| **Risk Level** | HIGH |
| **Security Certifications** | SOC 2 Type II; ISO 27001; ISO 27018; FedRAMP |
| **DPA Status** | GitHub DPA / Data Protection Agreement executed; GitHub ToS accepted |
| **Data Retention at Vendor** | Logs: 30 days; Artifacts: per retention policy; Source code: indefinite (unless deleted) |
| **Sub-processors** | Microsoft Azure (GitHub infrastructure); disclosed in GitHub DPA |
| **Encryption** | TLS in transit; at-rest encryption on GitHub infrastructure |
| **Incident Notification SLA** | 72 hours per GitHub DPA |
| **Annual Review Date** | 2027-03-11 |
| **Review Contact** | privacy@github.com |
| **Risk Mitigations** | (1) Branch protection rules on `main` (require PR review + CI passing); (2) GitHub 2FA enforced for all contributors; (3) Production secrets stored as GitHub Secrets (AES-256 encrypted, never in source); (4) No PII or encryption keys in source code (SI-8, enforced by `tests/security/ci-pipeline.spec.ts`); (5) GitHub Advanced Security secret scanning enabled; (6) `tests/security/ci-pipeline.spec.ts` validates security controls in CI pipeline |
| **Residual Risk** | MEDIUM — Source code exposure would reveal security control implementation details; mitigated by defense-in-depth (security not relying on obscurity) |

---

### V-005: GraphQL Hive (The Guild)

| Field | Detail |
|---|---|
| **Vendor** | The Guild (open-source organization) |
| **Headquarters** | N/A (distributed open-source team) |
| **Service** | Schema registry, federation supergraph composition, breaking change detection |
| **Service Tier** | Active — used in CI/CD pipeline |
| **Data Shared** | GraphQL SDL schema definitions only. No user data, no PII, no business logic — only type/field/directive definitions. |
| **Risk Level** | LOW |
| **Security Certifications** | Not assessed (low data sensitivity) |
| **DPA Status** | ToS accepted; schema data only — no DPA required under GDPR |
| **Encryption** | HTTPS in transit |
| **Annual Review Date** | 2027-03-11 |
| **Risk Mitigations** | SDL schema is not sensitive data; worst case is schema enumeration by attacker who compromises Hive; mitigated by defense-in-depth in application layer |
| **Residual Risk** | LOW |

---

### V-006: Keycloak (Self-Hosted)

| Field | Detail |
|---|---|
| **Vendor** | Red Hat / Keycloak open-source (Apache 2.0 license) |
| **Headquarters** | N/A (open-source) |
| **Service** | OIDC identity provider, user authentication, MFA, realm management, JWT issuance |
| **Service Tier** | Active — critical security dependency |
| **Data Shared** | N/A — self-hosted within EduSphere infrastructure; all data under EduSphere control |
| **Risk Level** | CRITICAL (self-hosted — Keycloak compromise would expose all user identities) |
| **Security Certifications** | N/A (self-hosted); Keycloak is Red Hat-maintained; CVEs tracked via Red Hat Security Advisories |
| **DPA Status** | N/A — no external data sharing |
| **Data Stored** | User credentials (bcrypt-hashed), realm configuration, JWT signing keys (RSA key pair) |
| **Encryption** | TLS for all Keycloak traffic; bcrypt for password hashing; RSA 2048-bit JWT signing |
| **Annual Review Date** | 2027-03-11 |
| **Risk Mitigations** | (1) Brute-force protection enabled (5 failures = lock) — `tests/security/keycloak-config.spec.ts`; (2) MFA available for all users — `tests/security/keycloak-mfa.spec.ts`; (3) Keycloak admin console restricted to internal network; (4) Realm configuration version-controlled (`infrastructure/docker/keycloak-realm.json`); (5) Regular Keycloak version updates; (6) JWT signing keys rotated annually |
| **Residual Risk** | HIGH — Self-hosted; EduSphere responsible for all security configuration and patching; requires dedicated Keycloak update procedure |
| **Notes** | Keycloak version must be updated within 30 days of security advisories. Keycloak admin account uses MFA and is not the same as any application account. |

---

### V-007: MinIO (Self-Hosted)

| Field | Detail |
|---|---|
| **Vendor** | MinIO, Inc. (AGPLv3 / commercial license) |
| **Headquarters** | Redwood City, CA, USA |
| **Service** | S3-compatible object storage for course media, exports, transcriptions, certificates |
| **Service Tier** | Active — critical data dependency |
| **Data Shared** | N/A — self-hosted; all data under EduSphere control |
| **Risk Level** | HIGH (self-hosted — stores course content and exported user data) |
| **Security Certifications** | N/A (self-hosted); MinIO is SOC 2 certified for its cloud offering (not applicable here) |
| **DPA Status** | N/A — no external data sharing |
| **Data Stored** | Course video/PDF files, user data exports (GDPR portability), certificate PDFs, transcription outputs |
| **Encryption** | TLS for all MinIO API traffic; AES encryption at rest configurable; `tests/security/minio-config.spec.ts` |
| **Annual Review Date** | 2027-03-11 |
| **Risk Mitigations** | (1) TLS enforced on all bucket access; (2) AES-256 server-side encryption at rest; (3) IAM bucket policies restrict access by subgraph service account; (4) Pre-signed URLs with 15-minute TTL for media delivery; (5) ClamAV scan before file stored; (6) MinIO admin console not publicly exposed; (7) `tests/security/minio-config.spec.ts` validates configuration |
| **Residual Risk** | MEDIUM — Bucket misconfiguration could expose course content; mitigated by automated configuration tests |

---

### V-008: NATS JetStream (Self-Hosted)

| Field | Detail |
|---|---|
| **Vendor** | Synadia / NATS.io open-source (Apache 2.0 license) |
| **Headquarters** | N/A (open-source) |
| **Service** | High-performance async event streaming between subgraphs |
| **Service Tier** | Active — critical messaging dependency |
| **Data Shared** | N/A — self-hosted; event payloads under EduSphere control |
| **Risk Level** | MEDIUM |
| **Security Certifications** | N/A (self-hosted) |
| **DPA Status** | N/A |
| **Data in Transit** | Event payloads containing: course IDs, lesson IDs, user IDs, event types. No raw PII in payloads by design. |
| **Encryption** | TLS + authentication per SI-7; `tests/security/nats-security.spec.ts` |
| **Annual Review Date** | 2027-03-11 |
| **Risk Mitigations** | (1) TLS enforced for all NATS connections (SI-7); (2) NATS username/password authentication via environment variables; (3) Streams configured with `max_age` and `max_bytes` (memory safety rule); (4) No raw PII in event payloads — only IDs and event types; (5) NATS not exposed outside the internal Kubernetes network |
| **Residual Risk** | LOW — Self-hosted; no external transmission; TLS and auth enforced |

---

## Vendor Review Checklist

This checklist must be completed for each vendor annually and upon any significant change (new DPA, security incident, service change).

### Annual Vendor Review Checklist

For each vendor, answer YES / NO / N/A:

**Security Posture:**
- [ ] Has the vendor's security certification (SOC 2, ISO 27001) been renewed in the past 12 months?
- [ ] Has the vendor disclosed any security incidents or data breaches in the past 12 months?
- [ ] Are there open CVEs for the vendor's software that affect EduSphere's deployment?
- [ ] Has the vendor's service agreement or DPA been updated in the past 12 months?
- [ ] Are all sub-processors listed in the vendor's DPA still the same as last year?

**Data Protection:**
- [ ] Is the DPA still compliant with current GDPR obligations (SCCs for US transfers, if applicable)?
- [ ] Has the data retention period at the vendor changed?
- [ ] Has the vendor's data processing location changed (e.g., new AWS region)?
- [ ] For AI vendors: Is model training opt-out still active and confirmed?
- [ ] Has the vendor's privacy policy or data processing practices changed materially?

**Operational:**
- [ ] Is the vendor's service still meeting the SLA agreed in the contract?
- [ ] Are there alternative vendors available if this vendor fails (business continuity)?
- [ ] Have the technical controls (TLS version, encryption algorithms) been verified for the current period?
- [ ] Are vendor contacts (security, privacy, legal) still accurate?

**Action on Findings:**
- If any answer is NO: open a remediation ticket in OPEN_ISSUES.md within 5 business days
- If vendor fails to meet DPA obligations: escalate to CISO and Legal within 24 hours
- If vendor suffers a breach: invoke BREACH-NOTIFICATION-PROCEDURE.md

---

## Annual Re-evaluation Schedule

| Vendor | Scheduled Review Date | Review Owner | Last Completed |
|---|---|---|---|
| V-001 OpenAI | 2027-03-11 | CISO + AI Lead | 2026-03-11 (initial) |
| V-002 Anthropic | 2027-03-11 | CISO + AI Lead | 2026-03-11 (initial) |
| V-003 Ollama | 2027-03-11 | AI Lead | 2026-03-11 (initial) |
| V-004 GitHub | 2027-03-11 | DevOps Lead + CISO | 2026-03-11 (initial) |
| V-005 GraphQL Hive | 2027-03-11 | Platform Lead | 2026-03-11 (initial) |
| V-006 Keycloak | 2027-03-11 | Security Lead + DevOps | 2026-03-11 (initial) |
| V-007 MinIO | 2027-03-11 | DevOps Lead | 2026-03-11 (initial) |
| V-008 NATS | 2027-03-11 | Platform Lead | 2026-03-11 (initial) |
| Cloud Provider (TBD) | Annual (date TBD) | CISO + DevOps | Not yet completed |

**Trigger for ad-hoc review (in addition to annual schedule):**
- Vendor security incident or breach notification
- Material change to vendor DPA or privacy policy
- New data category shared with vendor
- New regulation requiring updated DPA (e.g., new SCCs)
- Vendor acquisition, merger, or major organizational change

---

## Onboarding New Vendors

Before engaging any new vendor that will process EduSphere data:

1. **Risk Assessment** — Complete vendor assessment form (sensitivity of data, certification status, DPA availability)
2. **CISO Approval** — Required for MEDIUM risk and above
3. **Legal Review** — DPA execution required before any data transfer for GDPR-covered processing
4. **Add to this Register** — CISO updates this document within 5 business days of onboarding
5. **Update DPIA** — If new vendor introduces new processing activity, update `docs/compliance/DPIA.md`
6. **Update ROPA** — Add to `docs/compliance/ROPA.md` as sub-processor if applicable
7. **Update Asset Inventory** — Add to `docs/compliance/ASSET-INVENTORY.md` (Category 4)

**IRON RULE:** No production data may be sent to a new vendor without:
(a) CISO approval, (b) signed DPA, (c) entry in this register.

---

## Document Control

| Field | Value |
|---|---|
| **Owner** | CISO |
| **Review Frequency** | Annual; ad-hoc on vendor change or security incident |
| **Next Full Review** | 2027-03-11 |
| **Approval Required** | CISO + Legal |
| **Related Documents** | `docs/compliance/ISO-27001-ISMS-SCOPE.md` (Section 4.1) |
| | `docs/compliance/ASSET-INVENTORY.md` (Category 4) |
| | `docs/compliance/DPIA.md` |
| | `docs/compliance/ROPA.md` |
| | `docs/compliance/BREACH-NOTIFICATION-PROCEDURE.md` |
| | `tests/security/vendor-compliance.spec.ts` |
| | `apps/subgraph-agent/src/ai/llm-consent.guard.ts` |
| | `apps/subgraph-agent/src/ai/pii-scrubber.ts` |

*Version controlled in git. Full change history: `git log docs/compliance/VENDOR-RISK-REGISTER.md`*
