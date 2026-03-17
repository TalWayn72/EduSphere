# EduSphere Load Testing

k6-based load test scenarios for the 5 critical user journeys in EduSphere.

## Prerequisites

1. **Install k6** (v0.50+):

   ```bash
   # macOS
   brew install k6

   # Windows (winget)
   winget install k6 --source winget

   # Docker (no install)
   docker run --rm -i grafana/k6 run - <scenarios/smoke-ci.js
   ```

2. **Running infrastructure** — Most scenarios require the EduSphere stack:

   ```bash
   docker-compose up -d          # postgres, keycloak, nats, minio, jaeger
   pnpm --filter @edusphere/gateway dev
   pnpm turbo dev --filter='@edusphere/subgraph-*'
   ```

3. **Keycloak users seeded** — The test users must exist in Keycloak:

   | User                        | Role         | Password        |
   | --------------------------- | ------------ | --------------- |
   | student@example.com         | STUDENT      | Student123!     |
   | instructor@example.com      | INSTRUCTOR   | Instructor123!  |
   | super.admin@edusphere.dev   | SUPER_ADMIN  | SuperAdmin123!  |

## Scenarios

| File                       | Journey                          | VUs   | Duration | p95 Target |
| -------------------------- | -------------------------------- | ----- | -------- | ---------- |
| `smoke-ci.js`              | CI pipeline sanity check         | 10    | 60 s     | < 2 s      |
| `student-course-load.js`   | Student browses + opens course   | 1,000 | ~9 min   | < 500 ms   |
| `hybrid-rag-search.js`     | HybridRAG semantic search        | 500   | ~9 min   | < 1 s      |
| `instructor-upload.js`     | Instructor file upload flow      | 100   | ~7 min   | < 2 s      |
| `collab-editing.js`        | CRDT collaborative editing (WS)  | 50    | ~7 min   | < 200 ms   |

### Pre-existing scenarios (in `scenarios/` and `k6/scenarios/`)

| File             | Purpose                                    |
| ---------------- | ------------------------------------------ |
| `100k-users.js`  | Full-scale 100K user ramp                  |
| `soak-test.js`   | 24-hour endurance / memory leak detection  |
| `spike-test.js`  | Sudden traffic surge simulation            |
| `k6/scenarios/smoke.js`  | Original minimal smoke test         |
| `k6/scenarios/load.js`   | 1K VU production load test          |
| `k6/scenarios/stress.js` | 5K VU breaking-point stress test    |

## Running Tests

### Quick start — CI smoke test

```bash
cd infrastructure/load-testing
k6 run scenarios/smoke-ci.js
```

### With environment overrides

```bash
k6 run \
  -e GATEWAY_URL=http://localhost:4000/graphql \
  -e KEYCLOAK_URL=http://localhost:8080 \
  -e TEST_USER=student@example.com \
  -e TEST_PASS=Student123! \
  -e TENANT_ID=tenant-demo \
  scenarios/student-course-load.js
```

### Against staging / production

```bash
k6 run \
  -e GATEWAY_URL=https://api.staging.edusphere.io/graphql \
  -e KEYCLOAK_URL=https://auth.staging.edusphere.io \
  -e KEYCLOAK_REALM=edusphere \
  scenarios/student-course-load.js
```

### Docker (no local k6 install)

```bash
docker run --rm -i \
  --network=host \
  -v $(pwd)/scenarios:/scenarios \
  grafana/k6 run /scenarios/smoke-ci.js
```

### Upload flow with custom file size

```bash
k6 run -e FILE_SIZE_KB=1024 scenarios/instructor-upload.js
```

### Collaborative editing with custom ops count

```bash
k6 run -e OPS_PER_SESSION=50 scenarios/collab-editing.js
```

## Environment Variables

All scenarios support these environment variables:

| Variable             | Default                              | Description                         |
| -------------------- | ------------------------------------ | ----------------------------------- |
| `GATEWAY_URL`        | `http://localhost:4000/graphql`      | Gateway GraphQL endpoint            |
| `KEYCLOAK_URL`       | `http://localhost:8080`              | Keycloak base URL                   |
| `KEYCLOAK_REALM`     | `edusphere`                          | Keycloak realm name                 |
| `KEYCLOAK_CLIENT_ID` | `edusphere-web`                      | Keycloak client ID                  |
| `TEST_USER`          | varies per scenario                  | Keycloak username                   |
| `TEST_PASS`          | varies per scenario                  | Keycloak password                   |
| `TENANT_ID`          | `tenant-demo`                        | Multi-tenant ID header              |

Scenario-specific variables:

| Variable          | Scenario              | Default | Description                 |
| ----------------- | --------------------- | ------- | --------------------------- |
| `COURSE_ID`       | student-course-load   | `course-1` | Course ID for detail query |
| `FILE_SIZE_KB`    | instructor-upload     | `256`   | Simulated file size in KB   |
| `WS_URL`          | collab-editing        | `ws://localhost:4000/graphql` | WebSocket URL |
| `DOCUMENT_ID`     | collab-editing        | `collab-doc-load-test` | Document to collaborate on |
| `OPS_PER_SESSION` | collab-editing        | `20`    | CRDT ops per VU session     |

## Test Results

Each scenario writes a JSON summary to a `results/` directory (auto-created by k6):

```
results/
  smoke-ci-summary.json
  student-course-load-summary.json
  hybrid-rag-search-summary.json
  instructor-upload-summary.json
  collab-editing-summary.json
```

Add `results/` to `.gitignore` — these are ephemeral CI artifacts.

## CI Integration

Add the smoke test to your GitHub Actions workflow:

```yaml
- name: k6 smoke test
  uses: grafana/k6-action@v0.3.1
  with:
    filename: infrastructure/load-testing/scenarios/smoke-ci.js
  env:
    GATEWAY_URL: http://localhost:4000/graphql
    KEYCLOAK_URL: http://localhost:8080
```

## Grafana Cloud k6 (optional)

For long-running tests with dashboards, stream results to Grafana Cloud:

```bash
K6_CLOUD_TOKEN=<your-token> k6 cloud scenarios/student-course-load.js
```

## Thresholds Reference

| Metric                    | smoke-ci | student | search | upload | collab |
| ------------------------- | -------- | ------- | ------ | ------ | ------ |
| `http_req_duration p(95)` | < 2 s    | < 500ms | < 1 s  | —      | —      |
| `http_req_failed`         | < 1%     | < 1%    | < 1%   | < 2%   | —      |
| `presign_url_duration`    | —        | —       | —      | <500ms | —      |
| `minio_upload_duration`   | —        | —       | —      | <1.5s  | —      |
| `e2e_upload_duration`     | —        | —       | —      | < 2 s  | —      |
| `crdt_roundtrip p(95)`    | —        | —       | —      | —      | <200ms |
