# EduSphere — תוכנית ציות מלאה: נגישות + אבטחה
## Product Manager Research Report | March 2026

---

## Context

EduSphere היא פלטפורמת EdTech AI-first ל-100,000+ משתמשים בו-זמנית. המחקר הזה נדרש כדי:
1. לקבוע את מצב הציות הנוכחי לתקני נגישות ואבטחה
2. לזהות פערים קריטיים המהווים סיכון משפטי ורגולטורי
3. להניח תוכנית פעולה מפורטת ומתועדפת לסגירת הפערים

---

# חלק א׳ — נגישות (Accessibility)

## מצב נוכחי: ~92-95% WCAG 2.2 AA

### מה כבר מיושם ✅

| תחום | קובץ | WCAG SC |
|------|------|---------|
| Skip Links | `apps/web/src/components/a11y/SkipLinks.tsx` | 2.4.1 |
| Focus Trap (מודלים) | `apps/web/src/hooks/useFocusTrap.ts` | 2.4.3 |
| Live Regions | `apps/web/src/hooks/useAnnounce.ts` | 4.1.3 |
| Focus Visible 3px | `apps/web/src/styles/globals.css` | 2.4.11 |
| Target Size 24×24px | `apps/web/src/styles/globals.css` | 2.5.8 |
| ARIA Landmarks | `Layout.tsx`, `AppSidebar.tsx` | 1.3.1 |
| Form Labels | כל קומפוננטות טופס | 3.3.2 |
| Alt Text | כל תגיות `<img>` | 1.1.1 |
| ניגודיות צבעים ≥4.5:1 | CSS custom properties | 1.4.3 |
| Reduced Motion | `apps/web/src/hooks/useReducedMotion.ts` | 2.3.3 |
| RTL + עברית | `globals.css` | - |
| axe-core zero violations | `apps/web/e2e/accessibility.spec.ts` (377 שורות) | הכל |
| AccessibilityStatementPage | `apps/web/src/pages/AccessibilityStatementPage.tsx` | IS 5568 |

### פערים קריטיים ❌

