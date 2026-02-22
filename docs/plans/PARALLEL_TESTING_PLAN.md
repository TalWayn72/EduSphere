# תוכנית: בדיקה מקבילית מלאה — כל הכלים
**פרויקט:** EduSphere Monorepo
**תאריך:** 18 פברואר 2026
**מטרה:** הרצת כל כלי הבדיקה והאבטחה הקיימים בצורה מקבילית, תיקון פערים, ותיעוד מלא
**מגבלה:** הרצה מקומית (ללא 100K infra), ללא Docker בסבבים 1-5

---

## א. מלאי כלים — מה יש vs. מה עובד

### כלים מקומיים (לא צריך Docker)

| # | כלי | פקודה | מה זה בודק | מצב |
|---|-----|--------|-----------|------|
| 1 | **ESLint** | `pnpm turbo lint` | Code quality, no-console, import/order | ✅ עובד |
| 2 | **ESLint Security** | (תיקון נדרש) | XSS, injection, unsanitized input | ⚠️ plugin מותקן אך לא מוגדר |
| 3 | **Prettier** | `pnpm format --check` | עיצוב קוד | ✅ עובד |
| 4 | **TypeScript** | `pnpm turbo typecheck` | Type safety strict | ✅ עובד |
| 5 | **pnpm audit** | `pnpm audit --prod --audit-level=high` | CVE dependencies | ✅ עובד |
| 6 | **Vitest unit** | `pnpm turbo test -- --coverage` | 328 unit tests + coverage | ✅ עובד |
| 7 | **Playwright E2E** | `pnpm --filter @edusphere/web test:e2e` | 6 smoke tests | ✅ עובד |
| 8 | **Federation Compose** | `pnpm --filter @edusphere/gateway compose` | Schema integrity | ✅ עובד |
| 9 | **Husky pre-commit** | `git commit` triggers hooks | Lint+format on staged | ❌ hook ריק, לא מחובר |

### כלים עם Docker (מקומי עם `docker-compose up`)

| # | כלי | פקודה | מה זה בודק | מצב |
|---|-----|--------|-----------|------|
| 10 | **Integration Tests** | `pnpm turbo test:integration` | DB + services end-to-end | ❌ script לא קיים |
| 11 | **RLS Tests** | `pnpm --filter @edusphere/db test:rls` | Tenant isolation policies | ❌ script + tests לא קיימים |
| 12 | **k6 load** | `k6 run infrastructure/load-testing/k6/scenarios/smoke.js` | Performance (basic) | ⚠️ files קיימים, חסר queries |

### CI בלבד (GitHub Actions — לא ניתן הרצה מקומית)

| # | כלי | Workflow | מה זה בודק |
|---|-----|---------|-----------|
| 13 | **CodeQL** | `codeql.yml` | Static analysis, security patterns |
| 14 | **TruffleHog** | `codeql.yml` | Secret detection בקוד |
| 15 | **Trivy** | `docker-build.yml` | Container CVE scan |
| 16 | **PR Gate** | `pr-gate.yml` | Multi-layer quality gate |

---

## ב. פערים שצריך לתקן לפני הרצה מלאה

### קונפיגורציה (לא צריך לכתוב קוד גדול)
| פער | קובץ | תיקון נדרש |
|-----|------|-----------|
| ESLint security rules | `packages/eslint-config/index.js` | הוספת rules מ-`eslint-plugin-security` + `eslint-plugin-no-unsanitized` |
| Husky pre-commit hook | `.husky/pre-commit` | הוספת `npx lint-staged` |
| Coverage thresholds חסרים | `apps/subgraph-annotation/vitest.config.ts` | הוספת `thresholds: { lines: 80, functions: 80, branches: 70 }` |
| Coverage thresholds חסרים | `apps/subgraph-knowledge/vitest.config.ts` | הוספת thresholds |
| Coverage thresholds חסרים | `apps/subgraph-agent/vitest.config.ts` | הוספת thresholds + `passWithNoTests: false` |
| Coverage thresholds חסרים | `apps/subgraph-collaboration/vitest.config.ts` | הוספת thresholds + `passWithNoTests: false` |
| Coverage thresholds חסרים | `apps/gateway/tests/vitest.config.ts` | הוספת thresholds |
| test:rls script | `packages/db/package.json` | הוספת `"test:rls": "vitest run src/rls"` |

