# EduSphere AI Model Cards

## EU AI Act Compliance (Art.50 / Art.53 Transparency Requirements)

This document provides transparency information for all AI systems deployed within the EduSphere platform, in compliance with the EU AI Act transparency obligations.

## High-Risk Classification

EduSphere's AI systems fall under **high-risk** classification per Annex III of the EU AI Act, as they are used in educational and vocational training contexts. The following controls are applied:

- Conformity assessment completed before deployment
- Quality management system in place
- Technical documentation maintained (this document)
- Logging and traceability enabled for all AI decisions

## AI Agent Types

EduSphere deploys the following AI agent types:

| Agent | Purpose | Model | Risk Level |
|-------|---------|-------|------------|
| Chavruta Debate Agent | Socratic dialogue partner for learners | Ollama (dev) / GPT-4 (prod) | High-Risk |
| Quiz Generation Agent | Adaptive quiz creation from content | Ollama (dev) / GPT-4 (prod) | High-Risk |
| Tutor Agent | Personalized tutoring and explanation | Ollama (dev) / GPT-4 (prod) | High-Risk |
| Assessment Agent | Automated grading and feedback | Ollama (dev) / GPT-4 (prod) | High-Risk |
| Content Summarizer | Summarize course materials | nomic-embed-text / text-embedding-3-small | Medium |
| Knowledge Graph Indexer | Extract concepts and relationships | nomic-embed-text | Medium |

## Data Retention

- AI conversation logs: retained for 90 days, then anonymized
- Model inference metadata: retained for 12 months for audit purposes
- Embeddings: retained as long as source content exists, deleted on content removal
- Agent session state (LangGraph checkpoints): 30-day retention, then purged
- See `DATA_RETENTION_POLICY.md` for full retention schedule

## Human Oversight

All AI agent interactions include human oversight mechanisms:

- **Instructor review**: Instructors can review AI-generated quiz questions before publishing
- **Confidence thresholds**: AI responses below confidence threshold are flagged for human review
- **Appeal mechanism**: Learners can flag AI-generated assessments for instructor review
- **Kill switch**: Organization admins can disable any AI agent type per tenant
- **Audit trail**: All AI decisions are logged with full traceability (tenant, user, session, input/output)

## Opt-Out Information

Users have the right to opt out of AI-powered features in accordance with GDPR Article 21 (right to object) and Article 22 (automated decision-making):

- **Per-feature opt-out**: Users can disable AI tutoring, AI-generated quizzes, and AI assessments in their profile settings
- **Global AI opt-out**: Users can request complete exclusion from all AI processing via the privacy settings panel
- **Third-party LLM consent**: Before any data is sent to external LLM providers (OpenAI, Anthropic), explicit user consent is required (SI-10 compliance)
- **Data deletion**: Users can request deletion of all AI interaction history under GDPR Art.17 (right to erasure)

## Model Training

- EduSphere does **not** use user data to train or fine-tune any AI models
- All LLM providers are contractually prohibited from using EduSphere data for training
- Embeddings are generated locally (Ollama in dev) or via API (OpenAI in prod) with data processing agreements in place
