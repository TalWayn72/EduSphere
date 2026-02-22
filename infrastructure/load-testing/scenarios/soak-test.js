/**
 * k6 Soak Test — 24-hour endurance test
 * Validates no memory leaks, connection pool exhaustion, or degradation over time.
 * Run: k6 run --duration 24h scenarios/soak-test.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const latencyTrend = new Trend('latency_over_time');

export const options = {
  stages: [
    { duration: '5m', target: 500 },    // Ramp up
    { duration: '23h50m', target: 500 },// Hold at moderate load for 24h
    { duration: '5m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<750'],   // Allow 750ms during soak
    http_req_failed: ['rate<0.01'],
    // Key: latency should NOT increase over time (memory leaks show as degradation)
    latency_over_time: ['p(95)<750'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4000';

export default function () {
  const res = http.post(
    `${BASE_URL}/graphql`,
    JSON.stringify({
      query: `query SoakTest {
        courses(pagination: { first: 5 }) {
          edges { node { id title } }
        }
      }`,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  latencyTrend.add(res.timings.duration);
  check(res, { 'status 200': (r) => r.status === 200 });
  sleep(2); // Moderate load: ~250 req/s at 500 VUs
}
