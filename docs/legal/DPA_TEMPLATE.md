# Data Processing Agreement (DPA)

**Version:** 1.0
**Date:** 2026-02-22
**Reference:** GDPR Article 28

---

## 1. Parties

**Controller (Client):**
- Legal Name: [CLIENT_LEGAL_NAME]
- Registered Address: [CLIENT_ADDRESS]
- Registration Number: [CLIENT_REGISTRATION_NUMBER]
- Contact Person: [CLIENT_CONTACT_NAME]
- Email: [CLIENT_CONTACT_EMAIL]
- Data Protection Officer (if applicable): [CLIENT_DPO_EMAIL]

(hereinafter referred to as the **Controller**)

**Processor:**
- Legal Name: EduSphere Technologies Ltd.
- Registered Address: [EDUSPHERE_REGISTERED_ADDRESS]
- Registration Number: [EDUSPHERE_REGISTRATION_NUMBER]
- Contact Person: Chief Privacy Officer
- Email: dpo@edusphere.dev

(hereinafter referred to as the **Processor**)

Together referred to as the Parties.

---

## 2. Subject Matter and Duration

### 2.1 Subject Matter

This Data Processing Agreement (DPA) governs the processing of personal data by the Processor on behalf of the Controller in connection with the provision of the EduSphere educational platform services as described in the Main Agreement.

### 2.2 Duration

This DPA shall remain in force for the duration of the Main Agreement. Upon termination, this DPA shall automatically terminate subject to the data return and deletion obligations in Section 6.7.

---

## 3. Nature and Purpose of Processing

### 3.1 Nature of Processing

The Processor shall perform the following processing operations on behalf of the Controller:

- Collection and storage of personal data submitted by or on behalf of the Controller
- Organisation and structuring of learning records and user profiles
- Use and analysis for platform functionality delivery (personalized learning paths, progress tracking)
- Transmission of data to authorized sub-processors (see Section 7)
- Deletion and anonymization upon instruction or expiry of retention periods
- AI-assisted learning interactions including knowledge graph queries and conversational AI responses

### 3.2 Purpose of Processing

Personal data shall be processed solely for the following purposes:

1. Provision and operation of the EduSphere educational platform
2. User authentication, authorization, and session management
3. Delivery of personalized learning experiences and adaptive assessments
4. Knowledge graph construction and semantic search functionality
5. AI agent interactions for tutoring, assessment, and debate exercises
6. Analytics and reporting for the Controller administrative use
7. Technical support, incident response, and platform security monitoring
8. Compliance with applicable legal obligations

---

## 4. Type of Personal Data

| Category | Examples | Special Category? |
|----------|----------|-------------------|
| Identity data | Full name, username, profile picture | No |
| Contact data | Email address, institutional affiliation | No |
| Authentication data | Hashed passwords, OAuth tokens, session identifiers | No |
| Learning data | Course progress, assessment scores, quiz responses, completion records | No |
| AI conversation data | Prompts, responses, debate transcripts, tutoring session logs | No |
| Annotation data | Personal notes, highlights, comments on content | No |
| Behavioral data | Page views, feature interactions, time-on-task (aggregated) | No |
| Technical data | IP address (masked to /24 for audit logs), device type, browser agent | No |

**Special categories (GDPR Art.9):** The Processor does not intentionally process special category data. The Controller shall not submit special category data without a separate written agreement.

---

## 5. Categories of Data Subjects

| Category | Description |
|----------|-------------|
| Students / Learners | End users enrolled in courses on the platform |
| Instructors / Educators | Users who create and manage course content |
| Administrators | Controller staff managing the platform instance |
| Guest / Preview Users | Unauthenticated or limited-access users (minimal data) |

---

## 6. Obligations of the Processor

The Processor undertakes the following obligations in accordance with GDPR Article 28(3):

### 6.1 Processing Only on Documented Instructions (Art.28(3)(a))

The Processor shall process personal data only on documented instructions from the Controller, including with regard to transfers to a third country or international organisation, unless required to do so by Union or Member State law.

### 6.2 Confidentiality (Art.28(3)(b))

The Processor shall ensure that persons authorised to process personal data have committed themselves to confidentiality or are under an appropriate statutory obligation of confidentiality. Access is restricted to employees and contractors who need access for performance of the Services.

### 6.3 Security Measures (Art.28(3)(c))

