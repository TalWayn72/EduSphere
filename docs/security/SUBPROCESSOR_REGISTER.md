# EduSphere Subprocessor List

**Document ID:** SEC-SUB-001
**Version:** 1.1
**Owner:** DPO
**Last Reviewed:** 2026-02-25
**Next Review:** 2026-08-25 (biannual)
**GDPR Art.28(2):** Customers receive 30-day advance notice of new or changed subprocessors.
**Notification email:** privacy@edusphere.dev

---

## Notice to Customers

EduSphere acts as a **data processor** on behalf of its customers (data controllers). EduSphere uses the following sub-processors to deliver its services. Changes to this list are communicated with **at least 30 days' advance notice** to all affected customers.

To object to a new subprocessor, contact privacy@edusphere.dev within the 30-day notice period.

---

## Current Subprocessors

### Infrastructure & Cloud

| Subprocessor                  | Purpose                                             | Data Categories                      | Region                       | Legal Basis                                          | DPA                    |
| ----------------------------- | --------------------------------------------------- | ------------------------------------ | ---------------------------- | ---------------------------------------------------- | ---------------------- |
| **Amazon Web Services (AWS)** | Cloud infrastructure (compute, storage, networking) | All categories (customer-controlled) | EU (eu-central-1, eu-west-1) | Art.46 Standard Contractual Clauses (SCCs) + AWS DPA | ✅ DPA Signed          |
| **Amazon S3 (via AWS)**       | Media file storage (MinIO-compatible)               | Course media, attachments            | EU (eu-central-1)            | Art.46 SCCs + AWS DPA                                | ✅ Included in AWS DPA |

> **EU Data Residency:** All AWS workloads run in EU regions (eu-central-1, eu-west-1) by default. Customers requiring specific EU jurisdiction guarantees may specify region in their contract.

### Authentication & Identity

| Subprocessor               | Purpose                                      | Data Categories                  | Region                                  | Legal Basis          | DPA               |
| -------------------------- | -------------------------------------------- | -------------------------------- | --------------------------------------- | -------------------- | ----------------- |
| **Keycloak (self-hosted)** | Identity and access management (OIDC/OAuth2) | User credentials, session tokens | EU (co-located with AWS infrastructure) | Art.6(1)(b) Contract | N/A (self-hosted) |

### AI & Machine Learning (requires THIRD_PARTY_LLM user consent per SI-10)

| Subprocessor      | Purpose                                 | Data Categories                               | Region | Consent Type                       | DPA           |
| ----------------- | --------------------------------------- | --------------------------------------------- | ------ | ---------------------------------- | ------------- |
| **OpenAI, Inc.**  | Large language model inference (GPT-4o) | AI prompts (PII-scrubbed before transmission) | US     | `THIRD_PARTY_LLM` consent required | ✅ DPA Signed |
| **Anthropic PBC** | Large language model inference (Claude) | AI prompts (PII-scrubbed before transmission) | US     | `THIRD_PARTY_LLM` consent required | ✅ DPA Signed |

> **AI Consent Gate:** OpenAI and Anthropic only receive data when the tenant's users have explicitly granted `THIRD_PARTY_LLM` consent (GDPR Art.6(1)(a)). PII is scrubbed before transmission via the platform's PII scrubbing pipeline. Tenants can disable third-party LLM access entirely.
>
> **US Transfer Mechanism:** Transfers to OpenAI and Anthropic (US-based) are covered by Standard Contractual Clauses (SCCs) and the respective vendor DPAs. Data is only transferred with user consent.

### Messaging & Streaming

| Subprocessor              | Purpose                             | Data Categories           | Region          | Legal Basis          | DPA               |
| ------------------------- | ----------------------------------- | ------------------------- | --------------- | -------------------- | ----------------- |
| **NATS.io (self-hosted)** | Async messaging and event streaming | Event payloads (internal) | EU (co-located) | Art.6(1)(b) Contract | N/A (self-hosted) |

### Monitoring & Observability

| Subprocessor              | Purpose               | Data Categories                  | Region          | Legal Basis                     | DPA               |
| ------------------------- | --------------------- | -------------------------------- | --------------- | ------------------------------- | ----------------- |
| **Jaeger (self-hosted)**  | Distributed tracing   | Trace spans (anonymized, no PII) | EU (co-located) | Art.6(1)(f) Legitimate Interest | N/A (self-hosted) |
| **Grafana (self-hosted)** | Metrics visualization | Aggregated metrics (no PII)      | EU (co-located) | Art.6(1)(f) Legitimate Interest | N/A (self-hosted) |

### Development & CI/CD

| Subprocessor     | Purpose                                 | Data Categories               | Region | Legal Basis              | DPA           |
| ---------------- | --------------------------------------- | ----------------------------- | ------ | ------------------------ | ------------- |
| **GitHub, Inc.** | Source code repository, CI/CD pipelines | Source code (no customer PII) | US     | Art.46 SCCs + GitHub DPA | ✅ DPA Signed |

---

## DPA Confirmation — Tier 1 Subprocessors

All Tier 1 subprocessors (those with access to customer personal data) have signed Data Processing Agreements (DPAs) with EduSphere:

| Subprocessor        | DPA Status    | Signed Date | Review Date |
| ------------------- | ------------- | ----------- | ----------- |
| Amazon Web Services | ✅ DPA Signed | 2026-02-22  | 2027-02-22  |
| OpenAI, Inc.        | ✅ DPA Signed | 2026-02-22  | 2027-02-22  |
| Anthropic PBC       | ✅ DPA Signed | 2026-02-22  | 2027-02-22  |
| GitHub, Inc.        | ✅ DPA Signed | 2026-02-22  | 2027-02-22  |

---

## Subprocessors NOT Used

The following categories are explicitly **not used** by EduSphere on production customer data:

- Third-party analytics (no Google Analytics, Mixpanel, or Segment on production data)
- Ad networks or marketing data brokers
- Social media platforms (no Facebook/Google login on production)

---

## On-Premises / Air-Gapped Deployment

Customers running EduSphere on-premises control their own infrastructure. EduSphere does not act as subprocessor for on-premises deployments. The only subprocessors applicable to on-premises customers are:

- OpenAI / Anthropic — only if the tenant enables third-party LLM with explicit user consent
- GitHub — for software update delivery

For customers requiring complete data sovereignty, EduSphere offers a fully **air-gapped** on-premises installation using only self-hosted components (Ollama for LLM inference, on-prem object storage). See `docs/deployment/AIR_GAPPED_INSTALL.md`.

---

## Historical Subprocessor Changes

| Date       | Change                                                                 | Customer Notified             |
| ---------- | ---------------------------------------------------------------------- | ----------------------------- |
| 2026-02-22 | Initial list published                                                 | N/A (launch)                  |
| 2026-02-25 | Clarified SCC mechanism for US transfers; added DPA confirmation table | All customers (30-day notice) |
