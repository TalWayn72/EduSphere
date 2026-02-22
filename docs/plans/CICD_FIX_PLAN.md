# CI/CD Deep Fix Plan — EduSphere

## Context

**Why this plan exists:**
After completing the API First (Waves 1A–3B) implementation and pushing to master, all 7 GitHub Actions
workflows were failing. Multiple fix rounds addressed the pnpm/action-setup@v4→v2 breakage and line
endings, but 4 remaining categories of failure persist and need root-cause solutions.

**Current state after previous fixes:**
- ✅ CI workflow (`ci.yml`): passing (pnpm v2 fix worked)
- ✅ Federation workflow (`federation.yml`): passing
- ✅ Performance workflow (`performance.yml`): passing
- ✅ CodeQL analysis (`codeql.yml`): passing (pnpm v2 fix worked)
- ❌ **Full Test Suite (`test.yml`)**: 0 jobs (YAML validation error — root cause identified)
- ❌ **Docker Image Builds (`docker-build.yml`)**: failing (Dockerfiles don't exist)
- ❌ **Continuous Deployment (`cd.yml`)**: failing (K8s cluster + secrets not configured)
- ⚠️ TruffleHog (`codeql.yml`): pinned to `@main` (unstable)

---

## Fix 1 — test.yml "0 Jobs" (P0 — Root Cause Confirmed)

### Root Cause
`args: ["-js"]` is **NOT a valid field** in GitHub Actions service container configuration.
The GitHub Actions workflow YAML schema validator rejects the entire workflow file → 0 jobs start.
This is why the UI shows the filename ("test.yml") instead of the workflow name ("Full Test Suite").

The field appears in **2 places**: `integration-tests.services.nats` and `graphql-tests.services.nats`.

### Fix 1A — Remove invalid `args:` field from NATS service containers

Replace the NATS `services:` block (which uses the invalid `args:` key) with a manual `docker run`
step in the job, giving us full control over command arguments including `-js`.

**Pattern** (apply to both `integration-tests` and `graphql-tests`):

```yaml
# REMOVE this from services:
nats:
  image: nats:latest
  ports:
    - 4222:4222
    - 8222:8222
  options: >-
    --health-cmd "wget ..."
    ...
  args: ["-js"]   # ← INVALID — causes entire workflow to be rejected

# ADD this step (after Checkout, before Install dependencies):
- name: Start NATS JetStream
  run: |
    docker run -d --name nats \
      -p 4222:4222 -p 8222:8222 \
      nats:2.10-alpine -js
    for i in $(seq 1 20); do
      wget -q --spider http://localhost:8222/healthz && echo "NATS ready" && break
      sleep 2
    done
    echo "NATS JetStream started"
```

**File:** `.github/workflows/test.yml`
**Locations:** `integration-tests` job (line ~58) and `graphql-tests` job (line ~245)

### Fix 1B — Fix non-existent turbo task and package scripts

Secondary failures that will appear AFTER the YAML validation is fixed:

| Command in test.yml | Issue | Fix |
|---|---|---|
| `pnpm turbo test:integration --concurrency=2` | No `test:integration` task in `turbo.json` | Change to `pnpm turbo test --concurrency=2` |
| `pnpm --filter @edusphere/db test:rls` | No `test:rls` script in `packages/db/package.json` | Change to `pnpm --filter @edusphere/db test` |
| `pnpm --filter @edusphere/${{ matrix.package }} test:graphql` | No `test:graphql` script in any subgraph | Change to `pnpm --filter @edusphere/${{ matrix.package }} test` |

**File:** `.github/workflows/test.yml`

### Fix 1C — Fix missing newline at end of file (test-complete job)
The `test-complete` job at line 380 ends without a trailing newline, which can cause GitHub Actions
YAML parsing issues in some environments. Add a trailing newline.

---

## Fix 2 — Docker Image Builds (P1 — Create 8 Dockerfiles)

### Root Cause
`docker-build.yml` uses `file: apps/${{ matrix.service }}/Dockerfile` for 8 services.
None of these Dockerfiles exist (only root `Dockerfile` and `apps/transcription-worker/Dockerfile`).

### Required Dockerfiles

| File | Service | Base Pattern | Port |
|---|---|---|---|
| `apps/gateway/Dockerfile` | Hive Gateway v2 (tsx runtime) | node:20-alpine + tsx | 4000 |
| `apps/subgraph-core/Dockerfile` | NestJS | node:20-alpine + nest build | 4001 |
| `apps/subgraph-content/Dockerfile` | NestJS | node:20-alpine + nest build | 4002 |
| `apps/subgraph-annotation/Dockerfile` | NestJS | node:20-alpine + nest build | 4003 |
| `apps/subgraph-collaboration/Dockerfile` | NestJS | node:20-alpine + nest build | 4004 |
| `apps/subgraph-agent/Dockerfile` | NestJS | node:20-alpine + nest build | 4005 |
| `apps/subgraph-knowledge/Dockerfile` | NestJS | node:20-alpine + nest build | 4006 |
| `apps/web/Dockerfile` | React + Vite → nginx | node:20-alpine + nginx:alpine | 80 |

### Pattern A — NestJS Subgraphs (apps/subgraph-{name}/Dockerfile)

```dockerfile
# syntax=docker/dockerfile:1
ARG NODE_VERSION=20
ARG PNPM_VERSION=9

# ─── Stage 1: base ──────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION} --no-fund --no-audit
WORKDIR /app

# ─── Stage 2: dependencies ───────────────────────────────────────────────────
FROM base AS deps
# Copy workspace manifest files (changes rarely → good cache layer)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
# Copy all packages (workspace deps needed for resolution)
COPY packages/ packages/
# Copy the specific subgraph app
COPY apps/subgraph-{NAME}/ apps/subgraph-{NAME}/
# Install all workspace deps (frozen)
RUN pnpm install --frozen-lockfile

# ─── Stage 3: builder ────────────────────────────────────────────────────────
FROM deps AS builder
RUN pnpm --filter @edusphere/subgraph-{NAME} build

# ─── Stage 4: runner (lean production image) ─────────────────────────────────
FROM base AS runner
# Create non-root user
RUN addgroup -g 1001 -S edusphere && adduser -u 1001 -S app -G edusphere
# Copy only production artifacts
COPY --from=deps --chown=app:edusphere /app/node_modules ./node_modules
COPY --from=deps --chown=app:edusphere /app/packages ./packages
COPY --from=builder --chown=app:edusphere /app/apps/subgraph-{NAME}/dist ./apps/subgraph-{NAME}/dist
USER app
EXPOSE {PORT}
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:{PORT}/health || exit 1
CMD ["node", "apps/subgraph-{NAME}/dist/main.js"]
```

**Substitution table:**
| {NAME} | {PORT} |
|---|---|
| core | 4001 |
| content | 4002 |
| annotation | 4003 |
| collaboration | 4004 |
| agent | 4005 |
| knowledge | 4006 |

### Pattern B — Gateway (apps/gateway/Dockerfile)

The gateway has no `build` script — it runs with `tsx`. For production, add a typecheck step but
run using `tsx` or `node --experimental-strip-types` (Node 22).

```dockerfile
# syntax=docker/dockerfile:1
ARG NODE_VERSION=20
ARG PNPM_VERSION=9

FROM node:${NODE_VERSION}-alpine AS base
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION} --no-fund --no-audit
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ packages/
COPY apps/gateway/ apps/gateway/
RUN pnpm install --frozen-lockfile

FROM base AS runner
RUN addgroup -g 1001 -S edusphere && adduser -u 1001 -S app -G edusphere
COPY --from=deps --chown=app:edusphere /app/node_modules ./node_modules
COPY --from=deps --chown=app:edusphere /app/packages ./packages
COPY --from=deps --chown=app:edusphere /app/apps/gateway ./apps/gateway
USER app
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s \
  CMD wget -qO- http://localhost:4000/healthz || exit 1
CMD ["node_modules/.bin/tsx", "apps/gateway/src/index.ts"]
```

### Pattern C — Web Frontend (apps/web/Dockerfile)

```dockerfile
# syntax=docker/dockerfile:1
ARG NODE_VERSION=20
ARG PNPM_VERSION=9

FROM node:${NODE_VERSION}-alpine AS builder
ARG PNPM_VERSION
RUN npm install -g pnpm@${PNPM_VERSION} --no-fund --no-audit
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/
RUN pnpm install --frozen-lockfile

# Build-time args (Vite inlines them at build time)
ARG VITE_GRAPHQL_URL
ARG VITE_GRAPHQL_WS_URL
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ARG VITE_KEYCLOAK_REALM=edusphere
ARG VITE_KEYCLOAK_CLIENT_ID=edusphere-app

RUN pnpm --filter @edusphere/web build

FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
# nginx.conf for SPA routing (fallback to index.html)
RUN echo 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri $uri/ /index.html; } }' \
    > /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
```

---

## Fix 3 — cd.yml Deployment Guards (P2)

### Root Cause
The CD workflow immediately fails trying to decode `KUBECONFIG_STAGING` secret which doesn't exist.
The workflow needs to **skip gracefully** when K8s infrastructure is not configured.

### Fix Strategy
Add a prerequisite check job using a repository variable `DEPLOYMENT_ENABLED` (not a secret —
variables can be checked safely). When the variable is not set to `true`, all deployment jobs skip.

```yaml
# Add as first job in cd.yml:
check-prerequisites:
  name: Check Deployment Prerequisites
  runs-on: ubuntu-latest
  outputs:
    can_deploy: ${{ steps.check.outputs.can_deploy }}
  steps:
    - id: check
      env:
        HAS_STAGING_KUBECONFIG: ${{ secrets.KUBECONFIG_STAGING != '' }}
      run: |
        if [[ "${{ vars.DEPLOYMENT_ENABLED }}" == "true" ]]; then
          echo "can_deploy=true" >> $GITHUB_OUTPUT
          echo "Deployment prerequisites met"
        else
          echo "can_deploy=false" >> $GITHUB_OUTPUT
          echo "::notice::Deployment skipped — set DEPLOYMENT_ENABLED=true in repository variables to enable"
        fi

# Update deploy-staging and deploy-production to depend on this:
deploy-staging:
  needs: check-prerequisites
  if: |
    needs.check-prerequisites.outputs.can_deploy == 'true' &&
    (github.event_name == 'push' || github.event.inputs.environment == 'staging')
```

**File:** `.github/workflows/cd.yml`

**To enable K8s deployment when ready:**
1. Set up K8s cluster (AKS / EKS / GKE / k3s)
2. Add `KUBECONFIG_STAGING` secret (base64-encoded kubeconfig)
3. Add `KUBECONFIG_PRODUCTION` secret
4. Set repository variable `DEPLOYMENT_ENABLED` = `true`
5. Ensure Helm chart exists at `infrastructure/k8s/helm/edusphere/`

---

## Fix 4 — TruffleHog Stability (P3)

### Root Cause
`trufflesecurity/trufflehog@main` uses an unstable HEAD reference. GitHub recommends pinning
actions to specific versions to prevent unexpected breakage when the action is updated.

### Fix
Pin to the stable v3 tag and add `--fail` flag to properly fail on found secrets:

```yaml
- name: TruffleHog OSS
  uses: trufflesecurity/trufflehog@v3   # ← pin to stable major version
  with:
    path: ./
    base: ${{ github.event.repository.default_branch }}
    head: HEAD
    extra_args: --only-verified        # keep --only-verified (no false positives)
```

**File:** `.github/workflows/codeql.yml`

---

## Fix 5 — Vitest Version Alignment (P4)

### Root Cause
`tests/contract/package.json` specifies `"vitest": "^3.0.0"` while all other packages use `"^4.0.18"`.
This causes version conflicts in the monorepo and may cause `pnpm --filter @edusphere/contract-tests run test` to use a different vitest version than CI expects.

### Fix
Update `tests/contract/package.json`:
```json
"devDependencies": {
  "vitest": "^4.0.18"   // was: "^3.0.0"
}
```

**File:** `tests/contract/package.json`

---

## Execution Order (3 Agents in Parallel)

```
Agent A: test.yml complete fix (Fix 1A + 1B + 1C)
Agent B: All 8 Dockerfiles creation (Fix 2)
Agent C: cd.yml guards + TruffleHog + Vitest version (Fix 3 + 4 + 5)
```

All 3 agents run in parallel — zero dependencies between them.

---

## Files Modified / Created

| File | Change | Fix |
|---|---|---|
| `.github/workflows/test.yml` | Remove `args: ["-js"]` NATS service entries; add docker run steps; fix missing scripts | 1A + 1B + 1C |
| `apps/gateway/Dockerfile` | New — multi-stage with tsx runtime | 2 |
| `apps/subgraph-core/Dockerfile` | New — multi-stage NestJS | 2 |
| `apps/subgraph-content/Dockerfile` | New — multi-stage NestJS | 2 |
| `apps/subgraph-annotation/Dockerfile` | New — multi-stage NestJS | 2 |
| `apps/subgraph-collaboration/Dockerfile` | New — multi-stage NestJS | 2 |
| `apps/subgraph-agent/Dockerfile` | New — multi-stage NestJS | 2 |
| `apps/subgraph-knowledge/Dockerfile` | New — multi-stage NestJS | 2 |
| `apps/web/Dockerfile` | New — Vite build → nginx:alpine | 2 |
| `.github/workflows/cd.yml` | Add `check-prerequisites` job; add `needs:` guards on deploy jobs | 3 |
| `.github/workflows/codeql.yml` | Pin TruffleHog to `@v3` | 4 |
| `tests/contract/package.json` | Vitest `^3.0.0` → `^4.0.18` | 5 |

**Total:** 9 new files + 4 modified files

---

## Verification

After commit + push:
```bash
# 1. Verify test.yml now has jobs (wait ~2 min after push)
gh run list --workflow=test.yml --limit=3

# 2. Watch test.yml run
gh run watch $(gh run list --workflow=test.yml --limit=1 --json databaseId -q '.[0].databaseId')

# 3. Verify docker-build.yml starts (only on PR or push to main/master)
gh run list --workflow=docker-build.yml --limit=3

# 4. Verify cd.yml skips gracefully (check for "Deployment skipped" notice)
gh run list --workflow=cd.yml --limit=3
```

**Expected CI state after fixes:**
| Workflow | Expected Result |
|---|---|
| `ci.yml` | ✅ Pass (already passing) |
| `test.yml` | ✅ Jobs start; integration/contract tests run |
| `federation.yml` | ✅ Pass (already passing) |
| `docker-build.yml` | ✅ Builds all 8 images |
| `cd.yml` | ✅ Skips gracefully with notice (no secret configured) |
| `codeql.yml` | ✅ Pass with pinned TruffleHog |
| `performance.yml` | ✅ Pass (already passing) |