The Processor shall implement and maintain appropriate technical and organisational measures as detailed in Section 8, including:

- Encryption of personal data at rest using AES-256-GCM
- Encryption of personal data in transit using TLS 1.3
- Ongoing confidentiality, integrity, availability, and resilience of processing systems
- Ability to restore availability and access to personal data following a physical or technical incident
- Regular testing and evaluation of technical and organisational measures

### 6.4 Sub-processor Obligations (Art.28(3)(d))

The Processor shall not engage another processor (sub-processor) without prior written authorisation of the Controller. The Controller hereby grants general written authorisation for the sub-processors listed in docs/security/SUBPROCESSORS.md.

### 6.5 Data Subject Rights Assistance (Art.28(3)(e))

The Processor shall assist the Controller to respond to requests for exercising data subjects rights under Chapter III of GDPR:

- Right of access (Art.15): data export available within 48 hours via GDPR rights API
- Right to rectification (Art.16): profile data correctable by end users and administrators
- Right to erasure (Art.17): automated erasure workflow within 30 days, with cryptographic verification
- Right to restriction (Art.18): processing suspension available on Controller instruction
- Right to data portability (Art.20): JSON/CSV export available via platform API
- Right to object (Art.21): opt-out mechanisms for analytics processing

### 6.6 Assistance with Art.32-36 Obligations (Art.28(3)(f))

The Processor shall assist the Controller in ensuring compliance with GDPR Articles 32-36:

- Security of processing (Art.32)
- Notification of personal data breaches to the supervisory authority (Art.33)
- Communication of personal data breaches to the data subject (Art.34)
- Data protection impact assessments (Art.35)
- Prior consultation (Art.36)

### 6.7 Deletion and Return (Art.28(3)(g))

Upon termination of Services, the Processor shall, at the choice of the Controller:

- Delete all personal data and existing copies; or
- Return all personal data in a structured, machine-readable format (JSON)

Deletion shall be completed within **30 calendar days** of termination. Cryptographic proof of deletion shall be provided upon request.

### 6.8 Audit Assistance (Art.28(3)(h))

The Processor shall make available to the Controller all information necessary to demonstrate compliance with GDPR Article 28 and shall allow for audits conducted by the Controller or an auditor mandated by the Controller.

**Audit process:**
- Remote audit: Controller may request audit documentation (SOC 2 Type II report, penetration test summaries) once per year at no charge
- On-site audit: Available with 30 days written notice; costs borne by Controller
- Automated compliance reports available via platform administration dashboard

---

## 7. Sub-processors

### 7.1 Authorised Sub-processors

The Controller provides general authorisation for the Processor to engage the sub-processors listed in docs/security/SUBPROCESSORS.md.

### 7.2 Change Notification

The Processor shall notify the Controller of any intended addition or replacement of sub-processors with at least **30 days written notice** via email to [CLIENT_CONTACT_EMAIL]. The Controller may object within 14 days.

### 7.3 Sub-processor Contracts

The Processor shall ensure that each sub-processor is bound by a written agreement with data protection obligations no less protective than this DPA.

---

## 8. Technical and Organisational Measures (TOMs)

### 8.1 Encryption at Rest

| Measure | Implementation |
|---------|----------------|
| Algorithm | AES-256-GCM (Galois/Counter Mode) |
| Key management | Tenant-specific encryption keys, rotated annually |
| Scope | All personal data fields in PostgreSQL (PII columns via field-level encryption) |
| Database volumes | Full-disk encryption on all storage volumes |

### 8.2 Encryption in Transit

| Measure | Implementation |
|---------|----------------|
| Protocol | TLS 1.3 minimum (TLS 1.0 and 1.1 disabled) |
| Cipher suites | ECDHE-RSA-AES256-GCM-SHA384 and equivalents |
| Certificate management | Automated renewal via internal CA |
| Internal services | mTLS between microservices via Linkerd service mesh |
| HSTS | Enforced with min-age=31536000; includeSubDomains |

### 8.3 Access Controls

| Measure | Implementation |
|---------|----------------|
| Authentication | JWT via Keycloak (OIDC), MFA enforced for administrators |
| Authorization | RBAC: STUDENT, INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN |
| Row-Level Security | PostgreSQL RLS policies enforcing tenant isolation |
| API security | Scope-based authorization (@requiresScopes), query complexity limits |
| Privileged access | Least privilege; production access requires approved change request |

