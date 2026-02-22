# Vendor Register

**Document ID:** SEC-VEN-001
**Version:** 1.0
**Owner:** CISO
**Last Reviewed:** 2026-02-22
**Next Review:** 2026-08-22
**Policy Reference:** docs/policies/VENDOR_MANAGEMENT_POLICY.md (POL-006)
**SOC2 Trust Service Criteria:** CC9.1, CC9.2

---

## Purpose

This register tracks all vendors with access to EduSphere systems or customer data, their risk tier, security assessment status, and review dates.

---

## Vendor Register

### Tier 1 — Critical (Full Security Review Required)

| # | Vendor | Purpose | Data Access | SOC2 Type II | DPA | Last Review | Next Review | Status |
|---|--------|---------|------------|-------------|-----|------------|------------|--------|
| V-001 | Amazon Web Services | Cloud infrastructure | ALL (customer-controlled) | ✅ AWS SOC2 (annual) | ✅ AWS DPA | 2026-02-22 | 2027-02-22 | ✅ Approved |
| V-002 | OpenAI, Inc. | LLM inference (GPT-4o) | AI prompts (PII-scrubbed, consent-gated) | ✅ OpenAI SOC2 Type II | ✅ OpenAI DPA | 2026-02-22 | 2027-02-22 | ✅ Approved |
| V-003 | Anthropic PBC | LLM inference (Claude) | AI prompts (PII-scrubbed, consent-gated) | ✅ Anthropic SOC2 | ✅ Anthropic DPA | 2026-02-22 | 2027-02-22 | ✅ Approved |

### Tier 2 — Important (Security Review Required)

| # | Vendor | Purpose | Data Access | Compliance | DPA | Last Review | Next Review | Status |
|---|--------|---------|------------|-----------|-----|------------|------------|--------|
| V-004 | GitHub, Inc. | Source code, CI/CD | Source code only (no customer PII) | ✅ GitHub SOC2 | ✅ GitHub DPA | 2026-02-22 | 2027-02-22 | ✅ Approved |
| V-005 | HashiCorp (Vault) | Secrets management | Encryption keys, credentials | ✅ HashiCorp SOC2 | ✅ HashiCorp DPA | 2026-02-22 | 2027-02-22 | ✅ Approved |

### Tier 3 — Standard (ToS Review Only)

| # | Vendor | Purpose | Data Access | Review | Status |
|---|--------|---------|------------|--------|--------|
| V-006 | Figma | UI design tool | No production data | ToS reviewed 2026-02-22 | ✅ Approved |
| V-007 | Linear | Issue tracking | Internal only (no PII) | ToS reviewed 2026-02-22 | ✅ Approved |

---

## Self-Hosted Components (Not Vendors)

The following are open-source software components operated entirely by EduSphere — no third-party vendor relationship:

| Component | Version | License | Security Audit |
|-----------|---------|---------|---------------|
| Keycloak | 26.x | Apache 2.0 | ✅ Quarterly config review |
| PostgreSQL 16 | 16.x | PostgreSQL License | ✅ pgAudit enabled |
| Apache AGE | 1.5.0 | Apache 2.0 | ✅ Parameterized Cypher |
| pgvector | 0.8.0 | PostgreSQL License | ✅ HNSW index review |
| NATS JetStream | 2.x | Apache 2.0 | ✅ TLS + NKey auth |
| Jaeger | latest | Apache 2.0 | ✅ No PII in traces |
| Grafana | latest | AGPL-3.0 | ✅ Self-hosted only |

---

## Vendor Security Assessment Checklist (Tier 1)

- [ ] SOC2 Type II report reviewed (issued within 12 months)
- [ ] ISO 27001 certificate verified (if applicable)
- [ ] GDPR DPA executed
- [ ] Data residency confirmed (EU data stays in EU or SCCs in place)
- [ ] Sub-processor notification obligation clarified
- [ ] Security contact established (for breach notification)
- [ ] Annual review date set

---

## Offboarding Process

When a vendor relationship ends:
1. Revoke all API keys and credentials
2. Request data deletion confirmation (within 30 days)
3. Update this register (set Status = ❌ Terminated)
4. Update SUBPROCESSORS.md and notify customers (30-day notice)
5. Archive DPA in legal document management system
