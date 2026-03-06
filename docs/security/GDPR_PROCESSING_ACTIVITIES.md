# Records of Processing Activities (RoPA)

<!-- Canonical file. PROCESSING_ACTIVITIES.md was merged into this file (2026-03-06). -->

**Document ID:** SEC-RPA-001
**Version:** 1.2
**Owner:** DPO (Data Protection Officer)
**Last Reviewed:** 2026-02-25
**Next Review:** 2027-02-25
**Legal Basis:** GDPR Art.30 — Records of Processing Activities
**Contact:** dpo@edusphere.dev

---

## Overview

EduSphere maintains this Record of Processing Activities (RoPA) as required by **GDPR Art.30**. EduSphere acts as **Data Controller** for its own operations and as **Data Processor** on behalf of customer organizations (data controllers).

---

## A. EduSphere as Data Controller

### RPA-001: User Account Management

| Field                       | Value                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| **Activity ID**             | RPA-001                                                            |
| **Purpose**                 | Create and manage user accounts for platform access                |
| **Legal Basis**             | Art.6(1)(b) — Contract (performance of service agreement)          |
| **Data Categories**         | Name, email address, role, tenant association, account preferences |
| **Data Subjects**           | Platform users (students, instructors, administrators)             |
| **Recipients**              | EduSphere internal systems; Keycloak (self-hosted)                 |
| **Third-Country Transfers** | None (Keycloak self-hosted in EU)                                  |
| **Retention**               | Active account lifetime + 90 days post-deletion request            |
| **Security Measures**       | AES-256-GCM encryption, RLS tenant isolation, MFA for admin roles  |
| **Sub-processors**          | AWS (EU infrastructure)                                            |

### RPA-002: Security Monitoring and Audit Logging

| Field                       | Value                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Activity ID**             | RPA-002                                                                                              |
| **Purpose**                 | Detect security incidents; monitor platform integrity; audit log all access (GDPR Art.32, SOC2 CC7.2) |
| **Legal Basis**             | Art.6(1)(f) — Legitimate Interest (security monitoring)                                              |
| **Data Categories**         | IP addresses, user IDs, action timestamps, API endpoint accessed                                     |
| **Data Subjects**           | All platform users                                                                                   |
| **Recipients**              | EduSphere Security Team; Wazuh SIEM (self-hosted)                                                    |
| **Third-Country Transfers** | None (all self-hosted in EU)                                                                         |
| **Retention**               | 7 years (SOC2 audit requirement)                                                                     |
| **Security Measures**       | Encrypted storage, role-based access (security team only)                                            |
| **Sub-processors**          | AWS (infrastructure)                                                                                 |

### RPA-003: Platform Analytics (Anonymized)

| Field                       | Value                                                   |
| --------------------------- | ------------------------------------------------------- |
| **Activity ID**             | RPA-003                                                 |
| **Purpose**                 | Improve platform features and performance               |
| **Legal Basis**             | Art.6(1)(f) — Legitimate Interest (product improvement) |
| **Data Categories**         | Aggregated usage metrics (no individual-level PII)      |
| **Data Subjects**           | Aggregated — no individual identification possible      |
| **Recipients**              | EduSphere Product Team                                  |
| **Third-Country Transfers** | None                                                    |
| **Retention**               | 2 years                                                 |
| **Security Measures**       | Anonymization applied before storage; no PII linkable   |
| **Sub-processors**          | AWS (infrastructure)                                    |

---

## B. EduSphere as Data Processor (on behalf of customer organizations)

### RPA-004: Educational Content Delivery

| Field                       | Value                                                                          |
| --------------------------- | ------------------------------------------------------------------------------ |
| **Activity ID**             | RPA-004                                                                        |
| **Purpose**                 | Deliver course content to enrolled students on behalf of customer organization |
| **Legal Basis**             | Art.6(1)(b) — Customer DPA (Data Processor on Data Controller instructions)    |
| **Data Categories**         | User enrollment, course progress, completion certificates                      |
| **Data Subjects**           | Students enrolled in customer's courses                                        |
| **Data Controller**         | Customer organization (tenant)                                                 |
| **Recipients**              | EduSphere subgraphs; MinIO (media storage)                                     |
| **Third-Country Transfers** | None (EU infrastructure: eu-central-1, eu-west-1)                              |
| **Retention**               | Per customer's data retention policy; GDPR Art.5(1)(e) compliant               |
| **Security Measures**       | Per-tenant RLS, AES-256-GCM encryption, audit logging                          |
| **Sub-processors**          | AWS (EU infrastructure)                                                        |

