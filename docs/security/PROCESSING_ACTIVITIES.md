# Record of Processing Activities (GDPR Art.30)

**Controller:** EduSphere Platform
**Version:** 1.0
**Review Schedule:** Annual review by DPO
**Last Reviewed:** March 2026

---

## RPA-001: User Account Management

**Purpose:** Management of user accounts, authentication, and profile information
**Legal Basis:** Contract (Art. 6(1)(b)) — necessary for platform service delivery
**Data Categories:** Name, email, role, preferences, authentication credentials
**Retention Period:** Account data retained for duration of active subscription + 90 days after termination
**Subprocessors:** Keycloak (identity provider, self-hosted)
**Transfers:** No transfers outside EEA
**Data Controller Role:** Controller

---

## RPA-002: Security Audit Logging

**Purpose:** Security monitoring, audit trail for compliance, incident investigation
**Legal Basis:** Legal obligation (Art. 6(1)(c)) — required for GDPR accountability
**Data Categories:** User ID, IP address, action performed, timestamp, resource accessed
**Retention Period:** 2 years per security policy
**Subprocessors:** None (self-hosted PostgreSQL)
**Transfers:** No transfers outside EEA
**Data Controller Role:** Controller

---

## RPA-003: Educational Content Delivery

**Purpose:** Delivery of course content, lessons, assessments to enrolled learners
**Legal Basis:** Contract (Art. 6(1)(b)) — core platform service
**Data Categories:** Course enrollment, progress, completion status, assessment scores
**Retention Period:** Duration of enrollment + 5 years for certificate records
**Subprocessors:** MinIO (self-hosted object storage)
**Transfers:** No transfers outside EEA
**Data Controller Role:** Controller

---

## RPA-004: Learning Analytics

**Purpose:** Analytics on learner progress, engagement metrics, at-risk learner identification
**Legal Basis:** Legitimate interest (Art. 6(1)(f)) — improving educational outcomes
**Data Categories:** Progress events, time-on-task, completion rates, quiz attempts
**Retention Period:** Aggregated analytics retained indefinitely; individual event logs 1 year
**Subprocessors:** None
**Transfers:** No transfers outside EEA
**Data Controller Role:** Controller

---

## RPA-005: AI Processing with Consent Gate

**Purpose:** AI-powered tutoring, content generation, knowledge graph construction
**Legal Basis:** Consent (Art. 6(1)(a)) — explicit consent required before AI processing
**Consent Mechanism:** `THIRD_PARTY_LLM` consent flag checked before every LLM call (SI-10)
**Data Categories:** User queries, annotations, learning content (anonymized where possible)
**Retention Period:** Processing logs 90 days; models not trained on individual user data
**Subprocessors:**
  - Ollama (self-hosted, development) — no data transfer
  - OpenAI (production, US) — Standard Contractual Clauses (SCCs) in place, Data Processing Agreement signed
  - Anthropic (production, US) — Standard Contractual Clauses (SCCs) in place, Data Processing Agreement signed
**Transfers:** US transfer with SCCs for AI providers (OpenAI, Anthropic) per Art. 46(2)(c)
**Data Controller Role:** Controller (Data Processor relationship with OpenAI/Anthropic)

---

## RPA-006: Personal Annotations

**Purpose:** Storage and retrieval of user-created annotations on educational content
**Legal Basis:** Contract (Art. 6(1)(b)) — user-initiated feature
**Data Categories:** Annotation text (may contain personal reflections), document reference, timestamp
**Special Category:** May incidentally contain health/belief data — encryption required (AES-256-GCM)
**Retention Period:** Retained until user deletes or account termination + 30 days
**Subprocessors:** None (PostgreSQL self-hosted, encryption at application layer)
**Transfers:** No transfers outside EEA
**Data Controller Role:** Controller

---

## RPA-007: Tenant Organization Management

**Purpose:** Management of tenant organizations, admin users, billing, and feature configuration
**Legal Basis:** Contract (Art. 6(1)(b)) — B2B service agreement
**Data Categories:** Organization name, admin contact details, subscription tier, feature flags
**Retention Period:** Duration of contract + 7 years for financial records
**Subprocessors:** None
**Transfers:** No transfers outside EEA
**Data Controller Role:** Controller

---

## Subprocessor Register

| Subprocessor | Purpose | Location | Transfer Mechanism | DPA Status |
|---|---|---|---|---|
| Keycloak | Identity & Authentication | Self-hosted EEA | N/A | N/A |
| PostgreSQL | Primary Database | Self-hosted EEA | N/A | N/A |
| MinIO | Object Storage | Self-hosted EEA | N/A | N/A |
| OpenAI | AI Processing (prod, with consent) | US | SCCs Art. 46(2)(c) | Signed |
| Anthropic | AI Processing (prod, with consent) | US | SCCs Art. 46(2)(c) | Signed |

---

## Review Schedule

This document is reviewed annually by the Data Protection Officer (DPO).
Next review: March 2027.
