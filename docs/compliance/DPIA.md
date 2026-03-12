# Data Protection Impact Assessment (DPIA)

**GDPR Article 35 — Data Protection Impact Assessment**

| Field | Value |
|---|---|
| **Organisation** | EduSphere Ltd |
| **System Assessed** | AI Tutoring, Learning Analytics, and AI Assessment (Chavruta, Knowledge Graph, Grading AI) |
| **Assessment Date** | March 2026 |
| **Version** | 1.0 |
| **DPO Review Status** | Pending DPO Appointment |
| **Next Review** | March 2027 (or on material system change) |

> **Trigger for this DPIA:** Processing involves systematic profiling of data subjects (Art. 35(3)(a)), use of new technologies (AI/ML), and large-scale processing of personal data in an educational context — all criteria under WP29 Guidelines WP 248.

---

## Section 1 — Description of Processing

### 1.1 Systems in Scope

**System A — Chavruta AI Tutor**
An AI-powered Socratic dialogue tutor implemented via LangGraph.js state machine. The system engages learners in structured debate, questioning, and explanation cycles. Conversation turns are stored in PostgreSQL and optionally forwarded to frontier LLMs (OpenAI/Anthropic) subject to explicit consent.

Implementation: `apps/subgraph-agent/` — AI agent workflows, state machines, LLM abstraction layer.

**System B — Learning Path Recommendation Engine**
A hybrid recommendation system combining pgvector semantic similarity (768-dim embeddings, nomic-embed-text model) with Apache AGE graph traversal to identify knowledge gaps and recommend next learning steps. Personalised paths are built per learner based on mastery scores.

Implementation: `apps/subgraph-knowledge/` — HybridRAG pipeline, graph traversal, concept mastery tracking.

**System C — Assessment Grading AI**
AI-assisted grading for open-ended assessments (short answer, essay-style). The system produces a provisional grade with reasoning; human instructor review is mandatory before grade is final. Appeals are handled via instructor interface.

Implementation: `apps/subgraph-agent/` — grading agent template; `apps/subgraph-core/` — assessment records.

### 1.2 Data Flows

```
Student → Frontend (React/Expo)
         → Gateway (JWT validation, tenant routing)
         → subgraph-agent (AI session management)
              → PostgreSQL (conversation storage, RLS-isolated)
              → [CONSENT GATE] → OpenAI / Anthropic API (if consented)
         → subgraph-knowledge (embedding + graph)
              → pgvector (semantic search)
              → Apache AGE (graph traversal)
         → subgraph-core (assessment records, grades)
              → PostgreSQL (per-tenant, RLS)
```

### 1.3 Volume and Scale

- Target scale: 100,000+ concurrent users
- Conversation records: estimated 2–10 million messages per month at scale
- Embedding vectors: one 768-dim vector per concept per learner (potentially millions of vectors)
- Assessment records: varies by course design

### 1.4 Automated Decision-Making

**System B (Recommendations):** Fully automated — the system selects next content without human review. Learners may opt out via learning path settings (manual path mode). Not a legally significant decision under Art. 22.

**System C (Grading):** Semi-automated — AI produces provisional grade only. A human instructor must confirm or override before the grade is recorded. This design is intentional to comply with Art. 22 obligations and educational fairness requirements.

---

## Section 2 — Necessity and Proportionality

### 2.1 Why AI Processing Is Necessary

| Goal | Justification |
|---|---|
| Personalised pacing | Static course structure cannot adapt to individual knowledge gaps; AI-driven paths measurably improve completion rates |
| Scalable tutoring | 1:1 human tutoring is not economically viable at 100k+ user scale; AI Chavruta provides availability that human tutors cannot |
| Assessment throughput | Open-ended assessments provide richer learning signal than MCQ; AI grading (with human review) enables broader use of open-ended tasks |
| Accessibility | AI-generated captions, simplified explanations, and pace adaptation serve learners with disabilities |

### 2.2 Alternatives Considered

| Alternative | Reason Not Chosen |
|---|---|
| Fully manual instructor feedback | Not scalable; creates bottlenecks and inequitable response times |
| MCQ-only assessment | Insufficient to assess higher-order thinking; pedagogically inferior |
| Static learning paths | Cannot adapt to prior knowledge; inferior learning outcomes |
| No third-party LLM | Viable for development (Ollama local); third-party LLMs provide higher quality at scale — addressed by consent gate |

### 2.3 Data Minimisation Measures

- Conversation messages pseudonymised before being sent to LLM APIs (no direct identifiers)
- Embeddings are non-invertible 768-dim vectors; source text is not recoverable from the vector
- Cohort analytics aggregate to minimum group size n≥5 to prevent re-identification
- Push notification tokens stored separately from content data
- Assessment AI receives only the answer text and rubric — no other learner profile data

### 2.4 Proportionality Assessment