### בדיקות חסרות (כתיבת test files)
| חבילה | מה חסר | עדיפות |
|-------|---------|--------|
| `packages/auth` | JWT validation tests (jwt.test.ts) | 🔴 גבוהה — security critical |
| `packages/db/src/rls/` | withTenantContext tests + RLS policy tests | 🔴 גבוהה — security critical |
| `apps/subgraph-agent` | Unit tests (service + resolver) | 🟡 בינונית |
| `apps/subgraph-collaboration` | Unit tests (service + resolver) | 🟡 בינונית |

---

## ג. תוכנית הרצה — 6 סבבים

### גרף תלויות בין סבבים

```
Round 0 (Pre-flight)
     │
     ├──► Round 1 (Baseline — 6 agents parallel) ──────────────┐
     │                                                           │
     └──► Round 2 (Config Fixes — 4 agents parallel) ──────────┤
                                                                 │
                                                    Round 3 (Write Missing Tests — 4 agents parallel)
                                                                 │
                                                    Round 4 (Full Re-run — 5 agents parallel)
                                                                 │
                                                    Round 5 (Security Focus — 3 agents parallel)
                                                                 │
                                                    Round 6 (Document & Commit — 1 agent)
```

**הערה:** Rounds 1 ו-2 מתחילים יחד. Round 3 מתחיל רק אחרי שניהם סיימו.

---

### ROUND 0 — Pre-flight Check (5 דקות, agent יחיד)

**מטרה:** אמת שכל הכלים מותקנים ומוכנים לפני ההרצה
**Agent:** 1 (Bash)
**פקודות:**

```bash
# 1. אמת pnpm + node versions
node --version && pnpm --version

# 2. אמת vitest מותקן בכל packages
pnpm --filter @edusphere/subgraph-core exec vitest --version
pnpm --filter @edusphere/web exec vitest --version

# 3. אמת playwright
pnpm --filter @edusphere/web exec playwright --version

# 4. אמת turbo
pnpm turbo --version

# 5. רשום קבצים שיווצרו בסבבים הבאים
ls packages/db/src/rls/
ls packages/auth/src/
ls apps/subgraph-agent/src/
ls apps/subgraph-collaboration/src/
```

**תפוקה:** Pre-flight checklist (✅/❌ לכל כלי)
**תנאי המשך:** כל הכלים ✅

---

### ROUND 1 — Baseline Snapshot (15 דקות, 6 agents מקביליים)

**מטרה:** תמונת מצב מלאה לפני כל תיקון — baseline מתועד
**הרץ אחרי:** Round 0

| Agent | תפקיד | פקודה | תפוקה |
|-------|--------|--------|--------|
| **1-A** | ESLint + Prettier | `pnpm turbo lint` ואז `pnpm exec prettier --check "**/*.{ts,tsx}"` | רשימת שגיאות/warnings |
| **1-B** | TypeScript | `pnpm turbo typecheck 2>&1` | רשימת type errors |
| **1-C** | Security Audit | `pnpm audit --prod --audit-level=moderate 2>&1` | רשימת CVEs |
| **1-D** | Unit Tests + Coverage | `pnpm turbo test -- --coverage --reporter=json 2>&1` | coverage report JSON |
| **1-E** | E2E Smoke | `pnpm --filter @edusphere/web test:e2e 2>&1` | 6 tests pass/fail |
| **1-F** | Federation Schema | `pnpm --filter @edusphere/gateway compose 2>&1` | supergraph.graphql valid? |

**פורמט דוח תוך כדי ריצה (כל 3 דקות):**
```
═══════════════════════════════════════════
📊 ROUND 1 PROGRESS — [HH:MM]
═══════════════════════════════════════════
1-A ESLint:       🟡 Running (2m elapsed)
1-B TypeScript:   ✅ Done — 0 errors
1-C Audit:        ✅ Done — 3 moderate CVEs
1-D Unit Tests:   🟡 Running (coverage generating)
1-E E2E:          🟡 Running (test 4/6)
1-F Federation:   ✅ Done — composed OK
═══════════════════════════════════════════
```

**תפוקת Round 1:** `docs/test-reports/baseline-YYYYMMDD.md` עם תוצאות כל agent

---

### ROUND 2 — Config Fixes (10 דקות, 4 agents מקביליים)

**מטרה:** תקן את כל פערי הקונפיגורציה (לא לכתוב tests חדשות)
**הרץ אחרי:** Round 0 (מקביל ל-Round 1)

