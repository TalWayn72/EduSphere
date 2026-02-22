# Legitimate Interest Assessment — Security Monitoring & Audit Logging

**Document ID:** LIA-001
**Version:** 1.0
**Owner:** DPO / CISO
**Created:** 2026-02-22
**Next Review:** 2027-02-22
**GDPR Reference:** Article 6(1)(f) — Legitimate Interests
**SOC2 Reference:** CC7.1, CC7.2, CC7.3

---

## Purpose

This Legitimate Interest Assessment (LIA) justifies EduSphere's processing of personal data for **security monitoring and audit logging** under GDPR Article 6(1)(f). We apply the three-part test required by EU data protection authorities.

---

## Part 1 — Purpose Test: Is There a Legitimate Interest?

### 1.1 The Processing Activity

EduSphere logs the following events in the `audit_log` table:
- User authentication events (login, logout, failed attempts)
- GraphQL mutation operations (CREATE, UPDATE, DELETE on sensitive resources)
- Data export requests (Article 20 portability)
- Data erasure requests (Article 17 right to erasure)
- Administrative actions by ORG_ADMIN and SUPER_ADMIN roles
- Cross-tenant access attempts (security violations)
- Rate-limit violations

### 1.2 The Legitimate Interest Identified

**Primary interests:**
1. **IT security and fraud prevention** — Detecting unauthorized access, data breaches, and account takeover attacks before they cause harm to users and tenants.
2. **Legal compliance obligation** — SOC 2 Type II requires CC7.1 (monitoring), CC7.2 (anomaly detection), CC7.3 (incident evaluation). Enterprise clients contractually require audit trail evidence.
3. **Breach notification preparedness** — GDPR Article 33 requires notification within 72 hours of breach discovery. Without audit logs, the scope of a breach cannot be determined accurately.
4. **Accountability to data subjects** — Audit logs enable us to demonstrate to regulators and users that personal data was processed lawfully (Article 5(2) accountability principle).

### 1.3 Assessment

The interest is **legitimate**. It reflects the genuine, pressing security needs of a multi-tenant educational platform processing sensitive PII for over 100,000 users across multiple jurisdictions. The EDPB and national DPAs (including the German BfDI and French CNIL) recognize security monitoring as a valid legitimate interest.

**Conclusion for Part 1: ✅ PASS — Legitimate interest established**

---

## Part 2 — Necessity Test: Is the Processing Necessary?

### 2.1 Could the objective be achieved without processing personal data?

**No.** Security monitoring without any personal data linkage would:
- Make it impossible to attribute suspicious actions to specific accounts
- Prevent detection of account takeover (attacker using legitimate credentials)
- Prevent breach scope assessment (which users' data was accessed)
- Make the audit trail inadmissible as evidence (no data subject linkage)

### 2.2 Could less personal data achieve the same objective?

We apply data minimization strictly:

| Data Element | Justification for Inclusion |
|-------------|---------------------------|
| `user_id` (UUID) | Required to detect per-account anomalies and link to breach scope |
| `tenant_id` (UUID) | Required for cross-tenant breach detection and tenant-scoped incident response |
| `action` (string) | Required to understand what operation was performed |
| `resource_type` | Required to determine breach scope (which data category was affected) |
| `ip_address` | Required for geographic anomaly detection and law enforcement disclosure |
| `user_agent` | Required to detect credential stuffing from bots |
| `status` (SUCCESS/FAILED) | Required to detect brute-force attacks |
| `created_at` | Required for timeline reconstruction during incidents |

**Not included** (excluded by design):
- `old_values` / `new_values` content beyond resource type — only stored for SUPER_ADMIN operations
- Full request bodies or response payloads
- User passwords, session tokens, or JWT content

### 2.3 Assessment

The processing is **necessary**. Every field retained has a specific security purpose. Fields not needed for security monitoring are excluded.

**Conclusion for Part 2: ✅ PASS — Necessary and proportionate**

---

## Part 3 — Balancing Test: Do Individual Interests Override?

### 3.1 Nature of the Data

The audit log contains pseudonymized identifiers (UUIDs, not names or emails). IP addresses are potentially personally identifiable. The sensitivity is **medium** — less sensitive than health or financial data, but requires care.

### 3.2 Reasonable Expectation

Users of an enterprise educational platform:
- Operate under an employment or educational relationship with the tenant organization
- Sign Terms of Service that reference security monitoring
- Have a reasonable expectation that their actions within a corporate/educational system are logged for security purposes
- Benefit directly from the security monitoring (their own accounts are protected)

Users do **not** expect:
- Their search terms or content to be logged (excluded)
- Audit logs to be used for performance monitoring or behavioral profiling (prohibited)

### 3.3 Safeguards Applied

| Safeguard | Implementation |
|-----------|---------------|
| Access control | Audit log accessible only to SUPER_ADMIN and ORG_ADMIN (own tenant) via RLS |
| Retention limit | Audit logs retained 7 years (SOC2 requirement), then hard-deleted |
| No profiling | Logs used only for security and compliance — not HR or performance monitoring |
| Data minimization | Only necessary fields logged (see Section 2.2) |
| Encryption | Audit log stored in encrypted PostgreSQL volume (AES-256-XTS) |
| User notification | Privacy Policy (Section 4) informs users of audit logging |
| Right of access | Users can request their audit log via Article 20 data export |

### 3.4 Impact on Data Subjects

| Impact Category | Assessment |
|----------------|-----------|
| Likelihood of harm | Low — logs are not shared externally; no marketing use |
| Severity if misused | Medium — potential chilling effect on user behavior |
| Mitigation | Strict access controls, retention limits, prohibition on secondary use |
| Net benefit to users | High — protects their accounts from unauthorized access |

### 3.5 Assessment

The security monitoring purpose **outweighs** individual privacy interests, given:
1. The data is pseudonymized (UUID-based, not name-based)
2. Users have reasonable expectation of monitoring in enterprise/educational contexts
3. Strong safeguards prevent misuse
4. Users benefit directly from the monitoring
5. The EDPB explicitly recognizes IT security as a legitimate interest (EDPB Guidelines 01/2024 on Article 6(1)(f))

**Conclusion for Part 3: ✅ PASS — Interests do not override**

---

## Overall Conclusion

| Test | Result |
|------|--------|
| Purpose Test | ✅ PASS |
| Necessity Test | ✅ PASS |
| Balancing Test | ✅ PASS |

**Processing legal basis: GDPR Article 6(1)(f) — Legitimate Interests ✅**

---

## Right to Object

Under GDPR Article 21, data subjects have the right to object to processing under Article 6(1)(f). However, EduSphere may override objections where we demonstrate **compelling legitimate grounds** that override individual interests — specifically:

- Active security incidents require audit trail integrity
- Legal obligations (SOC 2 audit requirements) mandate log retention
- An objection that results in log deletion could constitute spoliation of evidence in an ongoing breach investigation

Data subjects wishing to exercise Article 21 rights should contact **privacy@edusphere.io**. Each request will be assessed individually.

---

## Review Schedule

This LIA must be reviewed:
- Annually (next review: 2027-02-22)
- When the scope of audit logging changes materially
- When a relevant regulatory decision or EDPB guideline is published
- Following any security incident that involves audit log data

---

*Reviewed and approved by: DPO | CISO | Legal Counsel*
*Approval date: 2026-02-22*
