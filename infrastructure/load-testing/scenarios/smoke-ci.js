/**
 * k6 Smoke Test — CI Pipeline Sanity Check
 *
 * A lightweight test designed to run in every CI pipeline. Validates that the
 * gateway is alive, introspection works, and at least one resolver returns data.
 *
 * Target: 10 VUs x 60 s — p95 < 2 s, error rate < 1%.
 *
 * Run:
 *   k6 run scenarios/smoke-ci.js
 *   k6 run -e GATEWAY_URL=http://localhost:4000/graphql scenarios/smoke-ci.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const errorRate = new Rate('errors');

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const GATEWAY_URL =
  __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const KEYCLOAK_URL =
  __ENV.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = __ENV.KEYCLOAK_REALM || 'edusphere';
const KEYCLOAK_CLIENT_ID = __ENV.KEYCLOAK_CLIENT_ID || 'edusphere-web';
const TEST_USER = __ENV.TEST_USER || 'student@example.com';
const TEST_PASS = __ENV.TEST_PASS || 'Student123!';
const TENANT_ID = __ENV.TENANT_ID || 'tenant-demo';

// ---------------------------------------------------------------------------
// k6 options — lightweight: 10 VUs, 60 seconds
// ---------------------------------------------------------------------------
export const options = {
  vus: 10,
  duration: '60s',
  thresholds: {
    http_req_duration: ['p(95)<2000'],   // p95 < 2 s
    http_req_failed: ['rate<0.01'],      // < 1 % error rate
    errors: ['rate<0.01'],
  },
};

// ---------------------------------------------------------------------------
// GraphQL payloads
// ---------------------------------------------------------------------------
const HEALTH_QUERY = JSON.stringify({
  query: `query HealthCheck { _health { status version } }`,
});

const INTROSPECTION_QUERY = JSON.stringify({
  query: `query Introspection {
    __schema {
      queryType { name }
      mutationType { name }
      subscriptionType { name }
      types { name kind }
    }
  }`,
});

const COURSES_QUERY = JSON.stringify({
  query: `query SmokeCourses {
    courses(pagination: { first: 3 }) {
      edges { node { id title } }
      pageInfo { hasNextPage }
    }
  }`,
});

// ---------------------------------------------------------------------------
// Setup — authenticate once
// ---------------------------------------------------------------------------
export function setup() {
  const tokenUrl =
    `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const res = http.post(tokenUrl, {
    grant_type: 'password',
    client_id: KEYCLOAK_CLIENT_ID,
    username: TEST_USER,
    password: TEST_PASS,
  });

  // Auth is best-effort for CI smoke — some environments may not have Keycloak.
  if (res.status === 200) {
    return { token: JSON.parse(res.body).access_token };
  }

  console.warn(`Keycloak auth failed (${res.status}) — running without auth`);
  return { token: null };
}

// ---------------------------------------------------------------------------
// Default VU function — three quick checks per iteration
// ---------------------------------------------------------------------------
export default function (data) {
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID,
  };
  if (data.token) {
    headers.Authorization = `Bearer ${data.token}`;
  }

  // Check 1 — Gateway health endpoint
  group('Health check', () => {
    const res = http.post(GATEWAY_URL, HEALTH_QUERY, { headers });
    const ok = check(res, {
      'health status 200': (r) => r.status === 200,
      'health returns status field': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && !body.errors;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // Check 2 — GraphQL introspection (validates schema is composed)
  group('Introspection query', () => {
    const res = http.post(GATEWAY_URL, INTROSPECTION_QUERY, { headers });
    const ok = check(res, {
      'introspection status 200': (r) => r.status === 200,
      'schema has query type': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.__schema?.queryType?.name === 'Query';
        } catch {
          return false;
        }
      },
      'schema has types': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data?.__schema?.types?.length > 0;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  // Check 3 — One real resolver (courses list)
  group('Resolver smoke test', () => {
    const res = http.post(GATEWAY_URL, COURSES_QUERY, { headers });
    const ok = check(res, {
      'courses status 200': (r) => r.status === 200,
      'courses returns data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.courses && !body.errors;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  // Short pause between iterations
  sleep(Math.random() + 0.5); // 0.5-1.5 s
}

// ---------------------------------------------------------------------------
// Summary reporter — concise output for CI logs
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  const passed =
    data.metrics.http_req_failed.values.rate < 0.01 &&
    data.metrics.http_req_duration.values['p(95)'] < 2000;

  return {
    'results/smoke-ci-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== CI Smoke Test Summary ===
Status:          ${passed ? 'PASS' : 'FAIL'}
Total requests:  ${data.metrics.http_reqs.values.count}
Error rate:      ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
p50 latency:     ${data.metrics.http_req_duration.values['p(50)'].toFixed(0)} ms
p95 latency:     ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)} ms
==============================
`,
  };
}
