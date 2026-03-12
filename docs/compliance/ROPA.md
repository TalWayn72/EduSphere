# Records of Processing Activities (RoPA)

**GDPR Article 30 — Controller Record**

| Field | Value |
|---|---|
| **Organisation** | EduSphere Ltd |
| **Role** | Controller |
| **DPO Contact** | [TO BE APPOINTED] — dpo@edusphere.dev |
| **Last Updated** | March 2026 |
| **Document Version** | 1.0 |
| **Review Cycle** | Annual (or on material change) |

> This record is maintained pursuant to GDPR Art. 30(1) and Israeli Privacy Protection Regulations 2023.
> Processor records for each vendor are maintained in the Vendor Register (see `docs/legal/VENDOR-REGISTER.md`).

---

## Activity 1 — User Account Management

| Field | Detail |
|---|---|
| **Activity Name** | User account registration, authentication and profile management |
| **Controller Department** | Engineering / Identity |
| **Purpose of Processing** | Create and maintain user accounts; authenticate users; manage role-based access; fulfil contractual obligations to provide the platform |
| **Legal Basis (Art. 6)** | Art. 6(1)(b) — performance of a contract |
| **Special Category Basis** | N/A |
| **Data Subjects** | Students, instructors, organisation administrators, researchers |
| **Categories of Personal Data** | Full name, email address, hashed password (bcrypt), tenant/organisation ID, user role, preferred language, account creation timestamp, last login timestamp |
| **Recipients** | Keycloak (identity provider, self-hosted); internal subgraph services via JWT propagation |
| **Third-Party Processors** | None (Keycloak deployed on-premises / organisation-controlled infrastructure) |
| **International Transfers** | None by default; subject to deployment region of organisation |
| **Retention Period** | Account lifetime + 2 years post-account closure (for audit); deleted on GDPR erasure request |
| **Security Measures** | Bcrypt password hashing (cost 12); JWT RS256 signing; brute-force protection in Keycloak (`bruteForceProtected: true, failureFactor: 5`); RLS via `withTenantContext()` in `packages/db/src/rls/rls.helpers.ts`; AES-256-GCM encryption for PII fields via `packages/db/src/helpers/encryption.ts` |

---

## Activity 2 — Learning Progress Tracking

| Field | Detail |
|---|---|
| **Activity Name** | Course progress, assessment results, grade tracking |
| **Controller Department** | Engineering / Core Subgraph |
| **Purpose of Processing** | Track learner progress through course modules; record assessment scores; generate completion certificates; enable instructors to monitor cohort performance |
| **Legal Basis (Art. 6)** | Art. 6(1)(b) — performance of a contract; Art. 6(1)(f) — legitimate interest (platform improvement analytics, aggregated only) |
| **Special Category Basis** | N/A |
| **Data Subjects** | Students, researchers |
| **Categories of Personal Data** | User ID (pseudonymous), course ID, module completion events with timestamps, quiz scores, time-on-task, learning velocity metrics |
| **Recipients** | Internal: subgraph-core, subgraph-knowledge (for recommendations); instructors (aggregated cohort view only) |
| **Third-Party Processors** | None |
| **International Transfers** | None |
| **Retention Period** | Duration of enrolment + 5 years (legal obligation for academic records); anonymised aggregates retained indefinitely |
| **Security Measures** | RLS per-tenant isolation; pseudonymous user IDs in analytics tables; migration `0019` (learning velocity) — user_id foreign key with CASCADE delete; `withTenantContext()` on all queries |

---

## Activity 3 — AI Tutoring Sessions (Chavruta)

