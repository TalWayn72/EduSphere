# Legitimate Interest Assessment (LIA) - Security Monitoring and Audit Logging

**Version:** 1.0
**Date:** 2026-02-22
**Legal Basis:** GDPR Article 6(1)(f) - Legitimate Interests
**Data Controller:** EduSphere Technologies Ltd.
**Author:** Data Protection Officer
**Review Cycle:** Annual

---

## 1. Overview

This Legitimate Interest Assessment evaluates whether EduSphere can rely on legitimate interests (GDPR Art.6(1)(f)) as the legal basis for processing personal data in the form of audit logs for the purposes of security monitoring, fraud prevention, and incident response.

**Processing activity:** Audit logging of user actions on the EduSphere platform
**Data processed:** Action type, resource type, resource ID, actor ID, tenant ID, timestamp, IP address (masked to /24 subnet)
**Retention:** 7 years

---

## 2. Purpose Test

### 2.1 Identified Legitimate Interests

| Interest | Description | Stakeholders |
|----------|-------------|-------------|
| Security monitoring | Detect unauthorized access, privilege escalation, data exfiltration attempts | EduSphere, clients, data subjects |
| Fraud prevention | Identify patterns indicative of account takeover or credential misuse | EduSphere, clients |
| Incident response | Reconstruct event timelines to contain and remediate security incidents | EduSphere, clients, supervisory authorities |
| Legal compliance | Demonstrate compliance with GDPR Art.32 (security of processing) and Art.33 (breach notification) | EduSphere, supervisory authorities |
| Contractual obligations | Fulfil DPA obligations to clients (Art.28(3)(c)) by maintaining security records | EduSphere, clients |

### 2.2 Are the Interests Legitimate?

Yes. Security monitoring and fraud prevention are recognized as legitimate interests by:

- GDPR Recital 47: fraud prevention and network security are legitimate interests
- EDPB Guidelines 06/2020 on Legitimate Interests
- Article 29 Working Party Opinion 06/2014 on Legitimate Interests

---

## 3. Necessity Test

### 3.1 Is Processing Necessary for the Identified Purposes?

Audit logging is necessary because:

1. **GDPR Art.32 obligation:** Security of processing requires the ability to detect and investigate security incidents. Audit logs are the primary mechanism for this.
2. **GDPR Art.33 obligation:** EduSphere must notify supervisory authorities of personal data breaches within 72 hours. Audit logs are essential to determine the scope, timing, and nature of any breach.
3. **DPA contractual obligations:** EduSphere DPAs (Art.28(3)(c)) commit to appropriate security measures, which include audit logging.
4. **Incident reconstruction:** Without audit logs, it is impossible to reconstruct the sequence of events following a security incident, making containment and remediation significantly harder.

### 3.2 Alternatives Considered

| Alternative | Assessment |
|-------------|------------|
| No logging | Not viable - would violate GDPR Art.32 and DPA obligations; no incident response capability |
| Aggregate-only logging (counts, not individual events) | Not sufficient - cannot reconstruct specific events or identify which accounts were compromised |
| Short-term logging (30 days) | Not sufficient - regulatory investigations and litigation may require logs from prior periods; standard practice is 1-7 years |
| Pseudonymous actor IDs only (current approach) | This IS the current implementation - actor IDs are internal UUIDs, not names or emails |
| No IP logging | Not viable - IP addresses are essential for detecting unauthorized access from external sources |

**Conclusion:** Audit logging at the current scope is the minimum necessary for the identified purposes. The current implementation already uses pseudonymous actor IDs and /24-masked IP addresses to minimise personal data exposure.

---

## 4. Balancing Test

### 4.1 Nature of Personal Data

