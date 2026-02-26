/**
 * k6 Load Test — 100,000 Concurrent Users
 * EduSphere production scale validation.
 * Run: k6 run --vus 1000 --duration 10m scenarios/100k-users.js
 * Performance budget: p95 < 500ms for all queries.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const queryDuration = new Trend('graphql_query_duration');

export const options = {
  stages: [
    { duration: '2m', target: 1000 }, // Ramp up to 1k users
    { duration: '5m', target: 5000 }, // Ramp to 5k
    { duration: '10m', target: 10000 }, // Ramp to 10k
    { duration: '20m', target: 50000 }, // Ramp to 50k
    { duration: '20m', target: 100000 }, // Target: 100k users
    { duration: '10m', target: 100000 }, // Hold at 100k
    { duration: '5m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'], // < 1% error rate
    errors: ['rate<0.01'],
    graphql_query_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

const COURSE_QUERY = JSON.stringify({
  query: `query LoadTest {
    courses(pagination: { first: 10 }) {
      edges { node { id title description } }
      pageInfo { hasNextPage endCursor }
    }
  }`,
});

const HEALTH_QUERY = JSON.stringify({
  query: `query Health { _health { status version } }`,
});

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    'x-tenant-id': `tenant-${Math.floor(Math.random() * 100)}`,
  };

  // 70% read queries (courses, health)
  if (Math.random() < 0.7) {
    const query = Math.random() < 0.5 ? COURSE_QUERY : HEALTH_QUERY;
    const res = http.post(`${BASE_URL}/graphql`, query, { headers });
    const duration = res.timings.duration;
    queryDuration.add(duration);
    const ok = check(res, {
      'status 200': (r) => r.status === 200,
      'no errors': (r) => !JSON.parse(r.body).errors,
      'p95 < 500ms': () => duration < 500,
    });
    errorRate.add(!ok);
  }

  sleep(Math.random() * 2 + 0.5); // 0.5-2.5s think time
}

export function handleSummary(data) {
  return {
    'results/100k-users-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== 100K Users Load Test Summary ===
Total requests: ${data.metrics.http_reqs.values.count}
Error rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
p50 latency: ${data.metrics.http_req_duration.values['p(50)'].toFixed(0)}ms
p95 latency: ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)}ms
p99 latency: ${data.metrics.http_req_duration.values['p(99)'].toFixed(0)}ms
=====================================
`,
  };
}
