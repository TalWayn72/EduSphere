# EduSphere — Incident Response Procedure
**Version:** 1.0  
**Owner:** Security Engineering  
**Review cycle:** Quarterly  
**Standards:** GDPR Art.33-34, SOC 2 CC7.3-7.4  

---

## 1. SCOPE

This procedure applies to all security incidents affecting EduSphere infrastructure, including:
- Unauthorized access to tenant data or personal information
- Ransomware, malware, or destructive attack
- Credential compromise (admin, service account, API key)
- Data exfiltration (intentional or accidental)
- Availability incidents affecting >1,000 users for >30 minutes
- Vendor/supply-chain compromise

---

## 2. ROLES & RESPONSIBILITIES

| Role | Responsibility | On-Call |
|------|---------------|---------|
| **Incident Commander (IC)** | Overall coordination, external comms | Security lead |
| **Tech Lead** | Root cause analysis, remediation | On-call engineer |
| **DPO (Data Protection Officer)** | GDPR notification decisions | Legal/DPO team |
| **Communications Lead** | Internal + customer comms | Product/Support |

---

## 3. SEVERITY CLASSIFICATION

| Level | Criteria | Max Response Time | Max Notification Time |
|-------|----------|------------------|-----------------------|
| 🔴 **P0 — Critical** | Personal data confirmed exposed; system-wide breach | 15 min | GDPR: 72h DPA; <24h affected tenants |
| 🟠 **P1 — High** | Suspected data access; significant availability impact | 1 hour | 24h internal; 48h tenants if confirmed |
| 🟡 **P2 — Medium** | Anomalous activity; limited impact | 4 hours | 72h if escalates to P0/P1 |
| 🟢 **P3 — Low** | Minor policy violation; no data impact | 24 hours | N/A |

---

## 4. INCIDENT RESPONSE TIMELINE

### Phase 1 — Detection & Triage (0:00 to 0:15)

**Sources:** Wazuh alert | Falco alert | User report | Monitoring alert | Third-party notification

Actions:
1. Assign Incident Commander immediately
2. Open dedicated incident channel: `#incident-YYYY-MM-DD-N`
3. Create incident ticket with timestamp, source, initial description
4. Determine: Is personal data involved? → **GDPR clock starts if YES**
5. Assign severity level P0–P3

**DO NOT** remediate before preserving evidence (see Phase 2).

---

### Phase 2 — Containment & Evidence (0:15 to 4:00)

**Evidence preservation (BEFORE any remediation):**
```bash
# Preserve logs to tamper-evident storage before touching affected systems
kubectl logs -l app=subgraph-core --since=24h > /incident/$(date +%Y%m%d)/core.log
kubectl logs -l app=gateway --since=24h > /incident/$(date +%Y%m%d)/gateway.log

# Export PostgreSQL audit log for the affected time window
psql $DATABASE_URL -c "
  COPY (SELECT * FROM audit_log WHERE created_at >= NOW() - INTERVAL '24 hours')
  TO '/incident/$(date +%Y%m%d)/audit_log.csv' CSV HEADER;
"

# Export Wazuh alerts
curl -k -u admin:$WAZUH_PASSWORD \
  "https://wazuh-manager:55000/alerts?q=timestamp>$(date -d '24 hours ago' +%Y-%m-%dT%H:%M:%S)" \
  > /incident/$(date +%Y%m%d)/wazuh-alerts.json
```

**Containment actions (severity-dependent):**
```bash
# P0: Isolate affected namespace immediately
kubectl cordon <node-name>
kubectl drain <node-name> --ignore-daemonsets

# Revoke compromised credentials (Keycloak)
# kcadm.sh update users/<user-id> -r <realm> -s enabled=false

# Rotate affected API keys/secrets (OpenBao)
# bao lease revoke -prefix aws/creds/
```

---

### Phase 3 — Notification (4:00 to 72:00)

#### GDPR Article 33 — Supervisory Authority Notification (within 72 hours)

**Required information for DPA notification:**
- Nature of the breach (accidental/unauthorized disclosure/alteration/destruction)
- Categories and approximate number of affected data subjects
- Categories and approximate number of affected records  
- Name and contact details of Data Protection Officer
- Likely consequences of the breach
- Measures taken or proposed to address the breach

