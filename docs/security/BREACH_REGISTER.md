# Personal Data Breach Register

**Version:** 1.0
**Date:** 2026-02-22
**Reference:** GDPR Article 33(5)
**Owner:** Data Protection Officer (dpo@edusphere.dev)
**Review Cycle:** Annual (and after each breach)

---

## Purpose

This register documents all personal data breaches in accordance with GDPR Article 33(5), which requires controllers to document any personal data breaches, including the facts relating to the breach, its effects, and the remedial action taken. This documentation enables supervisory authorities to verify compliance with notification obligations.

**Scope:** All personal data breaches affecting data processed by EduSphere Technologies Ltd. (as Controller) or notified by clients/sub-processors where EduSphere acts as Processor.

---

## Severity Levels

| Level        | Definition                                                                                                                                         | Examples                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Critical** | Breach involving special category data, financial data, or large-scale exposure (>1,000 individuals); likely to result in high risk to individuals | Mass credential compromise; database with special category data exposed publicly        |
| **High**     | Breach involving significant personal data exposure; risk to individuals likely but not certain; DPA notification threshold crossed                | Tenant data exposed to another tenant; user PII accessible without authentication       |
| **Medium**   | Limited personal data exposure; risk to individuals possible but low; DPA notification threshold may apply                                         | Single user account compromised; small number of records inadvertently shared           |
| **Low**      | Minimal personal data involved; risk to individuals unlikely; no DPA notification required                                                         | Accidental internal access log review; temporary misconfiguration with no data accessed |

---

## Notification Thresholds

### Supervisory Authority (DPA) Notification - GDPR Art.33

Notify the competent supervisory authority **within 72 hours** of becoming aware of a breach if the breach is likely to result in a risk to the rights and freedoms of natural persons.

**Exceptions (no DPA notification required):**

- The breach is unlikely to result in a risk to individuals (e.g., data was encrypted with AES-256-GCM and keys are not compromised)
- Low severity breaches where affected data is pseudonymous and there is no realistic risk of harm

**If notification is late (>72 hours):** Include explanation of the reasons for the delay in the notification.

### Data Subject Notification - GDPR Art.34

Notify affected data subjects **without undue delay** if the breach is likely to result in **high risk** to the rights and freedoms of natural persons.

**Exceptions (no data subject notification required):**

- Affected data was encrypted and the decryption key has not been compromised
- Subsequent measures eliminate the high risk to data subjects
- Notification would require disproportionate effort (use public communication instead)

---

## Breach Register

| Ref #       | Date Discovered | Date Reported to DPO | Description                                                                                                                                                                                                                                           | Data Subjects Affected       | Categories of Data                         | Severity | Notified DPA? | DPA Notification Date | Users Notified? | Root Cause                                                               | Remediation                                                                                                                                 | Status |
| ----------- | --------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------ | -------- | ------------- | --------------------- | --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| BR-2026-001 | 2026-02-22      | 2026-02-22           | [TEMPLATE ENTRY] Hypothetical example: Misconfigured API endpoint temporarily exposed user profile data for Tenant A to authenticated users of Tenant B. No evidence of data exfiltration. Affected window: 2026-02-20 14:00 to 2026-02-22 09:00 UTC. | Up to 47 students (Tenant A) | Email addresses, course enrollment records | High     | Pending       | -                     | Pending         | RLS policy gap: missing tenant_id check on /api/v1/users/search endpoint | (1) Endpoint patched with tenant_id filter; (2) Full RLS audit of all API endpoints initiated; (3) Affected users to be notified per Art.34 | Open   |

---

## Breach Entry Template

Use the following template when recording a new breach:

```
Ref #: BR-[YYYY]-[NNN]
Date Discovered: [YYYY-MM-DD HH:MM UTC]
Date Reported to DPO: [YYYY-MM-DD HH:MM UTC]
Description: [Brief description of the breach]
Data Subjects Affected: [Number or range if unknown]
Categories of Data: [List data types involved]
Severity: [Critical / High / Medium / Low]
Notified DPA: [Yes / No / N/A - not required]
DPA Notification Date: [YYYY-MM-DD or N/A]
Users Notified: [Yes / No / N/A - not required]
Root Cause: [Technical or procedural cause]
Remediation: [Steps taken or planned]
Status: [Open / Closed - Date Closed]
```

---

## Breach Response Procedure

### Immediate Actions (0-4 hours)

1. **Contain:** Stop the breach - revoke compromised credentials, patch vulnerability, isolate affected system
2. **Preserve evidence:** Capture logs, screenshots, and system state before making changes
3. **Notify DPO:** Email dpo@edusphere.dev with subject line: [BREACH ALERT] Brief Description
4. **Assess severity:** DPO makes initial severity determination within 1 hour

### Assessment Phase (4-24 hours)

1. Determine scope: which tenants, how many users, which data categories affected
2. Determine whether DPA notification is required (72-hour clock starts from awareness)
3. Determine whether data subject notification is required
4. Document in this register

### Notification Phase (24-72 hours)

1. If DPA notification required: Submit to competent supervisory authority using their online form
2. If user notification required: Draft notification with: what happened, what data, what risk, what to do
3. Notify affected Controller(s) under DPA obligations (Art.28(3)(f))

### Remediation and Review

1. Complete technical remediation
2. Root cause analysis (within 5 business days)
3. Update security controls to prevent recurrence
4. Post-incident review with engineering and DPO
5. Update this register with status: Closed

---

## Annual Review

This register must be reviewed annually by the DPO to:

- Verify all entries are complete and accurate
- Identify patterns or recurring root causes requiring systemic remediation
- Confirm supervisory authority notifications were made correctly
- Archive closed entries older than 3 years to secure storage
- Update breach response procedures if gaps were identified

**Next scheduled review:** 2027-02-22

---

## Supervisory Authority Contact Details

| Jurisdiction                        | Authority                             | Contact                                  |
| ----------------------------------- | ------------------------------------- | ---------------------------------------- |
| Ireland (lead SA for EU operations) | Data Protection Commission (DPC)      | www.dataprotection.ie / +353 57 868 4800 |
| UK                                  | Information Commissioner Office (ICO) | ico.org.uk / 0303 123 1113               |
| Germany                             | Relevant Landesbehoerde (per state)   | bfdi.bund.de                             |
| France                              | CNIL                                  | cnil.fr                                  |

---

_EduSphere Breach Register v1.0 - 2026-02-22 - Owner: dpo@edusphere.dev - Review: Annual_