| Field | Detail |
|---|---|
| **Activity Name** | AI Chavruta tutoring — conversation storage and processing |
| **Controller Department** | Engineering / Agent Subgraph |
| **Purpose of Processing** | Provide personalised AI tutoring via Socratic dialogue; store conversation history to maintain session continuity and enable review; improve tutor quality (subject to consent) |
| **Legal Basis (Art. 6)** | Art. 6(1)(b) — performance of a contract (core tutoring function) |
| **Special Category Basis** | Potentially Art. 9(2)(a) — explicit consent — if conversation content reveals health, religious, or political information |
| **Data Subjects** | Students |
| **Categories of Personal Data** | User ID, session ID, conversation messages (user and AI turns), timestamps, topic/concept context, emotional tone signals (if sentiment analysis enabled) |
| **Recipients** | Internal: subgraph-agent (storage); third-party LLMs only with explicit consent (see Activity 11) |
| **Third-Party Processors** | OpenAI (optional, consent-gated); Anthropic (optional, consent-gated) — see Activity 11 |
| **International Transfers** | To USA via OpenAI/Anthropic if consent granted and production LLM active; safeguard: SCCs + OpenAI Data Processing Addendum |
| **Retention Period** | 90 days active session history; archived 1 year; deleted on erasure request |
| **Security Measures** | Conversation content encrypted at rest (AES-256-GCM); consent gate enforced via `apps/subgraph-agent/src/guards/llm-consent.guard.ts`; SI-10 invariant: never forward to third-party LLM without `THIRD_PARTY_LLM` consent flag; `withTenantContext()` on all DB reads |

---

## Activity 4 — Knowledge Graph Personalisation

| Field | Detail |
|---|---|
| **Activity Name** | Learning path generation and content recommendations via knowledge graph |
| **Controller Department** | Engineering / Knowledge Subgraph |
| **Purpose of Processing** | Build personalised learning paths by analysing concept mastery; recommend next content; surface knowledge gaps |
| **Legal Basis (Art. 6)** | Art. 6(1)(b) — performance of a contract |
| **Special Category Basis** | N/A |
| **Data Subjects** | Students |
| **Categories of Personal Data** | User ID, concept mastery scores (0–1 float), learning path decisions, recommended concept edges, embedding vectors (768-dim, non-invertible) |
| **Recipients** | Internal subgraphs only |
| **Third-Party Processors** | Ollama (local, no data leaves infrastructure in dev); nomic-embed-text embeddings generated locally |
| **International Transfers** | None (embeddings generated on-premises) |
| **Retention Period** | Lifetime of user account; mastery scores deleted on erasure request; anonymised aggregate vectors may be retained |
| **Security Measures** | Apache AGE graph queries parameterised (no Cypher injection); pgvector HNSW indexes do not store raw PII; RLS on all graph-adjacent relational tables; embedding vectors stored in `vector` columns, not reversible to source text |

---

## Activity 5 — Video Transcription

| Field | Detail |
|---|---|
| **Activity Name** | Audio/video transcription via faster-whisper |
| **Controller Department** | Engineering / Transcription Worker |
| **Purpose of Processing** | Generate text transcripts of instructional videos for accessibility, searchability, and knowledge graph indexing |
| **Legal Basis (Art. 6)** | Art. 6(1)(b) — performance of a contract (accessibility obligation); Art. 6(1)(c) — legal obligation (IS 5568 accessibility) |
| **Special Category Basis** | Audio may incidentally capture biometric voice data — Art. 9(2)(a) explicit consent required if voice is used for identification |
| **Data Subjects** | Instructors (whose voice appears in recordings); students (if recorded in live sessions) |
| **Categories of Personal Data** | Audio file (biometric-adjacent), transcript text, speaker diarisation labels, timestamps, video/media ID |
| **Recipients** | Internal: MinIO object store (audio files), subgraph-content (transcripts) |
| **Third-Party Processors** | None — faster-whisper runs on-premises GPU |
| **International Transfers** | None |
| **Retention Period** | Audio source file: 7 years (academic record); transcript: lifetime of course content; deleted with content on takedown |
| **Security Measures** | MinIO server-side encryption (AES-256); audio files stored with tenant-scoped bucket prefix; `apps/transcription-worker` runs in isolated container; ClamAV scan before processing (`apps/subgraph-content/src/clamav/clamav.service.ts`) |

---

## Activity 6 — Certificate Generation

