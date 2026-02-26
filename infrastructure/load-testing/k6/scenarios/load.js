/**
 * Load test -- expected production load
 * Target: 1000 concurrent users, 10 minutes
 * Based on: 100K+ concurrent users, K=10% peak simultaneity
 */
import http from 'k6/http';
import { sleep } from 'k6';
import { getToken, authHeaders } from '../utils/auth.js';
import { GRAPHQL_URL, checkResponse, randomSleep } from '../utils/helpers.js';

export const options = {
  stages: [
    { duration: '2m', target: 200 }, // Ramp up
    { duration: '5m', target: 1000 }, // Sustained load
    { duration: '2m', target: 1000 }, // Hold
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'], // < 5% error rate
    http_req_duration: ['p(95)<2000'], // 95th percentile < 2s
    'http_req_duration{scenario:default}': ['p(99)<5000'], // 99th percentile < 5s
  },
};

const QUERIES = [
  // Dashboard load
  `query { me { id email displayName } }`,
  // Knowledge graph
  `query { conceptsForContent(contentId: "content-1") { nodes { id label type } edges { from to type } } }`,
  // Courses list
  `query { myCourses(first: 10) { edges { node { id title progress } } } }`,
];

export function setup() {
  const token = getToken(
    __ENV.TEST_USER || 'testuser@edusphere.io',
    __ENV.TEST_PASS || 'testpass'
  );
  return { token };
}

export default function (data) {
  const headers = authHeaders(data.token);
  const query = QUERIES[Math.floor(Math.random() * QUERIES.length)];

  const res = http.post(GRAPHQL_URL, JSON.stringify({ query }), { headers });

  checkResponse(res);
  randomSleep(1, 5);
}
