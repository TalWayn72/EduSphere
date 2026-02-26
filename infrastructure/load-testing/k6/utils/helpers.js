import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://app.edusphere.io';
export const GRAPHQL_URL = `${BASE_URL}/graphql`;

export function graphqlPost(url, query, variables, headers) {
  const http = require('k6/http');
  return http.post(url, JSON.stringify({ query, variables }), { headers });
}

export function checkResponse(res, expectedStatus = 200) {
  return check(res, {
    [`status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
    'no GraphQL errors': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors || body.errors.length === 0;
      } catch {
        return false;
      }
    },
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}

export function randomSleep(min = 1, max = 3) {
  sleep(Math.random() * (max - min) + min);
}