| Field | Detail |
|---|---|
| **Activity Name** | Completion certificate issuance and Open Badge credential generation |
| **Controller Department** | Engineering / Content Subgraph |
| **Purpose of Processing** | Issue verifiable proof of course completion; generate Open Badge 3.0 credentials shareable with third parties |
| **Legal Basis (Art. 6)** | Art. 6(1)(b) — performance of a contract |
| **Special Category Basis** | N/A |
| **Data Subjects** | Students |
| **Categories of Personal Data** | Full name, email address, course title, completion date, grade (if applicable), issuer name (instructor/organisation), cryptographic signature |
| **Recipients** | Student (PDF/badge download); optionally Open Badge ecosystem (if student shares externally — student-initiated, student controls) |
| **Third-Party Processors** | None for issuance; student may share badge to LinkedIn etc. at their discretion |
| **International Transfers** | Only if student self-initiates sharing to third-party platforms |
| **Retention Period** | 10 years (academic credential standard); signed credential is student property |
| **Security Measures** | Certificates signed with organisation private key; `apps/subgraph-content/src/open-badges/open-badge.service.ts`; `apps/subgraph-content/src/certificate/graph-credential.service.ts`; stored in MinIO with AES-256 |

---

## Activity 7 — Cohort Analytics

| Field | Detail |
|---|---|
| **Activity Name** | Aggregated learning analytics for instructors and organisation administrators |
| **Controller Department** | Engineering / Knowledge Subgraph |
| **Purpose of Processing** | Provide instructors with cohort-level performance insights (completion rates, average scores, learning velocity distributions); enable evidence-based course improvement |
| **Legal Basis (Art. 6)** | Art. 6(1)(f) — legitimate interest (educational quality improvement); interest balancing assessment on file |
| **Special Category Basis** | N/A |
| **Data Subjects** | Students (indirectly — data aggregated) |
| **Categories of Personal Data** | Aggregated: completion percentages, score distributions, engagement time bands — no individual-level data exposed to instructors unless they are the direct assessor |
| **Recipients** | Instructors (own cohort only); organisation administrators (their tenant only) |
| **Third-Party Processors** | None |
| **International Transfers** | None |
| **Retention Period** | Aggregated snapshots retained 3 years; underlying per-user records per Activity 2 retention |
| **Security Measures** | `apps/subgraph-knowledge/src/cohort-insights/cohort-insights.service.ts`; minimum cohort size threshold (n≥5) before displaying aggregates to prevent re-identification; RLS enforced — instructors cannot query other tenants; `@requiresRole(roles: [INSTRUCTOR, ORG_ADMIN])` GraphQL directive |

---

## Activity 8 — Push Notifications

| Field | Detail |
|---|---|
| **Activity Name** | Mobile and web push notification delivery |
| **Controller Department** | Engineering / Core Subgraph |
| **Purpose of Processing** | Deliver timely in-app and push notifications for learning reminders, assignment deadlines, live session alerts, and system messages |
| **Legal Basis (Art. 6)** | Art. 6(1)(b) — performance of a contract; Art. 6(1)(a) — consent (for marketing/promotional notifications) |
| **Special Category Basis** | N/A |
| **Data Subjects** | Students, instructors |
| **Categories of Personal Data** | User ID, device push token (Expo Push Token or VAPID web-push subscription), notification preferences, notification delivery timestamps |
| **Recipients** | Expo Push API (for mobile); Web Push (VAPID, no third-party server — browser-direct); Apple APNs / Google FCM (via Expo as intermediary) |
| **Third-Party Processors** | Expo (Data Processing Agreement in place); Apple APNs; Google FCM — all receive device tokens, not message content in full |
| **International Transfers** | USA (Expo, Apple, Google) — safeguard: SCCs + adequacy decision reliance where available |
| **Retention Period** | Push tokens stored until user revokes or uninstalls; automatically purged on erasure request |
| **Security Measures** | Push tokens stored in `push_tokens` table (migration `0018`); tokens treated as credentials — encrypted at rest; `@requiresScopes(scopes: ["notifications:manage"])` on registration mutation; user can revoke via profile settings |

