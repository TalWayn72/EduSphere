# EduSphere Performance Tests (k6)

Load testing scenarios for the EduSphere GraphQL Federation gateway.

## Prerequisites

Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

```bash
# macOS
brew install k6

# Windows (via Chocolatey)
choco install k6

# Linux
sudo apt-get install k6
```

## Running Tests Locally

Ensure all services are running first:

```bash
docker-compose up -d
pnpm dev  # starts all subgraphs + gateway
```

### Smoke Tests (20 VU / 30s — same as CI)

```bash
k6 run tests/performance/scenarios/02-course-list.k6.js \
  -e GATEWAY_URL=http://localhost:4000/graphql

k6 run tests/performance/scenarios/03-annotations.k6.js \
  -e GATEWAY_URL=http://localhost:4000/graphql \
  -e TEST_JWT=<your-test-jwt>
```

### Load Tests (ramp to 500 VU)

```bash
k6 run --env SCENARIO=load tests/performance/scenarios/02-course-list.k6.js \
  -e GATEWAY_URL=http://localhost:4000/graphql
```

## SLA Thresholds

| Metric                   | Threshold |
| ------------------------ | --------- |
| p95 response time        | < 500ms   |
| p99 response time        | < 1000ms  |
| Error rate               | < 1%      |
| Time to first byte (p95) | < 400ms   |

## CI Integration

Performance tests run automatically on every push to `main` and nightly at 02:00 UTC.
See `.github/workflows/performance.yml` for the CI configuration.

## Scenario Overview

| Scenario           | VUs | Duration | Auth Required |
| ------------------ | --- | -------- | ------------- |
| 01-health-check    | 5   | 15s      | No            |
| 02-course-list     | 20  | 30s      | No            |
| 03-annotations     | 10  | 30s      | Optional      |
| 04-semantic-search | 10  | 30s      | Optional      |
| 05-agent-session   | 5   | 30s      | Yes           |