| Agent | תפקיד | קובץ/פעולה | שינוי |
|-------|--------|-----------|-------|
| **2-A** | ESLint security rules | `packages/eslint-config/index.js` | הוסף rules מ-`eslint-plugin-security` (`security/detect-object-injection`, `security/detect-non-literal-regexp`, `no-unsanitized/method`, `no-unsanitized/property`) |
| **2-B** | Husky hook | `.husky/pre-commit` | הוסף `npx lint-staged` (wire lint-staged) |
| **2-C** | Coverage thresholds | 5 vitest.config.ts קבצים (annotation, knowledge, agent, collaboration, gateway) | הוסף thresholds `{ lines: 80, functions: 80, branches: 70 }` + `passWithNoTests: false` ל-agent, collab |
| **2-D** | DB test script | `packages/db/package.json` | הוסף `"test:rls": "vitest run src/rls"` ו-`"test": "vitest"` |

**לא דורש הרצה** — רק עריכת קבצי config
**תפוקה:** 8 קבצים ערוכים, מוכנים לסבב 3

---

### ROUND 3 — Write Missing Tests (25 דקות, 4 agents מקביליים)

**מטרה:** כתיבת test files לכל מה שחסר לגמרי
**הרץ אחרי:** Round 1 + Round 2 שניהם הסתיימו

| Agent | תפקיד | קובץ ליצור | מה לבדוק |
|-------|--------|-----------|---------|
| **3-A** | packages/auth tests | `packages/auth/src/jwt.test.ts` | `JWTValidator`: token valid, token expired, invalid signature, wrong tenant, missing claims, `requireRole()` with correct/wrong role, `requireTenantAccess()` |
| **3-B** | packages/db RLS tests | `packages/db/src/rls/withTenantContext.test.ts` | `withTenantContext()` sets correct SQL params, `withBypassRLS()` sets row_security=OFF, tenant isolation (mock DB query verifies SET LOCAL), context cleanup after query |
| **3-C** | subgraph-agent tests | `apps/subgraph-agent/src/agent/agent.service.spec.ts` + `agent.resolver.spec.ts` | createSession, sendMessage, endSession, UnauthorizedException paths |
| **3-D** | subgraph-collaboration tests | `apps/subgraph-collaboration/src/discussion/discussion.service.spec.ts` + `discussion.resolver.spec.ts` | createDiscussion, getDiscussions, addReply, UnauthorizedException paths |

**דפוסים לשימוש חוזר** (מקבצים קיימים):
- Mock pattern: `vi.fn(async (_db, _ctx, cb) => cb())` — ראה `apps/subgraph-annotation/src/annotation/annotation.service.spec.ts`
- Auth context pattern: ראה `apps/subgraph-knowledge/src/graph/graph.resolver.spec.ts:22-30`
- Drizzle chainable mock: ראה `apps/subgraph-content/src/course/course.service.spec.ts`

**תפוקה:** 6 קבצי בדיקה חדשים, ~80-100 tests נוספות

---

### ROUND 4 — Full Re-run (15 דקות, 5 agents מקביליים)

**מטרה:** הרץ את כל הבדיקות מחדש עם כל התיקונים
**הרץ אחרי:** Round 3

| Agent | פקודה | תפוקה צפויה |
|-------|--------|------------|
| **4-A** | `pnpm turbo lint` | 0 errors (כולל security rules החדשות) |
| **4-B** | `pnpm turbo typecheck` | 0 errors |
| **4-C** | `pnpm turbo test -- --coverage --reporter=verbose 2>&1` | ~430+ tests, coverage ≥80% על כל packages |
| **4-D** | `pnpm --filter @edusphere/web test:e2e 2>&1` | 6 smoke tests ✅ |
| **4-E** | `pnpm audit --prod --audit-level=high && pnpm --filter @edusphere/db test:rls 2>&1` | 0 HIGH CVEs + RLS tests ✅ |

**קריטריון הצלחה לסבב 4:**
- [ ] `pnpm turbo lint` → exit 0
- [ ] `pnpm turbo typecheck` → exit 0
- [ ] כל packages: coverage lines ≥ 80%, branches ≥ 70%
- [ ] E2E: 6/6 smoke tests pass
- [ ] `pnpm audit --prod --audit-level=high` → exit 0

---

### ROUND 5 — Security Focus (10 דקות, 3 agents מקביליים)

**מטרה:** בדיקות אבטחה ספציפיות — כולל tools שלא רצו עד כה
**הרץ אחרי:** Round 4