### RPA-005: AI-Powered Learning (Consent-Gated)

| Field                       | Value                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| **Activity ID**             | RPA-005                                                                                      |
| **Purpose**                 | Personalized AI tutoring, quiz generation, knowledge graph navigation via AI Consent gate    |
| **Legal Basis**             | Art.6(1)(a) — User consent (`AI_PROCESSING` + `THIRD_PARTY_LLM` consent flags)               |
| **Data Categories**         | Learning context, questions asked, AI responses; PII-scrubbed before external LLM call       |
| **Data Subjects**           | Users who have granted AI processing consent                                                 |
| **Data Controller**         | Customer organization (tenant) + user (for consent)                                          |
| **Recipients**              | EduSphere Agent subgraph; OpenAI (if `THIRD_PARTY_LLM` consent); Anthropic (if consent)      |
| **Third-Country Transfers** | US (OpenAI/Anthropic) — Standard Contractual Clauses (SCC) + explicit user consent           |
| **Retention**               | Agent messages: 90 days default (tenant-configurable); per RPA-004 thereafter                |
| **Security Measures**       | Consent gate (LLM guard SI-10), PII scrubber before external calls, AES-256-GCM storage      |
| **Sub-processors**          | AWS; OpenAI (with consent + SCC); Anthropic (with consent + SCC)                             |

### RPA-006: Personal Annotations

| Field                       | Value                                                                            |
| --------------------------- | -------------------------------------------------------------------------------- |
| **Activity ID**             | RPA-006                                                                          |
| **Purpose**                 | Store student personal notes and highlights on course content                    |
| **Legal Basis**             | Art.6(1)(b) — Contract (core feature of platform)                                |
| **Data Categories**         | Annotation text (potentially sensitive — student's own words), content reference |
| **Data Subjects**           | Students who create annotations                                                  |
| **Data Controller**         | Customer organization (tenant)                                                   |
| **Recipients**              | EduSphere Annotation subgraph; student's instructors (RLS-enforced access)       |
| **Third-Country Transfers** | None                                                                             |
| **Retention**               | Account lifetime + 90 days; erasable on Art.17 request                           |
| **Security Measures**       | AES-256-GCM per-tenant encryption, owner-only access by default                  |
| **Sub-processors**          | AWS (EU infrastructure)                                                          |

---

## C. Controller vs Processor Role Summary

| Activity                        | EduSphere Role  | Data Controller                        |
| ------------------------------- | --------------- | -------------------------------------- |
| RPA-001 User Account Management | Data Controller | EduSphere                              |
| RPA-002 Security Audit Logging  | Data Controller | EduSphere                              |
| RPA-003 Platform Analytics      | Data Controller | EduSphere                              |
| RPA-004 Content Delivery        | Data Processor  | Customer organization (tenant)         |
| RPA-005 AI-Powered Learning     | Data Processor  | Customer organization + user (consent) |
| RPA-006 Personal Annotations    | Data Processor  | Customer organization (tenant)         |

---

## D. Sub-processor Index

| Sub-processor                 | Activities                   | Transfer Mechanism                                |
| ----------------------------- | ---------------------------- | ------------------------------------------------- |
| AWS (eu-central-1, eu-west-1) | RPA-001 to RPA-006           | EU data residency (no transfer needed)            |
| OpenAI, Inc. (US)             | RPA-005 only (consent-gated) | Standard Contractual Clauses (SCC) + user consent |
| Anthropic PBC (US)            | RPA-005 only (consent-gated) | SCC + user consent                                |
| GitHub, Inc. (US)             | CI/CD only (no customer PII) | SCC                                               |

---

## E. Data Subject Rights Fulfillment Log

For each GDPR rights request, EduSphere logs:

- Request type (Art.15/16/17/18/20/21)
- Date received
- Date fulfilled
- Action taken
- Tenant ID (for processor requests)

Maintained in the legal case management system (not in git).

---

## F. Review Schedule

| Activity                | Frequency      | Owner       | DPO Sign-off |
| ----------------------- | -------------- | ----------- | ------------ |
| Full RoPA review        | Annual         | DPO         | Required     |
| New processing activity | Before go-live | DPO + Legal | Required     |
| Subprocessor change     | On change      | DPO         | Required     |
| Security measure update | On change      | CISO        | Required     |

**Next scheduled DPO review:** 2027-02-25
