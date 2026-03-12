# EU AI Act — Technical Documentation

**EU AI Act Article 11 — Technical Documentation for High-Risk AI Systems**

| Field | Value |
|---|---|
| **Organisation** | EduSphere Ltd |
| **Document Keeper** | Head of AI Engineering / DPO |
| **Initial Version** | 1.0 — March 2026 |
| **Retention Period** | 10 years from date of placing on market / putting into service (Art. 11(3)) |
| **Applies To** | AI systems deployed within EduSphere platform that qualify as high-risk or general-purpose AI |
| **Review Trigger** | Any material update to model, training data, or deployment scope |

> **Regulatory basis:** EU AI Act (Regulation 2024/1689), in force August 2024. High-risk AI systems in education (Annex III, point 3(b) — AI used to evaluate learning outcomes and assessments) require technical documentation under Art. 11 and conformity assessment before deployment in EU markets.

> **Classification note:** Chavruta AI Tutor and the Learning Path Recommendation Engine are assessed as Annex III high-risk systems as they are used to determine access to education and assess persons in an educational context. The Assessment Grading AI is also Annex III, point 3(b) — evaluating learning outcomes.

---

## System 1 — Chavruta AI Tutor

### 1.1 General Description

**System Name:** Chavruta AI Tutor
**Version:** 1.0 (March 2026)
**Intended Purpose:** Personalised AI tutoring through Socratic dialogue — engaging learners in structured question-answer and debate cycles to deepen understanding of educational content. The system is a pedagogical tool, not an assessor; it does not produce grades or make access decisions.
**Deployment Context:** EduSphere educational platform — all tenants with AI features enabled
**Implementation:** `apps/subgraph-agent/` — LangGraph.js state machine workflows
**AI Framework:** Vercel AI SDK v6 (LLM abstraction) + LangGraph.js (state machine agent)

### 1.2 Technical Description

**Architecture:**
```
LangGraph.js State Machine:
  assess → quiz → explain → debate → summarise
       ↑__________________________________|
       (loop until mastery threshold met)
```

**Models used:**
- Development / on-premises: Ollama + Llama 3 / Mistral (local, no data leaves infrastructure)
- Production (with consent): OpenAI GPT-4o or Anthropic Claude 3 Sonnet (via consent-gated API calls)
- Embedding: nomic-embed-text (768-dimensional, local via Ollama)

**Input data:**
- Current learner message (text)
- Conversation history (prior turns, last N turns with sliding window)
- Active concept context (from knowledge graph — concept node + related prerequisites)
- Learner mastery score for current concept (0–1 float)

**Output data:**
- AI tutor response (text)
- Suggested next state (assess / quiz / explain / debate)
- Updated mastery signal (provisional — confirmed by system after learner response)

**State persistence:**
- Conversation turns stored in PostgreSQL (`ai_sessions` table, RLS-isolated per tenant)
- LangGraph checkpointer wrapped in NestJS Injectable with OnModuleDestroy (memory safety)

### 1.3 Training and Development Approach

The Chavruta system does not train custom models. It uses pre-trained foundation models via API abstraction. The pedagogical state machine logic (assessment criteria, debate prompts, Socratic questioning patterns) is implemented as structured system prompts and graph state transitions in `apps/subgraph-agent/`.

No fine-tuning on learner data is performed without explicit DPA approval and updated DPIA.

### 1.4 Performance Metrics

| Metric | Target | Measurement Method |
|---|---|---|
| Response latency (P95) | < 3 seconds (local Ollama) | OpenTelemetry trace in Jaeger |
| Response latency (P95) | < 5 seconds (cloud LLM) | OpenTelemetry trace |
| Session completion rate | > 60% of sessions reach summarise state | Analytics aggregate |
| Learner mastery improvement | > 15% average mastery gain post-session | A/B comparison vs. static content |
| Consent compliance | 100% — no LLM calls without consent flag | `tests/security/ai-compliance.spec.ts` |
| Hallucination rate | Monitored — target < 5% flagged responses | Instructor review reports |

### 1.5 Known Limitations

- The system cannot detect learner distress or emotional states requiring human intervention — human instructor must remain available
- Responses may contain factual errors (hallucinations) — learners are instructed to verify information with course materials
- Performance degrades if conversation history exceeds context window — managed by sliding window truncation
- Language support: English primary; Hebrew supported via model capability; other languages not tested
- The system does not adapt for learners with cognitive disabilities — supplementary accessibility accommodations required via human instructor

### 1.6 Human Oversight Mechanism

- All AI responses are labelled "AI Tutor" in the UI — learners cannot be misled about AI nature (EU AI Act Art. 50 transparency obligation)
- Instructors can review all conversation histories in their cohort view
- Learners can report problematic AI responses via the "Flag this response" button (available on every AI turn)
- Flagged responses reviewed by human instructor within 5 business days
- Emergency exit: any mention of self-harm, crisis, or abuse in conversation triggers automatic message: "This is an AI tutor and cannot provide crisis support. Please contact [student support link]."

### 1.7 Monitoring Approach

