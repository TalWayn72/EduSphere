# Change Management Policy

**Document ID:** POL-003
**Version:** 1.0
**Classification:** Internal
**Owner:** VP Engineering
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**SOC2 Trust Service Criteria:** CC8.1

---

## 1. Purpose

Ensure that all changes to EduSphere production systems are authorized, tested, and deployed in a controlled manner to minimize risk to availability, confidentiality, and integrity.

## 2. Scope

All changes to:
- Production application code (all 6 subgraphs + gateway + frontend + mobile)
- Infrastructure configuration (Docker, Kubernetes, Helm charts)
- Database schema (Drizzle migrations)
- Security configuration (Keycloak, NATS, RLS policies)
- CI/CD pipeline configuration (GitHub Actions workflows)
- Third-party dependencies (npm packages)

## 3. Change Classification

| Class | Definition | Approval | Deployment |
|-------|-----------|---------|-----------|
| **Emergency** | Production outage or security breach | CISO or CTO verbal + post-hoc ticket | Immediate; rollback plan required |
| **Standard** | Pre-approved recurring change (e.g., dependency patch) | Pre-approved category | Automated via CI/CD |
| **Normal** | All other changes | 1 peer review + QA sign-off | Scheduled deployment window |
| **Major** | Architecture change, new subgraph, breaking schema | Engineering Lead + CISO | Planned with 2-week notice |

## 4. Change Process

### 4.1 Normal Changes

```
Developer → Feature Branch → Pull Request
     ↓
CI/CD Gates (mandatory, blocking):
  ✅ Lint (ESLint + Prettier)
  ✅ TypeScript strict (zero errors)
  ✅ Unit tests >90% coverage (backend), >80% (frontend)
  ✅ Security tests (345+ tests — static analysis)
  ✅ RLS policy tests
  ✅ GraphQL federation composition
  ✅ OWASP Dependency-Check
  ✅ Trivy IaC scan
  ✅ SBOM generation
     ↓
Peer Code Review (1 approver minimum)
     ↓
Merge to main/master
     ↓
Automated deployment (Kubernetes + Helm)
     ↓
Post-deploy smoke tests
```

### 4.2 Database Migrations

- All migrations via Drizzle ORM (`pnpm --filter @edusphere/db generate`)
- Migrations are **additive only** (never drop columns without a deprecation cycle)
- Rollback plan required for all schema changes
- Applied in staging for ≥24 hours before production
- RLS policy changes require full `pnpm test:rls` pass

### 4.3 Security Configuration Changes

Changes to the following require CISO approval:
- Keycloak realm configuration (keycloak-realm.json)
- CORS policy (gateway CORS origin allowlist)
- JWT token lifetimes
- RLS policy definitions
- Encryption key rotation
- Network security groups / firewall rules

### 4.4 Dependency Updates

| Type | Process |
|------|---------|
| Security patch (CVSS ≥7.0) | Emergency process — deploy within 48 hours |
| Minor/patch version | Standard process — deploy in next release |
| Major version | Normal process — assessment + testing + planned deployment |
| New dependency | PR review includes security justification + license check |

## 5. CI/CD Pipeline (Enforcement)

The GitHub Actions CI pipeline is the **technical enforcement mechanism** for this policy:

- **ci.yml**: Lint, typecheck, unit tests, security scan, build, E2E, codegen validation
- **federation.yml**: GraphQL supergraph composition + breaking change detection
- **docker-build.yml**: Container build + Trivy vulnerability scan
- **pr-gate.yml**: PR-level quality gate (required status checks)

No merge to `main`/`master` is possible without all required status checks passing.

## 6. Rollback Policy

Every deployment must have a documented rollback procedure:
- **Application:** Helm rollback (`helm rollback edusphere <revision>`)
- **Database:** Forward-only migration + data migration script for rollback
- **Configuration:** Previous version in git; Helm values rollback

Rollback must be tested in staging before production deployment for Major changes.

## 7. Change Records

All changes are recorded in:
- Git history (immutable, cryptographically signed commits preferred)
- GitHub Actions workflow run logs (retained 90 days; exported to `audit-logs` branch)
- Deployment log in Kubernetes (Helm release history)

## 8. Emergency Changes

1. Immediate action authorized by CISO or CTO
2. Post-hoc ticket created within 2 hours
3. Change reviewed and closed within 5 business days
4. Root cause documented in `OPEN_ISSUES.md`
5. Preventive measures added to prevent recurrence

## 9. Related Documents

- [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md)
- [INCIDENT_RESPONSE_POLICY.md](./INCIDENT_RESPONSE_POLICY.md)
- [docs/security/INCIDENT_RESPONSE.md](../security/INCIDENT_RESPONSE.md)
- `.github/workflows/ci.yml`
- `IMPLEMENTATION_ROADMAP.md`