---

## Activity 9 — Audit Logging

| Field | Detail |
|---|---|
| **Activity Name** | Security event and access audit logging |
| **Controller Department** | Engineering / Security |
| **Purpose of Processing** | Maintain tamper-evident log of authentication events, data access, administrative actions, and security incidents for compliance, forensics, and breach detection |
| **Legal Basis (Art. 6)** | Art. 6(1)(c) — legal obligation (GDPR Art. 32 security requirement; Israeli PPR 2023 §12) |
| **Special Category Basis** | N/A |
| **Data Subjects** | All platform users |
| **Categories of Personal Data** | User ID, IP address, user agent, action performed, resource accessed, timestamp, tenant ID, outcome (success/fail) |
| **Recipients** | CISO / Security team (internal); DPA on lawful request |
| **Third-Party Processors** | Jaeger (OpenTelemetry trace collector — self-hosted) |
| **International Transfers** | None (Jaeger self-hosted) |
| **Retention Period** | 2 years (security audit standard); critical incident logs 5 years |
| **Security Measures** | Audit logs are append-only; write access restricted to logging service account; Pino structured logging (`tenantId`, `userId`, `requestId`); Jaeger traces retained in-cluster; logs cannot be deleted by application users |

---

## Activity 10 — Email Notifications

| Field | Detail |
|---|---|
| **Activity Name** | Transactional and system email delivery |
| **Controller Department** | Engineering / Core Subgraph |
| **Purpose of Processing** | Send account verification emails, password reset links, course progress summaries, assignment feedback notifications, and system alerts |
| **Legal Basis (Art. 6)** | Art. 6(1)(b) — performance of a contract (transactional); Art. 6(1)(a) — consent (digest/newsletter emails) |
| **Special Category Basis** | N/A |
| **Data Subjects** | All platform users |
| **Categories of Personal Data** | Email address, full name (salutation), notification content (may reference course progress), delivery timestamp, open/click metrics (if tracking enabled) |
| **Recipients** | Email service provider (SMTP relay — vendor to be configured per deployment) |
| **Third-Party Processors** | SMTP provider (e.g., SendGrid / SES — DPA required before deployment) |
| **International Transfers** | Dependent on SMTP provider region — SCCs required if outside EEA |
| **Retention Period** | Email delivery logs: 90 days; underlying user email address: per Activity 1 |
| **Security Measures** | TLS enforced for SMTP delivery (STARTTLS/TLS); no PII in email subject lines; unsubscribe link mandatory in all non-transactional emails; DKIM/SPF/DMARC required on sending domain |

---

## Activity 11 — Third-Party LLM Processing

| Field | Detail |
|---|---|
| **Activity Name** | Processing user conversation data via OpenAI / Anthropic APIs (consent-gated) |
| **Controller Department** | Engineering / Agent Subgraph |
| **Purpose of Processing** | Enhance AI tutoring quality using frontier LLMs in production; only activated after explicit user consent to third-party AI processing |
| **Legal Basis (Art. 6)** | Art. 6(1)(a) — explicit consent |
| **Special Category Basis** | Art. 9(2)(a) — explicit consent (conversation may contain special category data) |
| **Data Subjects** | Students who have granted consent |
| **Categories of Personal Data** | Pseudonymised conversation messages (system prompt + user turns); no direct identifiers sent to LLM API |
| **Recipients** | OpenAI (USA); Anthropic (USA) |
| **Third-Party Processors** | OpenAI — DPA at platform.openai.com/docs/data-privacy; Anthropic — DPA at anthropic.com/legal/privacy |
| **International Transfers** | USA — safeguard: SCCs (OpenAI DPA includes SCCs); adequacy decision not yet issued for USA under EU GDPR |
| **Retention Period** | Data sent to LLM API is not retained by EduSphere beyond the API call; OpenAI/Anthropic retention per their DPAs (typically 0–30 days) |
| **Security Measures** | SI-10 invariant enforced: `CONSENT_REQUIRED` error thrown if `THIRD_PARTY_LLM` consent absent (`apps/subgraph-agent/src/guards/llm-consent.guard.ts`); messages pseudonymised before API call (`JSON.stringify({task, data})` pattern); Zero Data Retention option negotiated with OpenAI where available |

