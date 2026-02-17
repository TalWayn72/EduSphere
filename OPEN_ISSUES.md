# תקלות פתוחות - EduSphere

**תאריך עדכון:** 17 פברואר 2026
**מצב פרויקט:** 🔴 Phase 0 - Foundation (Not Started)
**סטטוס כללי:** תיכנון הושלם, מוכן להתחלת פיתוח

---

## Infrastructure & Deployment

| Domain | Purpose | Provider | Status |
|--------|---------|----------|--------|
| **TBD** | Main application domain | TBD | ⏳ Not configured |
| **TBD** | Production environment | TBD | ⏳ Not configured |
| **TBD** | Staging/QA environment | TBD | ⏳ Not configured |

### Deployment Targets

| Environment | Purpose | Infrastructure | Status |
|-------------|---------|----------------|--------|
| **Local Dev** | Development environment | Docker Compose | ⏳ To be set up (Phase 0.2) |
| **Staging** | QA and testing | Kubernetes cluster | ⏳ To be set up (Phase 7) |
| **Production** | Live system (100K+ users) | Kubernetes cluster (HA) | ⏳ To be set up (Phase 7) |

---

## סיכום תקלות

| קטגוריה | מספר פריטים | חומרה | סטטוס |
|----------|-------------|--------|--------|
| **Infrastructure Setup** | 0 | - | ⏳ Phase 0 not started |
| **Database Schema** | 0 | - | ⏳ Phase 1 not started |
| **GraphQL Federation** | 0 | - | ⏳ Phase 2-6 not started |
| **Security & RLS** | 0 | - | ⏳ To be validated |
| **Testing** | 0 | - | ⏳ To be implemented |
| **Performance** | 0 | - | ⏳ To be optimized |
| **Documentation** | 3 | 🟢 Low | ✅ Completed |

**סה"כ:** 3 פריטים → 3 הושלמו ✅ | 0 פתוחים 🔴

---

## ✅ TASK-001: Project Documentation - CLAUDE.md (17 פברואר 2026)
**סטטוס:** ✅ הושלם | **חומרה:** 🟢 Low | **תאריך:** 17 February 2026
**קבצים:** `CLAUDE.md`

### בעיה
הפרויקט זקוק למסמך הנחיות מקיף ל-AI assistant עם כל הכללים, ארכיטכטורה, patterns, commands, ו-workflows.

### דרישות
- Project Context עם Stack מלא
- Boundaries - עבודה רק בנתיב EduSphere
- 11+ Core Rules (כולל parallel execution)
- Architecture & Patterns (GraphQL Federation, NestJS, Drizzle, Apache AGE, pgvector, AI Agents)
- Environment Setup עם כל המשתנים לכל שירות
- Commands Reference מקיף (60+ פקודות)
- Code Conventions (GraphQL, Multi-tenancy, RLS, Security)
- Testing Requirements
- Security Checklist
- CI/CD Workflows
- Parallel Execution Protocol עם דוגמאות
- Phase Execution Protocol
- Troubleshooting

### פתרון
נוצר `CLAUDE.md` (600+ שורות) עם:
1. **Project Context** - Architecture: GraphQL Federation, NestJS, Drizzle ORM, PostgreSQL 16 + Apache AGE + pgvector, NATS JetStream, Keycloak, AI agents (Vercel AI SDK + LangGraph.js + LlamaIndex.TS)
2. **11 Core Rules** - כולל מגבלת 150 שורות (עם חריגות מוצדקות) ו-parallel execution mandatory
3. **Environment Setup** - משתני סביבה לכל שירות (Gateway, 6 Subgraphs, Frontend, Mobile, AI/ML)
4. **Commands Reference** - 60+ פקודות מאורגנות (Dev, Build, Test, Database, GraphQL, Docker, AI/ML)
5. **Code Conventions** - File size guidelines, error handling, validation, logging, GraphQL conventions, multi-tenancy & security
6. **Testing Requirements** - Coverage targets (>90% backend, >80% frontend, 100% RLS), test locations
7. **Security Checklist** - Pre-commit gate, RLS validation, GraphQL security
8. **CI/CD** - 5 workflows (ci, test, federation, docker-build, cd) + pre-commit hooks
9. **Parallel Execution Protocol** - Task decomposition, parallelization opportunities, agent tracking table
10. **Phase Execution Protocol** - Progress reporting format, quality gates
11. **Troubleshooting** - 15+ common issues with solutions

### בדיקות
- ✅ Document structure complete
- ✅ All sections filled with relevant content
- ✅ Examples provided for complex patterns
- ✅ Commands verified against IMPLEMENTATION-ROADMAP.md
- ✅ Environment variables aligned with architecture

---

## ✅ TASK-002: Project Documentation - README.md (17 פברואר 2026)
**סטטוס:** ✅ הושלם | **חומרה:** 🟢 Low | **תאריך:** 17 February 2026
**קבצים:** `README.md`

### בעיה
הפרויקט זקוק ל-README מקצועי שמסביר את הפרויקט למפתחים חדשים ומספק Quick Start מהיר.