| עדיפות | פער | WCAG SC | חוקים שנפגעים | מורכבות |
|--------|-----|---------|--------------|---------|
| **P0** | Drag-and-drop ללא חלופת מקלדת (`DragOrderQuestion.tsx`, Knowledge Graph) | 2.5.7 | ADA, IS 5568, EAA | גבוהה |
| **P0** | `lang` attribute לא עקבי על `<html>` | 3.1.1 | כל | נמוכה |
| **P0** | כתוביות לסרטוני וידאו prerecorded | 1.2.2 | כל (קריטי EdTech) | גבוהה |
| **P0** | Live captions ב-Live Sessions | 1.2.4 | כל | גבוהה מאוד |
| **P1** | ניגודיות hover states לא נבדקה | 1.4.3 | כל | נמוכה |
| **P1** | Mastery badges — צבע בלבד בהקשרים מסוימים | 1.4.1 | כל | נמוכה |
| **P1** | Screen reader audit (JAWS + NVDA + VoiceOver) | 4.1.2 | כל | בינונית |
| **P1** | Knowledge Graph: aria-label לצמתים, keyboard nav | 2.1.1 | כל | גבוהה |
| **P2** | MathML לתוכן מתמטי | 1.1.1 | EdTech | בינונית |
| **P2** | PDF accessibility (תעודות, מסמכי קורס) | EN 301 549 Ch.10 | EU, 508 | בינונית |
| **P2** | Consistent Help location (3.2.6 — חדש ב-2.2) | 3.2.6 | WCAG 2.2 | נמוכה |
| **P2** | Redundant Entry audit (3.3.7 — חדש ב-2.2) | 3.3.7 | WCAG 2.2 | נמוכה |
| **P2** | VPAT v2.5 (לרכישה פדרלית בארה"ב) | Section 508 | ממשלה | בינונית |
| **P3** | Audio Description לסרטונים חינוכיים | 1.2.5 | EU, ארה"ב | גבוהה |
| **P3** | Error prevention — confirm לפעולות הרסניות | 3.3.4 | WCAG 2.2 | נמוכה |

---

## חוקי נגישות החלים על EduSphere

| סמכות שיפוט | תקן | סטטוס | עדיפות |
|------------|-----|-------|--------|
| **ישראל** | IS 5568 = WCAG 2.1 AA | **אכיפה מיידית** — עד NIS 50,000 לתביעה | 🔴 P0 |
| **EU** | EAA / EN 301 549 / WCAG 2.1 AA | **נכנס לתוקף יוני 2025** — עד €100k (גרמניה) / €1M (ספרד) | 🔴 P0 |
| **ארה"ב פרטי** | ADA Title III / WCAG 2.1 AA | 8,800+ תביעות ב-2024; CA Unruh $4,000 לפגיעה | 🟡 P1 |
| **ארה"ב פדרלי** | Section 508 / WCAG 2.1 AA | נדרש VPAT לחוזים; deadline אפריל 2026 | 🟡 P1 |

**מחויבויות ייחודיות ישראל:**
- הצהרת נגישות בעברית (IS 5568 §4.1)
- מינוי רכז נגישות עם פרטי יצירת קשר
- כתוביות בעברית לתוכן וידאו

---

## תוכנית יישום — נגישות

### Phase A: 0–3 חודשים (P0 — חובה משפטית)

**Sprint 1 (שבועות 1-2): תשתית מיידית**
- [ ] Fix `lang` attribute — `applyDocumentDirection()` יגדיר גם `html.lang = 'he'/'en'`
  - קובץ: `apps/web/src/utils/i18n.ts` + `apps/web/index.html`
- [ ] מינוי רכז נגישות — הוסף פרטים ל-`AccessibilityStatementPage.tsx`
- [ ] הוסף `jest-axe` ל-component unit tests (`apps/web/src/components/__tests__/`)
- [ ] הוסף Lighthouse CI לפייפליין GitHub Actions (`.github/workflows/ci.yml`)

**Sprint 2 (שבועות 3-6): Drag & Drop (P0 — 2.5.7)**
- [ ] `apps/web/src/components/quiz/DragOrderQuestion.tsx` — הוסף Up/Down כפתורים
- [ ] `apps/web/src/components/knowledge-graph/KnowledgeSkillTree.tsx` — keyboard nav לצמתים (arrow keys + Space/Enter)
- [ ] Course reordering admin panel — keyboard alternative
- [ ] בדיקות regression ל-3 קומפוננטות אלה

**Sprint 3 (שבועות 6-12): כתוביות וידאו (P0 — 1.2.2)**
- [ ] `apps/transcription-worker/` — הפעל WebVTT output מ-faster-whisper
- [ ] `apps/web/src/components/VideoPlayerWithCurriculum.tsx` — הצג כתוביות
- [ ] `apps/subgraph-content/src/video/` — שמור VTT track ב-MinIO
- [ ] בדיקת quality captions (timing, speaker ID, non-speech)
- [ ] כתוביות עברית + אנגלית

### Phase B: 3–6 חודשים (P1 — Quality)

- [ ] Screen reader audit: JAWS 2024 (Windows) + NVDA (free) + VoiceOver (macOS)
  - 15+ דפים, focus order, form completion, knowledge graph
- [ ] Knowledge Graph ARIA: `role="tree"`, `role="treeitem"`, `aria-expanded`, arrow key nav
  - קובץ: `apps/web/src/components/knowledge-graph/KnowledgeSkillTree.tsx`
- [ ] Hover state contrast audit בכל ה-CSS custom properties
- [ ] Mastery badges — הוסף text label ("Beginner", "Intermediate", etc.) לצד צבע
- [ ] Live Sessions captions — שלב caption service (Google Cloud Speech / AssemblyAI)
  - קובץ: `apps/subgraph-collaboration/src/live-session/live-session.service.ts`

### Phase C: 6–12 חודשים (P2 — Full Compliance)

- [ ] PDF accessibility — כל תעודות (certificate-generator service)
- [ ] MathML / MathJax לתוכן מתמטי (אם יש)
- [ ] VPAT v2.5 authoring (עבור US Federal procurement)
- [ ] EN 301 549 conformance report (עבור EU sales)
- [ ] Accessibility audit שנתי — צד שלישי (Deque, Level Access)
- [ ] User testing עם 3-5 משתמשים עם מוגבלויות שונות

---

# חלק ב׳ — אבטחה (Security)

## מצב נוכחי: ~65% ציות כולל לתקנים הנדרשים

### מה כבר מיושם ✅ (מצוין)

| קטגוריה | יישום | קבצים |
|---------|-------|-------|
| JWT + Keycloak Auth | brute force, 15min TTL | `packages/auth/src/jwt.ts` (189 שורות) |
| AES-256-GCM הצפנה | tenant-specific keys | `packages/db/src/helpers/encryption.ts` |
| RLS על 82 טבלאות | 85 policies, 1,083 שורות בדיקות | `packages/db/src/rls/` |
| withTenantContext | 331 שימושים בכלל codebase | `packages/db/src/rls/withTenantContext.ts` |
| GDPR Erasure | hard-delete 20+ טבלאות | `user-erasure.service.ts` |
| GDPR Export | MinIO + 15min TTL | `user-export.service.ts` |
| Consent Management | THIRD_PARTY_LLM + AI_PROCESSING | `packages/db/src/schema/consent.ts` |
| SI-10 LLM Consent Gate | CONSENT_REQUIRED error | `llm-consent.guard.ts` |
| PII Scrubber | JSON.stringify pattern | `pii-scrubber.ts` |
| Rate Limiting | 100 req/min per-tenant | `gateway/src/middleware/rate-limit.ts` |
| Query Complexity | depth 10 + complexity 1000 | `query-complexity.ts` |
| CORS Fail-closed | no wildcard origin | `apps/gateway/src/index.ts` |
| ClamAV Upload Scanning | malware detection | `clamav.service.ts` |
| DOMPurify XSS | 18 קבצים | כולל `useInteractiveSvg.ts` |
| Audit Log Table | NATS JetStream | `packages/db/src/schema/auditLog.ts` |
| 40 Security Test Files | 7,474 שורות | `tests/security/` |

### פערים מרכזיים ❌

| עדיפות | פער | תקן | מורכבות |
|--------|-----|-----|---------|
| **P0** | mTLS בין subgraphs (SI-6) | ZTA, ISO 27001 A.5.14 | בינונית (Linkerd) |
| **P0** | אין מינוי DPO רשמי | GDPR Art. 37, Israeli PPR | נמוכה (ארגונית) |
| **P0** | אין ROPA (Records of Processing Activities) | GDPR Art. 30 | נמוכה |
| **P0** | נוהל הודעת פרה 72 שעות | GDPR Art. 33, Israeli PPR 2023 | נמוכה |
| **P0** | גילוי "אתה מדבר עם AI" ב-UI | EU AI Act Art. 50 | נמוכה |
| **P0** | Human oversight button ל-AI decisions | EU AI Act Art. 14 | בינונית |
| **P1** | MFA/2FA לא נאכף (ORG_ADMIN+) | ISO 27001, SOC 2 | נמוכה (Keycloak) |
| **P1** | pgvector RLS — cross-tenant audit | OWASP LLM06 | בינונית |
| **P1** | HTTP security headers (CSP, HSTS) | OWASP ASVS V14 | נמוכה |
| **P1** | DPIA ל-AI tutoring/assessment features | GDPR Art. 35 | בינונית |
| **P1** | DPA template לחוזי B2B | GDPR, FERPA | נמוכה (משפטי) |
| **P2** | ISO 27001 ISMS documentation | ISO 27001 | גבוהה |
| **P2** | Asset inventory רשמי | ISO 27001 A.5.9 | בינונית |
| **P2** | Risk assessment register | ISO 27001 6.1.2 | בינונית |
| **P2** | Vendor risk management (OpenAI, Anthropic) | ISO 27001, SOC 2 | בינונית |
| **P2** | Backup encryption + tagging | multi-tenant | נמוכה |
| **P2** | K8s NetworkPolicy בין pods | ZTA | בינונית |
| **P2** | EU AI Act technical documentation (10 שנות שמירה) | EU AI Act Art. 11 | גבוהה |
| **P3** | Penetration test שנתי (צד שלישי) | SOC 2, OWASP | בינונית |
| **P3** | Key rotation automation | ISO 27001 | בינונית |
| **P3** | SOC 2 readiness assessment | SOC 2 | גבוהה |

---

## חוקי אבטחה החלים על EduSphere

| רגולציה | תחולה | Deadline | עונש מקסימלי |
|---------|-------|----------|-------------|
| **GDPR** | משתמשים EU | **כבר בתוקף** | €20M / 4% מחזור |
| **EU AI Act** | מערכות AI | **אוגוסט 2026** (high-risk) | €35M / 7% מחזור |
| **Israeli PPR 2023** | כל הנתונים | **כבר בתוקף** | תביעות + קנסות PPA |
| **FERPA** | בתי ספר בארה"ב | בכל חוזה | אובדן מימון פדרלי |
| **COPPA** | משתמשים <13 | בכל חוזה | $50k לפגיעה |
| ISO 27001:2022 | ארגוני | 12-18 חודשים | אמון עסקי |
| SOC 2 Type II | ארגוני | 12-18 חודשים | חוזים ארגוניים |

**EduSphere + EU AI Act = HIGH RISK** (Annex III, Section 5 — חינוך):
מערכות המושפעות: AI grading, performance prediction, Chavruta assessment, learning path adaptation.
**Deadline: אוגוסט 2026 — פחות מ-18 חודשים.**

---

## תוכנית יישום — אבטחה

### Tier 1: 0–3 חודשים — מיידי (סיכון משפטי/רגולטורי)

**שבועות 1-2: ציות מיידי (ללא code)**
- [ ] מנה DPO (Data Protection Officer) — GDPR Art. 37 + Israeli PPR
- [ ] רשום בסיסי נתונים רגישים ב-PPA (Israeli Privacy Protection Authority)
- [ ] צור ROPA document (Records of Processing Activities) — GDPR Art. 30
- [ ] חתום על SDPC NDPA לשוק K-12 ארה"ב (FERPA)
- [ ] נוהל הודעת פרת אבטחה 72 שעות מתועד + אחראי

**שבועות 3-6: Code Changes (P0)**
- [ ] Linkerd mTLS — הפעל בין כל 6 subgraphs (SI-6)
  - קבצים: `infrastructure/k8s/linkerd/` + Docker Compose override
  - בדיקה: הוסף test ל-`tests/security/` לאמת mTLS handshake
- [ ] AI UI disclosure — הוסף banner "You are interacting with an AI" לכל AI chat
  - קובץ: `apps/web/src/components/AIChatPanel.tsx`
  - EU AI Act Art. 50 — חובה
- [ ] Human oversight button — "Request human review" ב-AI grading/assessment
  - קובץ: `apps/subgraph-agent/src/ai/` + frontend component
- [ ] pgvector RLS audit — ודא tenant_id filter בכל pgvector similarity queries
  - קובץ: `apps/subgraph-knowledge/src/embedding/` + `similarity-search.service.ts`

**שבועות 6-12: HTTP Security + DPA**
- [ ] HTTP security headers — הוסף ל-gateway middleware:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{nonce}'`
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
  - קובץ: `apps/gateway/src/middleware/security-headers.ts` (חדש)
- [ ] MFA enforcement ב-Keycloak לתפקידים ORG_ADMIN, SUPER_ADMIN
  - קובץ: `infrastructure/docker/keycloak-realm.json`
- [ ] DPA template עורך דין + FERPA addendum
- [ ] DPIA ל-Chavruta AI + learning analytics (AI grading)

### Tier 2: 3–6 חודשים — בקרות טכניות

- [ ] Data export API endpoint (`/api/gdpr/export`) — GDPR Art. 20
  - קובץ: `apps/subgraph-core/src/user/user-export.service.ts` (check completeness)
- [ ] Age verification + parental consent flow — GDPR Art. 8, COPPA
- [ ] EU AI Act technical documentation per AI feature (10 שנות שמירה)
  - AI risk register: Chavruta, learning path, assessment grading
- [ ] DLP לפלטי LLM — הרחב `pii-scrubber.ts` לסינון cross-tenant data
- [ ] K8s NetworkPolicy — הגבל תקשורת בין pods
  - קובץ: `infrastructure/k8s/network-policies/` (חדש)
- [ ] Backup encryption + tagging per-tenant
- [ ] SOC 2 readiness assessment (gap analysis רשמי)
- [ ] iKeepSafe FERPA + COPPA certification אם משרתים K-12

### Tier 3: 6–12 חודשים — הכנה להסמכה

- [ ] ISO 27001:2022 ISMS implementation
  - Statement of Applicability (SoA)
  - Asset inventory
  - Risk assessment register
  - Supplier/vendor risk program
  - Internal audit program
- [ ] Penetration test שנתי — צד שלישי מוסמך
- [ ] Security awareness training לכל הצוות
- [ ] Key rotation policy + automation
- [ ] DR/BCP plan מתועד + נבדק

### Tier 4: 12–24 חודשים — הסמכות

- [ ] ISO 27001:2022 Stage 1 + Stage 2 Audit → certification
- [ ] SOC 2 Type I → חלון תצפית 6 חודשים → SOC 2 Type II
- [ ] EU AI Act conformity assessment + CE marking
- [ ] EU AI Database registration (Art. 43)
- [ ] Annual surveillance audit

---

# חלק ג׳ — תוכנית פעולה משולבת (מסכמת)

## Phase 1: Quick Wins (שבועות 1-4) — ללא הסמכות, מורידים סיכון מיידי

| # | משימה | צוות | זמן |
|---|-------|------|-----|
| 1 | Fix `lang` attribute | Frontend | 2 שעות |
| 2 | AI UI disclosure banner | Frontend | 4 שעות |
| 3 | HTTP security headers | Backend | 4 שעות |
| 4 | MFA ב-Keycloak לאדמינים | DevOps | 2 שעות |
| 5 | pgvector RLS audit | DB/Backend | 1 יום |
| 6 | Keyboard alternative לDragOrderQuestion | Frontend | 2 ימים |
| 7 | מינוי DPO + רישום PPA | Legal | ללא code |
| 8 | נוהל הודעת פרה | Legal/CISO | ללא code |
| 9 | Linkerd mTLS | DevOps | 3 ימים |

**השפעה:** סגירת חשיפה משפטית מיידית (IS 5568, GDPR, EU AI Act Art. 50)

## Phase 2: Medium-term (1-6 חודשים) — תאימות מלאה

- Captions pipeline (transcription-worker → WebVTT → VideoPlayer)
- Knowledge Graph ARIA + keyboard
- DPIA documentation
- EU AI Act technical docs
- DPA templates B2B
- Screen reader audit

## Phase 3: Long-term (6-24 חודשים) — הסמכות

- ISO 27001:2022 certification
- SOC 2 Type II
- EU AI Act conformity assessment
- Annual accessibility audit (third-party)
- VPAT v2.5

---

## תקציב משוער

| תחום | שנה 1 | שנה 2 |
|------|-------|-------|
| נגישות (audit + fixing + tools) | $30k–$60k | $15k–$25k |
| GDPR/Legal (DPO, DPA, DPIA) | $50k–$100k | $30k |
| EU AI Act compliance | $40k–$80k | $20k |
| ISO 27001:2022 | $80k–$150k | $20k |
| SOC 2 Type II | $100k–$200k | $50k |
| Security tools (DLP, SIEM, pen-test) | $60k–$120k | $50k |
| **סה"כ** | **$360k–$710k** | **$185k–$275k** |

---

## קבצים קריטיים לשינוי (Phase 1)

**נגישות:**
- `apps/web/src/utils/i18n.ts` — הוסף `lang` attribute
- `apps/web/src/components/quiz/DragOrderQuestion.tsx` — keyboard alternative
- `apps/web/src/components/knowledge-graph/KnowledgeSkillTree.tsx` — ARIA tree
- `apps/web/src/components/AIChatPanel.tsx` — AI disclosure banner
- `apps/transcription-worker/src/` — WebVTT captions output

**אבטחה:**
- `apps/gateway/src/middleware/security-headers.ts` — חדש
- `infrastructure/docker/keycloak-realm.json` — MFA enforcement
- `infrastructure/k8s/linkerd/` — mTLS config
- `apps/subgraph-knowledge/src/embedding/similarity-search.service.ts` — RLS audit

---

## אימות (Verification)

**נגישות:**
```bash
pnpm --filter @edusphere/web test:e2e  # אפס violations ב-axe-core
# JAWS 2024 manual smoke test — 5 flows
# NVDA manual smoke test — 5 flows
```

**אבטחה:**
```bash
pnpm test:security  # כל 40 security tests עוברים
./scripts/health-check.sh
pnpm test:rls  # 100% RLS coverage
# curl -I http://localhost:4000/graphql | grep -E "Strict-Transport|Content-Security"
```

---

*מחקר בוצע על ידי 3 סוכנים מקבילים עם Tavily Research | מקורות: W3C, DOJ, ETSI, EU Commission, ISO.org, NIST, EDPB, AICPA, 30+ מקורות | תאריך: מרץ 2026*