### 8.4 Audit Logging

| Measure | Implementation |
|---------|----------------|
| Events logged | Create, read (sensitive), update, delete on personal data resources |
| Log fields | Timestamp, action, resource_type, resource_id, actor_id, tenant_id, IP (/24 masked) |
| Retention | 7 years (GDPR legitimate interest basis - see docs/security/LIA_SECURITY_MONITORING.md) |
| Access restriction | SUPER_ADMIN only; logs never used for profiling |
| Integrity | Append-only storage; tamper-evident hash chain |

### 8.5 Incident Response

| Measure | Implementation |
|---------|----------------|
| Detection | Automated anomaly detection on audit logs and infrastructure metrics |
| Response time | Critical incidents: 1-hour initial response; 4-hour containment target |
| GDPR notification | DPA notification within 72 hours of becoming aware of breach (Art.33) |
| User notification | Within 72 hours of DPA notification where high risk to individuals (Art.34) |
| Register | Breach register maintained per Art.33(5) - see docs/security/BREACH_REGISTER.md |
| Tabletop exercises | Quarterly incident response exercises |

### 8.6 Pseudonymisation

| Measure | Implementation |
|---------|----------------|
| Analytics | User IDs replaced with pseudonymous tokens for analytics processing |
| Audit logs | Actor identity stored as internal UUID; not exposed in exports |
| AI training | No personal data used for model training without explicit consent |
| Data minimisation | Only data necessary for each function collected and retained |

### 8.7 Physical Security

- All data processed in SOC 2 Type II certified data centres
- Physical access controls: biometric, CCTV, access logs
- Geographic location: [EU/EEA/UK data residency as specified in Main Agreement]

### 8.8 Organisational Measures

| Measure | Implementation |
|---------|----------------|
| Data protection training | Annual mandatory training for all staff with data access |
| Background checks | Conducted for all staff with access to personal data |
| DPO | Appointed Data Protection Officer (dpo@edusphere.dev) |
| Privacy by design | Privacy impact assessments required for new features |
| Vendor management | All vendors assessed for GDPR compliance before engagement |

---

## 9. International Data Transfers

Where processing involves a transfer of personal data to a third country (outside the EEA), the Processor shall ensure appropriate safeguards as required by GDPR Chapter V, including:

- Standard Contractual Clauses (SCCs) - EU Commission Decision 2021/914
- Adequacy decisions (where applicable)
- Binding Corporate Rules (where applicable)

Details are specified in the Sub-processor register (docs/security/SUBPROCESSORS.md).

---

## 10. Governing Law and Jurisdiction

- **EU/EEA clients:** The law of [MEMBER_STATE], and disputes subject to jurisdiction of courts in [JURISDICTION]
- **UK clients:** The laws of England and Wales
- **Other jurisdictions:** As specified in the Main Agreement

---

## 11. Order of Precedence

In the event of any conflict between this DPA and the Main Agreement, this DPA shall take precedence with respect to data protection.

---

## 12. Signature Block

**Signed for and on behalf of the Controller:**

| Field | Details |
|-------|--------|
| Name | ______________________________ |
| Title | ______________________________ |
| Date | ______________________________ |
| Signature | ______________________________ |

**Signed for and on behalf of the Processor (EduSphere Technologies Ltd.):**

| Field | Details |
|-------|--------|
| Name | ______________________________ |
| Title | Data Protection Officer |
| Date | ______________________________ |
| Signature | ______________________________ |

---

## Annex A - Processing Details Summary

| Field | Details |
|-------|--------|
| Subject matter | EduSphere educational platform services |
| Duration | Term of Main Agreement |
| Nature | Storage, analysis, transmission, AI-assisted processing |
| Purpose | Educational platform delivery and administration |
| Data types | Identity, contact, learning, AI conversation, annotation, behavioral, technical |
| Data subjects | Students, instructors, administrators |
| Legal basis (Controller) | Contract (Art.6(1)(b)); Legitimate Interest (Art.6(1)(f)) |

---

*This document is a template. Bracketed fields [LIKE_THIS] must be completed before execution.*
*For customization instructions, see docs/legal/DPA_INSTRUCTIONS.md*
*EduSphere DPA v1.0 - 2026-02-22 - Contact: dpo@edusphere.dev*