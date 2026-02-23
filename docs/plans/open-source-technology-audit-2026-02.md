# Open Source Technology Audit — EduSphere Platform
**Date:** February 23, 2026
**Scope:** All open source technologies in `apps/*`, `packages/*`, `infrastructure/`, and all Docker Compose files
**Sources:** `package.json` files (all workspaces), `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.monitoring.yml`, `infrastructure/docker-compose.pgbouncer.yml`, all `Dockerfile` files

---

## Complete Technology Inventory (A → Z)

Sorted alphabetically by common name. Scoped packages (`@foo/bar`) are sorted by primary name (ignoring `@scope/` prefix).

| # | Name | Package / Image | Used Version | Latest Stable | Description (≤ 15 words) |
|---|------|----------------|:------------:|:-------------:|--------------------------|
| 1 | AI SDK (Vercel) | `ai` | 5.0.0 | **6.0.97** | LLM abstraction layer for streaming AI responses from multiple providers |
| 2 | AlertManager | `prom/alertmanager` | 0.27.0 | 0.27.0 | Routes Prometheus alerts to email, Slack, PagerDuty notification channels |
| 3 | Apache AGE | PostgreSQL extension | 1.7.0 | 1.7.0 | Graph database extension for PostgreSQL using openCypher query language |
| 4 | Apollo Client | `@apollo/client` | 3.11.11 | **4.1.5** | Feature-rich GraphQL client with normalized caching for web and mobile |
| 5 | autoprefixer | `autoprefixer` | 10.4.20 | 10.4.21 | PostCSS plugin that automatically adds CSS vendor prefixes |
| 6 | AWS SDK v3 (S3) | `@aws-sdk/client-s3` | 3.729.0 | 3.750+ | Official AWS SDK v3 for S3 object storage operations in Node.js |
| 7 | Babel | `@babel/core` | 7.26.0 | 7.26.x | JavaScript compiler transforming modern syntax to compatible browser code |
| 8 | cAdvisor | `ghcr.io/google/cadvisor` | 0.49.1 | **0.56.2** | Google's container resource usage and performance analysis monitoring tool |
| 9 | class-variance-authority | `class-variance-authority` | 0.7.1 | 0.7.1 | Utility for creating type-safe CSS class variant component APIs |
| 10 | clsx | `clsx` | 2.1.1 | 2.1.1 | Tiny utility for constructing conditional CSS className strings |
| 11 | Drizzle Kit | `drizzle-kit` | 0.30.2 | **0.31.9** | CLI for Drizzle ORM schema diffing, migrations, and code generation |
| 12 | Drizzle ORM | `drizzle-orm` | 0.45.1 | 0.45.1 | TypeScript-first ORM with SQL-first design and native RLS support |
| 13 | ESLint | `eslint` | 10.0.0 | 10.x (RC) | Pluggable JavaScript/TypeScript static analysis and linting tool |
| 14 | Expo | `expo` | 54.0.0 | 54.0.33 | Platform for building universal React Native apps on iOS/Android/Web |
| 15 | Express | `express` | 4.21.2 | **5.2.1** | Minimal, flexible Node.js HTTP web server and middleware framework |
| 16 | Federation Composition | `@theguild/federation-composition` | 0.21.3 | 0.21.x | GraphQL Federation v2 supergraph composition and validation library |
| 17 | Grafana | `grafana/grafana` | 11.6.0 | **12.3.2** | Open-source data visualization and monitoring dashboard platform |
| 18 | graphql (JS) | `graphql` | 16.12.0 | 16.12.0 | Official JavaScript reference implementation of the GraphQL specification |
| 19 | GraphQL Code Generator | `@graphql-codegen/cli` | 5.0.0 | 5.0.4 | Generates TypeScript types and resolvers from GraphQL schema files |
| 20 | GraphQL Hive Gateway | `@graphql-hive/gateway` | 2.2.1 | **2.4.2** | Federation v2 gateway with schema registry, caching, and observability |
| 21 | graphql-request | `graphql-request` | 7.1.2 | **7.4.0** | Minimal, isomorphic GraphQL client for making HTTP requests |
| 22 | graphql-scalars | `graphql-scalars` | 1.24.0 | **1.25.0** | Community library of custom GraphQL scalar types (Date, UUID, JSON…) |
| 23 | graphql-subscriptions | `graphql-subscriptions` | 3.0.0 | 3.0.0 | PubSub abstraction enabling GraphQL real-time subscription transport |
| 24 | graphql-ws | `graphql-ws` | 5.16.0 | **6.0.7** | WebSocket protocol implementation for GraphQL subscriptions (RFC 7936) |
| 25 | GraphQL Yoga | `graphql-yoga` | 5.18.0 | 5.18.0 | Fully-featured, spec-compliant, extensible GraphQL server |
| 26 | HLS.js | `hls.js` | 1.5.0 | **1.6.15** | JavaScript library enabling HLS adaptive bitrate streaming in browsers |
| 27 | Hocuspocus | `@hocuspocus/server` | 2.15.0 | **3.4.4** | Real-time collaborative editing server based on Y.js CRDT |
| 28 | Husky | `husky` | 9.1.7 | 9.1.7 | Git hooks automation tool for pre-commit and pre-push workflows |
| 29 | i18next | `i18next` | 23.16.0 | **25.8.13** | Internationalization framework with plugins for detection and loading |
| 30 | ioredis | `ioredis` | 5.4.2 | 5.4.2 | Full-featured Redis client for Node.js with cluster and sentinel support |
| 31 | Jaeger | `jaegertracing/jaeger` | 1.58 | **2.15.1** | Open-source distributed tracing system for microservices observability |
| 32 | Jest | `jest` | 29.7.0 | 29.7.0 | Delightful JavaScript testing framework with mocking and snapshot support |
| 33 | jose | `jose` | 6.1.3 | 6.1.3 | JavaScript library implementing JOSE standards: JWT, JWK, JWS, JWE |
| 34 | KaTeX | `katex` | 0.16.0 | 0.16.21 | Fast, accurate mathematical typesetting library for browsers |
| 35 | Keycloak | `quay.io/keycloak/keycloak` | 26.5.3 | 26.5.3 | Open-source identity and access management with OIDC and SAML support |
| 36 | keycloak-js | `keycloak-js` | 26.2.3 | 26.2.3 | Keycloak JavaScript adapter for browser-side OIDC authentication |
| 37 | LangChain | `langchain` | 1.2.24 | **1.2.25** | Framework for composing LLM-powered chains, agents, and RAG pipelines |
| 38 | LangGraph | `@langchain/langgraph` | 1.0.0 | **1.1.4** | State-machine framework for multi-step AI agent workflows with persistence |
| 39 | lint-staged | `lint-staged` | 15.2.11 | 15.5.0 | Runs linters only on git staged files, not the entire codebase |
| 40 | Loki (Grafana) | `grafana/loki` | 3.0.0 | **3.6.5** | Horizontally scalable, cost-efficient log aggregation system |
| 41 | lowlight | `lowlight` | 3.0.0 | 3.2.0 | Syntax highlighting library without browser DOM dependency |
| 42 | Lucide React | `lucide-react` | 0.468.0 | **0.575.0** | Open-source React icon library with beautiful, consistent design |
| 43 | MinIO | `minio/minio` | latest | RELEASE.2026-02-02 | High-performance S3-compatible open-source object storage server |
| 44 | MSW (Mock Service Worker) | `msw` | 2.12.10 | 2.12.10 | API mocking library intercepting requests at the service worker level |
| 45 | NATS.js (client) | `nats` (npm) | 2.29.3 | 2.29.3 | NATS messaging system client library for Node.js applications |
| 46 | NATS Server | `nats:2-alpine` | 2.12.4 | 2.12.4 | High-performance cloud-native messaging system with JetStream persistence |
| 47 | NestJS | `@nestjs/common` | 11.1.14 | 11.1.14 | Progressive Node.js framework for scalable, maintainable server-side apps |
| 48 | nestjs-pino | `nestjs-pino` | 4.3.0 | **4.6.0** | NestJS logger module integrating Pino for structured JSON logging |
| 49 | Node.js | Runtime | 20.19.0 | **24.13.1 (LTS)** | JavaScript runtime built on Chrome's V8 engine |
| 50 | Node Exporter | `prom/node-exporter` | 1.8.0 | **1.8.1** | Prometheus exporter for hardware and OS-level metrics |
| 51 | Ollama | Binary (apt/curl) | latest | 0.6.x | Runs open-source LLMs locally with a simple REST API |
| 52 | ollama-ai-provider | `ollama-ai-provider` (npm) | 1.2.0 | 1.2.0 | Ollama local LLM provider adapter for Vercel AI SDK |
| 53 | OpenAI SDK | `openai` (npm) | 4.77.0 | **6.22.0** | Official OpenAI API client for Node.js and browser environments |
| 54 | OpenTelemetry SDK | `@opentelemetry/api` | 1.9.0 | 1.9.0 | Vendor-neutral observability SDK for traces, metrics, and logs |
| 55 | PgBouncer | `bitnami/pgbouncer` | 1.23.1 | **1.25.1** | Lightweight connection pooler for PostgreSQL database servers |
| 56 | pg (node-postgres) | `pg` (npm) | 8.14.0 | **8.18.0** | Non-blocking PostgreSQL client for Node.js applications |
| 57 | pgvector | PostgreSQL extension | 0.8.1 | 0.8.1 | Open-source vector similarity search extension for PostgreSQL |
| 58 | pgvector (JS) | `pgvector` (npm) | 0.2.0 | **0.2.1** | Node.js helper library for pgvector PostgreSQL extension |
| 59 | Pino | `pino` (npm) | 10.3.1 | 10.3.1 | Very low overhead, JSON-structured logging library for Node.js |
| 60 | Playwright | `@playwright/test` | 1.58.2 | 1.58.2 | Cross-browser E2E testing framework by Microsoft |
| 61 | pnpm | Package manager | 9.15.0 | **10.30.1** | Fast, disk space efficient JavaScript package manager |
| 62 | PostCSS | `postcss` (npm) | 8.5.1 | 8.5.1 | CSS transformation tool with a powerful plugin ecosystem |
| 63 | PostgreSQL | `postgres:16` | 16.x | **18.2** | Advanced open-source relational database (released Feb 12, 2026) |
| 64 | PostgreSQL Exporter | `prometheuscommunity/postgres-exporter` | 0.15.0 | 0.17.x | Prometheus metrics exporter for PostgreSQL database servers |
| 65 | Prettier | `prettier` | 3.8.1 | 3.8.1 | Opinionated code formatter supporting JS, TS, JSON, CSS, and more |
| 66 | prom-client | `prom-client` (npm) | 15.1.3 | 15.1.3 | Prometheus metrics client library for Node.js applications |
| 67 | Prometheus | `prom/prometheus` | 3.2.1 | 3.2.1 | Open-source monitoring and alerting toolkit with time-series database |
| 68 | Promtail | `grafana/promtail` | 3.0.0 | 3.0.0 ⚠️ EOL | Log shipping agent for Loki — **deprecated, EOL March 2, 2026** |
| 69 | Radix UI | `@radix-ui/*` | 1.x – 2.x | per component | Accessible, unstyled, composable React UI primitive components |
| 70 | React | `react` | 19.2.4 | 19.2.4 | Declarative component-based JavaScript library for building UIs |
| 71 | React Hook Form | `react-hook-form` | 7.71.1 | **7.71.2** | Performant, flexible React form library with minimal re-renders |
| 72 | react-i18next | `react-i18next` | 15.0.0 | 15.5.0 | React bindings for i18next internationalization framework |
| 73 | React Native | `react-native` | 0.76.8 | **0.84.0** | Framework for building native mobile apps using React |
| 74 | React Navigation | `@react-navigation/native` | 7.0.15 | **7.1.28** | Routing and navigation library for React Native apps |
| 75 | React Router | `react-router-dom` | 7.12.1 | **7.13.0** | Declarative client-side routing for React web applications |
| 76 | Redis | `redis:8.6.0-alpine` | 8.6.0 | 8.6.0 | In-memory data structure store used as cache and pub/sub broker |
| 77 | Redis Exporter | `oliver006/redis_exporter` | 1.58.0 | 1.68.0 | Prometheus exporter for Redis server performance metrics |
| 78 | reflect-metadata | `reflect-metadata` (npm) | 0.2.2 | 0.2.2 | Metadata reflection API polyfill enabling TypeScript decorators |
| 79 | RxJS | `rxjs` (npm) | 7.8.1 | **7.8.2** | Reactive programming library using composable observables |
| 80 | sonner | `sonner` (npm) | 1.7.4 | **2.0.7** | Opinionated, accessible toast notification component for React |
| 81 | tailwind-merge | `tailwind-merge` | 2.6.0 | 2.6.0 | Intelligently merges conflicting Tailwind CSS utility classes |
| 82 | TailwindCSS | `tailwindcss` | 4.0.12 | **4.2.0** | Utility-first CSS framework for rapid, responsive UI development |
| 83 | TanStack Query | `@tanstack/react-query` | 5.0.0 | **5.90.21** | Async server state management with caching and background refetching |
| 84 | TipTap | `@tiptap/react` | 3.20.0 | 3.20.0 | Headless, extensible rich-text editor built on ProseMirror |
| 85 | ts-jest | `ts-jest` | 29.2.0 | 29.2.6 | TypeScript preprocessor enabling Jest to run `.ts` test files |
| 86 | tsx | `tsx` (npm) | 4.19.2 | 4.19.2 | TypeScript Execute — runs TS files directly without compilation step |
| 87 | Turborepo | `turbo` | 2.7.2 | **2.8.10** | High-performance build system for JavaScript/TypeScript monorepos |
| 88 | TypeScript | `typescript` | 5.9.3 / 6.0.3β | **5.9.3** | Typed JavaScript superset with static analysis and inference |
| 89 | urql | `urql` (npm) | 4.1.0 | **5.0.1** | Highly customizable, lightweight GraphQL client for React |
| 90 | Vite | `vite` | 7.1.2 | **7.3.1** | Next-generation frontend build tool with instant HMR |
| 91 | Vitest | `vitest` | 4.0.18 | 4.0.18 | Blazing-fast Vite-native unit and integration testing framework |
| 92 | Yjs | `yjs` (npm) | 13.6.27 | **13.6.29** | CRDT framework enabling conflict-free collaborative real-time editing |
| 93 | Zod | `zod` (npm) | 4.3.6 | 4.3.6 | TypeScript-first schema declaration and runtime validation library |
| 94 | Zustand | `zustand` (npm) | 5.0.0 | **5.0.11** | Small, fast, scalable state management for React applications |

