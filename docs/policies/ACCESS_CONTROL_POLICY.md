# Access Control Policy

**Document ID:** POL-002
**Version:** 1.0
**Classification:** Internal
**Owner:** CISO
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**SOC2 Trust Service Criteria:** CC6.1, CC6.2, CC6.3, CC6.6, CC6.7

---

## 1. Purpose

Define access control requirements to ensure that access to EduSphere systems and customer data is granted on a need-to-know, least-privilege basis and revoked promptly when no longer required.

## 2. Scope

All logical and physical access to EduSphere production systems, development environments, CI/CD pipelines, and customer data.

## 3. Access Control Principles

### 3.1 Least Privilege

- Every user and service account receives the minimum permissions required to perform their function
- Database Row-Level Security (RLS) enforces tenant isolation: `SET LOCAL app.current_tenant = '<uuid>'`
- GraphQL directives enforce endpoint authorization: `@authenticated`, `@requiresScopes`, `@requiresRole`

### 3.2 Role-Based Access Control (RBAC)

#### Platform Roles

| Role          | Description               | Access Level                                               |
| ------------- | ------------------------- | ---------------------------------------------------------- |
| `SUPER_ADMIN` | EduSphere operations only | Cross-tenant read, platform config                         |
| `ORG_ADMIN`   | Tenant administrator      | All resources within their tenant                          |
| `INSTRUCTOR`  | Course instructor         | Course content, student progress within courses they teach |
| `STUDENT`     | Enrolled student          | Own data, enrolled course content                          |

#### Internal Roles (Keycloak)

| Role            | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| `security-team` | Security tooling, audit logs, vulnerability reports          |
| `sre-team`      | Infrastructure, monitoring, incident response                |
| `developer`     | Code repositories, staging environments (no production data) |
| `read-only`     | Read-only access to non-PII logs and metrics                 |

### 3.3 Multi-Factor Authentication (MFA)

MFA is **mandatory** for:

- All EduSphere staff (Google Workspace, GitHub, AWS)
- All Keycloak administrator accounts
- All production system access (SSH, Kubernetes)
- Any account with access to RESTRICTED data

MFA is **strongly recommended** for:

- All platform users (OrgAdmin and above enforce MFA via Keycloak policy)
- Tenant administrators

### 3.4 Privileged Access Management

- Production database access requires temporary credentials via Vault (max 1-hour TTL)
- `kubectl exec` into production pods requires approval in `#sre-approvals` Slack channel
- No standing `SUPER_ADMIN` sessions — elevation is time-limited and logged
- All privileged actions are logged to the audit log with `ip_address`, `user_agent`, `action`

## 4. Access Lifecycle

### 4.1 Provisioning

- Access requests submitted via IT ticketing system with manager approval
- New staff accounts provisioned within 1 business day of start date
- Principle of least privilege applied from day one

### 4.2 Review

- Access reviews conducted quarterly for all privileged accounts
- Annual access review for all staff accounts
- Automated de-provisioning for accounts inactive >90 days

### 4.3 Revocation

- Accounts disabled **immediately** upon termination notification
- Accounts disabled within **4 hours** for involuntary terminations
- All active sessions invalidated; SSH keys rotated; API tokens revoked
- Revocation logged in HR system and access management log

## 5. Password and Credential Policy

| Requirement         | Value                                                               |
| ------------------- | ------------------------------------------------------------------- |
| Minimum length      | 14 characters                                                       |
| Complexity          | Mixed case + digit + special character                              |
| Reuse restriction   | Last 12 passwords                                                   |
| Maximum age         | 180 days (staff); 365 days (service accounts)                       |
| Brute-force lockout | 5 failed attempts → 30-minute lockout (Keycloak `failureFactor: 5`) |
| Multi-factor        | Required for all staff and OrgAdmin+ platform roles                 |

Service accounts use:

- API tokens (not passwords) with expiry ≤90 days
- Stored in HashiCorp Vault; never in code or `.env` files committed to git

## 6. Remote Access

- VPN required for all internal service access from non-corporate networks
- Zero-trust network model for production: mTLS via Linkerd service mesh
- SSH access via bastion host only; direct port 22 blocked at firewall

## 7. Audit and Monitoring

All authentication events are logged:

- Successful logins (timestamp, user, IP, MFA method)
- Failed logins (lockout triggered after threshold)
- Privilege escalation events
- Access to RESTRICTED data

Logs retained 7 years (SOC2 CC7.2 + GDPR Art.5.2 accountability).

## 8. Related Documents

- [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md)
- [docs/security/INCIDENT_RESPONSE.md](../security/INCIDENT_RESPONSE.md)
- [docs/deployment/SECURITY_HARDENING.md](../deployment/SECURITY_HARDENING.md)
