# GDPR Compliance Policy

**Document ID:** POL-009
**Version:** 1.0
**Classification:** Internal
**Owner:** Data Protection Officer (DPO)
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**Regulation:** EU General Data Protection Regulation (GDPR) 2016/679

---

## 1. Purpose

Establish EduSphere's approach to GDPR compliance, defining legal bases for processing, data subject rights fulfillment, and breach notification obligations.

## 2. Legal Bases for Processing (Art.6)

| Processing Activity                 | Legal Basis                       | Notes                              |
| ----------------------------------- | --------------------------------- | ---------------------------------- |
| Account creation and authentication | Art.6(1)(b) — Contract            | Necessary for platform access      |
| Course content delivery             | Art.6(1)(b) — Contract            | Core educational service           |
| Learning progress tracking          | Art.6(1)(b) — Contract            | Inherent to educational platform   |
| AI-powered personalization          | Art.6(1)(a) — Consent             | `AI_PROCESSING` consent required   |
| Third-party LLM (OpenAI/Anthropic)  | Art.6(1)(a) — Consent             | `THIRD_PARTY_LLM` consent required |
| Audit logging (security)            | Art.6(1)(f) — Legitimate Interest | Security monitoring                |
| Analytics (anonymized)              | Art.6(1)(f) — Legitimate Interest | Aggregate only, no PII             |
| Marketing                           | Art.6(1)(a) — Consent             | Separate opt-in                    |

## 3. Special Categories (Art.9)

EduSphere **does not intentionally collect** special category data (health, disability, race, religion, political opinions).

If students voluntarily include such information in learning annotations, it is:

- Encrypted with AES-256-GCM (same as all annotations)
- Not used for profiling or AI training
- Deleted upon erasure request

## 4. Data Subject Rights Implementation

### Art.15 — Right of Access

- **Endpoint:** `GET /api/gdpr/export` (authenticated)
- **Format:** JSON export of all personal data
- **SLA:** 30 days from request
- **Implementation:** `UserExportService.exportUserData()`

### Art.16 — Right to Rectification

- Users can update name, email, preferences via profile settings
- Changes propagate to all subgraphs via NATS event `user.updated`
- SLA: Immediate via UI

### Art.17 — Right to Erasure ("Right to be Forgotten")

- **Endpoint:** `DELETE /api/gdpr/erase` (authenticated + confirmation)
- **Cascade:** Deletes user, annotations, agent history, consents, progress
- **Implementation:** `UserErasureService.eraseUser()` with cryptographic erasure of field-level encryption
- **SLA:** 30 days; automated after request confirmation
- **Exception:** Audit logs retained 7 years (legal obligation Art.17(3)(b))

### Art.18 — Right to Restriction

- Users can pause AI processing without deleting account
- Implemented via consent management (`AI_PROCESSING` consent withdrawal)

### Art.20 — Right to Data Portability

- **Endpoint:** `GET /api/gdpr/export?format=json` (machine-readable JSON)
- **Scope:** Data provided by the data subject and processed by automated means
- **SLA:** 30 days

### Art.21 — Right to Object

- Object to AI personalization: withdraw `AI_PROCESSING` consent
- Object to third-party LLM: withdraw `THIRD_PARTY_LLM` consent
- Consent management UI available in account settings

### Art.22 — Automated Decision-Making

- Students are notified when AI makes educational recommendations (EU AI Act Art.50 transparency)
- Human review available for consequential decisions (e.g., course completion)
- No solely automated decisions with legal effects

## 5. Consent Management

All consents recorded in `user_consents` table with:

- `consent_type`: `AI_PROCESSING` | `THIRD_PARTY_LLM` | `MARKETING`
- `granted_at`: Timestamp of consent
- `revoked_at`: Timestamp of withdrawal (NULL if active)
- `ip_address`: IP at time of consent (accountability)
- `consent_text_version`: Version of consent language shown

Consent withdrawal is immediate and propagated to all processing services.

## 6. Data Protection by Design (Art.25)

- **RLS:** Row-Level Security enforced at PostgreSQL level — cross-tenant queries impossible
- **Data minimisation:** Only data necessary for educational purpose collected
- **Pseudonymisation:** User IDs (UUIDs) used internally; display names separate
- **Privacy defaults:** AI processing requires opt-in (not opt-out)
- **Encryption by default:** All PII encrypted before storage

## 7. Data Transfers Outside EU (Art.44-49)

| Transfer                      | Mechanism                             | Safeguard                      |
| ----------------------------- | ------------------------------------- | ------------------------------ |
| OpenAI (US) — with consent    | Art.46 — Standard Contractual Clauses | User `THIRD_PARTY_LLM` consent |
| Anthropic (US) — with consent | Art.46 — Standard Contractual Clauses | User `THIRD_PARTY_LLM` consent |
| AWS (US operations)           | Art.46 — AWS DPA + SCCs               | EU regions primary             |

No RESTRICTED data transferred to non-adequate countries without SCCs and explicit consent.

## 8. GDPR Article 33 — Breach Notification

**72-hour DPA notification mandatory** for breaches risking rights and freedoms of EU residents.

Notification must include:

- Nature of breach (categories and approximate number of persons affected)
- Contact details of DPO
- Likely consequences
- Measures taken or proposed

**DPO contact:** dpo@edusphere.dev

## 9. Records of Processing Activities (Art.30)

Maintained in `docs/security/GDPR_PROCESSING_ACTIVITIES.md`:

- Purpose, legal basis, data categories for each processing activity
- Recipients and transfers
- Retention periods
- Security measures

## 10. Data Protection Impact Assessments (DPIA)

Required for:

- New AI features processing large-scale personal data
- New surveillance or tracking features
- Processing of special category data
- High-risk profiling

Template: `docs/security/DPIA_TEMPLATE.md`

## 11. Related Documents

- [DATA_CLASSIFICATION_POLICY.md](./DATA_CLASSIFICATION_POLICY.md)
- [INCIDENT_RESPONSE_POLICY.md](./INCIDENT_RESPONSE_POLICY.md)
- [AI_USAGE_POLICY.md](./AI_USAGE_POLICY.md)
- [docs/security/INCIDENT_RESPONSE.md](../security/INCIDENT_RESPONSE.md)