---

## Summary

| Category | Count |
|----------|-------|
| Infrastructure & Docker | 18 |
| Backend / Node.js NPM | 28 |
| Frontend / Web NPM | 26 |
| AI / ML | 6 |
| Dev Tools & Build | 16 |
| **Total** | **94** |

---

## ⚠️ Critical Upgrade Alerts

| Priority | Technology | Current | Latest | Issue |
|----------|-----------|---------|--------|-------|
| 🔴 EOL | Promtail | 3.0.0 | N/A | ✅ **DONE** — replaced with Grafana Alloy v1.8.2 |
| 🔴 Major gap | Jaeger | 1.58 | **2.15.1** | ✅ **DONE** — upgraded; image renamed `jaegertracing/all-in-one` → `jaegertracing/jaeger` |
| 🔴 Major gap | OpenAI SDK | 4.77.0 | 6.22.0 | ✅ **DONE** — `transcription-worker` updated to ^6.22.0 |
| 🟡 Minor gap | AI SDK (Vercel) | 5.0.0 | 6.0.97 | Major version behind |
| 🟡 Minor gap | Apollo Client | 3.11.11 | 4.1.5 | Major version behind (mobile uses Apollo) |
| 🟡 Minor gap | Express | 4.21.2 | 5.2.1 | Used in health/metrics packages |
| 🟡 Minor gap | Grafana | 11.6.0 | 12.3.2 | ✅ **DONE** — upgraded to 12.3.2 |
| 🟡 Minor gap | PostgreSQL | 16 | 18.2 | ✅ **DONE** — Dockerfile.postgres upgraded to postgres:18-alpine + AGE release/PG18/1.7.0 |
| 🟡 Minor gap | cAdvisor | 0.49.1 | **0.56.2** | ✅ **DONE** — upgraded; image moved to `ghcr.io/google/cadvisor:0.56.2` |
| 🟡 Minor gap | pnpm | 9.15.0 | 10.30.1 | ✅ **DONE** — upgraded; lockfile regenerated |
| 🟡 Minor gap | React Native | 0.76.8 | 0.84.0 | Several minor versions behind |
| 🟡 Minor gap | TanStack Query | 5.0.0 | 5.90.21 | Same major, large minor gap (90 patch versions) |
| 🟢 Fine | Apache AGE | 1.7.0 | 1.7.0 | Current |
| 🟢 Fine | NestJS | 11.1.14 | 11.1.14 | Current |
| 🟢 Fine | Keycloak | 26.5.3 | 26.5.3 | Current |
| 🟢 Fine | React | 19.2.4 | 19.2.4 | Current |
| 🟢 Fine | TypeScript (stable) | 5.9.3 | 5.9.3 | Current (note: some packages declare ^6.0.3 beta) |

