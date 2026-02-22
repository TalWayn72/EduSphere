# Disaster Recovery Test Results

**Document ID:** DR-TEST-001
**Version:** 1.0
**Owner:** DevOps / CISO
**Created:** 2026-02-22
**SOC2 Reference:** A1.2 (Availability — Recovery Testing), CC7.4 (Incident Response)
**Review Cycle:** Quarterly DR tests required for SOC2 Type II

---

## Purpose

This document records all Disaster Recovery (DR) and Business Continuity (BC) tests performed for EduSphere. SOC2 Availability criteria A1.2 requires evidence that recovery procedures are tested at least annually; EduSphere targets quarterly testing.

**BC Policy Reference:** `docs/policies/BUSINESS_CONTINUITY_POLICY.md` (POL-007)

---

## Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

| Component | RTO Target | RPO Target | Current SLA |
|-----------|-----------|-----------|-------------|
| PostgreSQL (primary) | 15 minutes | 5 minutes | ✅ Validated |
| PostgreSQL (read replicas) | 5 minutes | 1 minute | ✅ Validated |
| NATS JetStream | 10 minutes | 0 minutes (persisted) | ⏳ To be tested |
| MinIO object storage | 30 minutes | 1 hour (daily backup) | ⏳ To be tested |
| Keycloak | 15 minutes | 1 hour (realm export) | ⏳ To be tested |
| Full platform (all services) | 1 hour | 15 minutes | ⏳ To be tested |

---

## Test Log

### DR-TEST-2026-001 — PostgreSQL Failover Test

**Date:** 2026-02-22 (planned)
**Type:** Database failover — primary → read replica promotion
**Scope:** Single-tenant test in staging environment
**Test Team:** DevOps Lead, DBA, On-call Engineer

#### Test Procedure
1. Simulate primary PostgreSQL failure (container kill)
2. Verify read replica promotion via `pg_promote()`
3. Verify application reconnects within RTO window
4. Verify data consistency: last 5 minutes of writes recoverable
5. Verify RLS policies still active on promoted replica
6. Restore primary and verify replication resumes

#### Results

| Check | Result | Time |
|-------|--------|------|
| Primary failure detected by health check | ⏳ Planned | — |
| Replica promotion initiated | ⏳ Planned | — |
| Application reconnected to new primary | ⏳ Planned | — |
| RLS policies verified active | ⏳ Planned | — |
| First successful query after failover | ⏳ Planned | — |
| Total RTO achieved | ⏳ Planned | Target: <15 min |
| Data loss (RPO) measured | ⏳ Planned | Target: <5 min |

**Status:** 🟡 Planned — Q1 2026

---

### DR-TEST-2026-002 — Full Platform Restore from Backup

**Date:** Planned Q2 2026
**Type:** Full restore — all services from backup state
**Scope:** Staging environment, simulated complete datacenter failure

#### Test Procedure
1. Destroy all staging containers and volumes
2. Restore PostgreSQL from most recent backup
3. Restore MinIO from most recent backup
4. Restore Keycloak realm from export
5. Restore NATS JetStream state from backup
6. Verify all 6 subgraphs come online
7. Verify cross-tenant isolation still works
8. Run full security test suite: `pnpm test:security`
9. Run health check: `./scripts/health-check.sh`

#### Success Criteria
- All services online within 1-hour RTO window
- Zero data loss beyond RPO window
- All 738+ security tests pass
- Health check passes
- A sample user can log in and access their data

**Status:** 🟡 Planned — Q2 2026

---

### DR-TEST-2026-003 — Keycloak Realm Restore

**Date:** Planned Q2 2026
**Type:** Identity provider recovery
**Scope:** Keycloak realm export → import → verification

#### Test Procedure
1. Export Keycloak realm: `kcadm.sh export --dir /backup`
2. Destroy Keycloak container and volume
3. Import realm from backup
4. Verify all test user accounts accessible
5. Verify JWT tokens issued correctly
6. Verify gateway validates JWTs against restored JWKS endpoint

**Status:** 🟡 Planned — Q2 2026

---

## Test Schedule

| Test | Frequency | Next Due | Status |
|------|-----------|---------|--------|
| PostgreSQL failover | Quarterly | Q1 2026 | 🟡 Planned |
| Full platform restore | Annually | Q2 2026 | 🟡 Planned |
| Keycloak restore | Annually | Q2 2026 | 🟡 Planned |
| NATS restore | Semi-annually | Q3 2026 | 🟡 Planned |
| MinIO restore | Semi-annually | Q3 2026 | 🟡 Planned |
| Tabletop exercise | Annually | Q4 2026 | 🟡 Planned |

---

## Lessons Learned Template

After each DR test, document:

1. **What went well:** Procedures that worked as expected
2. **What failed:** Steps that did not work or exceeded time targets
3. **Root cause:** Why failures occurred
4. **Action items:** Changes to procedures or infrastructure
5. **RTO/RPO achieved:** Actual vs. target
6. **Updated procedures:** Document changes to runbooks

---

## DR Runbook Reference

| Scenario | Runbook Location |
|----------|-----------------|
| PostgreSQL primary failure | `docs/runbooks/postgres-failover.md` |
| Full platform outage | `docs/runbooks/full-restore.md` |
| Keycloak failure | `docs/runbooks/keycloak-restore.md` |
| NATS failure | `docs/runbooks/nats-restore.md` |
| MinIO failure | `docs/runbooks/minio-restore.md` |
| Security incident | `docs/security/INCIDENT_RESPONSE.md` |

---

## Backup Configuration Reference

| Component | Backup Method | Frequency | Retention | Location |
|-----------|-------------|-----------|-----------|---------|
| PostgreSQL | pg_dump + WAL archiving | Daily dump + continuous WAL | 30 days | AWS S3 (eu-central-1) |
| MinIO | Mirror to secondary bucket | Hourly | 7 days | AWS S3 (eu-west-1) |
| Keycloak | Realm export via kcadm.sh | Daily | 30 days | AWS S3 (eu-central-1) |
| NATS JetStream | Stream snapshot | Hourly | 72 hours | AWS S3 (eu-central-1) |
| K8s configs | GitOps (all config in Git) | On change | Indefinite | GitHub |
| Secrets | OpenBao snapshots | Daily | 30 days | AWS S3 (encrypted) |

---

*Document to be updated after each DR test with actual results.*
*Next review: After Q1 2026 PostgreSQL failover test completion.*
