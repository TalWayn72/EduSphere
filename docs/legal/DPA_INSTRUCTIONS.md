# DPA Customization and Execution Instructions

**Version:** 1.0
**Date:** 2026-02-22
**Contact:** dpo@edusphere.dev

---

## Overview

This document provides step-by-step instructions for customizing and executing the EduSphere Data Processing Agreement (DPA) template (`docs/legal/DPA_TEMPLATE.md`) with white-label clients.

The DPA is required under GDPR Article 28 whenever EduSphere processes personal data on behalf of a client organization (Controller).

---

## Step-by-Step Process

### Step 1: Identify the Parties

Collect the following information from the client before filling the template:

| Field | Required? | Source |
|-------|-----------|--------|
| CLIENT_LEGAL_NAME | Yes | Client legal registration documents |
| CLIENT_ADDRESS | Yes | Registered office address |
| CLIENT_REGISTRATION_NUMBER | Yes | Company registration / VAT number |
| CLIENT_CONTACT_NAME | Yes | Designated contact for DPA matters |
| CLIENT_CONTACT_EMAIL | Yes | Email for DPA notifications (sub-processor changes) |
| CLIENT_DPO_EMAIL | If appointed | Required if client has >250 employees or high-risk processing |
| MEMBER_STATE | Yes (EU/EEA) | Member State whose law governs the agreement |
| JURISDICTION | Yes (EU/EEA) | Courts with jurisdiction for disputes |

### Step 2: Review the Technical and Organisational Measures (TOMs)

Section 8 of the DPA describes EduSphere technical controls. Before sending to a client:

1. Verify that AES-256-GCM encryption is active for the client tenant (check infra team)
2. Confirm TLS 1.3 is enforced on the client sub-domain / vanity domain
3. Confirm audit logging is enabled for the client tenant (SUPER_ADMIN setting)
4. If client requires on-premises deployment, update Section 8.7 (Physical Security) to reflect client data centre details
5. If client is a healthcare organization, review whether special category data addendum is required

### Step 3: Fill in the Template

1. Create a copy of `docs/legal/DPA_TEMPLATE.md` named `DPA_[CLIENT_NAME]_[YYYY-MM-DD].md`
2. Replace all bracketed placeholders [LIKE_THIS] with actual values
3. Verify no placeholders remain using: `grep -n "[" DPA_*.md`
4. Set the document date to the execution date

**Fields to customize:**

| Placeholder | Section | Notes |
|-------------|---------|-------|
| [CLIENT_LEGAL_NAME] | 1 | Full legal entity name as registered |
| [CLIENT_ADDRESS] | 1 | Registered office, not trading address |
| [CLIENT_REGISTRATION_NUMBER] | 1 | Company number / VAT registration |
| [CLIENT_CONTACT_NAME] | 1 | Primary contact for DPA matters |
| [CLIENT_CONTACT_EMAIL] | 1 | Receives sub-processor change notifications |
| [CLIENT_DPO_EMAIL] | 1 | Leave blank if no DPO appointed |
| [EDUSPHERE_REGISTERED_ADDRESS] | 1 | Fill from EduSphere legal entity details |
| [EDUSPHERE_REGISTRATION_NUMBER] | 1 | EduSphere company registration number |
| [MEMBER_STATE] | 10 | E.g., Ireland, Germany, Netherlands |
| [JURISDICTION] | 10 | E.g., Dublin, Munich, Amsterdam courts |

### Step 4: Legal Review

1. Send the completed DPA to EduSphere legal counsel for review
2. If the client requests material changes to Section 6 (Obligations) or Section 8 (TOMs), escalate to DPO
3. Clients may NOT weaken the TOMs in Section 8 (security controls are non-negotiable)
4. Clients may add stricter obligations or shorter timelines

### Step 5: Sign Both Parties

1. Generate a PDF from the completed markdown (use pandoc or legal document tool)
2. Send to client for wet or electronic signature (DocuSign / Adobe Sign acceptable)
3. EduSphere DPO countersigns on behalf of EduSphere Technologies Ltd.
4. Retain executed copy in: `docs/legal/executed/DPA_[CLIENT_NAME]_[YYYY-MM-DD]_SIGNED.pdf`
5. Register the DPA in the client onboarding tracker (Notion / CRM)

---

## When to Re-Execute the DPA

A new DPA must be executed or the existing DPA must be amended in the following circumstances:

### Sub-processor Changes

| Trigger | Action | Timeline |
|---------|--------|----------|
| New sub-processor added to docs/security/SUBPROCESSORS.md | Send change notification to all clients at CLIENT_CONTACT_EMAIL | 30 days before activation |
| Sub-processor removed | Update SUBPROCESSORS.md; notify clients | Within 14 days |
| Sub-processor changes data transfer mechanism | Update SUBPROCESSORS.md and DPA Annex if applicable | Before change |

### Scope Changes

| Trigger | Action |
|---------|--------|
| Client adds new types of personal data not listed in Section 4 | Amend DPA Annex A or re-execute |
| Client deploys platform for new categories of data subjects (e.g., minors <16) | Re-execute with appropriate addendum |
| Client changes governing law jurisdiction | Re-execute Section 10 |
| EduSphere changes data centre region (EU to non-EU) | Re-execute with updated TOMs and transfer mechanism |
| New GDPR obligation requires TOM update | Notify all clients; amend via DPA amendment letter |

### Annual Review

- Review all executed DPAs annually (typically January)
- Check sub-processor list for changes
- Verify TOMs still accurate against current security posture
- Update template version if material changes needed

---

## Contact and Escalation

| Matter | Contact | Response SLA |
|--------|---------|-------------|
| DPA questions from clients | dpo@edusphere.dev | 2 business days |
| Client objects to sub-processor change | dpo@edusphere.dev + legal@edusphere.dev | Within 7 days |
| Client requests on-site audit | dpo@edusphere.dev | 30-day scheduling |
| DPA amendment requests | dpo@edusphere.dev | 5 business days |
| Data subject rights requests forwarded by client | privacy@edusphere.dev | 48-hour acknowledgment |

**DPO Contact:** dpo@edusphere.dev

---

## DPA Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-22 | Initial release |

---

*EduSphere DPA Instructions v1.0 - 2026-02-22 - Contact: dpo@edusphere.dev*