| Agent | כלי | פקודה | מה בודקים |
|-------|-----|--------|----------|
| **5-A** | ESLint Security Deep | `pnpm turbo lint -- --rule 'security/*: error'` | XSS, Object injection, RegExp injection, eval usage |
| **5-B** | Audit All Levels | `pnpm audit --audit-level=low 2>&1 \| tee audit-full.txt` | כל CVEs כולל low severity (לתיעוד) |
| **5-C** | Federation Security | בדיקה ידנית של schema: grep `@authenticated`, `@requiresScopes` בכל resolvers | אמת שאין mutations ללא הגנה |

**תפוקה:** `docs/test-reports/security-audit-YYYYMMDD.md`

---

### ROUND 6 — Document & Commit (5 דקות, 1 agent)

**מטרה:** עדכון תיעוד ו-commit לכל השינויים
**הרץ אחרי:** Round 5

```bash
# 1. עדכן README.md עם מספר tests חדש
# 2. עדכן OPEN_ISSUES.md — סמן gaps שנסגרו
# 3. Commit עם scope "test"
git add packages/eslint-config/ .husky/ packages/db/ packages/auth/ \
  apps/subgraph-agent/ apps/subgraph-collaboration/ \
  apps/subgraph-*/vitest.config.ts
git commit -m "test: complete parallel testing suite — all tools active, ~430 tests"
```

---

## ד. פורמט תיעוד תוצאות

### קובץ דוח ראשי: `docs/test-reports/full-audit-YYYYMMDD.md`

```markdown
# Full Test Audit — YYYY-MM-DD

## Summary
| Round | Tools | Status | Duration |
|-------|-------|--------|----------|
| R0 Pre-flight | 5 checks | ✅ PASS | 3m |
| R1 Baseline | ESLint, TSC, Audit, Vitest, E2E, Federation | ✅ PASS | 14m |
| R2 Fixes | Config patches | ✅ APPLIED | 8m |
| R3 Tests | 4 new test files | ✅ WRITTEN | 22m |
| R4 Full Re-run | All tools | ✅ PASS | 13m |
| R5 Security | ESLint security, audit, schema | ✅ PASS | 9m |

## Coverage Report
| Package | Lines | Functions | Branches | Tests |
|---------|-------|-----------|----------|-------|
| web | 83% | 81% | 72% | 180 |
| subgraph-core | 88% | 85% | 74% | 37 |
| subgraph-content | 86% | 84% | 71% | 34 |
| subgraph-annotation | 82% | 80% | 70% | 51 |
| subgraph-knowledge | 84% | 83% | 71% | 26 |
| subgraph-agent | 78% | 75% | 68% | ~30 |
| subgraph-collaboration | 76% | 74% | 66% | ~20 |
| packages/auth | 90% | 88% | 75% | ~15 |
| packages/db/rls | 95% | 92% | 80% | ~12 |

## Security Findings
| Tool | Severity | Count | Action |
|------|---------|-------|--------|
| pnpm audit | HIGH | 0 | - |
| pnpm audit | MODERATE | 3 | Document |
| ESLint security | ERROR | 0 | - |
| ESLint security | WARN | 0 | - |
| Federation schema | Missing @auth | 0 | - |
```

---

## ה. פורמט דיווח תוך כדי ריצה

כל agent מדווח בפורמט הזה כל 3 דקות:

```
═══════════════════════════════════════════════════════════
📊 PROGRESS REPORT — Round X — [HH:MM:SS]
═══════════════════════════════════════════════════════════
🔵 Active Agents:
   X-A [ESLint]:      🟡 Running — 47 files scanned / ~120
   X-B [TypeScript]:  ✅ Done — 0 errors (2m 14s)
   X-C [Vitest]:      🟡 Running — 312/430 tests passed
   X-D [E2E]:         🟡 Running — test 3/6 (KnowledgeGraph)
   X-E [RLS]:         ⏳ Waiting for Docker services

✅ Completed this cycle:
   - TypeScript: 0 errors, 0 warnings
   - Federation compose: supergraph.graphql 2.1KB ✅

⚠️  Issues found:
   - pnpm audit: 2 MODERATE (tar@6.1.11, fast-xml-parser@4.x)
   - ESLint: 1 security/detect-object-injection in annotation.service.ts

⏳ ETA: ~8 min remaining for Round X

📈 Round progress: 65%
═══════════════════════════════════════════════════════════
```

---

## ו. שלבים שדורשים Docker (אופציונלי — Round 4+)

