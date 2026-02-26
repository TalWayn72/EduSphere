# EduSphere Subprocessor List

**Document ID:** SEC-SUB-001
**Version:** 1.0
**Owner:** DPO
**Last Reviewed:** 2026-02-22
**Next Review:** 2026-08-22 (biannual)
**GDPR Art.28(2):** Customers receive 30-day advance notice of new subprocessors.
**Notification email:** privacy@edusphere.dev

---

## Notice to Customers

EduSphere acts as a **data processor** on behalf of its customers (data controllers). EduSphere uses the following sub-processors to deliver its services. Changes to this list are communicated with at least 30 days' advance notice.

To object to a new subprocessor, contact privacy@edusphere.dev within the notice period.

---

## Current Subprocessors

### Infrastructure & Cloud

| Subprocessor                  | Purpose                                             | Data Categories                      | Region                       | Legal Basis           | DPA                    |
| ----------------------------- | --------------------------------------------------- | ------------------------------------ | ---------------------------- | --------------------- | ---------------------- |
| **Amazon Web Services (AWS)** | Cloud infrastructure (compute, storage, networking) | All categories (customer-controlled) | EU (eu-central-1, eu-west-1) | Art.46 SCCs + AWS DPA | ✅ Signed              |
| **Amazon S3 (via AWS)**       | Media file storage (MinIO-compatible)               | Course media, attachments            | EU (eu-central-1)            | Art.46 SCCs + AWS DPA | ✅ Included in AWS DPA |

### Authentication & Identity

| Subprocessor               | Purpose                                      | Data Categories                  | Region                              | Legal Basis          | DPA               |
| -------------------------- | -------------------------------------------- | -------------------------------- | ----------------------------------- | -------------------- | ----------------- |
| **Keycloak (self-hosted)** | Identity and access management (OIDC/OAuth2) | User credentials, session tokens | EU (co-located with infrastructure) | Art.6(1)(b) Contract | N/A (self-hosted) |

### AI & Machine Learning (requires user consent per SI-10)

| Subprocessor      | Purpose                                 | Data Categories           | Region | Consent Type                       | DPA              |
| ----------------- | --------------------------------------- | ------------------------- | ------ | ---------------------------------- | ---------------- |
| **OpenAI, Inc.**  | Large language model inference (GPT-4o) | AI prompts (PII-scrubbed) | US     | `THIRD_PARTY_LLM` consent required | ✅ OpenAI DPA    |
| **Anthropic PBC** | Large language model inference (Claude) | AI prompts (PII-scrubbed) | US     | `THIRD_PARTY_LLM` consent required | ✅ Anthropic DPA |

> **Note:** OpenAI and Anthropic only receive data when the tenant's users have explicitly granted `THIRD_PARTY_LLM` consent. PII is scrubbed before transmission. Tenants can disable third-party LLM access entirely via the platform settings.

### Messaging & Streaming

| Subprocessor              | Purpose                             | Data Categories           | Region          | Legal Basis          | DPA               |
| ------------------------- | ----------------------------------- | ------------------------- | --------------- | -------------------- | ----------------- |
| **NATS.io (self-hosted)** | Async messaging and event streaming | Event payloads (internal) | EU (co-located) | Art.6(1)(b) Contract | N/A (self-hosted) |

### Monitoring & Observability

| Subprocessor              | Purpose               | Data Categories             | Region          | Legal Basis                     | DPA               |
| ------------------------- | --------------------- | --------------------------- | --------------- | ------------------------------- | ----------------- |
| **Jaeger (self-hosted)**  | Distributed tracing   | Trace spans (anonymized)    | EU (co-located) | Art.6(1)(f) Legitimate Interest | N/A (self-hosted) |
| **Grafana (self-hosted)** | Metrics visualization | Aggregated metrics (no PII) | EU (co-located) | Art.6(1)(f) Legitimate Interest | N/A (self-hosted) |

### Development & CI/CD

| Subprocessor     | Purpose                       | Data Categories               | Region | Legal Basis              | DPA           |
| ---------------- | ----------------------------- | ----------------------------- | ------ | ------------------------ | ------------- |
| **GitHub, Inc.** | Source code repository, CI/CD | Source code (no customer PII) | US     | Art.46 SCCs + GitHub DPA | ✅ GitHub DPA |

---

## Subprocessors NOT Used

The following categories of subprocessors are explicitly **not used** by EduSphere:

- Third-party analytics (no Google Analytics, Mixpanel, Segment on production data)
- Ad networks or marketing data brokers
- Social media platforms (no login via Facebook/Google on production)

---

## Historical Subprocessor Changes

| Date       | Change                 | Customer Notified |
| ---------- | ---------------------- | ----------------- |
| 2026-02-22 | Initial list published | N/A (launch)      |

---

## On-Premises Customers

Customers running EduSphere on-premises control their own infrastructure. EduSphere does not act as subprocessor for on-premises deployments. The only subprocessors applicable are:

- OpenAI/Anthropic (if tenant enables third-party LLM with user consent)
- GitHub (for software updates)

See `docs/deployment/AIR_GAPPED_INSTALL.md` for fully air-gapped deployment without external subprocessors.
