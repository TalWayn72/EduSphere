# AI Model Cards — EU AI Act Art.53 Compliance

## Overview

This document provides model cards for all AI agents and models used by EduSphere,
in accordance with EU AI Act Art.50 and Art.53 transparency requirements.

---

## 1. Chavruta Debate Agent

| Field | Value |
|-------|-------|
| **Agent Type** | Conversational AI Agent (LangGraph.js state machine) |
| **Purpose** | Socratic debate facilitation for educational content |
| **Risk Classification** | High-Risk (educational AI system per EU AI Act Annex III) |
| **Human Oversight** | Instructor can pause/terminate any agent session; all outputs logged |
| **Underlying Models** | Ollama (dev): llama3.2 / OpenAI gpt-4o (prod) / Anthropic claude-3-5-sonnet (prod) |
| **Data Retention** | Agent session logs: 90 days (configurable per tenant); embeddings: lifetime of course |
| **Opt-Out** | Users may opt out of AI-assisted sessions at any time; instructors can disable per course |

---

## 2. HybridRAG Knowledge Graph Agent

| Field | Value |
|-------|-------|
| **Agent Type** | Retrieval-Augmented Generation Agent |
| **Purpose** | Semantic search over course content using pgvector + Apache AGE |
| **Risk Classification** | High-Risk (educational recommendation system) |
| **Human Oversight** | All retrieved context is auditable; instructors can flag incorrect answers |
| **Underlying Models** | nomic-embed-text (dev) / text-embedding-3-small (prod) |
| **Data Retention** | Embeddings retained for course lifetime; query logs: 30 days |
| **Opt-Out** | Students may opt out of personalized recommendations |

---

## 3. Assessment & Quiz Agent

| Field | Value |
|-------|-------|
| **Agent Type** | Automated assessment agent |
| **Purpose** | Generate and grade quiz questions based on learning objectives |
| **Risk Classification** | High-Risk (automated scoring with educational consequence) |
| **Human Oversight** | All automated grades are reviewable and overridable by instructors |
| **Underlying Models** | OpenAI gpt-4o / Anthropic claude-3-5-sonnet (prod, consent-gated) |
| **Data Retention** | Assessment results: retained per GDPR data retention policy (3 years academic) |
| **Opt-Out** | Students may request human grading review for any automated assessment |

---

## EU AI Act Compliance Statement

- **Art.50 Transparency:** Users are informed when interacting with an AI agent via visible UI indicator.
- **Art.53 Documentation:** This MODEL_CARDS.md constitutes the technical documentation per Art.53(1).
- **High-Risk Classification:** EduSphere AI systems that produce educational assessments fall under Annex III category 5 (education and vocational training).
- **Human Oversight:** Per Art.14, all high-risk AI outputs include instructor override capability.
- **GDPR Alignment:** Opt-Out mechanisms comply with GDPR Art.21 (right to object to automated processing).
- **Third-Party LLM Consent:** External model calls (OpenAI, Anthropic) require `THIRD_PARTY_LLM` consent flag per SI-10.

---

## Data Retention Summary

| Data Type | Retention Period | Basis |
|-----------|-----------------|-------|
| Agent conversation logs | 90 days | Operational necessity |
| Embeddings (course content) | Course lifetime | Educational contract |
| Assessment results | 3 years | Academic records obligation |
| Query logs | 30 days | Security monitoring |

---

## Opt-Out Procedures

Users may opt out of AI features by:
1. Navigating to Account Settings > AI Preferences
2. Toggling "AI-Assisted Learning" to off
3. Requesting human grading via the assessment review form

Instructors may disable AI features at the course level via Course Settings > AI Configuration.

---

*Last Updated: March 2026 | Maintained by: EduSphere Security Team*
