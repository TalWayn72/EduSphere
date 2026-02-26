# Records of Processing Activities (RoPA)

**Document ID:** SEC-RPA-001
**Version:** 1.1
**Owner:** DPO (Data Protection Officer)
**Last Reviewed:** 2026-02-25
**Next Review:** 2027-02-25
**Legal Basis:** GDPR Art.30
**Contact:** dpo@edusphere.dev

---

## Overview

EduSphere maintains this Record of Processing Activities (RoPA) as required by **GDPR Art.30**. EduSphere acts as **Data Controller** for its own operations and as **Data Processor** on behalf of customer organizations.

---

## A. EduSphere as Data Controller

### RPA-001: User Account Management

| Field                       | Value                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| **Activity ID**             | RPA-001                                                            |
| **Purpose**                 | Create and manage User Account records for platform access         |
| **Legal Basis**             | Art.6(1)(b) - Contract (performance of service agreement)          |
| **Data Categories**         | Name, email address, role, tenant association, account preferences |
| **Data Subjects**           | Platform users (students, instructors, administrators)             |
| **Recipients**              | EduSphere internal systems; Keycloak (self-hosted)                 |
| **Third-Country Transfers** | None                                                               |
| **Retention**               | Active account lifetime + 90 days post-deletion request            |
| **Security Measures**       | AES-256-GCM encryption, RLS tenant isolation, MFA for admin roles  |
| **Sub-processor**           | AWS (EU infrastructure)                                            |

### RPA-002: Security Audit Logging and Security Monitoring

| Field                       | Value                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| **Activity ID**             | RPA-002                                                                                              |
| **Purpose**                 | Detect security incidents; security monitor platform; audit log all access (GDPR Art.32, SOC2 CC7.2) |
| **Legal Basis**             | Art.6(1)(f) - Legitimate Interest (security monitoring)                                              |
| **Data Categories**         | IP addresses, user IDs, action timestamps, API endpoint accessed                                     |
| **Data Subjects**           | All platform users                                                                                   |
| **Third-Country Transfers** | None (self-hosted EU)                                                                                |
| **Retention**               | 7 years (SOC2 audit log requirement)                                                                 |
| **Security Measures**       | Encrypted storage, role-based access (security team only)                                            |
| **Sub-processor**           | AWS (infrastructure)                                                                                 |

---

## B. EduSphere as Data Processor (on behalf of customer organizations)

### RPA-004: Educational Content Delivery

| Field                       | Value                                                                       |
| --------------------------- | --------------------------------------------------------------------------- |
| **Activity ID**             | RPA-004                                                                     |
| **Purpose**                 | Deliver course content to enrolled students on behalf of customer           |
| **Legal Basis**             | Art.6(1)(b) - Customer DPA (Data Processor on Data Controller instructions) |
| **Data Categories**         | User enrollment, course progress, completion certificates                   |
| **Data Controller**         | Customer organization (tenant)                                              |
| **Third-Country Transfers** | None (EU infrastructure: eu-central-1, eu-west-1)                           |
| **Retention**               | Per customer retention policy; GDPR Art.5(1)(e) compliant                   |
| **Security Measures**       | Per-tenant RLS, AES-256-GCM encryption, audit logging                       |
| **Sub-processor**           | AWS (EU infrastructure)                                                     |

### RPA-005: AI-Powered Learning - AI_PROCESSING (Consent-Gated)

| Field                       | Value                                                                                        |
| --------------------------- | -------------------------------------------------------------------------------------------- |
| **Activity ID**             | RPA-005                                                                                      |
| **Purpose**                 | Personalized AI tutoring, quiz generation, knowledge graph navigation via AI Consent gate    |
| **Legal Basis**             | Art.6(1)(a) - User consent (AI_PROCESSING + THIRD_PARTY_LLM consent flags)                   |
| **Data Categories**         | Learning context, questions, AI responses; PII-scrubbed before external LLM call             |
| **Data Subjects**           | Users who granted AI processing consent                                                      |
| **Data Controller**         | Customer organization (tenant) + user (for consent)                                          |
| **Recipients**              | EduSphere Agent subgraph; OpenAI (if THIRD_PARTY_LLM consent); Anthropic (if consent)        |
| **Third-Country Transfers** | US consent transfer via Standard Contractual Clauses (SCC) - only with explicit user consent |
| **Retention**               | Agent messages: 90 days default (tenant-configurable)                                        |
| **Security Measures**       | Consent gate (LLM guard SI-10), PII scrubber before external calls, AES-256-GCM              |
| **Sub-processor**           | AWS; OpenAI (with consent + SCC); Anthropic (with consent + SCC)                             |

### RPA-006: Personal Annotations

| Field                       | Value                                                             |
| --------------------------- | ----------------------------------------------------------------- |
| **Activity ID**             | RPA-006                                                           |
| **Purpose**                 | Store student Annotation notes and highlights on course content   |
| **Legal Basis**             | Art.6(1)(b) - Contract (core platform feature)                    |
| **Data Categories**         | Annotation text (personal - student own words), content reference |
| **Data Subjects**           | Students who create annotations                                   |
| **Data Controller**         | Customer organization (tenant)                                    |
| **Recipients**              | EduSphere Annotation subgraph; instructors (RLS-enforced access)  |
| **Third-Country Transfers** | None                                                              |
| **Retention**               | Account lifetime + 90 days; erasable on Art.17 request            |
| **Security Measures**       | AES-256-GCM per-tenant encryption, owner-only RLS by default      |
| **Sub-processor**           | AWS (EU infrastructure)                                           |

---

## C. Controller vs Processor Role Summary

| Activity                        | EduSphere Role  | Data Controller                        |
| ------------------------------- | --------------- | -------------------------------------- |
| RPA-001 User Account Management | Data Controller | EduSphere                              |
| RPA-002 Security Audit Logging  | Data Controller | EduSphere                              |
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

## E. Review Schedule

| Activity                | Frequency      | Owner       | DPO Sign-off |
| ----------------------- | -------------- | ----------- | ------------ |
| Full RoPA review        | Annual         | DPO         | Required     |
| New processing activity | Before go-live | DPO + Legal | Required     |
| Subprocessor change     | On change      | DPO         | Required     |

**Next scheduled DPO review:** 2027-02-25
