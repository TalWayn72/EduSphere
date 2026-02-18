/**
 * Smoke test -- minimal load to verify system is operational
 * Target: 1 VU, 1 minute
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { getToken, authHeaders } from '../utils/auth.js';
import { GRAPHQL_URL, checkResponse } from '../utils/helpers.js';

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
  },
};

const DASHBOARD_QUERY = ;

export function setup() {
  const token = getToken(
    __ENV.TEST_USER || 'testuser@edusphere.io',
    __ENV.TEST_PASS || 'testpass'
  );
  return { token };
}

export default function (data) {
  const headers = authHeaders(data.token);

  const res = http.post(
    GRAPHQL_URL,
    JSON.stringify({ query: DASHBOARD_QUERY }),
    { headers }
  );

  checkResponse(res);
  sleep(1);
}