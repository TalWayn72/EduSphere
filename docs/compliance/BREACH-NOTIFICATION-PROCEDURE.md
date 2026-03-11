# Personal Data Breach Notification Procedure

**GDPR Article 33 & 34 | Israeli Privacy Protection Regulations 2023**

| Field | Value |
|---|---|
| **Organisation** | EduSphere Ltd |
| **Document Owner** | CISO / DPO (on appointment) |
| **Version** | 1.0 |
| **Last Updated** | March 2026 |
| **Review Cycle** | Annual, or following any notifiable breach |

> This procedure implements the obligations of GDPR Art. 33 (72-hour DPA notification), Art. 34 (data subject notification), and the Israeli Privacy Protection Regulations 2023 (PPR 2023) notification requirements. Both regimes require notification to the supervisory authority **no later than 72 hours after becoming aware** of a breach where feasible.

---

## Section 1 — Trigger Conditions

A **personal data breach** is any security incident leading to the accidental or unlawful destruction, loss, alteration, unauthorised disclosure of, or access to, personal data transmitted, stored or otherwise processed by EduSphere.

### 1.1 Notifiable vs. Non-Notifiable Breaches

| Breach Type | Notification Required? | Rationale |
|---|---|---|
| Unauthorised access to encrypted data (key not compromised) | No | Unlikely to result in risk to individuals |
| Accidental internal access by wrong employee, immediately corrected, no further disclosure | No (document internally) | Unlikely to result in risk |
| Lost laptop with encrypted disk — full-disk encryption confirmed | No | Encrypted — risk mitigated |
| Unauthorised access to plaintext personal data | YES — Art. 33 | Risk to individuals |
| SQL injection exposing user records | YES — Art. 33 | Risk to individuals |
| Ransomware encrypting DB with data unavailable > 72h | YES — Art. 33 | Availability breach |
| Mass email sent to wrong recipients revealing other users' emails | YES — Art. 33 | Confidentiality breach |
| Conversation data forwarded to LLM without consent | YES — Art. 33 + Art. 34 | High risk to individuals |
| Cross-tenant data leak (one tenant sees another's data) | YES — Art. 33 + Art. 34 | High risk; contractual breach |
| Credential stuffing attack with confirmed account takeovers | YES — Art. 33 | Access breach |

### 1.2 What Does NOT Trigger This Procedure

- Failed login attempt blocked by brute-force protection — log only, no breach
- Attempted SQL injection blocked by Drizzle ORM parameterisation — log only
- Internal system error not involving personal data — standard incident process
- Spam email received — not a breach

---

## Section 2 — Severity Tiers

### Tier 1 — LOW

**Criteria:** Breach affects a small number of data subjects (<10); data category is low-sensitivity (e.g., display name, course title); no special category data; no financial data; no evidence of further disclosure; quickly contained.

**Examples:** Single incorrect email notification sent to wrong address; accidental display of one user's name to another user briefly.

**Action:** Internal documentation only; no DPA notification required; affected individuals notified as a courtesy if risk is not negligible.

---

### Tier 2 — MEDIUM

**Criteria:** Breach affects 10–999 data subjects; data may include contact details, learning progress, assessment scores; no special category data confirmed; data may have been accessed but no evidence of misuse.

**Examples:** Logging misconfiguration exposes user IDs and email addresses in application logs accessible to ops team; brief exposure of cohort results to wrong instructor.

**Action:** DPA notification required (Art. 33) if risk to individuals is not unlikely; assess Art. 34 data subject notification. Internal incident report. CISO and Legal notified within 4 hours.

---

### Tier 3 — HIGH

**Criteria:** Breach affects 1,000+ data subjects; OR involves special category data (conversations, biometric audio, health references); OR involves financial data; OR data confirmed exfiltrated; OR concerns AI conversation data exposed to unauthorised party; OR cross-tenant data leak.

**Examples:** Database dump exfiltrated; AI tutoring conversations exposed; live session recordings accessed without authorisation; cross-tenant SQL bug exposing one organisation's data to another.

**Action:** GDPR Art. 33 notification mandatory; Israeli PPA notification mandatory; DPO and Legal immediately; Art. 34 data subject notification strongly likely; engage external forensics if warranted.

---

### Tier 4 — CRITICAL

**Criteria:** Breach affects 10,000+ data subjects; OR involves mass exfiltration of credentials; OR involves special category data at large scale; OR there is evidence of ongoing attacker presence in systems; OR ransomware/destructive attack; OR breach involves minors' data.

**Examples:** Full user database dump publicly posted; ransomware encrypting all EduSphere databases; attacker maintains persistent access for >24h.

**Action:** All Tier 3 actions PLUS: CEO briefed immediately; external crisis communications firm engaged; regulatory authority pre-notification call before 72h if possible; consider platform suspension; law enforcement referral if criminal activity.

---

## Section 3 — Response Timeline

### Hour 0 — Detection

**Trigger:** Alert fired (SIEM, monitoring, user report, third-party notification, internal discovery).

**Actions:**
- [ ] Incident ticket created in incident tracking system with unique reference number (format: `INC-YYYY-MM-DD-NNN`)
- [ ] Detection source documented
- [ ] Initial responder identified (on-call engineer / security team)
- [ ] Incident channel opened (Slack `#incident-response` or equivalent)
- [ ] CISO notified via PagerDuty / phone
- [ ] **Clock starts: 72-hour DPA notification countdown begins**

---

### Hour 0–4 — Initial Assessment

**Actions:**
- [ ] Determine: Is this a personal data breach? (Use Section 1 criteria)
- [ ] If NOT a personal data breach: close with documentation, exit this procedure
- [ ] If YES: assign Severity Tier (Section 2)
- [ ] Identify affected systems, data types, and approximate number of data subjects
- [ ] Preserve evidence: snapshot logs, database state, network captures — **do not alter or delete**
- [ ] Initial containment action taken (block attacker IP, revoke compromised credentials, disable affected endpoint)
- [ ] Notify: CISO + DPO (or interim contact) + Head of Engineering + Legal counsel
- [ ] Document: Initial severity assessment + evidence log entry

---

### Hour 4–24 — Containment and Evidence Preservation

**Actions:**
- [ ] Full containment achieved (attacker access removed, vulnerability patched or mitigated)
- [ ] Evidence preservation complete:
  - PostgreSQL: `pg_dump` of affected tables with timestamp
  - Audit logs: export from Jaeger / Pino log aggregation
  - Network logs: export from infrastructure monitoring
  - Git commit log of recent deployments
- [ ] Forensic integrity: hash all evidence files (SHA-256)
- [ ] Identify root cause (preliminary)
- [ ] Map affected data: which tables, which tenant(s), which data categories
- [ ] Determine if breach is contained or ongoing
- [ ] Legal counsel confirms regulatory notification obligations
- [ ] Draft initial notification to DPA (can be submitted with incomplete information — Art. 33(4) allows phased notification)

---

### Hour 24–48 — Impact Analysis

**Actions:**
- [ ] Determine exact number of affected data subjects (query affected tables with tenant context)
- [ ] Categorise personal data involved (use RoPA categories from `ROPA.md`)
- [ ] Identify whether special category data (Art. 9) was involved
- [ ] Identify whether Israeli residents are affected (PPR 2023 notification)
- [ ] Assess likely consequences for data subjects (financial harm, discrimination, reputational damage, physical harm)
- [ ] Determine whether breach is "likely to result in high risk" for Art. 34 data subject notification
- [ ] Prepare DPA notification form (see Section 4, Template A)
- [ ] Prepare data subject notification if required (see Section 4, Template B)
- [ ] CISO and DPO review and approve notification text

---

### Hour 48–72 — Regulatory Notification (DEADLINE)

**HARD DEADLINE — 72 HOURS FROM DETECTION**

**Actions:**
- [ ] **GDPR Art. 33: Submit notification to Lead Supervisory Authority**
  - If EduSphere is established in an EU Member State: notify that Member State's DPA
  - If EduSphere serves EU data subjects without EU establishment: notify relevant DPA of data subjects
  - Submission method: DPA online portal or certified email (authority-specific)
- [ ] **Israeli PPA: Submit notification to Israeli Privacy Protection Authority**
  - Online portal: [https://www.gov.il/en/departments/the_privacy_protection_authority](https://www.gov.il/en/departments/the_privacy_protection_authority)
  - Notification within 72 hours per PPR 2023
- [ ] Retain confirmation of submission with timestamp
- [ ] Log submission in incident ticket

> **Note on phased notification (GDPR Art. 33(4)):** If full information is not available within 72 hours, submit an initial notification with available information and supplement as soon as further information is available. Document the reasons for the delay.

---

### Hour 72–96 — Data Subject Notification (if required)

**Triggered when:** The breach is **likely to result in a high risk** to the rights and freedoms of natural persons (Art. 34).

**Actions:**
- [ ] Identify all affected data subjects by email address
- [ ] Send notification via primary email channel within 96 hours of breach detection
- [ ] Content must include (Art. 34(2)):
  - Nature of the breach
  - Contact details of DPO / responsible contact
  - Likely consequences of the breach
  - Measures taken or proposed to address the breach
  - Measures individuals can take to protect themselves (e.g., change password, monitor accounts)
- [ ] If individual notification disproportionate (>100k subjects): public communication via website notice + media release

---

### Hour 96 onwards — Recovery and Post-Incident

**Actions:**
- [ ] Full system restoration from clean backup (if systems were compromised)
- [ ] Vulnerability remediated and verified
- [ ] Penetration test of remediation (if Tier 3/4)
- [ ] Post-mortem scheduled within 14 days
- [ ] Breach documented in internal breach register (GDPR Art. 33(5) — maintain regardless of notification requirement)
- [ ] OPEN_ISSUES.md updated with incident reference
- [ ] Regulatory authority follow-up submissions (Art. 33(4) supplements)
- [ ] Insurance notified (cyber liability policy)
- [ ] Customer (B2B tenant) notification per contractual Data Processing Agreements

---

## Section 4 — Notification Templates

### Template A — DPA Notification (GDPR Art. 33)

```
TO: [Supervisory Authority Name and Contact]
FROM: EduSphere Ltd
DATE: [Submission Date/Time]
REFERENCE: [INC-YYYY-MM-DD-NNN]

PERSONAL DATA BREACH NOTIFICATION — GDPR ARTICLE 33

1. NATURE OF THE BREACH
[Describe: type of breach (confidentiality/integrity/availability), how it occurred,
systems affected, approximate timeline of breach]

2. CATEGORIES AND APPROXIMATE NUMBER OF DATA SUBJECTS CONCERNED
Categories: [e.g., students, instructors]
Approximate number: [N data subjects]
Note: [If exact number not yet known, state estimate and reason]

3. CATEGORIES AND APPROXIMATE NUMBER OF PERSONAL DATA RECORDS CONCERNED
Categories: [e.g., email addresses, conversation history, assessment scores]
Approximate records: [N records]

4. NAME AND CONTACT DETAILS OF DPO OR OTHER CONTACT
Name: [DPO Name or Interim Contact]
Email: dpo@edusphere.dev / security@edusphere.dev
Phone: [Contact number]

5. LIKELY CONSEQUENCES OF THE BREACH
[Describe likely impact on data subjects]

6. MEASURES TAKEN OR PROPOSED
[Describe containment, remediation, and protective measures]

Signed: [CISO / DPO Name]
Date/Time: [ISO 8601 timestamp]
```

---

### Template B — Data Subject Notification (GDPR Art. 34)

```
Subject: Important Security Notice — Your EduSphere Account

Dear [First Name],

We are writing to inform you of a security incident that may have affected your
personal data on the EduSphere platform.

WHAT HAPPENED
[Plain-language description of the breach, when it occurred, and how it was discovered]

WHAT DATA WAS INVOLVED
[Specify the categories of data — e.g., "your email address and course progress records"]

WHAT WE HAVE DONE
We became aware of this incident on [date] and immediately took the following steps:
- [Action 1]
- [Action 2]
- [Action 3]

WHAT YOU SHOULD DO
We recommend that you:
- [Action, e.g., "Change your password at https://edusphere.dev/account/security"]
- [Action, e.g., "Enable two-factor authentication in your profile settings"]
- [Action if financial data involved: "Monitor your bank statements for unusual activity"]

FOR MORE INFORMATION
If you have any questions or concerns, please contact:
- Email: dpo@edusphere.dev
- Support: support@edusphere.dev
- Phone: [Contact number — business hours]

We sincerely apologise for any concern or inconvenience this may cause.

[Name]
[Title — DPO / CISO / CEO as appropriate]
EduSphere Ltd
```

---

## Section 5 — Contacts

| Role | Name | Contact | Escalation Order |
|---|---|---|---|
| DPO | [TO BE APPOINTED] | dpo@edusphere.dev | 1st |
| CISO | [TO BE APPOINTED] | ciso@edusphere.dev | 2nd |
| Head of Engineering | [TO BE APPOINTED] | engineering@edusphere.dev | 3rd |
| Legal Counsel | [TO BE APPOINTED] | legal@edusphere.dev | 4th |
| CEO / Management | [TO BE APPOINTED] | — | Tier 3/4 only |
| PR / Communications | [TO BE APPOINTED] | — | Tier 4 only |
| External Forensics | [TO BE CONTRACTED] | — | Tier 3/4 only |

**Supervisory Authorities:**
- GDPR Lead DPA: [Determined by EduSphere establishment / main establishment — to be confirmed on DPA appointment]
- Israeli Privacy Protection Authority: [https://www.gov.il/en/departments/the_privacy_protection_authority](https://www.gov.il/en/departments/the_privacy_protection_authority) — submissions via online portal

---

## Section 6 — Post-Incident Requirements

### 6.1 Internal Breach Register

All breaches must be documented in the internal breach register regardless of whether DPA notification is required (GDPR Art. 33(5)).

**Register fields per entry:**
- Date and time of detection
- Date and time of notification to DPA (or reason no notification required)
- Severity tier
- Data categories and subject count
- Root cause
- Remediation actions taken
- Lessons learned

**Register location:** `docs/compliance/BREACH-REGISTER.md` (maintained by DPO)

### 6.2 Post-Mortem Requirements

A formal post-mortem is mandatory for all Tier 2, 3, and 4 incidents. Post-mortem must be completed within 14 days of incident closure.

**Post-mortem sections:**
1. Timeline of events (UTC timestamps)
2. Root cause analysis (5 Whys or fishbone)
3. Contributing factors
4. What went well
5. What could be improved
6. Action items with owners and due dates
7. Preventive measures implemented

### 6.3 Regulatory Follow-Up

- If DPA requests further information: respond within the stated deadline (typically 5–15 business days)
- Supplementary Art. 33(4) notifications must reference the original notification reference number
- Document all regulatory communications in incident ticket

---

## Appendix A — Breach Detection Sources

| Source | Monitoring System | Alert Type |
|---|---|---|
| PostgreSQL audit log anomalies | Jaeger + Pino log aggregation | Unusual query volumes, cross-tenant queries |
| Failed authentication spikes | Keycloak events + SIEM | Brute force, credential stuffing |
| Container resource anomalies | Docker stats + health checks | Possible exfiltration (high network egress) |
| GraphQL error rate spike | Gateway monitoring | Possible injection attempts |
| MinIO access anomalies | MinIO access logs | Bulk object download |
| User-reported anomalies | Support ticket system | User sees another user's data |
| NATS stream anomalies | NATS JetStream monitoring | Unexpected message routing |

---

*Document owner: CISO / DPO (to be appointed)*
*Stored at: `docs/compliance/BREACH-NOTIFICATION-PROCEDURE.md`*
*Related: `ROPA.md`, `DPIA.md`, `docs/security/`*
