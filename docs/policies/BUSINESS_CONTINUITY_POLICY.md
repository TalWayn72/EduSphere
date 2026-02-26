# Business Continuity Policy

**Document ID:** POL-005
**Version:** 1.0
**Classification:** Internal
**Owner:** CTO
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**SOC2 Trust Service Criteria:** A1.1, A1.2, A1.3

---

## 1. Purpose

Ensure EduSphere can continue serving 100,000+ concurrent users and recover from major disruptions within defined Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO).

## 2. Recovery Objectives

| Service Tier            | RTO      | RPO        | Examples                                          |
| ----------------------- | -------- | ---------- | ------------------------------------------------- |
| **Tier 1 — Critical**   | 1 hour   | 15 minutes | Authentication (Keycloak), Gateway, Core subgraph |
| **Tier 2 — Important**  | 4 hours  | 1 hour     | Content, Annotation, Collaboration subgraphs      |
| **Tier 3 — Standard**   | 8 hours  | 4 hours    | Agent subgraph, Knowledge subgraph, Analytics     |
| **Tier 4 — Deferrable** | 24 hours | 24 hours   | Transcription worker, Email notifications         |

## 3. Business Impact Analysis

### Critical Dependencies

- **PostgreSQL 16 + Apache AGE + pgvector**: Primary data store — all tenants
- **Keycloak**: Authentication — platform unusable without it
- **NATS JetStream**: Async messaging — degraded mode possible without it
- **Hive Gateway**: GraphQL federation — all API calls route through it

### Tolerable Downtime

- Platform unavailability: max 1 hour per incident (99.9% monthly uptime SLA)
- Database unavailability: max 15 minutes (failover to replica)
- Total unplanned downtime per year: <8.76 hours (99.9% SLA)

## 4. Backup Strategy

### Database Backups

| Type                 | Frequency                | Retention  | Storage         |
| -------------------- | ------------------------ | ---------- | --------------- |
| Full backup          | Daily at 02:00 UTC       | 30 days    | S3 cross-region |
| Incremental WAL      | Continuous (streaming)   | 7 days     | S3 same-region  |
| On-demand snapshot   | Before major deployments | 14 days    | S3              |
| Cross-region replica | Real-time streaming      | N/A (live) | EU-WEST-1       |

All backups encrypted with AES-256 using tenant-specific KMS keys.

### Application Artifacts

- Docker images: ECR with multi-region replication (retain last 10 tags per service)
- Helm charts: Git repository + OCI registry backup
- Secrets: HashiCorp Vault with raft storage + S3 backup (encrypted)
- Configuration: GitOps — all config in git; Kubernetes manifests restore from git

## 5. Failover Procedures

### Database Failover (RTO: 5 min)

```bash
# Promote read replica to primary
pg_promote /var/lib/postgresql/data

# Update connection string in all services
kubectl set env deployment --all DATABASE_URL=postgresql://replica-host:5432/edusphere

# Verify replication lag was < 15 seconds at failover
psql -c "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;"
```

### Regional Failover (RTO: 1 hour)

1. DNS failover via Route53 health checks (automatic, <60s)
2. Kubernetes cluster in DR region promoted to primary
3. Database connection updated to DR region replica
4. Smoke tests validate all Tier 1 services operational

### NATS JetStream Failover (RTO: 15 min)

- NATS cluster with 3 nodes (quorum maintained with 2 nodes)
- If cluster loss: restart from last WAL checkpoint
- JetStream streams: `max_age: 7d`, `max_bytes: 10GB` limits prevent OOM

## 6. Disaster Recovery Testing

| Test Type               | Frequency | Success Criteria                                        |
| ----------------------- | --------- | ------------------------------------------------------- |
| Backup restore test     | Monthly   | Full restore completes within RTO                       |
| Regional failover drill | Quarterly | RTO met; no data loss beyond RPO                        |
| Full DR simulation      | Annually  | All Tier 1 services restored; tenant isolation verified |
| Table-top exercise      | Annually  | Team completes incident runbook without reference       |

All DR test results documented in `docs/security/DR_TEST_RESULTS.md`.

## 7. Communication Plan

| Audience          | Channel                            | Trigger           | Owner      |
| ----------------- | ---------------------------------- | ----------------- | ---------- |
| Engineering team  | `#incident-<date>` Slack           | P0/P1 detected    | IC         |
| Executive team    | Email + phone                      | P0 or >1hr outage | CISO       |
| Customers         | Status page (status.edusphere.dev) | >15 min outage    | Comms Lead |
| Regulatory bodies | DPA notification                   | Data breach       | Legal      |

## 8. On-Premises Customers

Customers running EduSphere on-premises are responsible for their own BCP per the agreement in `docs/deployment/AIR_GAPPED_INSTALL.md`. EduSphere provides:

- Backup/restore runbooks
- Offline installer packages with sha256sum verification
- Emergency support SLA per contract

## 9. Related Documents

- [INCIDENT_RESPONSE_POLICY.md](./INCIDENT_RESPONSE_POLICY.md)
- [docs/security/INCIDENT_RESPONSE.md](../security/INCIDENT_RESPONSE.md)
- [docs/deployment/AIR_GAPPED_INSTALL.md](../deployment/AIR_GAPPED_INSTALL.md)
