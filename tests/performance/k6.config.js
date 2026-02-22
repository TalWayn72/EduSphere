// tests/performance/k6.config.js
// Shared k6 configuration for EduSphere performance tests
// Import this in each scenario: import { SMOKE_OPTIONS, SLA_THRESHOLDS } from '../k6.config.js';

export const SLA_THRESHOLDS = {
  // p95 response time under 500ms (matches NestJS + Drizzle ORM overhead budget)
  http_req_duration: ['p(95)<500', 'p(99)<1000'],
  // Error rate under 1%
  http_req_failed: ['rate<0.01'],
  // Time to first byte under 400ms
  http_req_waiting: ['p(95)<400'],
};

// Smoke test: 20 virtual users, 30 seconds — used in CI
export const SMOKE_OPTIONS = {
  vus: 20,
  duration: '30s',
  thresholds: SLA_THRESHOLDS,
};

// Load test: ramp to 500 VUs — run manually
export const LOAD_OPTIONS = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 0 },
  ],
  thresholds: SLA_THRESHOLDS,
};

// Stress test: spike to 2000 VUs — run manually
export const STRESS_OPTIONS = {
  stages: [
    { duration: '1m', target: 2000 },
    { duration: '2m', target: 2000 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};