---

## Activity 12 — Live Session Recordings

| Field | Detail |
|---|---|
| **Activity Name** | Recording of live virtual learning sessions |
| **Controller Department** | Engineering / Collaboration Subgraph |
| **Purpose of Processing** | Record instructor-led live sessions for asynchronous replay; generate transcripts; create knowledge graph annotations from session content |
| **Legal Basis (Art. 6)** | Art. 6(1)(a) — consent of all participants prior to recording start |
| **Special Category Basis** | Biometric voice data — Art. 9(2)(a) explicit consent required; video may capture physical appearance — consider if sensitive |
| **Data Subjects** | Instructors, students who join live sessions |
| **Categories of Personal Data** | Audio/video stream, participant list (user IDs + display names), chat messages, timestamps, attendance duration |
| **Recipients** | Internal: MinIO (recording storage); subgraph-content (transcript); enrolled students (replay access) |
| **Third-Party Processors** | None — recording processed on-premises |
| **International Transfers** | None |
| **Retention Period** | Recording: 1 year post-session; participant can request removal of their image/voice within 30 days |
| **Security Measures** | Recording only starts after all participants acknowledge consent banner; consent stored as audit event; recordings stored in tenant-scoped MinIO bucket with AES-256; access controlled via `@authenticated` + enrolment check; `live_sessions` table with `si3_attendee_password_enc` field (migration `0012`) |

---

## Appendix A — Legal Basis Summary

| Activity | Art. 6 Basis | Art. 9 Basis |
|---|---|---|
| 1. Account Management | 6(1)(b) Contract | — |
| 2. Progress Tracking | 6(1)(b) Contract + 6(1)(f) LI | — |
| 3. AI Tutoring (Chavruta) | 6(1)(b) Contract | 9(2)(a) Consent (if special cat.) |
| 4. KG Personalisation | 6(1)(b) Contract | — |
| 5. Video Transcription | 6(1)(b) Contract + 6(1)(c) Legal | 9(2)(a) Consent (voice biometric) |
| 6. Certificate Generation | 6(1)(b) Contract | — |
| 7. Cohort Analytics | 6(1)(f) Legitimate Interest | — |
| 8. Push Notifications | 6(1)(b) Contract + 6(1)(a) Consent | — |
| 9. Audit Logging | 6(1)(c) Legal Obligation | — |
| 10. Email Notifications | 6(1)(b) Contract + 6(1)(a) Consent | — |
| 11. Third-Party LLM | 6(1)(a) Explicit Consent | 9(2)(a) Explicit Consent |
| 12. Live Session Recording | 6(1)(a) Consent | 9(2)(a) Consent (biometric) |

---

## Appendix B — Data Subject Rights Mapping

| Right | Mechanism | Responsible System |
|---|---|---|
| Access (Art. 15) | User profile export API | subgraph-core: `exportUserData` mutation |
| Rectification (Art. 16) | Profile settings page | subgraph-core: `updateProfile` mutation |
| Erasure (Art. 17) | Account deletion + CASCADE | `gdpr-erasure.spec.ts`; CASCADE delete on `users` table |
| Restriction (Art. 18) | Admin manual process (pending automation) | DPO coordinates |
| Portability (Art. 20) | JSON export via `exportUserData` | subgraph-core: `tests/security/gdpr-erasure.spec.ts` |
| Object (Art. 21) | Consent withdrawal + LI objection form | Consent management (`tests/security/consent-management.spec.ts`) |
| Automated Decision Review (Art. 22) | Human instructor review of AI grades | See DPIA Activity 3 (Assessment Grading AI) |

---

*Document owner: DPO (to be appointed) | Next review: March 2027*
*Stored at: `docs/compliance/ROPA.md` | Version controlled in Git*
