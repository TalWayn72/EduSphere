# Data Protection Impact Assessment (DPIA) Template

**Document ID:** SEC-DPIA-TEMPLATE-001
**Version:** 1.0
**Owner:** DPO
**Legal Basis:** GDPR Art.35 — Data Protection Impact Assessment
**Contact:** dpo@edusphere.dev

---

## When a DPIA is Required

A DPIA is **mandatory** (GDPR Art.35(3)) before processing that is likely to result in a high risk:

- Large-scale processing of special categories of data (Art.9)
- Systematic monitoring of a publicly accessible area
- Systematic and extensive profiling with significant effects

A DPIA is **strongly recommended** for EduSphere when:

- Adding a new AI feature that processes user learning behavior at scale
- Introducing biometric or behavioral analytics
- Processing data of children under 16
- Cross-tenant data sharing (even anonymized)
- New third-party AI model integration

**Decision rule:** If in doubt, conduct the DPIA. It is better to assess and find low risk than to skip assessment.

---

## DPIA Form

**Project Name:** **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***
**Prepared By:** **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***
**Date:** **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***
**DPO Review Date:** **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***
**Status:** Draft | Under Review | Approved | Rejected

---

## Section 1: Description of Processing

### 1.1 What data will be processed?

| Data Category | Classification | Approximate Volume |
| ------------- | -------------- | ------------------ |
|               |                |                    |

### 1.2 What is the purpose of processing?

_Describe the specific, explicit, and legitimate purpose(s):_

### 1.3 What is the legal basis?

- [ ] Art.6(1)(a) — Consent
- [ ] Art.6(1)(b) — Contract
- [ ] Art.6(1)(c) — Legal obligation
- [ ] Art.6(1)(f) — Legitimate interest (LIA required)
- [ ] Art.9(2)(a) — Explicit consent (special categories)

### 1.4 Who processes the data?

| Actor     | Role (Controller/Processor) | Location | DPA in place?   |
| --------- | --------------------------- | -------- | --------------- |
| EduSphere | Processor                   | EU       | N/A (this DPIA) |
|           |                             |          |                 |

---

## Section 2: Necessity and Proportionality

### 2.1 Is the processing necessary for the stated purpose?

_Explain why less privacy-intrusive alternatives would not achieve the same purpose:_

### 2.2 Data minimisation

_What data could be removed without affecting the purpose?_

### 2.3 Retention

| Data Type | Proposed Retention | Justification |
| --------- | ------------------ | ------------- |
|           |                    |               |

### 2.4 Data subjects' rights

| Right              | How fulfilled | Timeline |
| ------------------ | ------------- | -------- |
| Art.15 Access      |               |          |
| Art.17 Erasure     |               |          |
| Art.20 Portability |               |          |
| Art.21 Object      |               |          |

---

## Section 3: Risk Assessment

### 3.1 Risk Identification

| #   | Risk                                 | Likelihood (1-5) | Impact (1-5) | Risk Score |
| --- | ------------------------------------ | ---------------- | ------------ | ---------- |
| R1  | Unauthorized access to personal data |                  |              |            |
| R2  | Data breach or exfiltration          |                  |              |            |
| R3  | Data used beyond stated purpose      |                  |              |            |
| R4  | Denial of data subject rights        |                  |              |            |
| R5  | Cross-tenant data leak               |                  |              |            |
| R6  | AI bias or discrimination            |                  |              |            |

**Risk Score = Likelihood × Impact. High = 15-25, Medium = 8-14, Low = 1-7**

### 3.2 Risk Treatment

| Risk # | Treatment | Residual Risk | Owner |
| ------ | --------- | ------------- | ----- |
|        |           |               |       |

---

## Section 4: Security Measures

| Control                                 | Implemented? | Evidence |
| --------------------------------------- | ------------ | -------- |
| AES-256-GCM encryption at rest          | [ ]          |          |
| TLS 1.3 in transit                      | [ ]          |          |
| PostgreSQL RLS (tenant isolation)       | [ ]          |          |
| JWT authentication + scopes             | [ ]          |          |
| Audit logging (Art.32)                  | [ ]          |          |
| PII scrubbing (for AI calls)            | [ ]          |          |
| User consent gate (for LLM)             | [ ]          |          |
| Data retention enforcement              | [ ]          |          |
| Access restricted to minimum necessary  | [ ]          |          |
| Pseudonymization applied where possible | [ ]          |          |

---

## Section 5: DPO Opinion

**DPO Name:** **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***
**Date:** **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***

- [ ] **Approved** — Processing may proceed. Residual risks are acceptable.
- [ ] **Approved with conditions** — Processing may proceed after implementing: **\_\_\_**
- [ ] **Rejected** — Processing must not proceed. Reason: **\_\_\_**
- [ ] **Supervisory Authority consultation required** (Art.36) — Reason: **\_\_\_**

**DPO signature:** **\*\***\*\*\*\***\*\***\_**\*\***\*\*\*\***\*\***

---

## Section 6: Review History

| Version | Date | Author | Changes            |
| ------- | ---- | ------ | ------------------ |
| 1.0     |      |        | Initial assessment |

---

## Appendix: DPIA Checklist

- [ ] Description of processing documented (Section 1)
- [ ] Necessity and proportionality assessed (Section 2)
- [ ] Risks identified and scored (Section 3.1)
- [ ] Risk treatments documented (Section 3.2)
- [ ] Security measures verified (Section 4)
- [ ] DPO review completed (Section 5)
- [ ] Records of Processing updated (GDPR_PROCESSING_ACTIVITIES.md)
- [ ] Project team informed of approved conditions