- Conversation quality monitored via instructor review of flagged responses
- Latency and error rate monitored via Jaeger OpenTelemetry traces
- Consent compliance verified by CI security tests on every commit
- Quarterly review of learner satisfaction surveys including AI tutor experience
- Annual bias review: check if AI tutor responses differ in quality across demographic groups (language, institution type)

---

## System 2 — Learning Path Recommendation Engine

### 2.1 General Description

**System Name:** Learning Path Recommendation Engine
**Version:** 1.0 (March 2026)
**Intended Purpose:** Analyse individual learner's concept mastery and knowledge graph position to recommend the optimal next content module. Reduces time-to-mastery by sequencing learning more effectively than a fixed curriculum.
**Deployment Context:** All EduSphere tenants
**Implementation:** `apps/subgraph-knowledge/` — HybridRAG pipeline, Apache AGE graph traversal, pgvector semantic similarity

### 2.2 Technical Description

**Algorithm: HybridRAG (Hybrid Retrieval-Augmented Generation)**

Two parallel retrieval pathways fused before final ranking:
1. **Semantic similarity (pgvector):** 768-dim embedding of learner's current knowledge state vs. content embeddings. HNSW index, cosine similarity. Identifies conceptually adjacent content.
2. **Graph traversal (Apache AGE):** Cypher query on `edusphere_graph` knowledge graph. Traverses prerequisite edges from current mastered concepts to identify unlocked next concepts.

Fusion: both retrieval results scored and blended (weighted sum, weights configurable per tenant pedagogy). Top-K results returned as recommendations.

**Input data:**
- Learner user ID
- Mastery scores for all previously encountered concepts
- Current course context (tenant, course ID)
- Optional: explicit learner preference signals (clicked recommendations, skipped content)

**Output data:**
- Ordered list of recommended next content modules (up to N=5)
- Confidence score per recommendation (0–1)
- Explanation reason (for transparency: "Recommended because you've mastered [Concept X] and [Concept Y]")

**No LLM is used in the recommendation pipeline** — all computation is deterministic retrieval + scoring.

### 2.3 Fairness Considerations

**Identified risks:**
- Recommendations may perpetuate lower expectations for learners who start with lower mastery scores — "recommendation trap" where system keeps recommending remedial content
- Content embedding quality may be lower for non-English content, disadvantaging learners using translated materials

**Mitigations:**
- Minimum mastery threshold to unlock advanced content is configurable by instructor (not fixed by AI)
- Learners can override recommendations and choose any unlocked content manually
- Embedding quality monitoring: if Hebrew/other-language content has lower retrieval precision, flag for instructor review
- Fairness metrics tracked: recommendation distribution by starting mastery quintile — reviewed annually

### 2.4 Opt-Out Mechanism

Learners may disable AI-driven recommendations at any time via **Profile Settings → Learning Preferences → "Let me choose my own path."** In manual mode, all content is presented in default curriculum order with no AI prioritisation.

### 2.5 Human Oversight

- Instructors can configure recommendation parameters (prerequisite weights, minimum cohort agreement threshold before a recommendation is made)
- Instructors can add "instructor-required" tags to modules, forcing them into all learner paths regardless of AI recommendation
- All recommendation decisions logged — instructors can inspect why a specific content item was or was not recommended to a specific learner

### 2.6 Monitoring

- Recommendation click-through rate monitored (low CTR may indicate poor recommendation quality)
- Learning velocity compared between learners using AI recommendations vs. manual path
- Quarterly calibration: compare predicted mastery progression vs. actual assessment outcomes
- Bias audit: annual analysis of recommendation patterns by learner group

---

## System 3 — Assessment Grading AI

### 3.1 General Description

**System Name:** Assessment Grading AI
**Version:** 1.0 (March 2026)
**Intended Purpose:** Assist instructors in grading open-ended assessments (short-answer, essay) by producing a provisional grade and structured feedback. **The AI grade is never final.** Human instructor review and confirmation is mandatory before any grade is recorded.
**Deployment Context:** Opt-in — only activated for courses where instructor has explicitly enabled AI grading assistance
**Implementation:** `apps/subgraph-agent/` — grading agent template; `apps/subgraph-core/` — assessment records and grade confirmation workflow

### 3.2 Technical Description

**Decision Logic:**

```
1. Receive: answer text + assessment rubric + maximum marks
2. Analyse: compare answer against rubric criteria (LLM-powered)
3. Produce: provisional grade (0–max marks) + per-criterion breakdown + written feedback
4. Store: provisional grade with "PENDING_REVIEW" status — NOT visible to learner
5. Notify: instructor receives notification to review
6. Instructor action:
   a. Confirm grade → status "CONFIRMED" → visible to learner
   b. Override grade → instructor sets final grade → status "INSTRUCTOR_OVERRIDE" → visible to learner
   c. Return for re-grading → system re-runs with additional context
```

**Input data:**
- Answer text submitted by learner
- Rubric provided by instructor (mandatory — system refuses to grade without rubric)
- Maximum marks available
- Course and assessment context (not learner identity — blind grading by default)