---

## Notes

- **TypeScript 6.0.3**: Declared in most `apps/*/package.json` but TypeScript 6 is pre-release as of Feb 2026. Latest stable is 5.9.3.
- **ESLint 10**: Used as `^10.0.0` — v10 may still be in RC/alpha; stable v9 branch is the safe fallback.
- **MinIO**: Pinned to `latest` in Docker Compose — production deployments should pin to a specific digest.
- **Ollama**: Used as `latest` binary install — no version pinning. Add pinning for reproducible builds.
- **Promtail**: ✅ Replaced with Grafana Alloy v1.8.2. Config at `infrastructure/monitoring/alloy/alloy-config.alloy` (River syntax).
- **Jaeger v2**: ✅ Image renamed from `jaegertracing/all-in-one` to `jaegertracing/jaeger`. Port 14268 removed; OTLP on 4317/4318 is now the default.
- **cAdvisor v0.56.x**: ✅ Image moved from `gcr.io/cadvisor/cadvisor` to `ghcr.io/google/cadvisor`. Tag format: no `v` prefix (e.g. `0.56.2` not `v0.56.2`).
- **Apache AGE PG18**: Branch `PG18/v1.7.0` does not exist — use `release/PG18/1.7.0` (stable) or `PG18` (main dev branch).
- **Loki 3.x**: `enforce_metric_name` field removed; `table_manager` removed; use `tsdb` store + `v13` schema (not `boltdb-shipper` + `v11`).
- **Grafana 12.x**: `grafana-piechart-panel` is now built-in — remove from `GF_INSTALL_PLUGINS`.
- **pnpm v10**: Lockfile format changed to v9 (incompatible with pnpm v9). Run `pnpm install --no-frozen-lockfile` after upgrading.
- **Node.js**: Project declares `>=20.19.0` in engines. Some Dockerfiles use Node 22 LTS. Current LTS is 24.13.1.
