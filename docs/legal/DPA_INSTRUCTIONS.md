# DPA Execution Instructions for White-Label Clients

**Document ID:** LEGAL-DPA-002
**Version:** 1.0
**Owner:** Legal / DPO
**Created:** 2026-02-22
**Reference:** `docs/legal/DPA_TEMPLATE.md` (LEGAL-DPA-001)

---

## Who Needs to Sign a DPA?

Under GDPR Article 28, a Data Processing Agreement is required whenever:

1. **Your organization is a GDPR controller** — i.e., you determine the purposes and means of processing your users' personal data
2. **EduSphere processes that data on your behalf** — as your data processor

**In practice:** Every EduSphere white-label client or enterprise tenant that deploys EduSphere to process the personal data of EU/EEA residents must sign a DPA.

**Exemption:** If your organization is based entirely outside the EU/EEA and processes no EU/EEA residents' data, a DPA is not legally required — but we recommend executing one as a contractual best practice.

---

## How to Execute the DPA

### Step 1: Obtain the Template

The standard EduSphere DPA Template is available at:
- `docs/legal/DPA_TEMPLATE.md` (this repository)
- Your EduSphere account portal: Settings → Legal → Data Processing Agreement

### Step 2: Fill in Client Information

Replace all placeholder text in double angle brackets `<<LIKE THIS>>` with your organization's details:

| Placeholder | What to Enter |
|-------------|--------------|
| `<<CONTROLLER_NAME>>` | Your organization's full legal name |
| `<<CONTROLLER_ADDRESS>>` | Registered office address |
| `<<CONTROLLER_COUNTRY>>` | Country of incorporation |
| `<<CONTROLLER_REG_NO>>` | Company registration number |
| `<<CONTROLLER_DPO_EMAIL>>` | Your DPO email (if appointed) |
| `<<CONTRACT_DATE>>` | Date you want the DPA to take effect |
| `<<DATA_RESIDENCY_REGION>>` | EU (eu-central-1) / US / Custom |
| `<<RETENTION_PERIOD>>` | Your required data retention period (default: per EduSphere policy) |
| `<<SUPERVISORY_AUTHORITY>>` | Your lead supervisory authority (e.g., BfDI for Germany, CNIL for France) |

### Step 3: Review Annexes

The DPA template includes three annexes that may need customization:

- **Annex I — Subject-Matter and Duration:** Pre-filled with EduSphere standard processing activities. Review and add any custom processing activities specific to your deployment.
- **Annex II — Technical and Organisational Measures:** Pre-filled with EduSphere's security controls. If you operate an on-premises deployment, add your own infrastructure controls.
- **Annex III — Sub-Processors:** Lists all sub-processors EduSphere uses. Review and add any additional sub-processors you authorize.

### Step 4: Negotiate (Optional)

The template is designed to be accepted as-is for standard SaaS deployments. If you require modifications:

- **Email:** legal@edusphere.io
- **Response SLA:** 10 business days for standard change requests
- **Enterprise modifications:** Available for Enterprise plan customers — contact your account manager

Common negotiated items:
- Data residency restrictions (EU-only, specific country)
- Sub-processor approval rights (prior written approval vs. notification)
- Audit rights (remote questionnaire vs. on-site inspection)
- Custom retention periods

### Step 5: Sign and Return

**Electronic signature (preferred):**
1. Sign using DocuSign, HelloSign, or Adobe Sign
2. Send completed signed copy to: legal@edusphere.io
3. EduSphere will countersign and return an executed copy within 5 business days

**Paper signature:**
1. Print two copies, sign both
2. Mail to: EduSphere Legal, [registered address]
3. We will countersign and return one copy

### Step 6: Store the Executed DPA

Store the executed DPA:
- In your legal document management system
- As evidence for your own GDPR compliance records (Article 30 Records of Processing)
- Share with your DPO

EduSphere retains a copy and can provide it to you or your supervisory authority upon request.

---

## What Happens if EduSphere Updates the DPA?

EduSphere may update the DPA to reflect:
- Changes to sub-processors
- Regulatory changes (new EDPB guidelines, SCCs updates)
- Material changes to processing activities

**Notification:** You will receive 30 days' advance notice by email.

**If you object:** You may terminate your EduSphere subscription under the termination provisions of your Master Services Agreement.

**If you do not respond:** Continued use of EduSphere after the 30-day notice period constitutes acceptance of the updated DPA.

---

## Standard Contractual Clauses (SCCs) for International Transfers

If EduSphere transfers your users' personal data outside the EU/EEA (e.g., to OpenAI or Anthropic APIs):

- The EU SCCs (2021/914) are automatically incorporated by reference into the DPA
- The Standard Essential Module 2 (Controller→Processor) or Module 3 (Processor→Processor) applies
- A copy of the applicable SCCs is available at: legal@edusphere.io

For AI providers (OpenAI, Anthropic):
- EduSphere maintains Data Processing Agreements with these providers
- Copies available upon request with signed NDA

---

## Questions?

| Contact | For |
|---------|-----|
| legal@edusphere.io | DPA execution, legal questions |
| privacy@edusphere.io | GDPR rights, DPO contact |
| security@edusphere.io | Security questions, breach notification |

---

*This document is for informational purposes. It does not constitute legal advice. Clients should consult their own legal counsel before executing a DPA.*
