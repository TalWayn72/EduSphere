# AI Usage Policy

**Document ID:** POL-010
**Version:** 1.0
**Classification:** Internal
**Owner:** CISO + CTO
**Last Reviewed:** 2026-02-22
**Next Review:** 2027-02-22
**Regulations:** EU AI Act 2024/1689, GDPR Art.22, SI-10

---

## 1. Purpose

Govern the use of AI systems within EduSphere's educational platform to ensure transparency, fairness, human oversight, and compliance with EU AI Act requirements.

## 2. AI System Inventory

EduSphere operates AI systems at three layers:

### Layer 1 — LLM Abstraction (Vercel AI SDK v6)
- **Dev:** Ollama (local) — Llama 3, Mistral, nomic-embed-text
- **Prod:** OpenAI GPT-4o / Anthropic Claude (with user consent)
- **Risk classification:** Limited Risk (EU AI Act Art.50 — transparency obligations)

### Layer 2 — Agent Workflows (LangGraph.js)
- **Agents:** Assessment, Quiz Generator, Explainer, Chavruta Debate
- **Risk classification:** Limited Risk
- **Human oversight:** All agent outputs presented as recommendations; human review available

### Layer 3 — RAG Pipeline (LlamaIndex.TS)
- **Technique:** HybridRAG — pgvector semantic + Apache AGE graph traversal
- **Risk classification:** Minimal Risk (information retrieval, no decisions)

## 3. Prohibited AI Uses

EduSphere AI systems **must not** be used for:
- Biometric identification or surveillance of students
- Real-time emotion recognition
- Social scoring of individuals
- Making legally binding educational decisions without human review
- Processing data of children under 13 without parental consent
- Training AI models on user data without explicit consent

## 4. Consent Requirements (SI-10)

### Mandatory Consent Before Any LLM Processing

```typescript
// apps/subgraph-agent/src/ai/llm-consent.guard.ts
// IRON RULE: Check THIRD_PARTY_LLM + AI_PROCESSING consent
// before forwarding any user data to OpenAI or Anthropic
if (!hasConsent(userId, 'THIRD_PARTY_LLM')) {
  throw new ConsentRequiredException('THIRD_PARTY_LLM');
}
```

| Consent Type | Required For | Revocable |
|-------------|-------------|----------|
| `AI_PROCESSING` | Any AI personalization (local LLM) | Yes — immediate |
| `THIRD_PARTY_LLM` | OpenAI / Anthropic processing | Yes — immediate |

### Fallback Without Consent
- `AI_PROCESSING` not granted: Platform works; AI features disabled
- `THIRD_PARTY_LLM` not granted: Local Ollama only; OpenAI/Anthropic never called

## 5. EU AI Act Compliance

### Art.50 — Transparency Obligations
Every AI-generated response includes:
- Visual indicator: "Generated with AI assistance"
- Agent type disclosure: Assessment AI, Quiz AI, etc.
- Accuracy disclaimer in educational context
- Implemented in: `apps/subgraph-agent/src/ai/ai-transparency.ts`

### Art.53 — Model Cards
All AI models publish model cards at `docs/security/MODEL_CARDS.md`:
- Model ID, provider, version
- Intended use cases
- Known limitations
- Performance metrics
- Privacy controls

### Art.13 — High-Risk AI Logging
All AI decisions are logged with:
- Input context (sanitized — no raw PII)
- Model used, temperature, max tokens
- Output confidence (where available)
- User action on recommendation (accepted/rejected)

## 6. PII Protection in AI Calls

PII scrubber middleware (`pii-scrubber.ts`) is applied **before every LLM call**:

```typescript
// Patterns scrubbed from all LLM inputs:
// - Email addresses → [EMAIL]
// - Israeli IDs → [ID_NUMBER]
// - Phone numbers → [PHONE]
// - IP addresses → [IP_ADDRESS]
// - Keycloak UUIDs → [USER_ID]
```

Scrubbing is logged (patterns matched, not values) for compliance audit.

## 7. AI Safety and Sandboxing

- All agent code execution runs in gVisor sandbox (multi-tenant safety)
- LangGraph state machines have explicit timeout (300 seconds default)
- Fire-and-forget agent tasks: `Promise.race(task, timeout(5min))`
- Unbounded Map/Array growth prevented with LRU eviction
- Agent output is never executed as code (output to UI only)

## 8. Human Oversight Requirements

| Decision Type | Human Review Required | Mechanism |
|--------------|----------------------|---------|
| Course completion assessment | Yes | Instructor review before final grade |
| Student flagged for support | Yes | Counselor notification |
| Content recommendation | No | AI-only; user can dismiss |
| Quiz question generation | Optional | Instructor can edit before publishing |

## 9. Bias and Fairness

- AI models evaluated for demographic bias before deployment
- Embedding models tested for language bias (Hebrew, Arabic, English)
- Bias incidents reported to AI Ethics Committee (email: ai-ethics@edusphere.dev)
- Quarterly review of AI decision patterns per student demographic

## 10. Staff AI Tools Policy

All staff using AI coding assistants (GitHub Copilot, Claude, etc.) must:
- Not input customer PII or RESTRICTED data into external AI tools
- Review AI-generated code for security before committing
- Attribute AI-generated code with `Co-Authored-By` in commit message

## 11. Related Documents

- [VENDOR_MANAGEMENT_POLICY.md](./VENDOR_MANAGEMENT_POLICY.md)
- [GDPR_COMPLIANCE_POLICY.md](./GDPR_COMPLIANCE_POLICY.md)
- [docs/security/MODEL_CARDS.md](../security/MODEL_CARDS.md)
- [apps/subgraph-agent/src/ai/llm-consent.guard.ts](../../apps/subgraph-agent/src/ai/llm-consent.guard.ts)
- [apps/subgraph-agent/src/ai/pii-scrubber.ts](../../apps/subgraph-agent/src/ai/pii-scrubber.ts)
- [apps/subgraph-agent/src/ai/ai-transparency.ts](../../apps/subgraph-agent/src/ai/ai-transparency.ts)
