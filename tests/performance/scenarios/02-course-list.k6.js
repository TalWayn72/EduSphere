import http from 'k6/http';
import { check, sleep } from 'k6';
import { SMOKE_OPTIONS } from '../k6.config.js';

export const options = SMOKE_OPTIONS;

const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';

const COURSE_LIST_QUERY = JSON.stringify({
  query: `query CourseList {
    courses(limit: 20, offset: 0) {
      id
      title
      slug
      isPublished
      estimatedHours
    }
  }`,
});

const HEADERS = { 'Content-Type': 'application/json' };

export default function () {
  const res = http.post(GATEWAY_URL, COURSE_LIST_QUERY, { headers: HEADERS });

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'no GraphQL errors': (r) => {
      try {
        const body = JSON.parse(r.body);
        return !body.errors || body.errors.length === 0;
      } catch {
        return false;
      }
    },
    'courses array returned': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.data?.courses);
      } catch {
        return false;
      }
    },
  });

  if (!ok) {
    console.error(`Request failed: ${res.status} - ${res.body.substring(0, 200)}`);
  }

  sleep(0.5);
}