**Supervisory Authorities by tenant region:**
| Region | Authority | Contact |
|--------|-----------|---------|
| Germany | Bundesbeauftragter für den Datenschutz (BfDI) | https://www.bfdi.bund.de |
| France | Commission Nationale de l'Informatique et des Libertés (CNIL) | https://www.cnil.fr |
| Ireland | Data Protection Commission (DPC) | https://www.dataprotection.ie |
| Netherlands | Autoriteit Persoonsgegevens (AP) | https://www.autoriteitpersoonsgegevens.nl |

#### GDPR Article 34 — User Notification (if high risk)

Notify affected users if the breach is likely to result in high risk to their rights:
- Identity theft or fraud risk
- Financial loss risk
- Significant social harm (especially for minors)

**Notification template available at:** `docs/templates/breach-notification-email.md`

#### Tenant Notification (contractual obligation)

Notify affected tenants (ORG_ADMIN) within **24 hours** of confirmed P0/P1 incident via:
1. Email to tenant's registered DPO/admin contact
2. In-platform notification (system banner)
3. Dedicated status page update

---

### Phase 4 — Eradication & Recovery (after containment)

1. **Root cause identified and patched** — deploy fix to production
2. **Credentials rotated** — all potentially compromised secrets replaced
3. **Monitoring enhanced** — new detection rule added to Wazuh/Falco
4. **Access restored** — lift isolation/quarantine in phases, verify system integrity

**Recovery checklist:**
- [ ] Root cause confirmed and patch deployed
- [ ] All affected credentials rotated in OpenBao
- [ ] Affected tenant data integrity verified (checksums, audit log review)
- [ ] Wazuh/Falco rules updated to detect recurrence
- [ ] System restored to normal operations
- [ ] Monitoring confirmed healthy

---

### Phase 5 — Post-Incident (within 7 days)

**Required deliverables:**
1. **Root Cause Analysis (RCA)** — 5-Why analysis, timeline, contributing factors
2. **Action items** — each with owner, due date, severity
3. **SOC 2 evidence package** — filed for auditor review (CC7.4)
4. **GDPR documentation** — Article 33/34 notification copies archived
5. **Lessons learned** — distributed to engineering team

---

## 5. AUTOMATED DETECTION SOURCES

| Source | Tool | Alert Channel |
|--------|------|---------------|
| Cross-tenant RLS violation | Wazuh rule 100001 | `#security-alerts` |
| Mass data export (>100 records) | Wazuh rule 100002 | `#security-alerts` |
| Authentication brute force | Wazuh rule 100003 | `#security-alerts` |
| Unexpected container outbound | Falco | `#security-alerts` |
| Direct DB access bypass | Falco | `#security-alerts` |
| Failed login spike | Keycloak + Wazuh | `#security-alerts` |
| pgAudit: SELECT on PII tables | pgAudit + Wazuh | `#audit-log` |

---

## 6. CONTACT LIST

| Role | Name | Email | Phone |
|------|------|-------|-------|
| DPO | TBD — appoint before EU market entry | dpo@edusphere.io | — |
| Security Lead | TBD | security@edusphere.io | — |
| Legal Counsel | TBD | legal@edusphere.io | — |

> **Action required:** Appoint a named DPO before GDPR compliance audit.

---

## 7. EVIDENCE RETENTION

All incident artifacts must be retained for **7 years** (SOC 2 CC7.4):
- Incident tickets and communications
- Evidence packages (logs, audit exports)
- Notification copies (DPA, user, tenant)
- RCA documents
- Remediation records

Stored in: `s3://edusphere-incident-archives/<YYYY>/<incident-id>/`

---

## APPENDIX: Quick Reference Card

```
BREACH DETECTED → Assign IC → #incident channel → GDPR clock? → P0-P3?
                                                         ↓ YES
                                              72h to notify DPA (Art.33)
                                              24h to notify affected tenants
                                              Notify users if high risk (Art.34)

PRESERVE EVIDENCE FIRST → then CONTAIN → then REMEDIATE
```