**Output data:**
- Provisional grade (numeric)
- Per-rubric-criterion score and narrative justification
- Overall written feedback (formative, not evaluative labels)
- Confidence level (Low/Medium/High — based on answer length and rubric match quality)

**Blind grading:** Learner identity is not passed to the grading LLM — only the answer text and rubric. This prevents identity-based bias in AI grading.

### 3.3 Accuracy Metrics

Accuracy is measured against instructor confirmed/overridden grades at the end of each term.

| Metric | Target | Current (March 2026) |
|---|---|---|
| Grade alignment (AI provisional = instructor final, ±5%) | > 75% | Baseline collection in progress |
| Override rate | < 25% | Baseline collection in progress |
| Feedback helpfulness (learner survey) | > 3.5/5.0 | Baseline collection in progress |
| Turnaround time (submission to provisional grade) | < 2 minutes | OpenTelemetry trace |

> **Note:** Accuracy baselines will be collected during first production term. Targets will be revised based on observed performance.

### 3.4 Human Review Process

1. AI produces provisional grade → stored with `PENDING_REVIEW` status
2. Instructor notified within 5 minutes of submission
3. Instructor reviews in grading dashboard — sees: learner answer, rubric, AI grade, AI justification side by side
4. Instructor has three options: Confirm / Override / Return for re-grade
5. **Only CONFIRMED or INSTRUCTOR_OVERRIDE grades are released to learners**
6. All instructor decisions logged with timestamp for audit

### 3.5 Appeal Mechanism

Learners who receive a grade they dispute may:
1. Click "Appeal this grade" on their results page
2. Submit a written appeal explaining their reasoning
3. Appeal is routed to the instructor (not back to AI)
4. Instructor must review the appeal and respond within 10 business days
5. Instructor's appeal decision is final
6. All appeals and outcomes logged in the audit trail

Appeals are handled entirely by humans — the AI grading system has no role in the appeal process.

### 3.6 Prohibition on Fully Automated Grading

In compliance with GDPR Art. 22 and EU AI Act obligations, **automated-only grading (without human confirmation) is architecturally prohibited.** The grade status state machine (`PENDING_REVIEW → CONFIRMED / INSTRUCTOR_OVERRIDE`) cannot be bypassed by any API call. This is enforced at the GraphQL resolver level with `@requiresRole(roles: [INSTRUCTOR, ORG_ADMIN])` on the grade confirmation mutation.

---

## Section 4 — General Provisions

### 4.1 Data Governance for AI Systems

All three AI systems comply with the following data governance requirements:

| Requirement | Implementation |
|---|---|
| Data minimisation | AI systems receive only the minimum data needed for their specific task |
| Purpose limitation | AI outputs used only for the declared educational purpose |
| Consent for third-party LLM | SI-10 invariant: consent gate enforced in code (`llm-consent.guard.ts`) |
| Right to explanation | Recommendation explanations and grading justifications provided to learners |
| Opt-out | Recommendation engine opt-out in profile settings; AI grading is instructor opt-in per course |
| Audit trail | All AI decisions logged with `tenantId`, `userId`, `timestamp`, `outcome` |

### 4.2 EU AI Act Conformity Obligations

| Obligation | Article | Status |
|---|---|---|
| Technical documentation | Art. 11 | This document |
| Automatic logging | Art. 12 | Pino + Jaeger — implemented |
| Transparency to users | Art. 13 | AI labels on all AI interactions — implemented |
| Human oversight | Art. 14 | Instructor review mandatory for grading — implemented |
| Accuracy, robustness | Art. 15 | Metrics tracked (see per-system sections) — baseline in progress |
| Conformity assessment | Art. 43 | Required before EU commercial deployment — in progress |
| EU declaration of conformity | Art. 47 | Required before EU market placement — pending |
| Registration in EU database | Art. 49 | Required before EU market placement — pending |

### 4.3 Prohibited AI Practices (EU AI Act Title II)

EduSphere AI systems are verified as NOT implementing any prohibited practices:

- [x] No subliminal manipulation of learners
- [x] No exploitation of vulnerabilities (age, disability, social situation)
- [x] No social scoring based on personal characteristics
- [x] No real-time biometric identification in public spaces
- [x] No emotion recognition in educational context for admissions or grading (AU AI Act Art. 5(1)(f))

> **Note on emotion recognition:** The Chavruta system does not perform emotion recognition. Sentiment analysis, if enabled, is used only to detect distress for safeguarding purposes (trigger safety message) — not for grading or access decisions.

---

## Section 5 — Version History

| Version | Date | Changes | Author |
|---|---|---|---|
| 1.0 | March 2026 | Initial documentation — all three systems | EduSphere Engineering |

---

*Document owner: Head of AI Engineering / DPO (on appointment)*
*Retention: 10 years from service commencement per EU AI Act Art. 11(3)*
*Stored at: `docs/compliance/EU-AI-ACT-TECHNICAL-DOCUMENTATION.md`*
*Related: `DPIA.md`, `ROPA.md` (Activity 3, 4, 11)*