אם `docker-compose up -d` זמין, ניתן להוסיף:

```bash
# לאחר docker-compose up -d
pnpm --filter @edusphere/db migrate
pnpm --filter @edusphere/db seed
pnpm --filter @edusphere/db test:rls  # RLS real DB tests
k6 run --vus 1 --duration 30s infrastructure/load-testing/k6/scenarios/smoke.js
```

**לא נדרש** לסבבים הנוכחיים — כל הבדיקות מ-Round 1-5 הן מקומיות.

---

## ז. טבלת agents ומשך זמן כולל

| Round | Agents | מקביל? | משך | תנאי כניסה |
|-------|--------|--------|-----|-----------|
| R0 Pre-flight | 1 | - | 5m | ראשון |
| R1 Baseline | 6 | ✅ מלא | 15m | אחרי R0 |
| R2 Config Fixes | 4 | ✅ מלא | 10m | אחרי R0 (במקביל ל-R1) |
| R3 Write Tests | 4 | ✅ מלא | 25m | אחרי R1+R2 |
| R4 Full Re-run | 5 | ✅ מלא | 15m | אחרי R3 |
| R5 Security | 3 | ✅ מלא | 10m | אחרי R4 |
| R6 Document | 1 | - | 5m | אחרי R5 |
| **סה"כ** | **24** | | **~60m** | |

---

## ח. קבצים שייגעו — רשימה מלאה

### עריכה (Round 2 — Config):
- [packages/eslint-config/index.js](packages/eslint-config/index.js) — security rules
- [.husky/pre-commit](.husky/pre-commit) — wire lint-staged
- [apps/subgraph-annotation/vitest.config.ts](apps/subgraph-annotation/vitest.config.ts) — thresholds
- [apps/subgraph-knowledge/vitest.config.ts](apps/subgraph-knowledge/vitest.config.ts) — thresholds
- [apps/subgraph-agent/vitest.config.ts](apps/subgraph-agent/vitest.config.ts) — thresholds + passWithNoTests
- [apps/subgraph-collaboration/vitest.config.ts](apps/subgraph-collaboration/vitest.config.ts) — thresholds + passWithNoTests
- [apps/gateway/tests/vitest.config.ts](apps/gateway/tests/vitest.config.ts) — thresholds
- [packages/db/package.json](packages/db/package.json) — test + test:rls scripts

### יצירה (Round 3 — Tests):
- [packages/auth/src/jwt.test.ts](packages/auth/src/jwt.test.ts) — ~15 tests
- [packages/db/src/rls/withTenantContext.test.ts](packages/db/src/rls/withTenantContext.test.ts) — ~12 tests
- [apps/subgraph-agent/src/agent/agent.service.spec.ts](apps/subgraph-agent/src/agent/agent.service.spec.ts) — ~15 tests
- [apps/subgraph-agent/src/agent/agent.resolver.spec.ts](apps/subgraph-agent/src/agent/agent.resolver.spec.ts) — ~12 tests
- [apps/subgraph-collaboration/src/discussion/discussion.service.spec.ts](apps/subgraph-collaboration/src/discussion/discussion.service.spec.ts) — ~10 tests
- [apps/subgraph-collaboration/src/discussion/discussion.resolver.spec.ts](apps/subgraph-collaboration/src/discussion/discussion.resolver.spec.ts) — ~8 tests

### עדכון (Round 6 — Docs):
- [README.md](README.md) — מספר tests חדש, coverage
- [OPEN_ISSUES.md](OPEN_ISSUES.md) — gaps שנסגרו

---

## ט. קריטריוני הצלחה סופיים

לאחר Round 6, כל הפריטים הבאים חייבים להיות ✅:

- [ ] `pnpm turbo lint` → exit 0, 0 errors, 0 warnings
- [ ] `pnpm turbo typecheck` → exit 0
- [ ] `pnpm audit --prod --audit-level=high` → exit 0
- [ ] coverage: כל packages ≥ 80% lines, ≥ 70% branches
- [ ] E2E: 6/6 Playwright smoke tests
- [ ] Federation: `supergraph.graphql` composable
- [ ] Husky pre-commit: `git commit` מריץ lint-staged
- [ ] ESLint security rules: פעילות
- [ ] כל 9 packages יש test files
- [ ] RLS: `packages/db/src/rls/*.test.ts` קיים ועובר

**יעד:** ~430 tests, coverage ≥ 80%, 0 security issues open
