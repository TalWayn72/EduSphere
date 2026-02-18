/**
 * Stress test -- find breaking point
 * Gradually increases to 5000 VU to find system limits
 */
import http from 'k6/http';
import { sleep } from 'k6';
import { getToken, authHeaders } from '../utils/auth.js';
import { GRAPHQL_URL, checkResponse } from '../utils/helpers.js';

export const options = {
  stages: [
    { duration: '2m', target: 500 },
    { duration: '3m', target: 1000 },
    { duration: '3m', target: 2000 },
    { duration: '3m', target: 3000 },
    { duration: '3m', target: 5000 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.10'],
    http_req_duration: ['p(99)<10000'],
  },
};

const QUERY = ;

export function setup() {
  const token = getToken(
    __ENV.TEST_USER || 'testuser@edusphere.io',
    __ENV.TEST_PASS || 'testpass'
  );
  return { token };
}

export default function (data) {
  const headers = authHeaders(data.token);

  http.post(
    GRAPHQL_URL,
    JSON.stringify({ query: QUERY }),
    { headers }
  );

  sleep(0.5);
}