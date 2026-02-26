# Data Classification Policy

**Document ID:** POL-007
**Version:** 1.0
**Classification:** Internal
**Owner:** CISO
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**SOC2 Trust Service Criteria:** CC6.1, P1.1, P3.1, P4.1

---

## 1. Purpose

Define how EduSphere classifies, labels, and handles data throughout its lifecycle to ensure appropriate protection commensurate with sensitivity.

## 2. Data Classification Levels

### RESTRICTED (Highest Sensitivity)

**Definition:** Personally Identifiable Information (PII), authentication credentials, encryption keys, financial data, and regulated data whose exposure would cause significant harm or regulatory penalties.

**Examples:**

- Student names, email addresses, national IDs
- Learning disability or health-related annotations
- Passwords and API tokens
- AES-256 encryption keys and tenant KMS keys
- EU resident personal data subject to GDPR

**Controls:**

- AES-256-GCM encryption at rest (per-tenant key)
- TLS 1.3 in transit
- Access logged to `audit_log` table (all reads and writes)
- MFA required for all access
- RLS enforces tenant isolation at database level
- Minimum retention (deleted when purpose fulfilled)
- GDPR rights applicable (erasure, portability, rectification)

### CONFIDENTIAL

**Definition:** Business-sensitive data whose unauthorized disclosure would harm EduSphere or customers but is not directly regulated.

**Examples:**

- Source code and architecture diagrams
- Security configurations (non-credential)
- Customer contracts and pricing
- Internal communications
- Aggregate anonymized analytics

**Controls:**

- Encryption at rest (volume-level or object-level)
- TLS in transit
- Role-based access control
- No external sharing without legal review

### INTERNAL

**Definition:** Information intended for internal use only; low risk if exposed but not appropriate for public disclosure.

**Examples:**

- Internal runbooks and process documents
- Meeting notes
- Non-sensitive project documentation
- Test data (anonymized)

**Controls:**

- Access controls (authenticated employees only)
- Not shared externally without approval

### PUBLIC

**Definition:** Information approved for public access with no confidentiality requirements.

**Examples:**

- Marketing materials
- Open-source code
- Public API documentation
- Status page information

**Controls:**

- Review before publishing
- IP ownership review

## 3. Data Inventory (Key Datasets)

| Dataset                    | Classification | Storage                        | Encryption             | Retention                  |
| -------------------------- | -------------- | ------------------------------ | ---------------------- | -------------------------- |
| Student PII (name, email)  | RESTRICTED     | PostgreSQL `users` table       | AES-256-GCM per-tenant | Account lifetime + 3 years |
| Learning annotations       | RESTRICTED     | PostgreSQL `annotations` table | AES-256-GCM            | Account lifetime           |
| Agent conversation history | RESTRICTED     | PostgreSQL `agent_messages`    | AES-256-GCM            | 90 days (configurable)     |
| Course content             | CONFIDENTIAL   | PostgreSQL + MinIO             | TLS + SSE-S3           | Contract term              |
| Audit logs                 | CONFIDENTIAL   | PostgreSQL `audit_log`         | Volume encryption      | 7 years                    |
| Embeddings (pgvector)      | INTERNAL       | PostgreSQL `knowledge_nodes`   | Volume encryption      | Course lifetime            |
| Docker images              | INTERNAL       | Amazon ECR                     | Volume encryption      | 90 days (old tags)         |

## 4. Data Handling Requirements

### Collection (GDPR Art.5 — Purpose Limitation)

- Collect only data necessary for the stated educational purpose
- Document the legal basis (consent, legitimate interest, contract) for each data type
- Provide privacy notice at collection point

### Storage

- RESTRICTED data encrypted before database write (`encryptField()` helper)
- Never store credentials in plaintext (hashed passwords; API tokens in Vault)
- Multi-tenant data isolated at PostgreSQL RLS level

### Transmission

- TLS 1.3 minimum for all external communication
- mTLS (Linkerd) for inter-service communication in production
- No RESTRICTED data in log files or error messages

### Retention and Deletion

| Classification    | Default Retention      | Deletion Method                                    |
| ----------------- | ---------------------- | -------------------------------------------------- |
| RESTRICTED (PII)  | Purpose + 90 days      | Cryptographic erasure + GDPR Art.17 cascade delete |
| RESTRICTED (keys) | Active use only        | Vault lease expiry + HSM destruction               |
| CONFIDENTIAL      | Contract term + 1 year | Secure deletion                                    |
| INTERNAL          | 3 years                | Standard deletion                                  |
| PUBLIC            | Indefinite             | N/A                                                |

### Third-Party Sharing

- RESTRICTED data shared only with Tier 1 vendors (DPA required)
- LLM providers receive RESTRICTED data only with explicit user consent (`THIRD_PARTY_LLM` consent flag)
- PII scrubber applied before any external AI call

## 5. Data Subject Rights (GDPR)

| Right                  | Implementation                           | SLA       |
| ---------------------- | ---------------------------------------- | --------- |
| Art.15 — Access        | `/api/gdpr/export` endpoint              | 30 days   |
| Art.16 — Rectification | Profile update via UI                    | Immediate |
| Art.17 — Erasure       | `UserErasureService.eraseUser()` cascade | 30 days   |
| Art.20 — Portability   | `/api/gdpr/export` (JSON format)         | 30 days   |
| Art.21 — Objection     | Consent withdrawal UI                    | Immediate |

## 6. Related Documents

- [ENCRYPTION_POLICY.md](./ENCRYPTION_POLICY.md)
- [GDPR_COMPLIANCE_POLICY.md](./GDPR_COMPLIANCE_POLICY.md)
- [VENDOR_MANAGEMENT_POLICY.md](./VENDOR_MANAGEMENT_POLICY.md)
