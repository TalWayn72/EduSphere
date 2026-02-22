# Legitimate Interest Assessment — Anonymized Usage Analytics

**Document ID:** LIA-002
**Version:** 1.0
**Owner:** DPO / Product
**Created:** 2026-02-22
**Next Review:** 2027-02-22
**GDPR Reference:** Article 6(1)(f) — Legitimate Interests
**Note:** This LIA applies **only** to anonymized/aggregated analytics. Individual-level behavioral profiling requires separate consent (Article 6(1)(a)).

---

## Scope

This assessment covers EduSphere's collection of **anonymized** usage data for platform improvement:
- Aggregate page view counts (no user_id linkage after aggregation)
- Aggregate feature adoption rates (% of tenants using a feature)
- System error rates and performance metrics (response times, failure modes)
- Aggregate learning outcome statistics (course completion rates per cohort)

**Out of scope** (requires separate consent, NOT covered by this LIA):
- Individual learning behavior profiling
- AI personalization based on individual browsing history
- Marketing analytics or advertising attribution

---

## Part 1 — Purpose Test

### Legitimate Interest Identified

1. **Platform improvement** — Understanding which features are used, where users encounter errors, and where the product can be improved benefits all users directly.
2. **Capacity planning** — Aggregate traffic data allows infrastructure scaling before performance degrades, protecting service availability for all users.
3. **Security monitoring** — Aggregate error patterns can indicate attack attempts (e.g., spike in 401 errors indicating credential stuffing).
4. **Legal and contractual obligations** — Enterprise clients require SLA reporting on uptime and error rates. This requires aggregate performance data.

**Conclusion Part 1: ✅ PASS**

---

## Part 2 — Necessity Test

### Data Minimization Applied

| Analytics Type | Personal Data | Anonymization Method |
|---------------|--------------|---------------------|
| Page views | None — count only | Aggregate before storage |
| Feature usage | None — rate only | k-anonymity: minimum group size 50 |
| Error rates | IP address (technical) | Truncated to /24 subnet, discarded after 24h |
| Performance metrics | None | Timing only, no user linkage |
| Learning outcomes | None — cohort rates | k-anonymity: minimum cohort size 10 |

Where individual-level data is temporarily required for calculation, it is:
1. Processed in-memory only
2. Never written to persistent storage
3. Aggregated within 24 hours
4. Discarded after aggregation is complete

**Conclusion Part 2: ✅ PASS — Anonymization means minimal personal data processing**

---

## Part 3 — Balancing Test

### Safeguards

| Safeguard | Implementation |
|-----------|---------------|
| Genuine anonymization | k-anonymity enforced; no singling-out possible |
| No re-identification | Tenant-separated aggregates to prevent cross-tenant re-identification |
| No secondary use | Analytics used only for platform improvement and capacity planning |
| User transparency | Privacy Policy discloses aggregate analytics collection |
| Opt-out available | Tenants can disable analytics collection via `ANALYTICS_ENABLED=false` flag |
| Data retention | Aggregate statistics retained 2 years; no individual-level data retained |

### Reasonable Expectation

Users of digital services expect service providers to use aggregate statistics to improve the service. Provided the data is genuinely anonymized and used only for platform improvement, this expectation is met. The EDPB and ICO guidance confirms that genuinely anonymized data falls outside the scope of GDPR (Recital 26), making the residual privacy risk minimal.

**Conclusion Part 3: ✅ PASS**

---

## Overall Conclusion

| Test | Result |
|------|--------|
| Purpose Test | ✅ PASS |
| Necessity Test | ✅ PASS |
| Balancing Test | ✅ PASS |

**Processing legal basis: GDPR Article 6(1)(f) — Legitimate Interests ✅**

**Note:** If EduSphere in future implements individual-level analytics (e.g., "user X visited page Y"), this LIA must be updated and explicit consent obtained under Article 6(1)(a).

---

*Reviewed and approved by: DPO | Product Lead | Legal Counsel*
*Approval date: 2026-02-22*
