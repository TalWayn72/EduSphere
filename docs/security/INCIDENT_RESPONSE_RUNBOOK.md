# EduSphere — Incident Response Runbook

**Classification:** Internal — Security Sensitive
**Owner:** Security Team / Platform Engineering
**Last Updated:** February 2026
**Compliance:** GDPR Art. 33–34, ISO 27001 A.16, SOC 2 CC7

---

## 1. Scope and Objectives

This runbook governs the detection, containment, eradication, and notification procedure
for security incidents affecting EduSphere's production platform, including:
- Personal data breaches (GDPR Art. 33 — 72-hour DPA notification obligation)
- Unauthorized access to tenant data
- Service disruptions affecting data integrity
- AI/LLM system misuse (EU AI Act transparency obligations)

---

## 2. Incident Severity Matrix

| Severity | Definition | SLA (Detection → Contain) | GDPR Notification |
|----------|-----------|--------------------------|-------------------|
| **P0 — Critical** | Active data exfiltration, RLS bypass, credential theft | 15 min → 1 h | ✅ Required within 72 h of discovery |
| **P1 — High** | Unauthorized cross-tenant query, PII exposure, service down >1 h | 30 min → 4 h | ✅ Required if ≥1 user affected |
| **P2 — Medium** | Failed auth spike, rate-limit bypass, DoS attempt | 2 h → 24 h | ❌ Document; assess impact |
| **P3 — Low** | Misconfiguration (no data exposure), minor audit gap | 8 h → 72 h | ❌ Internal log only |

---

## 3. Incident Response Phases

### Phase 1 — Detection (0–15 min for P0/P1)

**Automated detection sources:**
- Grafana alerts (CPU, memory, 4xx/5xx rate) → PagerDuty
- NATS dead-letter queue spike → Slack `#alerts-infra`
- PostgreSQL `pg_stat_activity` connection saturation → Grafana alert
- Keycloak brute-force lockout event → Grafana Loki query alert
- TruffleHog CI secret scan failure → GitHub Actions notification
- CodeQL critical finding → GitHub Security tab

**Manual detection:**
- User report to `security@edusphere.io`
- Scheduled audit log review (OPEN_ISSUES.md: F-111 Audit Log Viewer)

**First responder actions:**
1. Acknowledge PagerDuty alert within SLA
2. Open incident Slack channel: `#incident-YYYY-MM-DD-NNN`
3. Record in Breach Register (§7 below): `docs/security/BREACH_REGISTER.md`
4. Assign Incident Commander (on-call engineer)

---

### Phase 2 — Containment

| Threat Type | Containment Action | Command |
|------------|-------------------|---------|
| RLS bypass / cross-tenant query | Block tenant in Keycloak; rotate `app.current_tenant` session | `psql -c "REVOKE CONNECT ON DATABASE edusphere FROM <role>"` |
| Credential compromise | Disable Keycloak user immediately | Keycloak Admin UI → Users → Disable |
| Active exfiltration | Block IP at Traefik level | `kubectl apply -f infrastructure/traefik/ip-block.yaml` |
| JWT secret compromise | Rotate Keycloak realm signing key | Keycloak Admin → Realm Settings → Keys → Generate |
| Database connection pool exhaustion | Kill idle connections | `psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - interval '10 min'"` |
| NATS stream poisoning | Purge affected stream | `nats stream purge EDUSPHERE.AFFECTED_SUBJECT` |
| MinIO data access | Rotate access key | `mc admin user remove myminio affected-user` |

**Isolation checklist:**
- [ ] Affected subgraph scaled to 0 replicas: `kubectl scale deployment <name> --replicas=0`
- [ ] Database write access suspended for affected tenant
- [ ] WAF rules updated to block attack vector
- [ ] CORS restricted to known origins only

---

### Phase 3 — Evidence Collection

**Preserve before any changes:**

