/**
 * k6 Spike Test — Sudden Traffic Surge
 * Validates EduSphere handles sudden traffic spikes (e.g., class starts at 9 AM).
 * Run: k6 run scenarios/spike-test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 100 },    // Normal load
    { duration: '10s', target: 5000 },  // SPIKE: sudden surge (class start)
    { duration: '5m', target: 5000 },   // Hold spike
    { duration: '10s', target: 100 },   // Drop back
    { duration: '2m', target: 100 },    // Recovery period
    { duration: '10s', target: 10000 }, // Second spike
    { duration: '5m', target: 10000 },  // Hold
    { duration: '2m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'],  // Allow 1s during spikes
    http_req_failed: ['rate<0.05'],     // < 5% errors during spike
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const res = http.post(
    `${BASE_URL}/graphql`,
    JSON.stringify({ query: '{ _health { status } }' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  const ok = check(res, { 'status 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  sleep(0.5);
}
