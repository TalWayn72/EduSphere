# Information Security Policy

**Document ID:** POL-001
**Version:** 1.0
**Classification:** Internal
**Owner:** CISO
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**SOC2 Trust Service Criteria:** CC1.1, CC1.2, CC1.3, CC1.4, CC1.5

---

## 1. Purpose

This policy establishes the information security framework for EduSphere to protect the confidentiality, integrity, and availability of customer data across its educational platform serving 100,000+ concurrent users in the European Union and globally.

## 2. Scope

Applies to all EduSphere employees, contractors, subprocessors, and systems that process, store, or transmit EduSphere or customer data including:

- SaaS platform (edusphere.dev and tenant subdomains)
- On-premises deployments at customer sites
- Mobile applications (iOS, Android)
- Internal development and CI/CD systems

## 3. Policy Statements

### 3.1 Information Classification

| Class            | Definition                   | Examples                                 | Controls                                       |
| ---------------- | ---------------------------- | ---------------------------------------- | ---------------------------------------------- |
| **RESTRICTED**   | Highly sensitive, regulatory | PII, credentials, encryption keys        | Encrypt at rest+transit, MFA, audit all access |
| **CONFIDENTIAL** | Business sensitive           | Source code, contracts, security configs | Encrypt at rest, role-based access             |
| **INTERNAL**     | Internal use only            | Architecture docs, runbooks              | Access controls, no external sharing           |
| **PUBLIC**       | Approved for public          | Marketing, open-source code              | No restrictions beyond IP policy               |

### 3.2 Security Controls

- **Encryption:** AES-256-GCM for all PII at rest; TLS 1.3 for all data in transit
- **Authentication:** Multi-factor authentication required for all staff; Keycloak OIDC for all services
- **Authorization:** Role-based access control (RBAC) with least-privilege principle; PostgreSQL RLS enforcing tenant isolation
- **Vulnerability Management:** OWASP Dependency-Check in CI; Trivy container scanning; quarterly penetration testing
- **Logging:** All access to RESTRICTED data logged with timestamp, user, action, IP address; 7-year retention (SOC2 CC7.2)

### 3.3 Asset Management

- All systems inventoried in CMDB within 24 hours of provisioning
- Security baseline applied before production access
- Decommissioned systems wiped per NIST SP 800-88

### 3.4 Third-Party Risk

- All subprocessors reviewed against SOC2 / ISO 27001 / equivalent standard
- Data Processing Agreements (DPAs) executed before data sharing
- LLM providers require explicit user consent before data transmission (SI-10)

## 4. Roles and Responsibilities

| Role              | Responsibility                                         |
| ----------------- | ------------------------------------------------------ |
| **CISO**          | Policy owner, annual review, exception approval        |
| **Security Team** | Implementation, monitoring, incident response          |
| **Engineering**   | Secure SDLC, code review, dependency management        |
| **DevOps/SRE**    | Infrastructure hardening, patching, secrets management |
| **All Staff**     | Compliance with this policy, incident reporting        |

## 5. Compliance

Violations of this policy may result in disciplinary action up to and including termination. Regulatory violations are reported to relevant authorities per GDPR Art.33 (72-hour DPA notification).

## 6. Exceptions

Exceptions require written approval from CISO with:

- Business justification
- Risk assessment and compensating controls
- Expiry date (maximum 90 days; renewable with re-approval)
- Tracking in the exception register

## 7. Related Documents

- [ACCESS_CONTROL_POLICY.md](./ACCESS_CONTROL_POLICY.md)
- [INCIDENT_RESPONSE_POLICY.md](./INCIDENT_RESPONSE_POLICY.md)
- [GDPR_COMPLIANCE_POLICY.md](./GDPR_COMPLIANCE_POLICY.md)
- [docs/security/INCIDENT_RESPONSE.md](../security/INCIDENT_RESPONSE.md)
- [docs/security/COMPLIANCE_ACTION_PLAN.md](../security/COMPLIANCE_ACTION_PLAN.md)

---

_This policy is reviewed annually and after any significant security incident or regulatory change._