```bash
# PostgreSQL — query logs and active connections
psql -c "\COPY (SELECT * FROM pg_stat_activity) TO '/tmp/pg_activity_$(date +%s).csv' CSV HEADER"
psql -c "\COPY (SELECT * FROM audit_log WHERE created_at > NOW() - interval '24 h') TO '/tmp/audit_$(date +%s).csv' CSV HEADER"

# NATS — stream state snapshot
nats stream info EDUSPHERE.CONTENT.CREATED > /tmp/nats_stream_$(date +%s).txt
nats stream info EDUSPHERE.ANNOTATION.ADDED >> /tmp/nats_stream_$(date +%s).txt

# Kubernetes — pod logs (24h window)
kubectl logs -l app=subgraph-core --since=24h > /tmp/core_logs_$(date +%s).txt
kubectl logs -l app=gateway --since=24h > /tmp/gateway_logs_$(date +%s).txt

# Grafana Loki — export to JSON
# Dashboard: Explore → Loki → {job="edusphere"} → Export
```

**Chain of custody:** Store all evidence in `s3://edusphere-incident-evidence/<incident-id>/`
with object lock enabled. Never modify original evidence files.

---

### Phase 4 — Eradication and Recovery

1. **Root cause analysis** — Use 5-Whys methodology; document in `#incident-YYYY-MM-DD-NNN`
2. **Patch** — Apply fix in isolated branch; fast-track PR review (2 approvers minimum)
3. **Validate** — Run full security test suite: `pnpm test:security && pnpm test:rls`
4. **Restore** — Scale services back: `kubectl scale deployment <name> --replicas=3`
5. **Verify** — Health check: `./scripts/health-check.sh`
6. **Monitor** — 48-hour enhanced monitoring in Grafana after recovery

---

### Phase 5 — GDPR Notification (72-hour obligation)

**Triggered when:** Any personal data breach (GDPR Art. 4 §12) at P0 or P1 severity.

**72-hour clock starts:** At the moment the processor/controller has "reasonable certainty"
of the breach — not necessarily full scope assessment.

#### 5a. DPA Notification (Art. 33)

Notify the lead supervisory authority (Israel Privacy Protection Authority / EU lead DPA
for multi-national tenants) within **72 hours** using the template below.

File saved at: `docs/security/DPA_NOTIFICATION_TEMPLATE.md`

Minimum required content:
- Nature of the breach (categories + approximate number of data subjects)
- Name and contact details of Data Protection Officer
- Likely consequences of the breach
- Measures taken / proposed to address the breach and mitigate its effects

**Filing method:** Israel: `https://www.gov.il/en/departments/topics/privacy_protection/govil-landing-page`
EU GDPR: Lead DPA filing portal of the member state where the controller is established.

#### 5b. Data Subject Notification (Art. 34)

**Required when:** Breach "likely to result in a high risk to the rights and freedoms"
of natural persons. Criteria:
- Unencrypted PII exposed (name, email, annotation content)
- Financial data exposure
- Sensitive categories (health, religion — applicable to EduSphere Torah content context)
- Large-scale (>1,000 data subjects)

**Method:** Email to affected users via `notifications@edusphere.io`
**Timing:** "Without undue delay" (no hard deadline, but best practice: 72 h after Art. 33)

**Template:** `docs/security/DATA_SUBJECT_NOTIFICATION_TEMPLATE.md`

---

### Phase 6 — Post-Incident Review

Within **5 business days** of incident closure:

1. **Post-mortem document** created in `docs/security/postmortems/YYYY-MM-DD-TITLE.md`
2. **Breach Register updated** (§7)
3. **Corrective actions** added to OPEN_ISSUES.md with priority and owner
4. **Security controls reviewed** — identify gaps that allowed the incident
5. **Runbook updated** — incorporate lessons learned into this document

---

## 4. Communication Matrix

