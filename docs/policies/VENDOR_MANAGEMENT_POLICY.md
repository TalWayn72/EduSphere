# Vendor Management Policy

**Document ID:** POL-006
**Version:** 1.0
**Classification:** Internal
**Owner:** CISO
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**SOC2 Trust Service Criteria:** CC9.1, CC9.2

---

## 1. Purpose

Manage the security and privacy risks introduced by third-party vendors and subprocessors that access, process, or store EduSphere or customer data.

## 2. Vendor Classification

| Tier | Definition | Examples | Controls |
|------|-----------|---------|---------|
| **Tier 1 — Critical** | Access to customer PII or production systems | OpenAI, Anthropic, AWS, Keycloak | Full security review, DPA, annual audit |
| **Tier 2 — Important** | Access to non-PII operational data | GitHub, Sentry, Datadog | Security review, DPA if EU data |
| **Tier 3 — Standard** | No data access (tools only) | Figma, Notion | Standard contract, ToS review |

## 3. Vendor Onboarding Process

### Step 1: Security Assessment
- Complete Vendor Security Questionnaire (VSQ)
- Review SOC2 Type II report (Tier 1 required; Tier 2 preferred)
- Review ISO 27001 certificate or equivalent
- Verify GDPR DPA availability (required for EU data processors)

### Step 2: Legal Review
- Data Processing Agreement (DPA) executed before any data sharing
- Review data residency (EU data must stay in EU unless adequacy decision exists)
- Confirm subprocessor notification obligations if applicable

### Step 3: Approval
- Tier 1: CISO + Legal approval required
- Tier 2: CISO approval required
- Tier 3: Engineering Lead approval sufficient

### Step 4: Registration
- Added to Vendor Register (`docs/security/VENDOR_REGISTER.md`)
- DPA filed in legal document management system
- Review date set (Tier 1: annual; Tier 2: annual; Tier 3: biennial)

## 4. LLM Provider Controls (SI-10)

All LLM providers (OpenAI, Anthropic) are Tier 1 vendors with additional controls:

- **User consent gate**: `THIRD_PARTY_LLM` consent required before any data sent to external LLM
- **PII scrubbing**: PII scrubber middleware strips names, emails, IDs before LLM calls
- **Model cards**: Published for each model in use (`docs/ai/MODEL_CARDS.md`)
- **EU AI Act Art.50**: Transparency disclosure when AI generates educational content
- **Data retention**: EduSphere configures zero-retention API options where available
- **Fallback**: Ollama (local LLM) available for customers requiring data sovereignty

## 5. Subprocessor List

EduSphere's current subprocessor list is maintained at `docs/security/SUBPROCESSORS.md` and updated within 30 days of any change. Customers receive 30-day advance notice of new subprocessors (GDPR Art.28(2)).

Key subprocessors:
| Subprocessor | Purpose | Data | Region | DPA |
|-------------|---------|------|--------|-----|
| AWS / Amazon | Cloud infrastructure | All | EU (eu-central-1, eu-west-1) | AWS DPA |
| OpenAI | LLM inference (with consent) | AI prompts only | US (with consent) | OpenAI DPA |
| Anthropic | LLM inference (with consent) | AI prompts only | US (with consent) | Anthropic DPA |

## 6. Ongoing Monitoring

- Annual SOC2 / ISO 27001 certificate review for Tier 1 vendors
- Subscribe to vendor security bulletins and breach notifications
- Quarterly review of vendor access (access only to what's needed)
- Offboard vendors within 5 business days of contract end

## 7. Vendor Incident Response

If a vendor reports a security incident affecting EduSphere data:
1. Activate incident response process (P1 minimum)
2. Obtain incident report from vendor within 24 hours
3. Assess customer impact and GDPR notification obligation
4. Notify affected customers per breach notification policy

## 8. Related Documents

- [INFORMATION_SECURITY_POLICY.md](./INFORMATION_SECURITY_POLICY.md)
- [GDPR_COMPLIANCE_POLICY.md](./GDPR_COMPLIANCE_POLICY.md)
- [AI_USAGE_POLICY.md](./AI_USAGE_POLICY.md)
- [docs/ai/MODEL_CARDS.md](../security/MODEL_CARDS.md)
