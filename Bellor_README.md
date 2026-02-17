# Bellor

A modern dating and social networking platform built for scale. Fully standalone, production-ready, serving real-time chat, matchmaking, stories, achievements, and premium subscriptions.

[![CI](https://github.com/TalWayn72/Bellor_MVP/workflows/CI/badge.svg)](https://github.com/TalWayn72/Bellor_MVP/actions)
![Version](https://img.shields.io/badge/version-1.0.0--beta-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)
![Tests](https://img.shields.io/badge/tests-3463%2B-green)
![License](https://img.shields.io/badge/license-Private-red)

---

## Quick Start

**Prerequisites:** Node.js 20+, npm 9+, Docker Desktop

```bash
git clone https://github.com/TalWayn72/Bellor_MVP.git
cd Bellor_MVP
npm install
cp apps/api/.env.example apps/api/.env    # Configure environment
npm run docker:up                          # Start PostgreSQL + Redis
npm run prisma:generate                    # Generate Prisma client
npm run prisma:migrate                     # Apply database schema
npm run prisma:seed                        # Seed 50 users + comprehensive demo data
npm run dev:all                            # Start frontend + backend
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3000 |
| API Health | http://localhost:3000/health |
| Memory Metrics | http://localhost:3000/health/memory |
| Prometheus Metrics | http://localhost:3000/metrics |
| Prisma Studio | http://localhost:5555 (via `npm run prisma:studio`) |

### Demo User Accounts

All demo users have password: **Demo123!**

| Language | Email | Name |
|----------|-------|------|
| English | demo_sarah@bellor.app | Sarah Johnson (F) |
| English | demo_michael@bellor.app | Michael Chen (M) |
| Hebrew | demo_yael@bellor.app | Yael Cohen (F) |
| Hebrew | demo_david@bellor.app | David Levi (M) |
| Spanish | demo_maria@bellor.app | Maria Garcia (F) |
| Spanish | demo_carlos@bellor.app | Carlos Rodriguez (M) |
| German | demo_anna@bellor.app | Anna Schmidt (F) |
| German | demo_thomas@bellor.app | Thomas Muller (M) |
| French | demo_sophie@bellor.app | Sophie Dubois (F) |
| French | demo_pierre@bellor.app | Pierre Martin (M) |

### Service Health Check

Verify all services are running before starting work:

```bash
docker ps && curl -s http://localhost:3000/health
```

| Service | Port | Check | Expected |
|---------|------|-------|----------|
| PostgreSQL | 5432 | `docker ps \| grep postgres` | Container running |
| Redis | 6379 | `docker ps \| grep redis` | Container running |
| Backend API | 3000 | `curl localhost:3000/health` | `{"status":"ok"}` |
| Frontend | 5173 | Open browser | App loads |

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Docker services won't start | Verify Docker Desktop is running (`docker --version`). Check ports: `netstat -an \| grep 5432` |
| Prisma Client errors | `npm run prisma:generate` or reset: `cd apps/api && npx prisma migrate reset` |
| Port 5173 in use | `npx kill-port 5173` or set `VITE_PORT=5174` |
| API not responding (port 3000) | `npm run dev:api` |

---

## Architecture

```
Bellor_MVP/
├── apps/
│   ├── web/                 # React Frontend (Vite + TypeScript)
│   │   ├── src/             # api/, components/, hooks/, pages/, security/, utils/
│   │   ├── e2e/             # Playwright E2E tests (11 mocked + 22 full-stack spec files)
│   │   ├── android/         # Capacitor Android
│   │   └── ios/             # Capacitor iOS
│   └── api/                 # Fastify Backend (TypeScript)
│       ├── src/             # controllers/, services/, routes/, middleware/, websocket/, security/, lib/
│       └── prisma/          # Schema, migrations, seed
├── packages/
│   ├── shared/              # Shared TypeScript types
│   └── ui/                  # Design system (50+ components)
├── infrastructure/
│   ├── docker/              # Multi-stage Dockerfiles (api, web, nginx)
│   ├── kubernetes/          # K8s manifests (HPA, PDB, Ingress)
│   ├── monitoring/          # Prometheus, Grafana, Loki, Alertmanager
│   └── k6/                  # Load test scripts (smoke, stress, spike, WS, DB)
├── .github/workflows/       # CI/CD pipelines (ci, cd, docker-build, test)
├── scripts/                 # Utility scripts (analysis, deployment, Windows)
│   └── windows/             # Windows-specific scripts (.bat, .ps1)
└── docs/                    # 40+ documentation files
    ├── architecture/        # System architecture diagrams
    ├── api/                 # API endpoints & client docs
    ├── product/             # PRD & requirements
    ├── development/         # Development guidelines & rules
    ├── security/            # Security checklist, plan, incident response
    ├── deployment/          # Deployment guides (cloud, Docker, mobile)
    ├── reports/             # Performance baselines & test reports
    ├── project/             # Issue tracking & project status
    ├── plans/               # Implementation plans
    └── archive/             # Historical & completed documents
```

For detailed architecture diagrams (Mermaid): [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md)

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18.2, Vite 6.1, TypeScript 5.8, Tailwind CSS 3.4, Radix UI, TanStack Query 5, React Router 6, Framer Motion 11 |
| **Backend** | Node.js 20+, Fastify 5.2, Prisma 6.19, Zod 3.23, Socket.io 4.8, Stripe 20.3, Firebase Admin 13.6 |
| **Database** | PostgreSQL 16 (40+ indexes), Redis 7 (sessions, cache, presence) |
| **Testing** | Vitest 2.1 (2,649 unit/integration tests across 935 files), Playwright (224 mocked + 214 full-stack E2E tests + visual regression + accessibility), k6 (7 load test scripts) |
| **DevOps** | Docker 24+, Kubernetes 1.28+, GitHub Actions, Prometheus, Grafana, Loki, Alertmanager |

---

## Features

### Core Platform
- **Authentication** -- JWT access/refresh tokens, Google OAuth, bcrypt, brute force protection
- **User Profiles** -- Photos, bio, preferences, search, discovery, compatibility quiz
- **Real-time Chat** -- WebSocket messaging, typing indicators, read receipts, presence tracking
- **Stories** -- 24-hour ephemeral content with full-screen viewer, auto-advance, navigation
- **Matchmaking** -- Romantic and positive matches, advanced filtering, daily missions
- **Achievements** -- Badges, XP rewards, auto-unlock system
- **Premium** -- Stripe subscriptions, profile boost, referral program
- **Push Notifications** -- Firebase Cloud Messaging for offline users
- **Audio/Video** -- Voice responses with play/pause, video tasks, video dating
- **Feedback System** -- User feedback collection (bug reports, feature requests, improvements)

### Admin Dashboard
- User management (block/unblock/verify), report moderation, chat monitoring
- Activity analytics, system settings, real-time metrics

### Internationalization
- 5 languages: English, Hebrew, Spanish, German, French

### Reliability & Performance
- DB transaction safety (atomic operations via `prisma.$transaction()`)
- Circuit breaker pattern for external APIs (Stripe, Firebase, Resend)
- Redis cache-aside for profiles, stories, missions, achievements
- Endpoint-specific rate limiting (login, register, chat, upload, search)
- Global error handler with standardized AppError class
- WebSocket heartbeat with stale connection cleanup
- 40+ optimized database indexes including compound indexes

### Security (Multi-layer)
- Input sanitization (client + server), Zod validation on every endpoint
- File upload security (magic bytes, EXIF stripping, re-encoding)
- Security headers (CSP, HSTS, CORS, X-Frame-Options)
- Container hardening (non-root, read-only FS, capability dropping)
- K8s NetworkPolicy + RBAC for pod-to-pod traffic restriction
- Full audit: [docs/security/SECURITY_CHECKLIST.md](docs/security/SECURITY_CHECKLIST.md) (75/79 items verified)

---

## Commands

| Category | Command | Description |
|----------|---------|-------------|
| **Dev** | `npm run dev` | Frontend only (port 5173) |
| | `npm run dev:api` | Backend only (port 3000) |
| | `npm run dev:all` | Both frontend and backend |
| **Build** | `npm run build` | Build all workspaces |
| | `npm run lint` / `lint:fix` | Lint all / auto-fix |
| | `npm run type-check` | TypeScript check (zero errors) |
| **Database** | `npm run prisma:generate` | Generate Prisma client |
| | `npm run prisma:migrate` | Run migrations (dev) |
| | `npm run prisma:studio` | Prisma Studio (port 5555) |
| | `npm run prisma:seed` | Seed 50 demo users |
| **Test** | `npm run test` | All tests (3,463+) |
| | `npm run test:api` | Backend tests (1,425) |
| | `npm run test:web` | Frontend tests (1,224) |
| | `npm run test:e2e` | Playwright E2E mocked (224 tests) |
| | `npm run test:e2e:fullstack` | Playwright E2E full-stack (214 tests) |
| | `npm run test:migration` | Database migration tests (97 tests) |
| | `npm run test:coverage` | Tests with coverage report |
| | `npm run test:mutation` | Stryker mutation testing (critical backend services) |
| | `npm run test:mutation:report` | Open mutation test HTML report |
| **Docker** | `npm run docker:up` / `down` | Start/stop PostgreSQL + Redis |
| **Mobile** | `npm run cap:sync` | Sync web to native projects |
| | `npm run cap:build` | Build web + sync to Android/iOS |

---

## Deployment

### Development
```bash
npm run docker:up && npm run dev:all
```

### Production -- Docker Compose
```bash
# Standard
docker compose -f docker-compose.prod.yml up -d

# High-scale (3-20 API replicas, PgBouncer, nginx LB)
docker compose -f infrastructure/docker/docker-compose.production.yml up -d
docker compose -f infrastructure/docker/docker-compose.production.yml up -d --scale api=5

# All-in-one (275MB minimum, DB included)
docker compose -f infrastructure/docker/docker-compose.all-in-one.yml up -d
```

### Production -- Kubernetes
```bash
kubectl apply -f infrastructure/kubernetes/
# HPA: 3-10 pods, rolling updates, PDB, health checks
```

### One-Command Universal Installer
```bash
# Linux/macOS
curl -fsSL https://raw.githubusercontent.com/TalWayn72/Bellor_MVP/main/scripts/install-anywhere.sh | bash

# Windows (PowerShell as Administrator)
irm https://raw.githubusercontent.com/TalWayn72/Bellor_MVP/main/scripts/install-anywhere.ps1 | iex
```

Docker images are published to GHCR on version tags (`v*.*.*`):
`ghcr.io/TalWayn72/bellor_mvp/{api,web}:<version>`

---

## Monitoring

| Component | Tool | Access |
|-----------|------|--------|
| Metrics | Prometheus | http://localhost:9090 |
| Dashboards | Grafana | http://localhost:3001 |
| Logs | Loki + Promtail | via Grafana |
| Alerts | Alertmanager | http://localhost:9093 |

Tracks: API request rates, p50/p95/p99 latency, error rates, WebSocket connections, DB query performance, system resources, **real-time memory metrics** (heap, RSS, external, GC). Structured logging with correlation IDs.

### Memory Monitoring
- **Real-time Prometheus metrics**: heapUsed, heapTotal, rss, external, arrayBuffers (auto-updated every 15s)
- **Health endpoint**: `GET /health/memory` with status thresholds (healthy < 200MB, warning < 500MB, critical >= 500MB)
- **Alert logger**: Monitors heap usage every 60s, logs warnings at 80%, critical at 90%, force GC if needed
- **Trend detection**: 60-minute history tracking with heap growth rate calculation (MB/min)
- **Prometheus alerts**: BellorHighMemoryUsage (>200MB for 5min), BellorCriticalMemory (>500MB for 2min), BellorMemoryLeak (>10MB/h growth for 2h)

Start monitoring stack:
```bash
docker compose -f infrastructure/docker/docker-compose.monitoring.yml up -d
```

---

## Testing

| Category | Count | Framework | Files |
|----------|-------|-----------|-------|
| **Backend (Unit + Integration + Migration)** | **1,425 tests** | **Vitest** | **519 test files** |
| **Frontend (Unit + Accessibility + Components)** | **1,224 tests** | **Vitest** | **416 test files** |
| E2E (Mocked) | 224 | Playwright | 11 spec files |
| **E2E Full-Stack** | **214 (207 passed, 7 skipped)** | **Playwright** | **22 spec files** |
| **E2E Accessibility** | **56 page tests (28×2 viewports)** | **axe-core + Playwright** | **1 test file** |
| **Visual Regression** | **20+ scenarios** | **Playwright** | **1 spec file** |
| Load Testing | 7 scripts | k6 | smoke, sustained, stress, spike, WS, DB, memory |
| Mutation Testing | Critical services | Stryker | Auth, Chat, Security, Middleware |
| **Memory Leak Detection** | **Automated scan** | **Custom + Vitest** | **Static analysis + Runtime tests** |
| **Total** | **3,463+ tests** | | **935+ test files** |

**Browsers (E2E):** Chromium, Mobile Chrome, Mobile Safari, Firefox (CI)

**Performance baseline (k6):** p95 = 23ms (smoke), 230ms (stress). See [docs/reports/PERFORMANCE_BASELINE.md](docs/reports/PERFORMANCE_BASELINE.md).

### Visual Regression Testing

Automated screenshot comparison to catch UI regressions:
- **Coverage:** Login, Feed, Profile, Chat, Discover, Settings, Modals
- **Viewports:** Desktop (1280x720), Mobile (390x844)
- **Themes:** Light mode, Dark mode
- **Framework:** Playwright's built-in screenshot comparison

```bash
npm run test:visual              # Run visual regression tests
npm run test:visual:update       # Update baseline screenshots
```

See [apps/web/e2e/visual/README.md](apps/web/e2e/visual/README.md) for details.

### Accessibility (A11y) Testing

Comprehensive WCAG 2.1 AA compliance testing across all components and pages:

- **Component Tests:** 138 tests for SecureTextInput, SecureTextArea, Dialog, Button, Form, Navigation, Image
- **E2E Tests:** 28 scenarios × 2 viewports (desktop 1280x720, mobile 375x667) = 56 test executions
- **Coverage:** Form labels, ARIA attributes, keyboard navigation, focus management, screen reader compatibility
- **Tools:** axe-core, axe-playwright, vitest-axe, jest-axe

```bash
npm run test -- src/test/a11y        # Run component a11y tests
npm run test:e2e -- accessibility    # Run E2E a11y tests
```

See [apps/web/src/test/a11y/README.md](apps/web/src/test/a11y/README.md) for complete documentation.

### Mutation Testing

Mutation testing validates test quality by introducing small code changes (mutations) and checking if tests catch them. Stryker is configured to test critical backend services:

- **Services:** `auth.service.ts`, `chat.service.ts`
- **Middleware:** `auth.middleware.ts`
- **Security:** `input-sanitizer.ts`, `csrf-protection.ts`

Run manually or via weekly GitHub Actions workflow:
```bash
npm run test:mutation              # Run mutation tests (~10+ minutes)
npm run test:mutation:report       # View HTML report
```

**Thresholds:** High: 80%, Low: 60%, Break: 50%

**CI:** Automated weekly on Sundays at 2 AM UTC via GitHub Actions.

### 🆕 Memory Leak Detection

Automated detection system for common memory leak patterns. Catches issues before they reach production.

**What it detects:**
- ✅ `setInterval` without `clearInterval` 🔴 HIGH
- ✅ `addEventListener` without `removeEventListener` 🔴 HIGH
- ✅ Event emitter `.on()` without `.off()` 🔴 HIGH
- ✅ `useEffect` without cleanup return 🟡 MEDIUM
- ✅ `setTimeout` in refs without cleanup 🟡 MEDIUM
- ✅ WebSocket connections not closed 🔴 HIGH
- ✅ Map/Set growth without size limits 🟢 LOW

**Commands:**
```bash
npm run check:memory-leaks              # AST-based static analysis (621 files)
npm run check:memory-leaks -- --verbose # Verbose mode with debug info
npm run test:memory-leak                # Runtime validation tests
```

**CI Integration:** GitHub Actions runs on every PR and daily at 2 AM UTC. Fails builds if HIGH severity leaks detected.

**Improvements (AST-based):**
- Reduced false positives: 45 → 6 issues (only test files)
- Zero HIGH severity false positives (was 6 → 0)
- Smart detection: Recognizes unsub patterns, lifecycle events, server-level listeners
- Test file awareness: Downgrades severity for `.test.` / `.spec.` files

**Files:**
- `scripts/check-memory-leaks.js` - Main entry point (144 lines)
- `scripts/memory-leak-ast-analyzer.js` - AST analysis (100 lines)
- `scripts/ast-utils.js` - Pattern detection utilities (146 lines)
- `apps/api/src/test/memory-leak-detection.test.ts` - Backend tests
- `apps/web/src/test/memory-leak-detection.test.ts` - Frontend tests
- `.github/workflows/memory-leak-check.yml` - CI workflow

---

## Database Schema

PostgreSQL with Prisma ORM. Key entities:

| Entity | Purpose |
|--------|---------|
| User | Profiles, preferences, authentication, photos |
| ChatRoom / Message | Real-time conversations, read receipts |
| Mission / Response | Daily challenges, audio/video/text responses |
| Story | 24-hour ephemeral content |
| Achievement | Badges, XP, auto-unlock |
| Report | User reports, moderation workflow |
| Subscription | Stripe premium plans |
| DeviceToken | Push notification registration (FCM) |
| AppSettings | Feature flags, system config |

40+ optimized indexes. Full schema: [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)

---

## Environment Variables

See [apps/api/.env.example](apps/api/.env.example) for the complete list. Key variables:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/bellor
REDIS_URL=redis://localhost:6379
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars>
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=ws://localhost:3000
```

---

## Documentation

| Category | Documents |
|----------|-----------|
| **Project** | [docs/development/GUIDELINES.md](docs/development/GUIDELINES.md) -- Dev standards (15 sections) / [docs/project/PROJECT_STATUS.md](docs/project/PROJECT_STATUS.md) -- Project status reference |
| **Product** | [docs/product/PRD.md](docs/product/PRD.md) -- Product requirements / [docs/archive/MIGRATION_PLAN.md](docs/archive/MIGRATION_PLAN.md) -- Migration strategy |
| **Architecture** | [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) -- 8 Mermaid diagrams / [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma) -- DB schema |
| **Security** | [docs/security/SECURITY_PLAN.md](docs/security/SECURITY_PLAN.md) / [docs/security/SECURITY_CHECKLIST.md](docs/security/SECURITY_CHECKLIST.md) / [docs/security/INCIDENT_RESPONSE.md](docs/security/INCIDENT_RESPONSE.md) |
| **Deployment** | [docs/deployment/DEPLOYMENT_INFRASTRUCTURE_COMPLETE.md](docs/deployment/DEPLOYMENT_INFRASTRUCTURE_COMPLETE.md) / [docs/deployment/CLOUD_AGNOSTIC_DEPLOYMENT.md](docs/deployment/CLOUD_AGNOSTIC_DEPLOYMENT.md) / [docs/deployment/FREE_HOSTING_OPTIONS.md](docs/deployment/FREE_HOSTING_OPTIONS.md) |
| **Performance** | [docs/reports/PERFORMANCE_BASELINE.md](docs/reports/PERFORMANCE_BASELINE.md) -- k6 load test results and scripts |
| **Privacy** | [docs/security/DATA_RETENTION_POLICY.md](docs/security/DATA_RETENTION_POLICY.md) -- GDPR-compliant PII retention policy |
| **Mobile** | [docs/deployment/GOOGLE_PLAY_DEPLOYMENT.md](docs/deployment/GOOGLE_PLAY_DEPLOYMENT.md) / [docs/deployment/MOBILE_RELEASE_CHECKLIST.md](docs/deployment/MOBILE_RELEASE_CHECKLIST.md) / [docs/product/MOBILE_APP_REQUIREMENTS.md](docs/product/MOBILE_APP_REQUIREMENTS.md) |
| **Tracking** | [docs/project/OPEN_ISSUES.md](docs/project/OPEN_ISSUES.md) -- 523+ items tracked, all resolved |

---

## Development Phases

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation -- Monorepo, TypeScript, Prisma, Docker | Complete |
| 2 | Core Backend -- Auth, Users, Files, Stories, Achievements, Premium, Push | Complete |
| 3 | Real-time -- Socket.io, Chat, Presence, Frontend integration | Complete |
| 4 | Frontend Migration -- Remove Base44 dependencies | Complete |
| 5 | Admin & Tools -- Dashboard, User/Report/Chat management | Complete |
| 6 | Testing & QA -- 2,649 unit/integration + 514 E2E tests, 75% backend coverage, 40% frontend baseline, WCAG 2.1 AA compliance | Complete |
| 7 | Deployment -- CI/CD, Docker builds, K8s, universal installers | Complete |
| 8 | Universal Deployment -- Cloud-agnostic, free hosting, one-command deploy | Complete |
| 9 | Final Polish -- Push notifications, audio playback, story viewer, TS cleanup, Logger | Complete |
| 10 | Mobile App -- Capacitor configured, Android + iOS platforms added | 30% |

**Phase 10 remaining:** Upload keystore (Android), AAB build, store listing.

---

## Next Steps

1. Beta testing with 100 users
2. Production deployment to cloud provider
3. Mobile app store submission (Phase 10)
4. Feature flags rollout system
5. GDPR data export/deletion endpoints

---

## License

Private -- All rights reserved.

---

**Version:** 1.0.0-beta | **Last Updated:** February 2026 | **TypeScript Errors:** 0