| Audience | Channel | Trigger | Owner |
|---------|---------|---------|-------|
| Internal responders | `#incident-YYYY-MM-DD-NNN` (Slack) | P0/P1/P2 | Incident Commander |
| Engineering leadership | Direct message + email | P0/P1 | Incident Commander |
| Customer (tenant admins) | Email via `support@edusphere.io` | P0/P1 affecting their data | DPO |
| All affected users | Email via `notifications@edusphere.io` | Art. 34 trigger | DPO |
| DPA / Supervisory authority | Official portal | Art. 33 trigger (P0/P1) | DPO |
| Status page (`status.edusphere.io`) | Status page update | P0 (service disruption) | Platform team |

---

## 5. Automated Breach Detection (Grafana Alerts)

The following Grafana alert rules implement automated early detection.
Import from `infrastructure/monitoring/grafana/dashboards/security-alerts.json`.

| Alert Name | PromQL / Loki Query | Threshold | Channel |
|-----------|---------------------|-----------|---------|
| `RLSPolicyViolation` | `count(log_line \|= "RLS policy violation")` | >0 in 5 min | PagerDuty P0 |
| `JWTValidationSpike` | `rate(jwt_validation_failed_total[5m])` | >50/s | Slack #alerts |
| `CrossTenantQuery` | `count(log_line \|= "cross-tenant")` | >0 in 1 min | PagerDuty P0 |
| `UnusualDataVolume` | `rate(http_response_size_bytes_sum[5m])` | >10× baseline | Slack #alerts |
| `DatabaseConnectionExhaustion` | `pg_stat_activity_count > 90` (of pool max) | >90% | PagerDuty P1 |
| `KeycloakBruteForce` | Loki: `\|= "account is temporarily disabled"` | >10 in 1 min | Slack #alerts |
| `AdminPrivilegeEscalation` | Loki: `\|= "role=SUPER_ADMIN" \|= "changed"` | Any | PagerDuty P1 |

**PagerDuty integration:** Configure in `infrastructure/monitoring/alertmanager/alertmanager.yml`
under the `pagerduty` receiver block.

---

## 6. Key Contacts

| Role | Responsibility | Contact |
|------|---------------|---------|
| Data Protection Officer (DPO) | GDPR compliance, DPA notification | `dpo@edusphere.io` |
| Security Lead | Technical response, forensics | `security@edusphere.io` |
| Platform On-Call | Infrastructure containment | PagerDuty rotation |
| Legal Counsel | DPA communication, regulatory advice | `legal@edusphere.io` |
| Tenant Emergency Contact | Per-tenant data breach notification | Tenant admin email (from DB) |

**External resources:**
- Israel PPA: `https://www.gov.il/en/departments/topics/privacy_protection/`
- CISA (if applicable): `https://www.cisa.gov/report`
- HaveIBeenPwned notification: `https://haveibeenpwned.com/API/v3`

---

## 7. Breach Register

The Breach Register is maintained at `docs/security/BREACH_REGISTER.md`.

Minimum fields per entry:

| Field | Required |
|-------|---------|
| Incident ID | Yes |
| Date discovered | Yes |
| Date contained | Yes |
| Nature of breach | Yes |
| Categories of data affected | Yes |
| Approx. number of data subjects | Yes |
| Severity (P0–P3) | Yes |
| Art. 33 notification sent? | Yes |
| Art. 34 notification sent? | Yes |
| Root cause | Yes |
| Corrective action | Yes |

---

## 8. Testing and Maintenance

| Activity | Frequency | Owner |
|---------|-----------|-------|
| Tabletop exercise (simulated breach scenario) | Annually | Security Lead |
| Runbook review and update | After every incident + annually | Security Lead |
| Breach Register audit | Quarterly | DPO |
| PagerDuty escalation test | Monthly | Platform On-Call |
| Grafana alert validation | Monthly | Platform team |
| GDPR notification template review | Annually | DPO + Legal |

---

*This document fulfills G-18 (Incident Response Procedure) and supports GDPR Art. 33–34
compliance. See also: `docs/security/SUBPROCESSORS.md`, `docs/security/PROCESSING_ACTIVITIES.md`.*
