import http from 'k6/http';
import { check, sleep } from 'k6';
import { SMOKE_OPTIONS } from '../k6.config.js';

export const options = {
  ...SMOKE_OPTIONS,
  vus: 5, // Health check needs fewer VUs
  duration: '15s',
};

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:4000';

export default function () {
  const res = http.get(`${GATEWAY_URL}/health`);

  check(res, {
    'health endpoint returns 200': (r) => r.status === 200,
    'response time under 100ms': (r) => r.timings.duration < 100,
  });

  sleep(0.2);
}