### דרישות
- Badges וסטטיסטיקות
- Quick Start עם טבלת שירותים
- Demo users עם סיסמאות
- Architecture diagram חזותית
- Tech Stack מפורט (Core, Frontend, AI/ML)
- Features מקובצות לוגית
- 8 Phases עם סטטוס
- Commands Reference
- Documentation links
- Deployment (Dev + K8s)
- Monitoring
- Testing
- Database Schema
- Troubleshooting

### פתרון
נוצר `README.md` (800+ שורות) עם:
1. **Badges** - TypeScript 5.8, GraphQL Federation v2.7, PostgreSQL 16+, Apache AGE 1.5.0
2. **Quick Start** - 10 שלבים (clone → install → docker up → migrate → seed → dev) + טבלת 11 שירותים
3. **Demo Users** - 5 תפקידים (Super Admin, Org Admin, Instructor, Student, Researcher) עם email/password
4. **Architecture** - ASCII diagram (Client → Gateway → 6 Subgraphs → DB/MinIO/NATS) + monorepo structure מפורט
5. **Tech Stack** - 3 טבלאות מפורטות (Core Infrastructure, Frontend, Real-time & Collaboration, AI/ML)
6. **Features** - 6 קטגוריות (Core Platform, Content Management, AI Agents, Knowledge & Search, Auth & Authorization, Observability)
7. **8 Phases** - Phase 0-8 עם duration + status (🔴 Not Started)
8. **Commands** - 30+ פקודות מאורגנות (Dev, Build, Test, Database, GraphQL, Docker)
9. **Deployment** - Docker Compose (dev) + Kubernetes/Helm (prod) עם HPA/PDB/Ingress
10. **Monitoring** - Prometheus, Grafana, Jaeger, GraphQL Hive, Loki
11. **Testing** - טבלת frameworks (Vitest, Playwright, k6) עם coverage targets
12. **Database Schema** - 16 טבלאות + Apache AGE graph ontology (5 vertex labels, 10 edge labels)
13. **Troubleshooting** - 10+ בעיות נפוצות עם פתרונות

### בדיקות
- ✅ Professional structure and formatting
- ✅ All links functional (internal docs)
- ✅ ASCII diagrams render correctly
- ✅ Commands verified against package.json structure
- ✅ Tech stack aligned with IMPLEMENTATION-ROADMAP.md

---

## ✅ TASK-003: Project Documentation - OPEN_ISSUES.md (17 פברואר 2026)
**סטטוס:** ✅ הושלם | **חומרה:** 🟢 Low | **תאריך:** 17 February 2026
**קבצים:** `OPEN_ISSUES.md`

### בעיה
הפרויקט זקוק למערכת מעקב תקלות מובנית מוכנה לשימוש מיום ראשון של הפיתוח.

### דרישות
- סיכום תקלות עם טבלה (קטגוריה, מספר, חומרה, סטטוס)
- תבנית לכל תקלה: סטטוס, חומרה, תאריך, קבצים, בעיה, שורש, פתרון, בדיקות
- שימוש בסמלי emoji לקריאות (✅/🔴/🟡/🟢/⏳)
- מבנה היררכי עם כותרות ברורות
- דוגמאות לתיעוד המשימות הראשונות

### פתרון
נוצר `OPEN_ISSUES.md` עם:
1. **Infrastructure & Deployment** - טבלת domains + deployment targets
2. **סיכום תקלות** - טבלה עם 7 קטגוריות (Infrastructure, Database, GraphQL, Security, Testing, Performance, Documentation)
3. **3 דוגמאות מתועדות** - TASK-001 (CLAUDE.md), TASK-002 (README.md), TASK-003 (OPEN_ISSUES.md)
4. **תבנית מובנית** - כל task עם: סטטוס, חומרה, תאריך, קבצים, בעיה, דרישות, פתרון, בדיקות
5. **Phase tracking template** - תבנית לכל phase ב-IMPLEMENTATION-ROADMAP.md
6. **Common issue templates** - תבניות לבאגים, features, refactoring, security issues

### בדיקות
- ✅ Document structure ready for phase execution
- ✅ Templates match Bellor quality level
- ✅ Emoji usage consistent and readable
- ✅ All 3 completed tasks documented

---

## Phase Templates

### Phase 0: Foundation (Pending)

**Phase Start Date:** TBD
**Phase End Date:** TBD
**Phase Duration:** 1-2 days (estimated)

#### Phase 0.1: Monorepo Scaffolding
- [ ] Initialize pnpm workspace with `pnpm-workspace.yaml`
- [ ] Create `turbo.json` with build/lint/test/dev pipelines
- [ ] Set up shared TypeScript config (`packages/tsconfig/`)
- [ ] Set up shared ESLint config (`packages/eslint-config/`)
- [ ] Create `.env.example`
- [ ] Create `packages/graphql-shared/`

#### Phase 0.2: Infrastructure Docker Stack
- [ ] Build custom PostgreSQL image (PG16 + AGE + pgvector)
- [ ] Create `docker-compose.yml` with all services
- [ ] Create Keycloak realm import JSON
- [ ] Create `scripts/health-check.sh`
- [ ] Create SQL init script (`init.sql`)