The benefits (personalised, scalable, accessible education) are proportionate to the privacy intrusion (conversation storage, behavioural profiling for recommendations). Key proportionality factors:
- Processing is limited to the educational relationship context
- Special-category data (if captured incidentally in conversation) is subject to explicit consent
- Learners retain meaningful control: opt-out of recommendations, delete conversation history, withdraw LLM consent

---

## Section 3 — Risk Assessment

### Risk Scoring Key

| Score | Likelihood | Severity |
|---|---|---|
| 1 | Very Unlikely | Negligible |
| 2 | Unlikely | Minor |
| 3 | Possible | Moderate |
| 4 | Likely | Significant |
| 5 | Very Likely | Severe |

**Risk Score = Likelihood × Severity. Residual risk after mitigation shown in Section 6.**

---

### Risk 1 — Unauthorised Access to Conversation Data

| Field | Detail |
|---|---|
| **Description** | An attacker or insider gains access to stored AI tutoring conversations containing potentially sensitive personal disclosures |
| **Likelihood (pre-mitigation)** | 3 |
| **Severity** | 5 (conversations may contain personal distress, religious/political views, health references) |
| **Risk Score** | 15 — HIGH |
| **Threat Actors** | External attacker (SQL injection, credential theft); malicious insider; cross-tenant data leak |
| **Mitigations** | AES-256-GCM encryption at rest (`packages/db/src/helpers/encryption.ts`); RLS via `withTenantContext()` (SI-9); JWT RS256 auth (Keycloak brute-force protected, SI-4); penetration testing; separate encryption keys per tenant; conversation data not exposed in GraphQL schema without `@authenticated` + scope check |

---

### Risk 2 — Re-identification from Learning Analytics

| Field | Detail |
|---|---|
| **Description** | An instructor or admin re-identifies an individual learner from aggregated analytics, particularly in small cohorts |
| **Likelihood (pre-mitigation)** | 3 |
| **Severity** | 3 (reputational harm, discrimination risk) |
| **Risk Score** | 9 — MEDIUM |
| **Threat Actors** | Instructor with access to cohort dashboard; curious admin |
| **Mitigations** | Minimum cohort size threshold n≥5 before displaying any aggregate (`cohort-insights.service.ts`); role-based access — instructors see only their own cohort; no individual drill-down from cohort view; audit logging of all analytics queries |

---

### Risk 3 — Discriminatory Outcomes from AI Grading

| Field | Detail |
|---|---|
| **Description** | The AI grading system produces systematically biased grades disadvantaging learners based on language, cultural background, or writing style |
| **Likelihood (pre-mitigation)** | 3 |
| **Severity** | 4 (academic harm, potential violation of equality law) |
| **Risk Score** | 12 — HIGH |
| **Threat Actors** | Model bias in underlying LLM; distribution shift from training data |
| **Mitigations** | Human instructor mandatory review before grade finalisation (Art. 22 compliance); explicit appeal mechanism in learner UI; bias monitoring: instructors instructed to track override frequency by demographic group; grading rubric provided to AI alongside answer text to constrain evaluation scope; periodic model audit |

---

### Risk 4 — Personal Data Breach

| Field | Detail |
|---|---|
| **Description** | Bulk exfiltration of personal data (user records, conversation history, assessment data) due to vulnerability exploitation |
| **Likelihood (pre-mitigation)** | 2 |
| **Severity** | 5 (all data subjects affected, regulatory notification required) |
| **Risk Score** | 10 — HIGH |
| **Threat Actors** | External attacker; supply-chain compromise |
| **Mitigations** | Encryption at rest (AES-256-GCM) and in transit (TLS 1.3); Drizzle ORM parameterised queries (SQL injection prevention, SI-8); dependency scanning (`pnpm audit --audit-level=high`); container image scanning (Trivy); mTLS between services in production (SI-6); 72-hour breach notification procedure (see `BREACH-NOTIFICATION-PROCEDURE.md`) |

---

### Risk 5 — Excessive Profiling / Surveillance Perception

| Field | Detail |
|---|---|
| **Description** | Learners perceive the AI tutoring and tracking system as excessive surveillance, eroding trust and autonomy |
| **Likelihood (pre-mitigation)** | 3 |
| **Severity** | 3 (reputational harm, user abandonment, potential regulatory scrutiny) |
| **Risk Score** | 9 — MEDIUM |
| **Threat Actors** | Systemic — inherent to personalisation systems |
| **Mitigations** | Transparency: clear privacy notice explaining what data is collected and why; learner dashboard showing their own data; opt-out for recommendations (manual path mode); conversation history deletion self-service; EU AI Act transparency requirement: AI interaction clearly labelled (see `EU-AI-ACT-TECHNICAL-DOCUMENTATION.md`) |

---

### Risk 6 — Cross-Tenant Data Leakage

