# Personal Data Breach Register

**Document ID:** SEC-BREACH-001
**Version:** 1.0
**Owner:** DPO
**Created:** 2026-02-22
**GDPR Reference:** Article 33(5) — Controller must document all personal data breaches
**SOC2 Reference:** CC7.3, CC7.4

---

## Purpose

GDPR Article 33(5) requires controllers to document all personal data breaches, regardless of whether notification to the supervisory authority was required. This register serves as EduSphere's official breach record and provides evidence of compliance with the 72-hour notification obligation.

**Retention:** This register must be retained for a minimum of 3 years from the date of each entry.

---

## Register Format

Each entry must capture:

| Field | Description |
|-------|-------------|
| **Incident ID** | Unique identifier (format: BREACH-YYYY-NNN) |
| **Date Discovered** | Date/time EduSphere first became aware |
| **Date of Breach** | Estimated date breach began (if known) |
| **Duration** | How long the breach lasted before containment |
| **Discovery Source** | How it was discovered (Wazuh alert / user report / third party / internal audit) |
| **Nature** | Type: confidentiality / integrity / availability breach |
| **Categories of Data** | Types of personal data involved (names, emails, annotations, AI conversations, etc.) |
| **Approximate No. of Records** | Number of records involved (estimate acceptable) |
| **Categories of Data Subjects** | Students / Instructors / ORG_ADMINs / All users |
| **Tenants Affected** | Which tenant(s) impacted |
| **Cause** | Root cause (e.g., misconfiguration / software vulnerability / insider threat / supply chain) |
| **Consequences** | Likely consequences for data subjects |
| **Measures Taken** | Remediation steps taken |
| **DPA Notified** | Yes / No / Not required (low risk) |
| **DPA Notification Date** | Date notification sent to supervisory authority |
| **Users Notified** | Yes / No / Not required |
| **User Notification Date** | Date notification sent to affected users |
| **Outcome / Status** | Closed / Under investigation / Pending notification |
| **RCA Document** | Link to root cause analysis document |

---

## Active Incidents

*As of 2026-02-22, no breaches have been recorded.*

---

## Closed Incidents

*None — EduSphere launched in 2026. Register will be populated as incidents occur.*

---

## Breach Classification Guide

### Severity Classification

| Severity | Criteria | DPA Notification | User Notification |
|----------|----------|-----------------|-------------------|
| **Critical** | Large-scale breach (>1,000 subjects), sensitive categories (health, financial), or identity theft risk | Required within 72h | Required without undue delay |
| **High** | Limited-scale breach (10-999 subjects), moderate risk (email + name exposed) | Required within 72h | Consider on case-by-case |
| **Medium** | Very limited-scale (<10 subjects), low risk | Not required; document only | Not required |
| **Low** | Availability-only breach (no data exposed), or breach of encrypted data with secure key | Not required; document only | Not required |

### Breach Type Definitions

| Type | Definition | Example |
|------|-----------|---------|
| **Confidentiality breach** | Unauthorized disclosure or access to personal data | Misconfigured RLS policy allows cross-tenant read |
| **Integrity breach** | Unauthorized modification of personal data | SQL injection corrupting annotation records |
| **Availability breach** | Personal data made unavailable | DDoS causing temporary loss of access to learning records |

---

## 72-Hour Clock Protocol

When a potential breach is identified:

```
T+0:00  Detection — assign Incident Commander, open #incident channel
T+0:04  Initial assessment — does it involve personal data? If YES, GDPR clock starts
T+4:00  Internal severity classification — Critical / High / Medium / Low
T+24:00 Draft DPA notification ready (even if incomplete — Art. 33(4) allows phase 1 notification)
T+48:00 Scope confirmed — number of data subjects, categories of data, tenants affected
T+72:00 ⚠️ DPA notification DEADLINE — must be sent by this point

Note: The 72-hour clock runs from when EduSphere BECAME AWARE, not when the breach occurred.
```

**DPA Contact (EU/EEA):**
- Germany: Bundesbeauftragter für den Datenschutz (BfDI) — www.bfdi.bund.de
- France: CNIL — www.cnil.fr — notifications@cnil.fr
- Netherlands: Autoriteit Persoonsgegevens — meldloket@autoriteitpersoonsgegevens.nl
- UK (post-Brexit): ICO — https://ico.org.uk/report-a-breach/

---

## DPA Notification Template

When notification is required, the following information must be included (Article 33(3)):

1. **Nature of the breach** including categories and approximate number of data subjects and records
2. **Contact details of DPO:** privacy@edusphere.io
3. **Likely consequences** of the breach for data subjects
4. **Measures taken or proposed** to address the breach and mitigate adverse effects

A phase 1 notification can be submitted within 72 hours if full information is not yet available, with a phase 2 follow-up once the investigation is complete.

---

## Tenant Breach Notification Obligations

Where a breach affects a specific tenant (EduSphere acts as data processor under GDPR Art.28):

1. **EduSphere must notify the affected tenant (controller) without undue delay** — typically within 24 hours of becoming aware
2. The tenant (controller) is then responsible for notifying their DPA and data subjects
3. EduSphere will provide the tenant with all available information to support their notification
4. EduSphere will cooperate with the tenant's incident response investigation

Notification contacts per tenant are stored in `tenants.settings.incidentContact`.

---

## Annual Review Requirement

This register must be reviewed annually by the DPO to:
1. Verify all incidents are documented
2. Verify notifications were made within required timeframes
3. Identify systemic causes of breaches
4. Update classification guide if regulatory guidance changes
5. Confirm retention schedules are being followed

**Next scheduled review:** 2027-02-22

---

*This document is confidential — for internal use, regulatory disclosure, and legal proceedings only.*
*Do not share externally without DPO approval.*
