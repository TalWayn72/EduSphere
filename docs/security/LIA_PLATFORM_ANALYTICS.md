# Legitimate Interest Assessment (LIA) - Anonymized Platform Analytics

**Version:** 1.0
**Date:** 2026-02-22
**Legal Basis:** GDPR Article 6(1)(f) - Legitimate Interests
**Data Controller:** EduSphere Technologies Ltd.
**Author:** Data Protection Officer
**Review Cycle:** Annual

---

## 1. Overview

This Legitimate Interest Assessment evaluates whether EduSphere can rely on legitimate interests (GDPR Art.6(1)(f)) as the legal basis for processing anonymized usage analytics data for the purpose of platform improvement.

**Processing activity:** Collection and analysis of anonymized, aggregated platform usage data
**Data processed:** Page views, feature usage counts, session counts, error rates - all aggregated and anonymized
**Key distinction:** This processing does NOT involve personal data after anonymization. However, the pre-anonymization collection stage requires a legal basis.

---

## 2. Purpose Test

### 2.1 Identified Legitimate Interests

| Interest                 | Description                                                                                                   | Stakeholders                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Platform improvement     | Understand which features are used, where users encounter friction, and how to prioritise product development | EduSphere, clients, data subjects |
| Performance optimization | Identify slow pages, high-error-rate flows, and infrastructure bottlenecks                                    | EduSphere, clients                |
| Business intelligence    | Understand platform adoption and engagement to make informed investment decisions                             | EduSphere                         |
| Benchmark reporting      | Provide clients with anonymized usage benchmarks for their platform instances                                 | Clients                           |

### 2.2 Are the Interests Legitimate?

Yes. Product improvement and service quality analytics are widely recognized as legitimate interests when data is genuinely anonymized. EDPB Opinion 5/2019 on the interplay between the e-Privacy Directive and GDPR supports analytics as a legitimate interest where privacy impact is minimal.

---

## 3. Necessity Test

### 3.1 Is Processing Necessary?

Analytics data collection is necessary because:

1. Qualitative feedback alone is insufficient to identify systemic UX issues affecting all users
2. Without usage data, product decisions are based on incomplete information, leading to poor resource allocation
3. Error rate monitoring requires automated data collection; manual testing cannot replicate real-world usage patterns

### 3.2 Alternatives Considered

| Alternative                              | Assessment                                                                                                       |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| No analytics                             | Not viable - product improvement without data leads to poor decisions; unable to identify errors affecting users |
| Consent-based analytics only             | Would create systematic bias (only engaged users consent); unrepresentative data                                 |
| Fully synthetic data                     | Synthetic data does not reflect real usage patterns; cannot substitute for actual telemetry                      |
| Current approach (anonymized aggregates) | This IS the privacy-minimising approach - no individual tracking                                                 |

**Conclusion:** Anonymized aggregate analytics is the minimum necessary approach for platform improvement.

---

## 4. Balancing Test

### 4.1 Nature of Data Processed

| Data Element                | Identifiability                      | Assessment             |
| --------------------------- | ------------------------------------ | ---------------------- |
| Page view counts            | Non-identifiable aggregate           | Zero privacy impact    |
| Feature usage counts        | Non-identifiable aggregate           | Zero privacy impact    |
| Session counts (per tenant) | Organizational-level, not individual | Minimal privacy impact |
| Error rates                 | Non-identifiable aggregate           | Zero privacy impact    |
| Funnel drop-off rates       | Non-identifiable aggregate           | Zero privacy impact    |

**Key safeguard:** Analytics data is aggregated to a minimum group size of k=5 (k-anonymity) before any reporting or storage. Individual user events are never stored or exported.

### 4.2 Anonymization Standard

The analytics processing uses the following anonymization pipeline:

1. **Collection:** Raw events include a pseudonymous session token (no user ID, no email)
2. **Aggregation:** Events are aggregated by page, feature, tenant, and time period (hourly/daily)
3. **k-anonymity enforcement:** Any aggregate bucket with fewer than 5 contributing sessions is suppressed
4. **Storage:** Only the aggregated counts are persisted; raw events are discarded within 24 hours
5. **Export:** Reports contain only aggregated counts; no session tokens in any output

**Re-identification risk:** Negligible. The ICO anonymization code of practice and EDPB Opinion 05/2014 on Anonymisation Techniques support this approach as effective anonymization.

### 4.3 Impact on Data Subjects

| Impact Type           | Assessment                                                                  |
| --------------------- | --------------------------------------------------------------------------- |
| Tracking risk         | None - no persistent user identifier in analytics pipeline                  |
| Re-identification     | Negligible - k-anonymity k>=5 applied; raw events discarded within 24 hours |
| Behavioral profiling  | None - no individual-level data retained or analyzed                        |
| Cross-context linkage | None - analytics pseudonymous token cannot be linked to user account        |

### 4.4 Safeguards Applied

| Safeguard              | Implementation                                                       |
| ---------------------- | -------------------------------------------------------------------- |
| k-anonymity            | k >= 5 enforced; low-count buckets suppressed                        |
| No user IDs            | Session tokens are ephemeral and not linked to user accounts         |
| No PII                 | Names, emails, content not included in analytics events              |
| Raw event TTL          | Raw events deleted within 24 hours; only aggregates retained         |
| Opt-out                | Data subjects can opt out of analytics in platform privacy settings  |
| No third-party sharing | Analytics data not shared with third parties or used for advertising |

---

## 5. Conclusion

**Result: Legitimate Interest applies.**

The balancing test demonstrates that:

1. EduSphere has a genuine legitimate interest in understanding platform usage for improvement
2. Anonymized aggregate analytics is the minimum necessary and privacy-preserving approach
3. The privacy impact on data subjects is negligible given k-anonymity, lack of user IDs, and 24-hour raw event deletion
4. Data subjects have a reasonable expectation of basic usage telemetry on software platforms
5. An opt-out mechanism is available, consistent with Art.21 rights

**Legal basis: GDPR Article 6(1)(f) - Legitimate Interests of EduSphere Technologies Ltd.**

**Note:** Once data is genuinely anonymized (post-aggregation), GDPR no longer applies. This LIA covers the collection and pre-anonymization processing stage only.

---

## 6. Data Specification

| Field                    | Retention (raw) | Retention (aggregate) | Notes                           |
| ------------------------ | --------------- | --------------------- | ------------------------------- |
| Page identifier          | 24 hours        | 13 months             | URL path only, no query params  |
| Feature interaction type | 24 hours        | 13 months             | E.g., QUIZ_START, VIDEO_PLAY    |
| Session token            | 24 hours        | Not retained          | Ephemeral, not linked to user   |
| Tenant ID                | 24 hours        | 13 months             | For per-tenant reporting        |
| Error type               | 24 hours        | 13 months             | Error category, not stack trace |
| Timestamp (hour)         | 24 hours        | 13 months             | Rounded to hour, not second     |

**Prohibited:** Full URLs with query params, user IDs, session content, device fingerprints, precise timestamps.

---

## 7. Review and Approval

| Role                    | Name       | Date       |
| ----------------------- | ---------- | ---------- |
| Data Protection Officer | [DPO_NAME] | 2026-02-22 |
| Next review             | -          | 2027-02-22 |

_EduSphere LIA - Analytics v1.0 - 2026-02-22 - Contact: dpo@edusphere.dev_