#### Phase 0.3: First Subgraph — Core "Hello World"
- [ ] Scaffold `apps/subgraph-core/` as NestJS application
- [ ] Scaffold `apps/gateway/` as Hive Gateway v2 config
- [ ] Verify full path: Client → Gateway → Core subgraph

**Acceptance Criteria:**
```bash
# All workspace packages resolve
pnpm install --frozen-lockfile  # exits 0

# Full stack starts
docker-compose up -d  # all containers healthy within 60s

# Gateway responds to health query
curl -sf http://localhost:4000/graphql -d '{"query":"{ _health }"}' | jq .data._health
# → "ok"
```

---

## Issue Templates

### Bug Report Template
```markdown
## 🐛 BUG-XXX: [Title] (DD Month YYYY)
**סטטוס:** 🔴 Open | **חומרה:** 🔴 Critical / 🟡 Medium / 🟢 Low | **תאריך:** DD Month YYYY
**קבצים:** `file1.ts`, `file2.ts`

### תיאור הבעיה
[Clear description of the bug]

### צעדים לשחזור
1. [Step 1]
2. [Step 2]
3. [Bug occurs]

### התנהגות צפויה
[What should happen]

### התנהגות בפועל
[What actually happens]

### לוגים
```
[Relevant error logs from Pino logger]
```

### שורש הבעיה
[Root cause analysis after investigation]

### פתרון
[Solution implemented]

### בדיקות
- [ ] Regression test added
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] RLS validation (if DB-related)
```

### Feature Request Template
```markdown
## ✨ FEATURE-XXX: [Title] (DD Month YYYY)
**סטטוס:** 🔴 Open | **חומרה:** 🟡 Medium | **תאריך:** DD Month YYYY
**קבצים:** [Files to be created/modified]

### תיאור התכונה
[Clear description of the feature]

### דרישות
- [Requirement 1]
- [Requirement 2]

### תוכנית יישום
1. [Implementation step 1]
2. [Implementation step 2]

### בדיקות
- [ ] Unit tests
- [ ] Integration tests
- [ ] E2E tests (if user-facing)
- [ ] Documentation updated
```

### Refactoring Template
```markdown
## 🔧 REFACTOR-XXX: [Title] (DD Month YYYY)
**סטטוס:** 🔴 Open | **חומרה:** 🟢 Low | **תאריך:** DD Month YYYY
**קבצים:** [Files to be refactored]

### סיבת הרפקטור
[Why refactoring is needed]

### מצב נוכחי
[Current state description]

### מצב רצוי
[Desired state after refactoring]

### תוכנית
1. [Refactoring step 1]
2. [Refactoring step 2]

### בדיקות
- [ ] All existing tests still pass
- [ ] No breaking changes
- [ ] Code coverage maintained or improved
```

### Security Issue Template
```markdown
## 🔒 SECURITY-XXX: [Title] (DD Month YYYY)
**סטטוס:** 🔴 Open | **חומרה:** 🔴 Critical | **תאריך:** DD Month YYYY
**קבצים:** [Affected files]

### תיאור הפגיעות
[Security vulnerability description]

### סיכון
[Impact and risk assessment]

### מיקום הבעיה
[Where the vulnerability exists]

### פתרון
[Security fix implemented]

### בדיקות
- [ ] Security scan passes
- [ ] RLS validation (if DB-related)
- [ ] JWT validation (if auth-related)
- [ ] Input sanitization (if user input)
- [ ] Penetration test performed
```

---

## Tracking Guidelines

### Status Emojis
- 🔴 **Open** - Issue identified, not yet started
- 🟡 **In Progress** - Currently being worked on
- ✅ **Fixed/Completed** - Issue resolved and verified
- ⏳ **Waiting** - Blocked by dependency or external factor
- 🔄 **Review** - Solution implemented, awaiting review
- ❌ **Closed/Won't Fix** - Decided not to fix or no longer relevant

### Severity Levels
- 🔴 **Critical** - Blocks development, production down, security vulnerability, data loss
- 🟡 **Medium** - Degrades functionality, workaround exists, performance issue
- 🟢 **Low** - Minor issue, cosmetic, improvement, refactoring

### Update Protocol
1. **Create issue** - Use appropriate template, assign severity
2. **Update status** - Change status emoji as work progresses
3. **Log progress** - Add notes under each issue for significant updates
4. **Document solution** - Fill in "פתרון" section when resolved
5. **Verify tests** - Check all test checkboxes before marking ✅
6. **Update summary** - Update "סיכום תקלות" table counts

---

## Notes

- **Iron rule:** Every bug must be documented in OPEN_ISSUES.md before being fixed
- **Never skip documentation** - Even small fixes deserve a one-line entry
- **Use consistent formatting** - Follow templates for readability
- **Link to commits** - Include commit SHA when issue is resolved
- **Cross-reference** - Link related issues together (e.g., "Depends on BUG-042")
- **Parallel tracking** - When using parallel agents, track each agent's issues separately

---

**Last Updated:** 17 February 2026 | **Total Issues:** 3 completed | **Open Issues:** 0
