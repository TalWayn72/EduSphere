# GDPR Art.28 Subprocessor List

## Overview

EduSphere maintains this Subprocessor List in compliance with GDPR Article 28.
Customers are notified of subprocessor changes with **30-day** advance notice.
All Tier 1 subprocessors have a signed Data Processing Agreement (DPA Signed).

---

## Tier 1 — Core Infrastructure

| Subprocessor | Purpose | Region | DPA Status | Data Transferred |
|-------------|---------|--------|-----------|-----------------|
| **Amazon Web Services (AWS)** | Cloud infrastructure, compute, S3 storage | eu-central-1, eu-west-1 | DPA Signed ✅ | Tenant data (encrypted at rest) |
| **PostgreSQL (self-hosted on AWS)** | Primary database (RLS enforced) | EU | DPA Signed ✅ | All application data |
| **NATS.io (self-hosted on AWS)** | Event streaming | EU | DPA Signed ✅ | Event metadata only |
| **MinIO (self-hosted on AWS)** | Object storage (media files) | eu-central-1 | DPA Signed ✅ | Course media, recordings |
| **Keycloak (self-hosted on AWS)** | Identity and access management | EU | DPA Signed ✅ | User credentials (hashed) |

---

## Tier 2 — AI/ML Subprocessors (Consent-Gated)

All AI subprocessors are activated only after explicit THIRD_PARTY_LLM consent from the user.
PII is scrubbed from all data before transmission to AI providers.
Users may opt out at any time. On-premises air-gap deployment is available for institutions requiring full data sovereignty.

| Subprocessor | Purpose | Region | DPA Status | Consent Required |
|-------------|---------|--------|-----------|-----------------|
| **OpenAI** | LLM inference (gpt-4o) | US (EU SCCs applied) | DPA Signed ✅ | THIRD_PARTY_LLM consent |
| **Anthropic** | LLM inference (claude-3-5-sonnet) | US (EU SCCs applied) | DPA Signed ✅ | THIRD_PARTY_LLM consent |

PII scrubbing: All user PII (names, email, annotation text) is scrubbed before transmission to OpenAI and Anthropic.
Standard Contractual Clauses (SCC): EU-US data transfers to OpenAI and Anthropic use Standard Contractual Clauses per GDPR Art.46(2)(c).

---

## Tier 3 — Development and Operations

| Subprocessor | Purpose | Region | DPA Status | Data Transferred |
|-------------|---------|--------|-----------|-----------------|
| **GitHub** | CI/CD, source control (GitHub Actions) | US (SCCs applied) | DPA Signed ✅ | Source code, CI logs (no PII) |
| **Jaeger (self-hosted)** | Distributed tracing | EU | DPA Signed ✅ | Trace metadata (anonymized) |

---

## Data Transfer Mechanisms

- EU-US Transfers: Standard Contractual Clauses (SCC) per GDPR Art.46(2)(c) for OpenAI, Anthropic, GitHub
- EU Residency: All primary data stored in AWS eu-central-1 / eu-west-1
- Air-Gap / On-Premises Option: Available for institutions requiring full on-prem deployment (contact sales@edusphere.dev)

---

## Subprocessor Change Notice Policy

EduSphere will notify customers of any intended changes to this subprocessor list with **30-day** advance notice via:
1. Email notification to the registered DPA contact
2. In-app notification to ORG_ADMIN users
3. Update to this document with changelog entry

Customers may object to a new subprocessor within the 30-day notice period.

---

## Contact

For DPA inquiries: dpa@edusphere.dev
For subprocessor objections: privacy@edusphere.dev

*Last Updated: March 2026 | Version: 1.0*