| Field | Detail |
|---|---|
| **Description** | Data from one educational organisation (tenant) is visible to users of another organisation |
| **Likelihood (pre-mitigation)** | 2 |
| **Severity** | 5 (GDPR breach; contractual breach with B2B customers) |
| **Risk Score** | 10 — HIGH |
| **Threat Actors** | Developer error (missing `withTenantContext()`); GraphQL resolver misconfiguration |
| **Mitigations** | RLS enforced at PostgreSQL level (not only application level) — SI-9; all 16 tables have `USING (tenant_id = current_setting('app.current_user_id', TRUE))`; security test suite: `tests/security/rls-variables.spec.ts`; CI gate: `pnpm test:rls` must pass on every commit; SUPER_ADMIN role required for any cross-tenant query |

---

### Risk 7 — Third-Party LLM Exposure Without Consent

| Field | Detail |
|---|---|
| **Description** | Learner conversation data forwarded to OpenAI or Anthropic without the learner's knowledge or consent |
| **Likelihood (pre-mitigation)** | 2 (if consent gate removed or bypassed) |
| **Severity** | 5 (GDPR Art. 6 violation; potential Art. 9 violation; significant regulatory risk) |
| **Risk Score** | 10 — HIGH |
| **Threat Actors** | Developer bypassing consent gate; misconfigured feature flag |
| **Mitigations** | SI-10 invariant: consent check is mandatory code path in `llm-consent.guard.ts` — throws `CONSENT_REQUIRED` exception if `THIRD_PARTY_LLM` flag absent; consent check is covered by `tests/security/ai-compliance.spec.ts`; CI gate — removing consent guard is a failing security test; consent status visible and revocable in user profile |

---

## Section 4 — Mitigation Measures Summary

| Risk | Primary Technical Control | Primary Organisational Control |
|---|---|---|
| 1. Unauthorised access | AES-256-GCM encryption + RLS + JWT | Access review quarterly; incident response plan |
| 2. Re-identification | Cohort minimum n≥5 threshold | Instructor training on data use |
| 3. Discriminatory grading | Human mandatory review gate | Bias audit annual; instructor override tracking |
| 4. Data breach | End-to-end encryption + Trivy | 72h breach notification procedure |
| 5. Excessive profiling | Opt-out + transparency dashboard | Privacy notice; DPO oversight |
| 6. Cross-tenant leak | PostgreSQL RLS + CI security gate | Code review policy; penetration testing |
| 7. LLM without consent | `llm-consent.guard.ts` + CI test | Consent management UI; DPO audit rights |

---

## Section 5 — DPO Consultation

| Field | Value |
|---|---|
| **DPO Name** | [TO BE APPOINTED] |
| **Consultation Date** | [Pending DPO appointment] |
| **DPO Opinion** | [Pending] |
| **DPO Signature** | [Pending] |
| **Resolution of DPO Objections** | N/A — pending |

> **Action Required:** DPO must be appointed and this DPIA presented for review before System C (AI Grading) is enabled in production. Systems A and B may proceed with current mitigations pending DPO appointment, subject to interim CISO sign-off.

**Interim CISO Sign-off (pending DPO):**
- Name: [CISO to sign]
- Date: [Pending]
- Scope: Systems A and B only — System C (AI grading in production) deferred until DPO review complete

---

## Section 6 — Residual Risk Assessment

| Risk | Pre-Mitigation Score | Residual Score | Acceptable? |
|---|---|---|---|
| 1. Unauthorised access | 15 | 4 (2×2) | Yes |
| 2. Re-identification | 9 | 3 (1×3) | Yes |
| 3. Discriminatory grading | 12 | 6 (2×3) | Conditionally — requires annual audit |
| 4. Data breach | 10 | 4 (2×2) | Yes |
| 5. Excessive profiling | 9 | 4 (2×2) | Yes |
| 6. Cross-tenant leak | 10 | 2 (1×2) | Yes |
| 7. LLM without consent | 10 | 2 (1×2) | Yes |

**Overall Residual Risk: MEDIUM-LOW**

The residual risk for discriminatory grading (Risk 3, score 6) is conditionally acceptable, subject to:
- Annual bias audit of AI grading outcomes
- Mandatory human review maintained permanently (not configurable off)
- Appeal mechanism operational and tested
- Instructor override frequency monitored and reported to DPO annually

---

## Section 7 — Review Schedule

| Event | Action |
|---|---|
| Annual review | March 2027 — full DPIA re-assessment |
| New LLM provider added | DPIA addendum required before activation |
| AI grading model updated | Bias re-assessment required |
| Data breach incident | Emergency DPIA review within 14 days of incident closure |
| Regulatory guidance update (WP29/EDPB) | Review for compliance impact within 60 days |
| Scale increase beyond 500k users | Re-assess re-identification and breach impact scores |

---

*Document owner: DPO (to be appointed) / CISO (interim) | Stored at: `docs/compliance/DPIA.md`*
*Related documents: `ROPA.md`, `BREACH-NOTIFICATION-PROCEDURE.md`, `EU-AI-ACT-TECHNICAL-DOCUMENTATION.md`*
