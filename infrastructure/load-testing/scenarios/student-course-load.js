/**
 * k6 Load Test — Student Course Page Load
 *
 * Simulates the most common user journey: a student authenticating via
 * Keycloak, browsing the course catalogue, and opening a single course
 * with its module tree.
 *
 * Target: 1,000 concurrent VUs — p95 < 500 ms.
 *
 * Run:
 *   k6 run scenarios/student-course-load.js
 *   k6 run -e GATEWAY_URL=https://api.edusphere.io/graphql scenarios/student-course-load.js
 */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------
const errorRate = new Rate('errors');
const courseListDuration = new Trend('course_list_duration', true);
const courseDetailDuration = new Trend('course_detail_duration', true);

// ---------------------------------------------------------------------------
// Environment & constants
// ---------------------------------------------------------------------------
const GATEWAY_URL =
  __ENV.GATEWAY_URL || 'http://localhost:4000/graphql';
const KEYCLOAK_URL =
  __ENV.KEYCLOAK_URL || 'http://localhost:8080';
const KEYCLOAK_REALM = __ENV.KEYCLOAK_REALM || 'edusphere';
const KEYCLOAK_CLIENT_ID = __ENV.KEYCLOAK_CLIENT_ID || 'edusphere-web';
const TEST_USER = __ENV.TEST_USER || 'student@example.com';
const TEST_PASS = __ENV.TEST_PASS || 'Student123!';
const TENANT_ID = __ENV.TENANT_ID || 'tenant-demo';

// ---------------------------------------------------------------------------
// k6 options — ramp to 1 000 VUs
// ---------------------------------------------------------------------------
export const options = {
  stages: [
    { duration: '1m', target: 200 },   // warm-up
    { duration: '2m', target: 500 },   // ramp
    { duration: '3m', target: 1000 },  // sustain at peak
    { duration: '2m', target: 1000 },  // hold
    { duration: '1m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],           // all HTTP p95 < 500 ms
    http_req_failed: ['rate<0.01'],             // < 1 % error rate
    errors: ['rate<0.01'],
    course_list_duration: ['p(95)<500'],        // catalogue query < 500 ms
    course_detail_duration: ['p(95)<500'],      // detail query < 500 ms
  },
};

// ---------------------------------------------------------------------------
// GraphQL payloads
// ---------------------------------------------------------------------------
const COURSES_LIST_QUERY = JSON.stringify({
  query: `query StudentCoursesList($first: Int!) {
    courses(pagination: { first: $first }) {
      edges {
        node {
          id
          title
          description
          thumbnailUrl
          instructor { id displayName }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`,
  variables: { first: 12 },
});

const COURSE_DETAIL_QUERY = JSON.stringify({
  query: `query CourseDetail($courseId: ID!) {
    course(id: $courseId) {
      id
      title
      description
      syllabus
      modules {
        id
        title
        order
        lessons {
          id
          title
          type
          durationMinutes
        }
      }
      instructor { id displayName avatarUrl }
      enrollmentCount
    }
  }`,
  // A placeholder course ID — override via __ENV.COURSE_ID if needed.
  variables: { courseId: __ENV.COURSE_ID || 'course-1' },
});

// ---------------------------------------------------------------------------
// Setup — authenticate once, share token across VUs
// ---------------------------------------------------------------------------
export function setup() {
  const tokenUrl =
    `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

  const res = http.post(tokenUrl, {
    grant_type: 'password',
    client_id: KEYCLOAK_CLIENT_ID,
    username: TEST_USER,
    password: TEST_PASS,
  });

  check(res, {
    'Keycloak token obtained': (r) => r.status === 200,
  });

  if (res.status !== 200) {
    console.error(`Auth failed (${res.status}): ${res.body}`);
    return { token: null };
  }

  const token = JSON.parse(res.body).access_token;
  return { token };
}

// ---------------------------------------------------------------------------
// Default VU function — the student journey
// ---------------------------------------------------------------------------
export default function (data) {
  if (!data.token) {
    console.error('No auth token — skipping iteration');
    errorRate.add(true);
    return;
  }

  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
    'x-tenant-id': TENANT_ID,
  };

  // Step 1 — Browse course catalogue
  group('Browse courses list', () => {
    const res = http.post(GATEWAY_URL, COURSES_LIST_QUERY, { headers });
    courseListDuration.add(res.timings.duration);

    const ok = check(res, {
      'courses list status 200': (r) => r.status === 200,
      'courses list has data': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.data && body.data.courses && !body.errors;
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  // Simulate user scanning the page before clicking into a course
  sleep(Math.random() * 2 + 1); // 1-3 s think time

  // Step 2 — Open a single course detail page
  group('Open course detail', () => {
    const res = http.post(GATEWAY_URL, COURSE_DETAIL_QUERY, { headers });
    courseDetailDuration.add(res.timings.duration);

    const ok = check(res, {
      'course detail status 200': (r) => r.status === 200,
      'course detail has modules': (r) => {
        try {
          const body = JSON.parse(r.body);
          return (
            body.data &&
            body.data.course &&
            Array.isArray(body.data.course.modules)
          );
        } catch {
          return false;
        }
      },
    });
    errorRate.add(!ok);
  });

  // Think time before next iteration
  sleep(Math.random() * 3 + 2); // 2-5 s
}

// ---------------------------------------------------------------------------
// Summary reporter
// ---------------------------------------------------------------------------
export function handleSummary(data) {
  return {
    'results/student-course-load-summary.json': JSON.stringify(data, null, 2),
    stdout: `
=== Student Course Load Test Summary ===
Total requests:  ${data.metrics.http_reqs.values.count}
Error rate:      ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
p50 latency:     ${data.metrics.http_req_duration.values['p(50)'].toFixed(0)} ms
p95 latency:     ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)} ms
p99 latency:     ${data.metrics.http_req_duration.values['p(99)'].toFixed(0)} ms
========================================
`,
  };
}
