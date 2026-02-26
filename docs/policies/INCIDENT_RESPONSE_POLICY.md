# Incident Response Policy

**Document ID:** POL-004
**Version:** 1.0
**Classification:** Internal
**Owner:** CISO
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**SOC2 Trust Service Criteria:** CC7.3, CC7.4, CC7.5

---

## 1. Purpose

Establish a structured approach for detecting, containing, and recovering from security incidents affecting EduSphere systems or customer data, including mandatory GDPR breach notifications.

## 2. Scope

All security incidents affecting EduSphere's production environment, customer data, or organizational systems, including:

- Data breaches (unauthorized access to customer PII)
- System compromises (malware, unauthorized access)
- Service disruptions caused by security events
- Insider threats
- Third-party/subprocessor incidents affecting EduSphere data

## 3. Incident Severity Classification

| Severity          | Definition                                    | Response SLA                     | Examples                                      |
| ----------------- | --------------------------------------------- | -------------------------------- | --------------------------------------------- |
| **P0 — Critical** | Active breach, data exfiltration, full outage | 15 min acknowledge; 2 hr contain | Cross-tenant data leak, production ransomware |
| **P1 — High**     | Partial breach, service degraded              | 1 hr acknowledge; 8 hr contain   | Single-tenant compromise, credential theft    |
| **P2 — Medium**   | Suspicious activity, limited impact           | 4 hr acknowledge; 24 hr contain  | Brute-force attack, unusual API patterns      |
| **P3 — Low**      | Policy violation, near-miss                   | 1 business day                   | Failed SSL cert, expired credentials          |

## 4. Incident Response Team

| Role                        | Responsibility                          |
| --------------------------- | --------------------------------------- |
| **Incident Commander (IC)** | CISO or delegate — overall coordination |
| **Technical Lead**          | Senior engineer — technical containment |
| **Communications Lead**     | Legal/PR — internal and external comms  |
| **Legal Counsel**           | Regulatory notifications, DPA liaison   |

**On-call pager rotation:** `#security-oncall` Slack channel + PagerDuty escalation policy.

## 5. Incident Response Process

### Phase 1: Detection (0–15 min for P0/P1)

- Wazuh SIEM alert (rules 100001–100008) or manual report
- Falco eBPF runtime alert
- User complaint via support ticket
- Internal security monitoring

### Phase 2: Triage (15–60 min)

- Assign severity (P0–P3)
- Activate Incident Commander
- Open incident Slack channel `#incident-<date>-<slug>`
- Begin evidence preservation (see §6)

### Phase 3: Containment

- Isolate compromised systems (network segmentation, pod deletion)
- Revoke compromised credentials
- Enable enhanced logging
- Block malicious IPs at gateway/WAF level
- Preserve evidence before containment actions alter state

### Phase 4: Eradication

- Remove malicious code or unauthorized access
- Patch exploited vulnerability
- Rotate all potentially exposed credentials
- Validate no persistence mechanisms remain

### Phase 5: Recovery

- Restore systems from clean backup or known-good image
- Re-enable services incrementally with monitoring
- Verify RLS isolation is intact post-recovery
- Post-recovery smoke tests (`./scripts/smoke-test.sh`)

### Phase 6: Post-Incident Review

- Blameless post-mortem within 5 business days
- Root cause documented in `OPEN_ISSUES.md`
- Preventive measures implemented
- Lessons learned shared with Engineering and Security teams

## 6. Evidence Preservation

```bash
# Capture memory dumps and logs BEFORE containment actions
kubectl logs <pod> --previous > incident-$(date +%Y%m%d-%H%M%S).log

# PostgreSQL: capture active sessions
psql -c "SELECT * FROM pg_stat_activity WHERE state != 'idle';"

# Export last 24h audit log
psql -c "SELECT * FROM audit_log WHERE created_at > NOW() - INTERVAL '24 hours';" > audit-$(date +%Y%m%d).csv

# Network capture (if authorized)
tcpdump -w capture-$(date +%Y%m%d-%H%M%S).pcap -i eth0 -c 10000
```

Evidence stored in encrypted S3 bucket `edusphere-incident-evidence` with 7-year retention.

## 7. GDPR Breach Notification (Art.33–34)

**72-hour DPA notification is mandatory** for breaches involving EU resident PII.

### Notification Decision Matrix

| Breach Type                              | Notification Required      | Timeline                             |
| ---------------------------------------- | -------------------------- | ------------------------------------ |
| PII exfiltrated                          | Yes — DPA + affected users | DPA: 72h; Users: without undue delay |
| PII accessed (no exfiltration confirmed) | Yes — DPA                  | DPA: 72h                             |
| Encrypted PII with no key exposure       | No (low risk)              | Document in breach register          |
| No PII involved                          | No                         | Document internally                  |

### DPA Contacts

| Country     | Authority | URL                                       |
| ----------- | --------- | ----------------------------------------- |
| Germany     | BfDI      | https://www.bfdi.bund.de                  |
| France      | CNIL      | https://www.cnil.fr                       |
| Ireland     | DPC       | https://www.dataprotection.ie             |
| Netherlands | AP        | https://www.autoriteitpersoonsgegevens.nl |

**Notification template:** See [INCIDENT_RESPONSE.md](../security/INCIDENT_RESPONSE.md) — §7 DPA Notification Template.

## 8. Wazuh Alert Response Runbook

| Alert Rule              | Description             | Immediate Action                     |
| ----------------------- | ----------------------- | ------------------------------------ |
| 100001 (CRITICAL lvl15) | Cross-tenant access     | Isolate tenant; rotate keys; P0      |
| 100002 (HIGH lvl12)     | Mass data export        | Rate limit; review user; P1          |
| 100003 (MEDIUM lvl10)   | Brute force             | Block IP; check Keycloak lockout; P2 |
| 100007 (HIGH lvl13)     | SUPER_ADMIN creation    | Immediate review; P1                 |
| 100008 (HIGH lvl14)     | Mass consent withdrawal | Preserve logs; P1                    |

## 9. Related Documents

- [docs/security/INCIDENT_RESPONSE.md](../security/INCIDENT_RESPONSE.md) — detailed procedures
- [ACCESS_CONTROL_POLICY.md](./ACCESS_CONTROL_POLICY.md)
- [BUSINESS_CONTINUITY_POLICY.md](./BUSINESS_CONTINUITY_POLICY.md)
- [infrastructure/wazuh/rules/edusphere-breach.xml](../../infrastructure/wazuh/rules/edusphere-breach.xml)
