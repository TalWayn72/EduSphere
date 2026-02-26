# Records of Processing Activities (RoPA)

**Document ID:** SEC-RPA-001
**Version:** 1.0
**Owner:** DPO (Data Protection Officer)
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**Legal Basis:** GDPR Art.30 — Records of Processing Activities
**Contact:** dpo@edusphere.dev

---

## Overview

EduSphere maintains this Record of Processing Activities (RoPA) as required by GDPR Art.30. This document covers activities where EduSphere acts as **data processor** on behalf of customer organizations (data controllers), and activities where EduSphere acts as **data controller** for its own purposes.

---

## A. EduSphere as Data Controller

### RPA-001: User Account Management

| Field                       | Value                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| **Purpose**                 | Create and manage user accounts for platform access                |
| **Legal Basis**             | Art.6(1)(b) — Contract (performance of service agreement)          |
| **Data Categories**         | Name, email address, role, tenant association, account preferences |
| **Data Subjects**           | Platform users (students, instructors, administrators)             |
| **Recipients**              | EduSphere internal systems; Keycloak (authentication)              |
| **Third-Country Transfers** | None (Keycloak self-hosted in EU)                                  |
| **Retention**               | Active account lifetime + 90 days post-deletion request            |
| **Security Measures**       | AES-256-GCM encryption, RLS isolation, MFA for admin roles         |
| **Sub-processors**          | AWS (infrastructure), Keycloak (self-hosted)                       |

### RPA-002: Security Monitoring and Audit Logging

| Field                       | Value                                                                          |
| --------------------------- | ------------------------------------------------------------------------------ |
| **Purpose**                 | Detect security incidents, ensure platform integrity (GDPR Art.32, SOC2 CC7.2) |
| **Legal Basis**             | Art.6(1)(f) — Legitimate Interest (security monitoring)                        |
| **Data Categories**         | IP addresses, user IDs, action timestamps, API endpoint accessed               |
| **Data Subjects**           | All platform users                                                             |
| **Recipients**              | EduSphere Security Team; Wazuh SIEM (self-hosted)                              |
| **Third-Country Transfers** | None (all self-hosted in EU)                                                   |
| **Retention**               | 7 years (SOC2 audit requirement)                                               |
| **Security Measures**       | Encrypted storage, role-based access (security team only)                      |
| **Sub-processors**          | AWS (infrastructure)                                                           |

### RPA-003: Platform Analytics (Anonymized)

| Field                       | Value                                                   |
| --------------------------- | ------------------------------------------------------- |
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
| **Purpose**                 | Deliver course content to enrolled students on behalf of customer organization |
| **Legal Basis**             | Art.6(1)(b) — Customer DPA (processor acting on controller instructions)       |
| **Data Categories**         | User enrollment, course progress, completion certificates                      |
| **Data Subjects**           | Students enrolled in customer's courses                                        |
| **Controller**              | Customer organization (tenant)                                                 |
| **Recipients**              | EduSphere subgraphs; MinIO (media storage)                                     |
| **Third-Country Transfers** | None (EU infrastructure primary)                                               |
| **Retention**               | Per customer's data retention policy + GDPR Art.5(1)(e)                        |
| **Security Measures**       | Per-tenant RLS, AES-256-GCM encryption, audit logging                          |
| **Sub-processors**          | AWS (infrastructure)                                                           |

### RPA-005: AI-Powered Learning (Consent-Gated)

| Field                       | Value                                                                             |
| --------------------------- | --------------------------------------------------------------------------------- |
| **Purpose**                 | Personalized AI tutoring, quiz generation, knowledge graph navigation             |
| **Legal Basis**             | Art.6(1)(a) — User consent (`AI_PROCESSING` + `THIRD_PARTY_LLM`)                  |
| **Data Categories**         | Learning context, questions asked, AI responses; PII-scrubbed before external LLM |
| **Data Subjects**           | Users who have granted AI consent                                                 |
| **Controller**              | Customer organization (tenant) + user (for consent)                               |
| **Recipients**              | EduSphere Agent subgraph; OpenAI/Anthropic (if `THIRD_PARTY_LLM` consent granted) |
| **Third-Country Transfers** | US (OpenAI/Anthropic) — only with explicit user consent + SCCs                    |
| **Retention**               | Agent messages: 90 days (configurable per tenant); per RPA-004 thereafter         |
| **Security Measures**       | Consent gate (LLM guard), PII scrubber, AES-256-GCM storage                       |
| **Sub-processors**          | AWS; OpenAI (with consent); Anthropic (with consent)                              |

### RPA-006: Personal Annotations

| Field                       | Value                                                                            |
| --------------------------- | -------------------------------------------------------------------------------- |
| **Purpose**                 | Store student personal notes and highlights on course content                    |
| **Legal Basis**             | Art.6(1)(b) — Contract (core feature of platform)                                |
| **Data Categories**         | Annotation text (potentially sensitive — student's own words), content reference |
| **Data Subjects**           | Students who create annotations                                                  |
| **Controller**              | Customer organization (tenant)                                                   |
| **Recipients**              | EduSphere Annotation subgraph; student's instructors (with access controls)      |
| **Third-Country Transfers** | None                                                                             |
| **Retention**               | Account lifetime + 90 days; erasable on Art.17 request                           |
| **Security Measures**       | AES-256-GCM per-tenant encryption, owner-only access by default                  |
| **Sub-processors**          | AWS (infrastructure)                                                             |

---

## C. Data Subject Rights Fulfillment Log

For each GDPR rights request, EduSphere logs:

- Request type (Art.15/16/17/18/20/21)
- Date received
- Date fulfilled
- Action taken
- Tenant ID (for processor requests)

Maintained in the legal case management system (not in git).

---

## D. Review Schedule

| Activity                | Frequency     | Owner       |
| ----------------------- | ------------- | ----------- |
| Full RoPA review        | Annual        | DPO         |
| New processing activity | Before launch | DPO + Legal |
| Subprocessor change     | On change     | DPO         |
| Security measure update | On change     | CISO        |