| Data Element | Assessment |
|-------------|------------|
| Actor ID | Internal UUID - pseudonymous, not directly identifying |
| Tenant ID | Organizational identifier - no individual impact |
| Action type | Operational category (CREATE/READ/UPDATE/DELETE) - low sensitivity |
| Resource type | Category of data accessed (e.g., COURSE, ANNOTATION) - low sensitivity |
| Resource ID | Internal UUID - pseudonymous |
| IP address (/24 subnet) | Partially masked - identifies network block, not specific device or individual |
| Timestamp | Temporal context - standard technical metadata |

**Assessment:** The data processed is predominantly pseudonymous or low-sensitivity technical metadata. No names, email addresses, passwords, or content data are included in audit logs.

### 4.2 Reasonable Expectations of Data Subjects

Data subjects (students, instructors, administrators) using an institutional educational platform would reasonably expect:

- That their actions on the platform are logged for security and audit purposes
- That the institution (Controller) and platform provider (EduSphere) monitor for unauthorized access
- That logs are retained for a reasonable period to support incident investigation

This expectation is reinforced by EduSphere Privacy Notice disclosures and DPA transparency provisions.

### 4.3 Impact on Data Subjects

| Impact Type | Assessment |
|-------------|------------|
| Surveillance risk | Low - logs are not used for performance monitoring or profiling; access restricted to SUPER_ADMIN |
| Discrimination risk | Minimal - logs contain action types, not content; no inference of personal characteristics |
| Chilling effect | Low - users are informed of logging in privacy notice; logs support security not behavioral control |
| Re-identification risk | Low - actor IDs are internal UUIDs; IP addresses are /24 masked |

### 4.4 Safeguards Applied

To minimise the impact on data subjects, the following safeguards are implemented:

| Safeguard | Implementation |
|----------|---------------|
| Data minimisation | Only action, resource_type, resource_id, actor_id, tenant_id, IP (/24), timestamp - no raw content |
| Pseudonymisation | Actor ID is internal UUID; does not directly identify individuals without cross-reference to user table |
| IP masking | Last octet removed; /24 subnet identifies network block, not specific user device |
| Access restriction | Audit logs accessible only to SUPER_ADMIN role; not accessible to instructors or students |
| No profiling | Audit logs are never used for automated decision-making or profiling of individuals |
| Retention limit | 7-year retention aligned with statutory limitation periods; automated deletion after retention period |
| Transparency | Logging disclosed in platform Privacy Notice and Controller DPA |

---

## 5. Conclusion

**Result: Legitimate Interest applies.**

The balancing test demonstrates that:

1. EduSphere and its clients have genuine legitimate interests in security monitoring and incident response
2. Audit logging is necessary and there are no less privacy-invasive alternatives that would achieve the same purposes
3. The impact on data subjects is low due to pseudonymisation, IP masking, and strict access controls
4. Data subjects have a reasonable expectation that their actions on an institutional platform are logged for security
5. The safeguards applied are proportionate and effective

**Legal basis: GDPR Article 6(1)(f) - Legitimate Interests of the controller or a third party.**

---

## 6. Data Minimisation Specification

The following data fields are logged. No additional fields may be added without a new or updated LIA:

| Field | Type | Purpose | Retention |
|-------|------|---------|----------|
| action | Enum (CREATE/READ/UPDATE/DELETE) | Identify operation type | 7 years |
| resource_type | Enum (COURSE/USER/ANNOTATION/etc.) | Identify resource category | 7 years |
| resource_id | UUID | Identify specific resource | 7 years |
| actor_id | UUID (pseudonymous) | Identify performing account | 7 years |
| tenant_id | UUID | Identify client tenant | 7 years |
| ip_address | /24 subnet only | Network-level source identification | 7 years |
| timestamp | ISO 8601 | Temporal context | 7 years |

**Prohibited additions:** Full IP address, user name, email, session content, request body, response payload.

---

## 7. Review and Approval

| Role | Name | Date |
|------|------|------|
| Data Protection Officer | [DPO_NAME] | 2026-02-22 |
| Next review | - | 2027-02-22 |

*EduSphere LIA - Security Monitoring v1.0 - 2026-02-22 - Contact: dpo@edusphere.dev*